import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import App from '../App';

// Mock fetch with realistic responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful initial load for grocery list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });
  });

  it('should handle complete speech-to-grocery workflow', async () => {
    // Mock successful API responses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        items: ['milk', 'bread'],
        reasoning: 'Added milk and bread to your grocery list.'
      }),
    });

    render(<App />);

    // Type in the transcription textarea
    const textarea = screen.getByPlaceholderText('Your transcribed text will appear here...');
    fireEvent.change(textarea, {
      target: { value: 'add milk and bread to my grocery list' }
    });

    // Wait for initial load and click update list button
    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeInTheDocument();
    });
    const updateButton = screen.getByText('Update List');
    fireEvent.click(updateButton);

    // Wait for the API call and check results
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'add milk and bread to my grocery list' }),
      });
      expect(screen.getByText('milk')).toBeInTheDocument();
      expect(screen.getByText('bread')).toBeInTheDocument();
      expect(screen.getByText('Added milk and bread to your grocery list.')).toBeInTheDocument();
    });
  });

  it('should handle recipe parsing workflow', async () => {
    // Mock recipe API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ingredients: ['flour', 'sugar', 'eggs', 'butter'],
        added: ['flour', 'sugar', 'eggs', 'butter'],
        reasoning: 'Extracted ingredients from recipe.',
        currentList: ['flour', 'sugar', 'eggs', 'butter']
      }),
    });

    render(<App />);

    // Wait for initial load and click recipe button
    await waitFor(() => {
      expect(screen.getByText('Recipe')).toBeInTheDocument();
    });
    const recipeButton = screen.getByText('Recipe');
    fireEvent.click(recipeButton);

    // Enter recipe text
    const recipeTextarea = screen.getByPlaceholderText('Paste your recipe here...');
    fireEvent.change(recipeTextarea, {
      target: { value: 'Chocolate Chip Cookies\nIngredients:\n- 2 cups flour\n- 1 cup sugar\n- 2 eggs\n- 1/2 cup butter' }
    });

    // Click add ingredients
    const addIngredientsButton = screen.getByText('Add Ingredients');
    fireEvent.click(addIngredientsButton);

    // Wait for the API call and check results
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: 'Chocolate Chip Cookies\nIngredients:\n- 2 cups flour\n- 1 cup sugar\n- 2 eggs\n- 1/2 cup butter'
        }),
      });
      expect(screen.getByText('flour')).toBeInTheDocument();
      expect(screen.getByText('sugar')).toBeInTheDocument();
      expect(screen.getByText('eggs')).toBeInTheDocument();
      expect(screen.getByText('butter')).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', async () => {
    // Mock API error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'API error' }),
    });

    render(<App />);

    // Type in the transcription textarea
    const textarea = screen.getByPlaceholderText('Your transcribed text will appear here...');
    fireEvent.change(textarea, { target: { value: 'add milk' } });

    // Wait for initial load and click update list button
    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeInTheDocument();
    });
    const updateButton = screen.getByText('Update List');
    fireEvent.click(updateButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to process instructions.')).toBeInTheDocument();
    });
  });

  it('should handle clear list functionality', async () => {
    // Mock clear API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [], message: 'Grocery list cleared' }),
    });

    render(<App />);

    // Wait for initial load and click clear button
    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Wait for the API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/grocery', {
        method: 'DELETE',
      });
    });
  });

  it('should maintain state across multiple operations', async () => {
    // Mock multiple API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: ['milk'],
          reasoning: 'Added milk.'
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: ['milk', 'bread'],
          reasoning: 'Added bread to existing list.'
        }),
      });

    render(<App />);

    // First operation: add milk
    const textarea = screen.getByPlaceholderText('Your transcribed text will appear here...');
    fireEvent.change(textarea, { target: { value: 'add milk' } });

    // Wait for initial load and click update
    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeInTheDocument();
    });
    const updateButton = screen.getByText('Update List');
    fireEvent.click(updateButton);

    // Wait for first operation to complete
    await waitFor(() => {
      expect(screen.getByText('milk')).toBeInTheDocument();
    });

    // Second operation: add bread
    fireEvent.change(textarea, { target: { value: 'add bread' } });
    fireEvent.click(updateButton);

    // Wait for second operation to complete
    await waitFor(() => {
      expect(screen.getByText('bread')).toBeInTheDocument();
      expect(screen.getByText('milk')).toBeInTheDocument(); // Should still be there
    });

    // Verify both API calls were made
    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial load + 2 operations
  });

  it('should handle URL recipe parsing workflow', async () => {
    // Mock URL recipe API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ingredients: ['chicken', 'rice', 'vegetables'],
        added: ['chicken', 'rice', 'vegetables'],
        reasoning: 'Extracted ingredients from recipe URL',
        currentList: ['chicken', 'rice', 'vegetables'],
        sourceUrl: 'https://example.com/recipe'
      }),
    });

    render(<App />);

    // Wait for initial load and click URL button
    await waitFor(() => {
      expect(screen.getByText('URL')).toBeInTheDocument();
    });
    const urlButton = screen.getByText('URL');
    fireEvent.click(urlButton);

    // Type URL into input
    const urlInput = screen.getByPlaceholderText(/Paste recipe URL here/);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/recipe' } });

    // Click add from URL
    const addFromUrlButton = screen.getByText('Add from URL');
    fireEvent.click(addFromUrlButton);

    // Wait for the API call and check results
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/recipe-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/recipe' }),
      });
      expect(screen.getByText('chicken')).toBeInTheDocument();
      expect(screen.getByText('rice')).toBeInTheDocument();
      expect(screen.getByText('vegetables')).toBeInTheDocument();
    });
  });
});