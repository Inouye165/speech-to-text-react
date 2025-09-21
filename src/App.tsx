// src/App.tsx
import React, { useState } from 'react';
import { TranscriptionPad } from './components/TranscriptionPad';
import MultiListManager from './components/MultiListManager';

const appStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: '#1a1a1a',
  padding: '1rem',
};

function App() {
  const [transcript, setTranscript] = useState('');

  return (
    <div style={appStyles}>
      <div style={{ width: '100%', maxWidth: 1400 }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem',
          color: '#e0e0e0'
        }}>
          <h1 style={{ margin: 0, color: '#e0e0e0' }}>Speech-to-Text Lists</h1>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          <TranscriptionPad onTranscriptChange={setTranscript} />
          <MultiListManager transcript={transcript} />
        </div>
      </div>
    </div>
  );
}

export default App;