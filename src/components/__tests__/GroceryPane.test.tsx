import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import GroceryPane from '../GroceryPane';

// Mock fetch
global.fetch = vi.fn();

const mockFetch = fetch as any;

describe('GroceryPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with empty grocery list', () => {
    render(<GroceryPane transcript="test transcript" />);
    
    expect(screen.getByText('Grocery List')).toBeInTheDocument();
    expect(screen.getByText(/No items yet/)).toBeInTheDocument();
  });

  it('should show update button when transcript is provided', () => {
    render(<GroceryPane transcript="add milk" />);
    
    expect(screen.getByText('Update List')).toBeInTheDocument();
  });

  it('should disable update button when no transcript', () => {
    render(<GroceryPane transcript="" />);
    
    const updateButton = screen.getByText('Update List');
    expect(updateButton).toBeDisabled();
  });

  it('should process transcript and update grocery list', async () => {
    const mockResponse = {
      items: ['milk', 'bread'],
      reasoning: 'Added milk and bread to the list'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    render(<GroceryPane transcript="add milk and bread" />);
    
    const updateButton = screen.getByText('Update List');
    fireEvent.click(updateButton);

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/grocery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'add milk and bread' }),
    });

    await waitFor(() => {
      expect(screen.getByText('milk')).toBeInTheDocument();
      expect(screen.getByText('bread')).toBeInTheDocument();
    });
  });

  it('should show error when API call fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<GroceryPane transcript="add milk" />);
    
    const updateButton = screen.getByText('Update List');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to process instructions.')).toBeInTheDocument();
    });
  });

  it('should clear grocery list when clear button is clicked', async () => {
    const mockResponse = {
      items: [],
      message: 'Grocery list cleared'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    render(<GroceryPane transcript="add milk" />);
    
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/grocery', {
      method: 'DELETE',
    });

    await waitFor(() => {
      expect(screen.getByText(/No items yet/)).toBeInTheDocument();
    });
  });

  it('should show recipe input when recipe button is clicked', () => {
    render(<GroceryPane transcript="test" />);
    
    const recipeButton = screen.getByText('Recipe');
    fireEvent.click(recipeButton);

    expect(screen.getByPlaceholderText('Paste your recipe here...')).toBeInTheDocument();
    expect(screen.getByText('Add Ingredients')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should process recipe and add ingredients', async () => {
    const mockResponse = {
      ingredients: ['flour', 'sugar', 'eggs'],
      added: ['flour', 'sugar', 'eggs'],
      reasoning: 'Extracted ingredients from recipe',
      currentList: ['flour', 'sugar', 'eggs']
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    render(<GroceryPane transcript="test" />);
    
    // Open recipe input
    const recipeButton = screen.getByText('Recipe');
    fireEvent.click(recipeButton);

    // Enter recipe text
    const recipeTextarea = screen.getByPlaceholderText('Paste your recipe here...');
    fireEvent.change(recipeTextarea, { target: { value: 'Chocolate Chip Cookies\nIngredients:\n- 2 cups flour\n- 1 cup sugar\n- 2 eggs' } });

    // Submit recipe
    const addIngredientsButton = screen.getByText('Add Ingredients');
    fireEvent.click(addIngredientsButton);

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recipe: 'Chocolate Chip Cookies\nIngredients:\n- 2 cups flour\n- 1 cup sugar\n- 2 eggs' 
      }),
    });

    await waitFor(() => {
      expect(screen.getByText('flour')).toBeInTheDocument();
      expect(screen.getByText('sugar')).toBeInTheDocument();
      expect(screen.getByText('eggs')).toBeInTheDocument();
    });
  });

  it('should cancel recipe input', () => {
    render(<GroceryPane transcript="test" />);
    
    // Open recipe input
    const recipeButton = screen.getByText('Recipe');
    fireEvent.click(recipeButton);

    // Enter some text
    const recipeTextarea = screen.getByPlaceholderText('Paste your recipe here...');
    fireEvent.change(recipeTextarea, { target: { value: 'test recipe' } });

    // Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByPlaceholderText('Paste your recipe here...')).not.toBeInTheDocument();
  });

  it('should disable add ingredients button when no recipe text', () => {
    render(<GroceryPane transcript="test" />);
    
    // Open recipe input
    const recipeButton = screen.getByText('Recipe');
    fireEvent.click(recipeButton);

    const addIngredientsButton = screen.getByText('Add Ingredients');
    expect(addIngredientsButton).toBeDisabled();
  });

  it('should show loading state during processing', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(promise as any);

    render(<GroceryPane transcript="add milk" />);
    
    const updateButton = screen.getByText('Update List');
    fireEvent.click(updateButton);

    expect(screen.getByText('Processing…')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({ items: ['milk'], reasoning: 'Added milk' }),
    });

    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeInTheDocument();
    });
  });
});
