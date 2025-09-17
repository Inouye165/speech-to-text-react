// src/App.tsx
import React from 'react';
import { TranscriptionPad } from './components/TranscriptionPad';

const appStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: '#1a1a1a',
};

function App() {
  return (
    <div style={appStyles}>
      <TranscriptionPad />
    </div>
  );
}

export default App;