// src/components/TranscriptionPad.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'; // Add fireEvent
import { describe, it, expect, beforeEach } from 'vitest';
import { TranscriptionPad } from './TranscriptionPad';

// Test suite for the initial, static render
describe('TranscriptionPad Component (Static Render)', () => {
  beforeEach(() => {
    render(<TranscriptionPad />);
  });

  it('should render the initial status message', () => {
    expect(screen.getByText('Press "Start Recording" to begin.')).toBeInTheDocument();
  });

  it('should render the main record button', () => {
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('should render the textarea for transcription', () => {
    expect(screen.getByPlaceholderText('Your transcribed text will appear here...')).toBeInTheDocument();
  });

  it('should render the Copy and Clear buttons', () => {
    expect(screen.getByRole('button', { name: /copy text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear text/i })).toBeInTheDocument();
  });
});

// New test suite for user interactions
describe('TranscriptionPad Component (User Interactions)', () => {
  beforeEach(() => {
    render(<TranscriptionPad />);
  });

  it('should toggle recording state and text on button click', () => {
    const recordButton = screen.getByRole('button', { name: /start recording/i });

    // 1. First Click: Start recording
    fireEvent.click(recordButton);
    expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    expect(screen.getByText('Recording in progress...')).toBeInTheDocument();

    // 2. Second Click: Stop recording
    fireEvent.click(recordButton);
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    expect(screen.getByText('Press "Start Recording" to begin.')).toBeInTheDocument();
  });

  it('should allow user to type in the textarea', () => {
    const textarea = screen.getByPlaceholderText<HTMLTextAreaElement>('Your transcribed text will appear here...');

    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(textarea.value).toBe('Hello world');
  });

  it('should clear the textarea when the clear button is clicked', () => {
    const textarea = screen.getByPlaceholderText<HTMLTextAreaElement>('Your transcribed text will appear here...');
    const clearButton = screen.getByRole('button', { name: /clear text/i });

    // 1. Type something into the textarea
    fireEvent.change(textarea, { target: { value: 'Some text to clear' } });
    expect(textarea.value).toBe('Some text to clear');

    // 2. Click the clear button
    fireEvent.click(clearButton);

    // 3. Assert the textarea is now empty
    expect(textarea.value).toBe('');
  });
});