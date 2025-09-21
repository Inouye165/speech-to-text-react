import express from 'express';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { getMultiListStorage } from './multiListStorage';
import { getListTypeConfig, getAllListTypes } from './listTypes';
import { getStorage } from './storage';
import { 
  ListType, 
  ListItem, 
  ProcessTranscriptRequest, 
  ProcessTranscriptResponse,
  CreateListRequest,
  UpdateListRequest 
} from './types';

// Zod schemas for validation
const ProcessTranscriptSchema = z.object({
  final_list: z.array(z.object({
    text: z.string().describe('The item text'),
    completed: z.boolean().nullable().optional().describe('Whether the item is completed')
  })).describe('The final list items after applying all instructions.'),
  reasoning: z.string().describe('Brief reasoning on how instructions were interpreted.'),
  changes: z.object({
    added: z.array(z.string()).describe('Items that were added'),
    removed: z.array(z.string()).describe('Items that were removed'),
    modified: z.array(z.string()).describe('Items that were modified')
  }).describe('Summary of changes made')
});

const CreateListSchema = z.object({
  type: z.nativeEnum(ListType),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(10).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  settings: z.object({
    allowDuplicates: z.boolean().nullable().optional(),
    maxItems: z.number().positive().nullable().optional(),
    sortOrder: z.enum(['manual', 'alphabetical', 'created', 'updated']).nullable().optional(),
    autoComplete: z.boolean().nullable().optional()
  }).nullable().optional()
});

const UpdateListSchema = z.object({
  name: z.string().min(1).max(100).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(10).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  settings: z.object({
    allowDuplicates: z.boolean().nullable().optional(),
    maxItems: z.number().positive().nullable().optional(),
    sortOrder: z.enum(['manual', 'alphabetical', 'created', 'updated']).nullable().optional(),
    autoComplete: z.boolean().nullable().optional()
  }).nullable().optional()
});

export function createMultiListRoutes(): express.Router {
  const router = express.Router();
  const storage = getMultiListStorage();
  const legacyStorage = getStorage();

  // Get all list types (templates)
  router.get('/types', (req, res) => {
    try {
      const types = getAllListTypes();
      res.json({ types });
    } catch (error) {
      console.error('Failed to get list types:', error);
      res.status(500).json({ error: 'Failed to get list types' });
    }
  });

  // Get all lists
  router.get('/', async (req, res) => {
    try {
      const lists = await storage.getAllLists();
      res.json({ lists });
    } catch (error) {
      console.error('Failed to get lists:', error);
      res.status(500).json({ error: 'Failed to get lists' });
    }
  });

  // Migrate legacy grocery list to multi-list format
  router.post('/migrate-grocery', async (req, res) => {
    try {
      // Check if grocery list already exists in multi-list format
      const existingLists = await storage.getAllLists();
      const existingGroceryList = existingLists.find(list => list.type === ListType.GROCERY);
      
      if (existingGroceryList) {
        return res.json({ 
          message: 'Grocery list already exists in multi-list format',
          list: existingGroceryList 
        });
      }

      // Get legacy grocery list
      const legacyItems = await legacyStorage.getList();
      
      if (legacyItems.length === 0) {
        // Create empty grocery list if no legacy data
        const groceryList = await storage.createList({
          type: ListType.GROCERY,
          name: 'My Grocery List',
          description: 'Items to buy at the store'
        });
        return res.json({ 
          message: 'Created empty grocery list',
          list: groceryList 
        });
      }

      // Convert legacy items to ListItem format
      const items: ListItem[] = legacyItems.map((item, index) => ({
        id: `migrated-${Date.now()}-${index}`,
        text: item,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { migrated: true }
      }));

      // Create grocery list with migrated items
      const groceryList = await storage.createList({
        type: ListType.GROCERY,
        name: 'My Grocery List',
        description: 'Items to buy at the store'
      });

      // Update the list with migrated items
      const updatedList = await storage.updateListItems(groceryList.id, items);

      res.json({ 
        message: `Migrated ${items.length} items from legacy grocery list`,
        list: updatedList,
        migratedItems: items.length
      });
    } catch (error) {
      console.error('Failed to migrate grocery list:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to migrate grocery list' });
    }
  });

  // Get a specific list
  router.get('/:listId', async (req, res) => {
    try {
      const { listId } = req.params;
      const list = await storage.getList(listId);
      
      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }
      
      res.json({ list });
    } catch (error) {
      console.error('Failed to get list:', error);
      res.status(500).json({ error: 'Failed to get list' });
    }
  });

  // Create a new list
  router.post('/', async (req, res) => {
    try {
      const validatedData = CreateListSchema.parse(req.body);
      const list = await storage.createList(validatedData);
      res.status(201).json({ list });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      
      console.error('Failed to create list:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create list' });
    }
  });

  // Update a list
  router.put('/:listId', async (req, res) => {
    try {
      const { listId } = req.params;
      const validatedData = UpdateListSchema.parse(req.body);
      const list = await storage.updateList(listId, validatedData);
      
      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }
      
      res.json({ list });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      
      console.error('Failed to update list:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update list' });
    }
  });

  // Delete a list
  router.delete('/:listId', async (req, res) => {
    try {
      const { listId } = req.params;
      const success = await storage.deleteList(listId);
      
      if (!success) {
        return res.status(404).json({ error: 'List not found' });
      }
      
      res.json({ message: 'List deleted successfully' });
    } catch (error) {
      console.error('Failed to delete list:', error);
      res.status(500).json({ error: 'Failed to delete list' });
    }
  });

  // Process transcript for a specific list
  router.post('/:listId/process', async (req, res) => {
    try {
      const { listId } = req.params;
      const { transcript } = req.body;

      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ error: 'Transcript is required' });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });
      }

      // Get the list
      const list = await storage.getList(listId);
      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      // Get the list type configuration
      const typeConfig = getListTypeConfig(list.type);

      // Initialize LLM
      const llm = new ChatOpenAI({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        apiKey: process.env.OPENAI_API_KEY,
      });
      const structuredModel = llm.withStructuredOutput(ProcessTranscriptSchema, { name: 'list_processing' });

      // Create user prompt with current list items
      const userPrompt = `
Current ${typeConfig.name}:
${list.items.length > 0 ? list.items.map((item, i) => `${i + 1}. ${item.text}${item.completed ? ' (completed)' : ''}`).join('\n') : '(empty list)'}

New Instructions:
"""
${transcript}
"""

Task: Apply the new instructions to the CURRENT ${typeConfig.name} above. Return the FINAL updated list after applying adds/removes/modifications.
Return JSON only.
`;

      const result = await structuredModel.invoke([
        new SystemMessage(typeConfig.systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      // Convert result to ListItem format
      const newItems: ListItem[] = result.final_list.map((item, index) => ({
        id: `generated-${Date.now()}-${index}`,
        text: item.text,
        completed: item.completed || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
      }));

      // Update the list with new items
      const updatedList = await storage.updateListItems(listId, newItems);
      
      if (!updatedList) {
        return res.status(500).json({ error: 'Failed to update list' });
      }

      // Prepare response
      const response: ProcessTranscriptResponse = {
        items: newItems,
        reasoning: result.reasoning,
        changes: {
          added: result.changes.added,
          removed: result.changes.removed,
          modified: result.changes.modified
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Failed to process transcript:', error);
      res.status(500).json({ error: 'Failed to process transcript' });
    }
  });

  // Add a single item to a list
  router.post('/:listId/items', async (req, res) => {
    try {
      const { listId } = req.params;
      const { text, completed, metadata } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Item text is required' });
      }

      const newItem = await storage.addListItem(listId, {
        text: text.trim(),
        completed: completed || false,
        metadata: metadata || {}
      });

      if (!newItem) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.status(201).json({ item: newItem });
    } catch (error) {
      console.error('Failed to add item:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add item' });
    }
  });

  // Update a specific item
  router.put('/:listId/items/:itemId', async (req, res) => {
    try {
      const { listId, itemId } = req.params;
      const updates = req.body;

      const updatedItem = await storage.updateListItem(listId, itemId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      if (!updatedItem) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json({ item: updatedItem });
    } catch (error) {
      console.error('Failed to update item:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  // Delete a specific item
  router.delete('/:listId/items/:itemId', async (req, res) => {
    try {
      const { listId, itemId } = req.params;
      const success = await storage.deleteListItem(listId, itemId);

      if (!success) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Failed to delete item:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  // Recipe functionality for grocery lists
  const RecipeIngredientSchema = z.object({
    ingredients: z.array(z.string()).describe('List of ingredients extracted from the recipe, normalized (e.g., "2 cups flour" becomes "flour").'),
    reasoning: z.string().describe('Brief explanation of how ingredients were extracted and normalized.'),
  });

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

  // Add ingredients from recipe text to a grocery list
  router.post('/:listId/recipe', async (req, res) => {
    try {
      const { listId } = req.params;
      const { recipe } = req.body;

      if (!recipe || typeof recipe !== 'string') {
        return res.status(400).json({ error: 'Recipe text is required' });
      }

      // Get the list
      const list = await storage.getList(listId);
      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      // Only allow recipe functionality for grocery lists
      if (list.type !== ListType.GROCERY) {
        return res.status(400).json({ error: 'Recipe functionality is only available for grocery lists' });
      }

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

      // Add new ingredients to the list (avoiding duplicates)
      const existingTexts = list.items.map(item => item.text.toLowerCase());
      const newIngredients = result.ingredients.filter(ingredient => 
        !existingTexts.some(existing => 
          existing.includes(ingredient.toLowerCase()) ||
          ingredient.toLowerCase().includes(existing)
        )
      );

      // Convert to ListItem format and add to list
      const newItems: ListItem[] = newIngredients.map((ingredient, index) => ({
        id: `recipe-${Date.now()}-${index}`,
        text: ingredient,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { source: 'recipe' }
      }));

      // Add new items to the existing list
      const updatedItems = [...list.items, ...newItems];
      const updatedList = await storage.updateListItems(listId, updatedItems);

      if (!updatedList) {
        return res.status(500).json({ error: 'Failed to update list' });
      }

      res.json({
        ingredients: result.ingredients,
        added: newIngredients,
        reasoning: result.reasoning,
        list: updatedList
      });
    } catch (error) {
      console.error('Failed to process recipe:', error);
      res.status(500).json({ error: 'Failed to process recipe' });
    }
  });

  return router;
}
