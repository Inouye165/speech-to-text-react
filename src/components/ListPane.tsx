import { useState, useEffect } from 'react';
import type { List, ListItem, ProcessTranscriptResponse } from './types';

interface ListPaneProps {
  list: List;
  transcript: string;
  onListUpdate: (updatedList: List) => void;
}

export default function ListPane({ list, transcript, onListUpdate }: ListPaneProps) {
  const [items, setItems] = useState<ListItem[]>(list.items);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [reasoning, setReasoning] = useState('');
  const [manualItemText, setManualItemText] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [showRecipeInput, setShowRecipeInput] = useState(false);

  // Update items when list changes
  useEffect(() => {
    setItems(list.items);
  }, [list.items]);

  const processTranscript = async () => {
    try {
      setStatus('loading');
      const response = await fetch(`http://localhost:8787/api/lists/${list.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      
      const data: ProcessTranscriptResponse = await response.json();
      if (!response.ok) throw new Error(data?.reasoning || 'API error');
      
      setItems(data.items);
      setReasoning(data.reasoning);
      
      // Update the parent component with the new list data
      const updatedList = { ...list, items: data.items };
      onListUpdate(updatedList);
      
      setStatus('idle');
    } catch (error) {
      console.error('Failed to process transcript:', error);
      setReasoning(`Error: ${error instanceof Error ? error.message : 'Failed to process transcript'}`);
      setStatus('error');
    }
  };

  const addManualItem = async () => {
    if (!manualItemText.trim()) return;
    
    try {
      setStatus('loading');
      const response = await fetch(`http://localhost:8787/api/lists/${list.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: manualItemText.trim() }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to add item');
      
      const newItem = data.item;
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      setManualItemText('');
      
      // Update the parent component
      const updatedList = { ...list, items: updatedItems };
      onListUpdate(updatedList);
      
      setStatus('idle');
    } catch (error) {
      console.error('Failed to add item:', error);
      setReasoning(`Error: ${error instanceof Error ? error.message : 'Failed to add item'}`);
      setStatus('error');
    }
  };

  const toggleItemComplete = async (itemId: string, completed: boolean) => {
    try {
      const response = await fetch(`http://localhost:8787/api/lists/${list.id}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update item');
      
      const updatedItems = items.map(item => 
        item.id === itemId ? { ...item, completed } : item
      );
      setItems(updatedItems);
      
      // Update the parent component
      const updatedList = { ...list, items: updatedItems };
      onListUpdate(updatedList);
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`http://localhost:8787/api/lists/${list.id}/items/${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to delete item');
      }
      
      const updatedItems = items.filter(item => item.id !== itemId);
      setItems(updatedItems);
      
      // Update the parent component
      const updatedList = { ...list, items: updatedItems };
      onListUpdate(updatedList);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const clearList = async () => {
    if (!confirm('Are you sure you want to clear all items from this list?')) {
      return;
    }
    
    try {
      setStatus('loading');
      const response = await fetch(`http://localhost:8787/api/lists/${list.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'clear all items' }),
      });
      
      const data: ProcessTranscriptResponse = await response.json();
      if (!response.ok) throw new Error(data?.reasoning || 'Failed to clear list');
      
      setItems([]);
      setReasoning('List cleared successfully');
      
      // Update the parent component
      const updatedList = { ...list, items: [] };
      onListUpdate(updatedList);
      
      setStatus('idle');
    } catch (error) {
      console.error('Failed to clear list:', error);
      setReasoning(`Error: ${error instanceof Error ? error.message : 'Failed to clear list'}`);
      setStatus('error');
    }
  };

  const processRecipe = async () => {
    if (!recipeText.trim()) return;
    
    try {
      setStatus('loading');
      const response = await fetch(`http://localhost:8787/api/lists/${list.id}/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipeText }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to process recipe');
      
      const updatedItems = [...items, ...data.list.items.filter((item: ListItem) => 
        !items.some(existing => existing.id === item.id)
      )];
      setItems(updatedItems);
      setReasoning(`Added ${data.added?.length || 0} ingredients from recipe: ${data.added?.join(', ') || 'none'}. ${data.reasoning || ''}`);
      setRecipeText('');
      setShowRecipeInput(false);
      
      // Update the parent component
      const updatedList = { ...list, items: updatedItems };
      onListUpdate(updatedList);
      
      setStatus('idle');
    } catch (error) {
      console.error('Failed to process recipe:', error);
      setReasoning(`Error: ${error instanceof Error ? error.message : 'Failed to process recipe'}`);
      setStatus('error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* List Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '0.5rem',
        background: list.metadata.color || '#607D8B',
        borderRadius: 4,
        color: 'white'
      }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {list.metadata.icon} {list.metadata.name}
        </h3>
        <button
          onClick={clearList}
          disabled={items.length === 0 || status === 'loading'}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '0.25rem 0.5rem',
            cursor: items.length === 0 || status === 'loading' ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem'
          }}
        >
          Clear All
        </button>
      </div>

      {/* List Description */}
      {list.metadata.description && (
        <div style={{ fontSize: '0.875rem', color: '#aaa', padding: '0 0.5rem' }}>
          {list.metadata.description}
        </div>
      )}

      {/* Items List */}
      <div style={{ 
        border: '1px solid #424242', 
        borderRadius: 4, 
        padding: '0.75rem', 
        minHeight: 200, 
        background: '#1a1a1a', 
        color: '#e0e0e0' 
      }}>
        {items.length === 0 ? (
          <em>No items yet. {transcript ? 'Click "Update List" to add items from your transcript.' : 'Add items manually or use speech-to-text.'}</em>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'none' }}>
            {items.map((item, index) => (
              <li key={item.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '0.25rem',
                textDecoration: item.completed ? 'line-through' : 'none',
                opacity: item.completed ? 0.6 : 1
              }}>
                <input
                  type="checkbox"
                  checked={item.completed || false}
                  onChange={(e) => toggleItemComplete(item.id, e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ flex: 1 }}>
                  {index + 1}. {item.text}
                </span>
                <button
                  onClick={() => deleteItem(item.id)}
                  style={{
                    background: 'transparent',
                    color: '#666',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.125rem',
                    fontSize: '0.875rem'
                  }}
                  title="Delete item"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={processTranscript}
          disabled={!transcript || status === 'loading'}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#4CAF50', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4, 
            cursor: !transcript || status === 'loading' ? 'not-allowed' : 'pointer',
            flex: 1,
            minWidth: '120px'
          }}
        >
          {status === 'loading' ? 'Processing...' : 'Update List'}
        </button>
        
        <button
          onClick={() => {
            const input = document.getElementById(`manual-input-${list.id}`) as HTMLInputElement;
            if (input) input.focus();
          }}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#2196F3', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4, 
            cursor: 'pointer',
            minWidth: '100px'
          }}
        >
          Add Item
        </button>

        {/* Recipe button - only show for grocery lists */}
        {list.type === 'grocery' && (
          <button
            onClick={() => setShowRecipeInput(!showRecipeInput)}
            disabled={status === 'loading'}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#FF9800', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4, 
              cursor: status === 'loading' ? 'not-allowed' : 'pointer'
            }}
          >
            Recipe
          </button>
        )}
      </div>

      {/* Manual Item Input */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          id={`manual-input-${list.id}`}
          type="text"
          value={manualItemText}
          onChange={(e) => setManualItemText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addManualItem()}
          placeholder={`Add ${list.metadata.name.toLowerCase()} item...`}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: '#1a1a1a',
            color: '#e0e0e0',
            border: '1px solid #424242',
            borderRadius: 4
          }}
        />
        <button
          onClick={addManualItem}
          disabled={!manualItemText.trim() || status === 'loading'}
          style={{
            padding: '0.5rem 1rem',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: !manualItemText.trim() || status === 'loading' ? 'not-allowed' : 'pointer'
          }}
        >
          Add
        </button>
      </div>

      {/* Recipe Input - only show for grocery lists */}
      {list.type === 'grocery' && showRecipeInput && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea
            value={recipeText}
            onChange={(e) => setRecipeText(e.target.value)}
            placeholder="Paste your recipe here..."
            style={{
              width: '100%',
              minHeight: '100px',
              background: '#1a1a1a',
              border: '1px solid #424242',
              borderRadius: 4,
              color: '#e0e0e0',
              padding: '0.5rem',
              fontSize: '0.9rem',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={processRecipe}
              disabled={!recipeText.trim() || status === 'loading'}
              style={{ 
                padding: '0.5rem 1rem', 
                background: '#FF9800', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4, 
                cursor: !recipeText.trim() || status === 'loading' ? 'not-allowed' : 'pointer',
                flex: 1
              }}
            >
              {status === 'loading' ? 'Extracting...' : 'Add Ingredients'}
            </button>
            <button
              onClick={() => {
                setShowRecipeInput(false);
                setRecipeText('');
              }}
              disabled={status === 'loading'}
              style={{ 
                padding: '0.5rem 1rem', 
                background: '#616161', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4, 
                cursor: status === 'loading' ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reasoning/Status */}
      {(reasoning || status === 'error') && (
        <div style={{ 
          fontSize: '0.875rem', 
          color: status === 'error' ? '#f44336' : '#4CAF50',
          padding: '0.5rem',
          background: '#2a2a2a',
          borderRadius: 4,
          border: `1px solid ${status === 'error' ? '#f44336' : '#4CAF50'}`
        }}>
          {reasoning}
        </div>
      )}
    </div>
  );
}
