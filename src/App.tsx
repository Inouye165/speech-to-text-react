// src/App.tsx
import React from 'react';

// Basic styling for our component
const appStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  height: '100vh',
  backgroundColor: '#1a1a1a',
  color: 'rgba(255, 255, 255, 0.87)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const headingStyles: React.CSSProperties = {
  fontSize: '3rem',
  margin: '0',
  fontWeight: '600',
}

const paragraphStyles: React.CSSProperties = {
    fontSize: '1.2rem',
    color: '#7a7a7a',
}

function App() {
  return (
    <div style={appStyles}>
      <header>
        <h1 style={headingStyles}>Speech-to-Text</h1>
        <p style={paragraphStyles}>Ready to transcribe.</p>
      </header>
    </div>
  );
}

export default App;