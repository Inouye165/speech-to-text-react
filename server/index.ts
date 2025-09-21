import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import * as cheerio from 'cheerio';
import { getStorage } from './storage';

const app = express();
app.use(cors());
app.use(express.json());

// Get storage instance (file-based for now, easily replaceable with database)
const storage = getStorage();

// Load grocery list from storage on startup
let currentGroceryList: string[] = [];

// Initialize storage and load existing data
async function initializeStorage() {
  try {
    currentGroceryList = await storage.getList();
    console.log(`Loaded ${currentGroceryList.length} items from storage`);
  } catch (error) {
    console.error('Failed to load grocery list from storage:', error);
    currentGroceryList = [];
  }
}

const GroceryPlanSchema = z.object({
  final_list: z.array(z.string()).describe('The final grocery list after applying all instructions.'),
  reasoning: z.string().describe('Brief reasoning on how instructions were interpreted.'),
});

const RecipeIngredientSchema = z.object({
  ingredients: z.array(z.string()).describe('List of ingredients extracted from the recipe, normalized (e.g., "2 cups flour" becomes "flour").'),
  reasoning: z.string().describe('Brief explanation of how ingredients were extracted and normalized.'),
});

const GROCERY_SYSTEM = `
You manage a grocery list by applying natural-language instructions to an existing list.
Rules:
- Understand variants like "add X", "put X on grocery list", "add X to shopping".
- Handle removals: "remove X", "delete X", "take X off the list".
- Handle relative removal: "I'll take that last one out" = remove the most recently added item.
- Ignore filler words; normalize item names (e.g., lowercase, no trailing punctuation).
- Always work with the CURRENT list provided and apply changes to it.
- If adding items that already exist, don't duplicate them.
- Output ONLY in the specified JSON schema.
`;

const RECIPE_SYSTEM = `
You extract ingredients from recipes and normalize them for a grocery list.
Rules:
- Extract all ingredients from the recipe text
- Normalize ingredient names (remove measurements, quantities, and preparation notes)
- Convert to simple grocery items (e.g., "2 cups all-purpose flour" → "flour")
- Group similar items (e.g., "olive oil" and "extra virgin olive oil" → "olive oil")
- Remove common pantry items that people usually have (salt, pepper, water, etc.)
- Output ONLY in the specified JSON schema.
`;

// Function to fetch and extract recipe content from URL
async function fetchRecipeFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let recipeText = '';

    // First, try to find structured data (JSON-LD) - most reliable
    $('script[type="application/ld+json"]').each((_, script) => {
      try {
        const scriptContent = $(script).html();
        if (!scriptContent) return;
        
        const data = JSON.parse(scriptContent);
        const recipes = Array.isArray(data) ? data : [data];
        
        for (const item of recipes) {
          if (item['@type'] === 'Recipe' && item.recipeIngredient) {
            recipeText = Array.isArray(item.recipeIngredient) 
              ? item.recipeIngredient.join('\n')
              : item.recipeIngredient;
            if (recipeText.length > 50) return false; // Break out of each loop
          }
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    });

    // If no structured data, try common recipe selectors
    if (!recipeText || recipeText.length < 50) {
      const recipeSelectors = [
        // Schema.org microdata
        '[itemtype*="Recipe"] [itemprop="recipeIngredient"]',
        '[itemtype*="Recipe"] .ingredient',
        
        // Common recipe site selectors
        '.recipe-ingredients',
        '.recipe-ingredients-list',
        '.ingredients',
        '.ingredient-list',
        '.recipe-ingredient',
        '.wprm-recipe-ingredients',
        '.tasty-recipes-ingredients',
        '.recipe-card-ingredients',
        '.recipe-ingredients-container',
        '.ingredients-container',
        
        // Generic selectors
        '.recipe [class*="ingredient"]',
        '.recipe [class*="ingredients"]',
        '[data-testid*="ingredient"]',
        '[data-testid*="recipe"] [class*="ingredient"]',
        
        // List-based selectors
        '.recipe ul li',
        '.recipe ol li',
        '.ingredients ul li',
        '.ingredients ol li'
      ];

      for (const selector of recipeSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          const text = elements.map((_, el) => $(el).text().trim()).get().join('\n');
          if (text.length > 100) {
            recipeText = text;
            break;
          }
        }
      }
    }

    // Fallback: look for any text that looks like ingredients
    if (!recipeText || recipeText.length < 50) {
      const ingredientKeywords = ['cup', 'tbsp', 'tsp', 'tablespoon', 'teaspoon', 'pound', 'lb', 'ounce', 'oz', 'gram', 'g', 'ml', 'liter'];
      
      const potentialIngredients = $('li, p, div, span').filter((_, el) => {
        const text = $(el).text().toLowerCase().trim();
        return text.length > 10 && text.length < 200 && 
               ingredientKeywords.some(keyword => text.includes(keyword)) &&
               !text.includes('preheat') && 
               !text.includes('bake') && 
               !text.includes('cook') &&
               !text.includes('method') &&
               !text.includes('instruction');
      });
      
      if (potentialIngredients.length > 0) {
        recipeText = potentialIngredients.map((_, el) => $(el).text().trim()).get().join('\n');
      }
    }

    // Final fallback: extract from the entire page content if it looks like a recipe
    if (!recipeText || recipeText.length < 50) {
      const pageText = $('body').text();
      const recipeKeywords = ['ingredients', 'recipe', 'cooking', 'baking', 'preparation'];
      const hasRecipeKeywords = recipeKeywords.some(keyword => pageText.toLowerCase().includes(keyword));
      
      if (hasRecipeKeywords) {
        // Try to extract lines that look like ingredients
        const lines = pageText.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 10 && trimmed.length < 200 &&
                 /[\d\/\s]+(cup|tbsp|tsp|tablespoon|teaspoon|pound|lb|ounce|oz|gram|g|ml|liter)/i.test(trimmed);
        });
        
        if (lines.length > 0) {
          recipeText = lines.join('\n');
        }
      }
    }

    if (!recipeText || recipeText.length < 30) {
      throw new Error(`Could not extract recipe content from URL. Page may not contain a recipe or uses an unsupported format.`);
    }

    return recipeText;
  } catch (error) {
    throw new Error(`Failed to fetch recipe from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

app.post('/api/grocery', async (req, res) => {
  try {
    const { transcript } = req.body as { transcript: string };

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });
    }

    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      apiKey: process.env.OPENAI_API_KEY,
    });
    const structuredModel = llm.withStructuredOutput(GroceryPlanSchema, { name: 'grocery_plan' });

    const userPrompt = `
Current Grocery List:
${currentGroceryList.length > 0 ? currentGroceryList.map((item, i) => `${i + 1}. ${item}`).join('\n') : '(empty list)'}

New Instructions:
"""
${transcript}
"""

Task: Apply the new instructions to the CURRENT grocery list above. Return the FINAL updated list after applying adds/removes/"last one out".
Return JSON only.
`;

    const result = await structuredModel.invoke([
      new SystemMessage(GROCERY_SYSTEM),
      new HumanMessage(userPrompt),
    ]);

    // Update the persistent storage
    currentGroceryList = result.final_list;
    await storage.saveList(currentGroceryList);
    console.log(`Saved ${currentGroceryList.length} items to storage`);

    return res.json({ items: result.final_list, reasoning: result.reasoning });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to process grocery instructions.' });
  }
});

// Parse recipe and add ingredients to grocery list
app.post('/api/recipe', async (req, res) => {
  try {
    const { recipe } = req.body as { recipe: string };

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });
    }

    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      apiKey: process.env.OPENAI_API_KEY,
    });
    const structuredModel = llm.withStructuredOutput(RecipeIngredientSchema, { name: 'recipe_ingredients' });

    const userPrompt = `
Recipe:
"""
${recipe}
"""

Task: Extract all ingredients from this recipe and normalize them for a grocery list. Remove measurements, quantities, and preparation notes. Return only the ingredient names.
`;

    const result = await structuredModel.invoke([
      new SystemMessage(RECIPE_SYSTEM),
      new HumanMessage(userPrompt),
    ]);

    // Add new ingredients to the current list (avoiding duplicates)
    const newIngredients = result.ingredients.filter(ingredient => 
      !currentGroceryList.some(existing => 
        existing.toLowerCase().includes(ingredient.toLowerCase()) ||
        ingredient.toLowerCase().includes(existing.toLowerCase())
      )
    );
    
    currentGroceryList = [...currentGroceryList, ...newIngredients];
    await storage.saveList(currentGroceryList);

    return res.json({ 
      ingredients: result.ingredients, 
      added: newIngredients,
      reasoning: result.reasoning,
      currentList: currentGroceryList
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to parse recipe.' });
  }
});

// Parse recipe from URL and add ingredients to grocery list
app.post('/api/recipe-url', async (req, res) => {
  try {
    const { url } = req.body as { url: string };

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch recipe content from URL
    const recipeText = await fetchRecipeFromUrl(url);

    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      apiKey: process.env.OPENAI_API_KEY,
    });
    const structuredModel = llm.withStructuredOutput(RecipeIngredientSchema, { name: 'recipe_ingredients' });

    const userPrompt = `
Recipe content from URL (${url}):
"""
${recipeText}
"""

Task: Extract all ingredients from this recipe content and normalize them for a grocery list. Remove measurements, quantities, and preparation notes. Return only the ingredient names.
`;

    const result = await structuredModel.invoke([
      new SystemMessage(RECIPE_SYSTEM),
      new HumanMessage(userPrompt),
    ]);

    // Add new ingredients to the current list (avoiding duplicates)
    const newIngredients = result.ingredients.filter(ingredient => 
      !currentGroceryList.some(existing => 
        existing.toLowerCase().includes(ingredient.toLowerCase()) ||
        ingredient.toLowerCase().includes(existing.toLowerCase())
      )
    );
    
    currentGroceryList = [...currentGroceryList, ...newIngredients];
    await storage.saveList(currentGroceryList);

    return res.json({ 
      ingredients: result.ingredients, 
      added: newIngredients,
      reasoning: result.reasoning,
      currentList: currentGroceryList,
      sourceUrl: url,
      extractedContent: recipeText.substring(0, 500) + (recipeText.length > 500 ? '...' : '') // Preview of extracted content
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: `Failed to parse recipe from URL: ${err.message}` });
  }
});

// Get current grocery list
app.get('/api/grocery', (req, res) => {
  return res.json({ items: currentGroceryList });
});

// Clear grocery list
app.delete('/api/grocery', async (req, res) => {
  try {
    currentGroceryList = [];
    await storage.clearList();
    return res.json({ items: [], message: 'Grocery list cleared' });
  } catch (error) {
    console.error('Failed to clear grocery list:', error);
    return res.status(500).json({ error: 'Failed to clear grocery list' });
  }
});

// Export for testing
export { app, currentGroceryList };

// Helper functions for testing
export const getCurrentGroceryList = () => currentGroceryList;
export const clearGroceryList = () => { currentGroceryList = []; };

// Initialize storage and start server
async function startServer() {
  await initializeStorage();
  
  // Only start the server if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
    app.listen(PORT, () => console.log(`Grocery API running on http://localhost:${PORT}`));
  }
}

startServer().catch(console.error);


