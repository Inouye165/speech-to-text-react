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
  });

  it('should handle complete speech-to-grocery workflow', async () => {
    // Mock successful API responses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: ['milk', 'bread'], reasoning: 'Added milk and bread' }),
    });

    render(<App />);

    // Check that both components are rendered
    expect(screen.getByText('Grocery List')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your transcribed text will appear here...')).toBeInTheDocument();

    // Simulate having transcript text (this would normally come from speech recognition)
    const textarea = screen.getByPlaceholderText('Your transcribed text will appear here...');
    fireEvent.change(textarea, { target: { value: 'add milk and bread to my grocery list' } });

    // Click update list button
    const updateButton = screen.getByText('Update List');
    fireEvent.click(updateButton);

    // Wait for the API call and UI update
    await waitFor(() => {
      expect(screen.getByText('milk')).toBeInTheDocument();
      expect(screen.getByText('bread')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/grocery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'add milk and bread to my grocery list' }),
    });
  });

  it('should handle recipe parsing workflow', async () => {
    // Mock recipe API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ingredients: ['flour', 'sugar', 'eggs'],
        added: ['flour', 'sugar', 'eggs'],
        reasoning: 'Extracted ingredients from recipe',
        currentList: ['flour', 'sugar', 'eggs']
      }),
    });

    render(<App />);

    // Click recipe button
    const recipeButton = screen.getByText('Recipe');
    fireEvent.click(recipeButton);

    // Enter recipe text
    const recipeTextarea = screen.getByPlaceholderText('Paste your recipe here...');
    fireEvent.change(recipeTextarea, {
      target: { value: 'Chocolate Chip Cookies\nIngredients:\n- 2 cups flour\n- 1 cup sugar\n- 2 eggs' }
    });

    // Click add ingredients
    const addIngredientsButton = screen.getByText('Add Ingredients');
    fireEvent.click(addIngredientsButton);

    // Wait for the API call and UI update
    await waitFor(() => {
      expect(screen.getByText('flour')).toBeInTheDocument();
      expect(screen.getByText('sugar')).toBeInTheDocument();
      expect(screen.getByText('eggs')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipe: 'Chocolate Chip Cookies\nIngredients:\n- 2 cups flour\n- 1 cup sugar\n- 2 eggs'
      }),
    });
  });

  it('should handle error states gracefully', async () => {
    // Mock API error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    // Simulate having transcript text
    const textarea = screen.getByPlaceholderText('Your transcribed text will appear here...');
    fireEvent.change(textarea, { target: { value: 'add milk' } });

    // Click update list button
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
      json: async () => ({ items: [], message: 'Grocery list cleared' }),
    });

    render(<App />);

    // Click clear button
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Wait for the API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/grocery', {
        method: 'DELETE',
      });
    });

    // Check that the list is empty
    expect(screen.getByText(/No items yet/)).toBeInTheDocument();
  });

  it('should maintain state across multiple operations', async () => {
    // Mock multiple API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: ['milk'], reasoning: 'Added milk' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ingredients: ['bread', 'eggs'],
          added: ['bread', 'eggs'],
          reasoning: 'Extracted ingredients',
          currentList: ['milk', 'bread', 'eggs']
        }),
      });

    render(<App />);

    // First operation: Add milk via speech
    const textarea = screen.getByPlaceholderText('Your transcribed text will appear here...');
    fireEvent.change(textarea, { target: { value: 'add milk' } });

    const updateButton = screen.getByText('Update List');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('milk')).toBeInTheDocument();
    });

    // Second operation: Add more items via recipe
    const recipeButton = screen.getByText('Recipe');
    fireEvent.click(recipeButton);

    const recipeTextarea = screen.getByPlaceholderText('Paste your recipe here...');
    fireEvent.change(recipeTextarea, {
      target: { value: 'Ingredients:\n- 1 loaf bread\n- 2 eggs' }
    });

    const addIngredientsButton = screen.getByText('Add Ingredients');
    fireEvent.click(addIngredientsButton);

    // Wait for all items to appear
    await waitFor(() => {
      expect(screen.getByText('milk')).toBeInTheDocument();
      expect(screen.getByText('bread')).toBeInTheDocument();
      expect(screen.getByText('eggs')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle URL recipe parsing workflow', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ingredients: ['chicken', 'broccoli', 'cheese'],
        added: ['chicken', 'broccoli', 'cheese'],
        reasoning: 'Extracted ingredients from recipe URL',
        currentList: ['chicken', 'broccoli', 'cheese'],
        sourceUrl: 'https://example.com/recipe'
      }),
    });

    render(<App />);

    // Click "URL" button
    fireEvent.click(screen.getByText('URL'));

    // Type URL into input
    const urlInput = screen.getByPlaceholderText(/Paste recipe URL here/);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/recipe' } });

    // Click "Add from URL"
    fireEvent.click(screen.getByText('Add from URL'));

    await waitFor(() => {
      expect(screen.getByText('chicken')).toBeInTheDocument();
      expect(screen.getByText('broccoli')).toBeInTheDocument();
      expect(screen.getByText('cheese')).toBeInTheDocument();
      expect(screen.getByText(/Added 3 ingredients from recipe URL/)).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/recipe-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/recipe'
      }),
    });
  });
});
