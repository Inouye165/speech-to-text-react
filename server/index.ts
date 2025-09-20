import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store for grocery lists (in production, use a database)
let currentGroceryList: string[] = [];

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

    // Update the in-memory list
    currentGroceryList = result.final_list;

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

// Get current grocery list
app.get('/api/grocery', (req, res) => {
  return res.json({ items: currentGroceryList });
});

// Clear grocery list
app.delete('/api/grocery', (req, res) => {
  currentGroceryList = [];
  return res.json({ items: [], message: 'Grocery list cleared' });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
app.listen(PORT, () => console.log(`Grocery API running on http://localhost:${PORT}`));


