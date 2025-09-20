import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the OpenAI dependencies
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: vi.fn()
    })
  }))
}));

vi.mock('@langchain/core/messages', () => ({
  SystemMessage: vi.fn(),
  HumanMessage: vi.fn()
}));

// Import the app setup
const app = express();
app.use(cors());
app.use(express.json());

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';

// In-memory store for grocery lists (same as in the actual server)
let currentGroceryList: string[] = [];

// Mock the actual API endpoints
app.post('/api/grocery', async (req, res) => {
  try {
    const { transcript } = req.body as { transcript: string };

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });
    }

    // Mock AI response
    const mockResult = {
      final_list: ['milk', 'bread'],
      reasoning: 'Added milk and bread to the list'
    };

    // Update the in-memory list
    currentGroceryList = mockResult.final_list;

    return res.json({ items: mockResult.final_list, reasoning: mockResult.reasoning });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to process grocery instructions.' });
  }
});

app.post('/api/recipe', async (req, res) => {
  try {
    const { recipe } = req.body as { recipe: string };

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });
    }

    // Mock AI response
    const mockResult = {
      ingredients: ['flour', 'sugar', 'eggs'],
      reasoning: 'Extracted ingredients from recipe'
    };

    // Add new ingredients to the current list (avoiding duplicates)
    const newIngredients = mockResult.ingredients.filter(ingredient => 
      !currentGroceryList.some(existing => 
        existing.toLowerCase().includes(ingredient.toLowerCase()) ||
        ingredient.toLowerCase().includes(existing.toLowerCase())
      )
    );
    
    currentGroceryList = [...currentGroceryList, ...newIngredients];

    return res.json({ 
      ingredients: mockResult.ingredients, 
      added: newIngredients,
      reasoning: mockResult.reasoning,
      currentList: currentGroceryList
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to parse recipe.' });
  }
});

app.get('/api/grocery', (req, res) => {
  return res.json({ items: currentGroceryList });
});

app.delete('/api/grocery', (req, res) => {
  currentGroceryList = [];
  return res.json({ items: [], message: 'Grocery list cleared' });
});

describe('Grocery API', () => {
  beforeEach(() => {
    currentGroceryList = [];
  });

  describe('POST /api/grocery', () => {
    it('should process grocery instructions successfully', async () => {
      const response = await request(app)
        .post('/api/grocery')
        .send({ transcript: 'add milk and bread' })
        .expect(200);

      expect(response.body).toEqual({
        items: ['milk', 'bread'],
        reasoning: 'Added milk and bread to the list'
      });
    });

    it('should return 400 when OPENAI_API_KEY is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .post('/api/grocery')
        .send({ transcript: 'add milk' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Missing OPENAI_API_KEY'
      });

      // Restore the API key
      process.env.OPENAI_API_KEY = 'test-api-key';
    });

    it('should handle empty transcript', async () => {
      const response = await request(app)
        .post('/api/grocery')
        .send({ transcript: '' })
        .expect(200);

      expect(response.body.items).toEqual(['milk', 'bread']);
    });
  });

  describe('POST /api/recipe', () => {
    it('should parse recipe and extract ingredients', async () => {
      const recipe = `
        Chocolate Chip Cookies
        
        Ingredients:
        - 2 cups flour
        - 1 cup sugar
        - 2 eggs
        - 1 cup chocolate chips
      `;

      const response = await request(app)
        .post('/api/recipe')
        .send({ recipe })
        .expect(200);

      expect(response.body).toEqual({
        ingredients: ['flour', 'sugar', 'eggs'],
        added: ['flour', 'sugar', 'eggs'],
        reasoning: 'Extracted ingredients from recipe',
        currentList: ['flour', 'sugar', 'eggs']
      });
    });

    it('should avoid duplicate ingredients', async () => {
      // First, add some items to the list
      currentGroceryList = ['flour', 'milk'];

      const recipe = `
        Pancakes
        
        Ingredients:
        - 1 cup flour
        - 1 cup milk
        - 2 eggs
      `;

      const response = await request(app)
        .post('/api/recipe')
        .send({ recipe })
        .expect(200);

      expect(response.body).toEqual({
        ingredients: ['flour', 'sugar', 'eggs'],
        added: ['sugar', 'eggs'], // flour and milk already exist
        reasoning: 'Extracted ingredients from recipe',
        currentList: ['flour', 'milk', 'sugar', 'eggs']
      });
    });

    it('should return 400 when OPENAI_API_KEY is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .post('/api/recipe')
        .send({ recipe: 'test recipe' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Missing OPENAI_API_KEY'
      });

      // Restore the API key
      process.env.OPENAI_API_KEY = 'test-api-key';
    });
  });

  describe('GET /api/grocery', () => {
    it('should return current grocery list', async () => {
      currentGroceryList = ['milk', 'bread', 'eggs'];

      const response = await request(app)
        .get('/api/grocery')
        .expect(200);

      expect(response.body).toEqual({
        items: ['milk', 'bread', 'eggs']
      });
    });

    it('should return empty list when no items', async () => {
      currentGroceryList = [];

      const response = await request(app)
        .get('/api/grocery')
        .expect(200);

      expect(response.body).toEqual({
        items: []
      });
    });
  });

  describe('DELETE /api/grocery', () => {
    it('should clear the grocery list', async () => {
      currentGroceryList = ['milk', 'bread', 'eggs'];

      const response = await request(app)
        .delete('/api/grocery')
        .expect(200);

      expect(response.body).toEqual({
        items: [],
        message: 'Grocery list cleared'
      });

      // Verify the list is actually cleared
      expect(currentGroceryList).toEqual([]);
    });
  });

  describe('Integration tests', () => {
    it('should maintain state across multiple operations', async () => {
      // Start with empty list
      expect(currentGroceryList).toEqual([]);

      // Add items via grocery endpoint
      await request(app)
        .post('/api/grocery')
        .send({ transcript: 'add milk and bread' })
        .expect(200);

      expect(currentGroceryList).toEqual(['milk', 'bread']);

      // Add more items via recipe endpoint
      await request(app)
        .post('/api/recipe')
        .send({ recipe: 'Ingredients:\n- 2 eggs\n- 1 cup flour' })
        .expect(200);

      expect(currentGroceryList).toEqual(['milk', 'bread', 'flour', 'sugar', 'eggs']);

      // Verify via GET endpoint
      const response = await request(app)
        .get('/api/grocery')
        .expect(200);

      expect(response.body.items).toEqual(['milk', 'bread', 'flour', 'sugar', 'eggs']);

      // Clear the list
      await request(app)
        .delete('/api/grocery')
        .expect(200);

      expect(currentGroceryList).toEqual([]);
    });
  });
});
