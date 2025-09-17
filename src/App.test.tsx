// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('should render the main TranscriptionPad component', () => {
    // 1. Arrange: Render the main App component
    render(<App />);

    // 2. Act/Assert: Check if a key element from its child component is visible.
    // We'll check for the main record button. If it's here, we know the
    // TranscriptionPad was rendered successfully.
    const recordButton = screen.getByRole('button', { name: /start recording/i });
    expect(recordButton).toBeInTheDocument();
  });
});