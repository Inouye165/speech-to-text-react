// src/components/GroceryPane.tsx
import React, { useState } from 'react';

type Props = { transcript: string };

export default function GroceryPane({ transcript }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [reasoning, setReasoning] = useState('');

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
      <button
        onClick={processTranscript}
        disabled={!transcript || status === 'loading'}
        style={{ padding: '0.5rem 1rem', background: '#616161', color: 'white', border: 'none', borderRadius: 4, cursor: !transcript || status === 'loading' ? 'not-allowed' : 'pointer' }}
      >
        {status === 'loading' ? 'Processing…' : 'Build Grocery List'}
      </button>
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


