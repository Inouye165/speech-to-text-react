// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('renders the main heading', () => {
    // Arrange: Render the component to our virtual screen
    render(<App />);

    // Act: Query the screen to find the element we expect
    const headingElement = screen.getByText(/Speech-to-Text/i);

    // Assert: Check if the element was actually found in the document
    expect(headingElement).toBeInTheDocument();
  });

  it('renders the ready message', () => {
    render(<App />);
    const readyMessage = screen.getByText(/Ready to transcribe/i);
    expect(readyMessage).toBeInTheDocument();
  });
});