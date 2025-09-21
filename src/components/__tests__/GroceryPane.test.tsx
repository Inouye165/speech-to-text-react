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
    
    // Mock successful initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });
  });

  it('should render with empty grocery list', async () => {
    render(<GroceryPane transcript="test transcript" />);
    
    expect(screen.getByText('Grocery List')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/No items yet/)).toBeInTheDocument();
    });
  });

  it('should show update button when transcript is provided', async () => {
    render(<GroceryPane transcript="add milk" />);

    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeInTheDocument();
      expect(screen.getByText('Update List')).not.toBeDisabled();
    });
  });

  it('should disable update button when no transcript', async () => {
    render(<GroceryPane transcript="" />);

    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeDisabled();
    });
  });

  it('should process transcript and update grocery list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: ['milk', 'bread'], reasoning: 'Added milk and bread.' }),
    });

    render(<GroceryPane transcript="add milk and bread" />);
    
    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update List'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'add milk and bread' }),
      });
      expect(screen.getByText('milk')).toBeInTheDocument();
      expect(screen.getByText('bread')).toBeInTheDocument();
      expect(screen.getByText('Added milk and bread.')).toBeInTheDocument();
    });
  });

  it('should show error when API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'API error' }),
    });

    render(<GroceryPane transcript="add milk" />);
    
    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update List'));

    await waitFor(() => {
      expect(screen.getByText('Failed to process instructions.')).toBeInTheDocument();
    });
  });

  it('should clear grocery list when clear button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: ['milk'] }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [], message: 'Grocery list cleared' }),
    });

    render(<GroceryPane transcript="add milk" />);
    
    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update List'));
    await waitFor(() => expect(screen.getByText('milk')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/grocery', {
        method: 'DELETE',
      });
      expect(screen.getByText(/No items yet/)).toBeInTheDocument();
    });
  });

  it('should show recipe input when recipe button is clicked', async () => {
    render(<GroceryPane transcript="test" />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Recipe'));
    expect(screen.getByPlaceholderText('Paste your recipe here...')).toBeInTheDocument();
  });

  it('should process recipe and add ingredients', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ingredients: ['flour', 'sugar'],
        added: ['flour', 'sugar'],
        reasoning: 'Extracted flour and sugar.',
        currentList: ['flour', 'sugar']
      }),
    });

    render(<GroceryPane transcript="test" />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Recipe'));
    fireEvent.change(screen.getByPlaceholderText('Paste your recipe here...'), {
      target: { value: '1 cup flour, 1/2 cup sugar' },
    });
    fireEvent.click(screen.getByText('Add Ingredients'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: '1 cup flour, 1/2 cup sugar' }),
      });
      expect(screen.getByText('flour')).toBeInTheDocument();
      expect(screen.getByText('sugar')).toBeInTheDocument();
      expect(screen.getByText(/Added 2 ingredients from recipe/)).toBeInTheDocument();
    });
  });

  it('should cancel recipe input', async () => {
    render(<GroceryPane transcript="test" />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Recipe'));
    expect(screen.getByPlaceholderText('Paste your recipe here...')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Paste your recipe here...')).not.toBeInTheDocument();
  });

  it('should disable add ingredients button when no recipe text', async () => {
    render(<GroceryPane transcript="test" />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Recipe'));
    expect(screen.getByText('Add Ingredients')).toBeDisabled();
  });

  it('should show loading state during processing', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(promise as any);

    render(<GroceryPane transcript="add milk" />);
    
    await waitFor(() => {
      expect(screen.getByText('Update List')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update List'));

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

  it('should show URL input when URL button is clicked', async () => {
    render(<GroceryPane transcript="test" />);
    
    await waitFor(() => {
      expect(screen.getByText('URL')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('URL'));

    expect(screen.getByPlaceholderText(/Paste recipe URL here/)).toBeInTheDocument();
    expect(screen.getByText('Add from URL')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should process recipe URL and add ingredients', async () => {
    const mockResponse = {
      ingredients: ['chicken', 'broccoli', 'cheese'],
      added: ['chicken', 'broccoli', 'cheese'],
      reasoning: 'Extracted ingredients from recipe URL',
      currentList: ['chicken', 'broccoli', 'cheese'],
      sourceUrl: 'https://example.com/recipe'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<GroceryPane transcript="test" />);
    
    await waitFor(() => {
      expect(screen.getByText('URL')).toBeInTheDocument();
    });

    // Click URL button
    const urlButton = screen.getByText('URL');
    fireEvent.click(urlButton);

    // Enter URL
    const urlInput = screen.getByPlaceholderText(/Paste recipe URL here/);
    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/recipe' }
    });

    // Click add from URL
    const addFromUrlButton = screen.getByText('Add from URL');
    fireEvent.click(addFromUrlButton);

    // Wait for the API call and UI update
    await waitFor(() => {
      expect(screen.getByText('chicken')).toBeInTheDocument();
      expect(screen.getByText('broccoli')).toBeInTheDocument();
      expect(screen.getByText('cheese')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8787/api/recipe-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/recipe'
      }),
    });
  });

  it('should cancel URL input', async () => {
    render(<GroceryPane transcript="test" />);
    
    await waitFor(() => {
      expect(screen.getByText('URL')).toBeInTheDocument();
    });

    // Click URL button
    const urlButton = screen.getByText('URL');
    fireEvent.click(urlButton);

    // Enter some URL
    const urlInput = screen.getByPlaceholderText(/Paste recipe URL here/);
    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/recipe' }
    });

    // Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByPlaceholderText(/Paste recipe URL here/)).not.toBeInTheDocument();
  });

  it('should disable add from URL button when no URL', async () => {
    render(<GroceryPane transcript="test" />);
    
    await waitFor(() => {
      expect(screen.getByText('URL')).toBeInTheDocument();
    });

    // Click URL button
    const urlButton = screen.getByText('URL');
    fireEvent.click(urlButton);

    const addFromUrlButton = screen.getByText('Add from URL');
    expect(addFromUrlButton).toBeDisabled();
  });
});