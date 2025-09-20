// src/components/GroceryPane.tsx
import React, { useState } from 'react';

type Props = { transcript: string };

export default function GroceryPane({ transcript }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [reasoning, setReasoning] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [showRecipeInput, setShowRecipeInput] = useState(false);
  const [recipeUrl, setRecipeUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const processTranscript = async () => {
    try {
      setStatus('loading');
      const resp = await fetch('http://localhost:8787/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'API error');
      setItems(data.items || []);
      setReasoning(data.reasoning || '');
      setStatus('idle');
    } catch (e) {
      setStatus('error');
    }
  };

  const clearList = async () => {
    try {
      setStatus('loading');
      const resp = await fetch('http://localhost:8787/api/grocery', {
        method: 'DELETE',
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'API error');
      setItems([]);
      setReasoning('');
      setStatus('idle');
    } catch (e) {
      setStatus('error');
    }
  };

  const processRecipe = async () => {
    if (!recipeText.trim()) return;
    
    try {
      setStatus('loading');
      const resp = await fetch('http://localhost:8787/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipeText }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'API error');
      
      setItems(data.currentList || []);
      setReasoning(`Added ${data.added?.length || 0} ingredients from recipe: ${data.added?.join(', ') || 'none'}. ${data.reasoning || ''}`);
      setRecipeText('');
      setShowRecipeInput(false);
      setStatus('idle');
    } catch (e) {
      setStatus('error');
    }
  };

  const processRecipeUrl = async () => {
    if (!recipeUrl.trim()) return;
    
    try {
      setStatus('loading');
      const resp = await fetch('http://localhost:8787/api/recipe-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: recipeUrl }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'API error');
      
      setItems(data.currentList || []);
      setReasoning(`Added ${data.added?.length || 0} ingredients from recipe URL: ${data.added?.join(', ') || 'none'}. ${data.reasoning || ''}`);
      setRecipeUrl('');
      setShowUrlInput(false);
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      // Show more specific error message
      const errorMessage = e instanceof Error ? e.message : 'Failed to process recipe URL';
      setReasoning(`Error: ${errorMessage}. Please try a different recipe URL or paste the recipe text directly.`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <h3 style={{ color: '#e0e0e0', margin: 0 }}>Grocery List</h3>
      <div style={{ border: '1px solid #424242', borderRadius: 4, padding: '0.75rem', minHeight: 180, background: '#1a1a1a', color: '#e0e0e0' }}>
        {items.length === 0 ? (
          <em>No items yet. Click “Build Grocery List”.</em>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {items.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            flex: 1
          }}
        >
          {status === 'loading' ? 'Processing…' : 'Update List'}
        </button>
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
        <button
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={status === 'loading'}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#9C27B0', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4, 
            cursor: status === 'loading' ? 'not-allowed' : 'pointer'
          }}
        >
          URL
        </button>
        <button
          onClick={clearList}
          disabled={status === 'loading'}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#f44336', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4, 
            cursor: status === 'loading' ? 'not-allowed' : 'pointer'
          }}
        >
          Clear
        </button>
      </div>
      
      {showRecipeInput && (
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
                background: '#2196F3', 
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
      
      {showUrlInput && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            type="url"
            value={recipeUrl}
            onChange={(e) => setRecipeUrl(e.target.value)}
            placeholder="Paste recipe URL here (e.g., https://allrecipes.com/recipe/...)"
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#1a1a1a',
              border: '1px solid #424242',
              borderRadius: 4,
              color: '#e0e0e0',
              fontSize: '0.9rem'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={processRecipeUrl}
              disabled={!recipeUrl.trim() || status === 'loading'}
              style={{ 
                padding: '0.5rem 1rem', 
                background: '#9C27B0', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4, 
                cursor: !recipeUrl.trim() || status === 'loading' ? 'not-allowed' : 'pointer',
                flex: 1
              }}
            >
              {status === 'loading' ? 'Fetching...' : 'Add from URL'}
            </button>
            <button
              onClick={() => {
                setShowUrlInput(false);
                setRecipeUrl('');
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
      
      {status === 'error' && (
        <p style={{ color: '#ff5252', margin: 0 }}>Failed to process instructions.</p>
      )}
      {reasoning && (
        <details style={{ marginTop: '0.25rem' }}>
          <summary>Why this list?</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{reasoning}</pre>
        </details>
      )}
    </div>
  );
}


