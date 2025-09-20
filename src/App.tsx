// src/App.tsx
import React, { useState } from 'react';
import { TranscriptionPad } from './components/TranscriptionPad';
import GroceryPane from './components/GroceryPane';

const appStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: '#1a1a1a',
};

function App() {
  const [transcript, setTranscript] = useState('');
  return (
    <div style={appStyles}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '95%', maxWidth: 1200 }}>
        <TranscriptionPad onTranscriptChange={setTranscript} />
        <GroceryPane transcript={transcript} />
      </div>
    </div>
  );
}

export default App;