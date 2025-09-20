import request from 'supertest';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the OpenAI dependencies
const mockInvoke = vi.fn();
const mockWithStructuredOutput = vi.fn().mockReturnValue({
  invoke: mockInvoke
});
const mockChatOpenAI = vi.fn().mockImplementation(() => ({
  withStructuredOutput: mockWithStructuredOutput
}));

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: mockChatOpenAI
}));

vi.mock('@langchain/core/messages', () => ({
  SystemMessage: vi.fn(),
  HumanMessage: vi.fn()
}));

// Mock cheerio
vi.mock('cheerio', () => ({
  load: vi.fn().mockReturnValue({
    text: vi.fn().mockReturnValue('Mock recipe content'),
    length: 1,
    each: vi.fn(),
    filter: vi.fn().mockReturnValue({
      map: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(['Mock ingredient 1', 'Mock ingredient 2'])
      })
    })
  })
}));

// Mock fetch for URL requests
global.fetch = vi.fn();

// Import the app setup
let app: any;
let currentGroceryList: string[];

beforeEach(async () => {
  vi.clearAllMocks();
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.OPENAI_API_KEY = 'test-key';
  
  // Dynamically import the server to get a fresh instance and reset state
  const serverModule = await import('../index');
  app = serverModule.app;
  currentGroceryList = serverModule.getCurrentGroceryList();
  serverModule.clearGroceryList();
});

describe('Grocery API', () => {
  describe('POST /api/grocery', () => {
    it('should process grocery instructions successfully', async () => {
      mockInvoke.mockResolvedValueOnce({
        final_list: ['milk', 'bread'],
        reasoning: 'Added milk and bread to the list'
      });

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
  });

  describe('POST /api/recipe', () => {
    it('should parse recipe and extract ingredients', async () => {
      mockInvoke.mockResolvedValueOnce({
        ingredients: ['flour', 'sugar', 'eggs'],
        reasoning: 'Extracted ingredients from recipe'
      });

      const response = await request(app)
        .post('/api/recipe')
        .send({ recipe: '1 cup flour, 1/2 cup sugar, 2 eggs' })
        .expect(200);

      expect(response.body).toEqual({
        ingredients: ['flour', 'sugar', 'eggs'],
        added: ['flour', 'sugar', 'eggs'],
        reasoning: 'Extracted ingredients from recipe',
        currentList: ['flour', 'sugar', 'eggs']
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

  describe('POST /api/recipe-url', () => {
    it('should return 400 when URL is missing', async () => {
      const response = await request(app)
        .post('/api/recipe-url')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'URL is required'
      });
    });

    it('should return 400 when URL format is invalid', async () => {
      const response = await request(app)
        .post('/api/recipe-url')
        .send({ url: 'invalid-url' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid URL format'
      });
    });

    it('should return 400 when OPENAI_API_KEY is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .post('/api/recipe-url')
        .send({ url: 'https://example.com/recipe' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Missing OPENAI_API_KEY'
      });

      // Restore the API key
      process.env.OPENAI_API_KEY = 'test-api-key';
    });

    it('should handle URL fetch errors gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      const response = await request(app)
        .post('/api/recipe-url')
        .send({ url: 'https://nonexistent-domain-12345.com/recipe' })
        .expect(500);

      expect(response.body.error).toContain('Failed to parse recipe from URL');
    });
  });

  describe('GET /api/grocery', () => {
    it('should return current grocery list', async () => {
      // Manually set the grocery list for this test
      const serverModule = await import('../index');
      serverModule.clearGroceryList();
      // We need to access the internal state - let's use a different approach
      
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
      const response = await request(app)
        .delete('/api/grocery')
        .expect(200);

      expect(response.body).toEqual({
        items: [],
        message: 'Grocery list cleared'
      });
    });
  });
});