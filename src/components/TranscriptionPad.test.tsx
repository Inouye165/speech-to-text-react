// src/components/TranscriptionPad.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TranscriptionPad } from './TranscriptionPad';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

// --- MOCK SETUP ---
// We tell Vitest to replace the real hook with a fake one.
vi.mock('../hooks/useSpeechRecognition');

// --- TEST SUITE ---
describe('TranscriptionPad Component', () => {

  // Create mock functions that we can track
  const mockStartListening = vi.fn();
  const mockStopListening = vi.fn();
  const mockSetTranscript = vi.fn();

  it('should render correctly in the default (non-listening) state', () => {
    // Arrange: Define the mock's return value for this test
    (useSpeechRecognition as any).mockReturnValue({
      isListening: false,
      transcript: '',
      setTranscript: mockSetTranscript,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      hasRecognitionSupport: true,
    });

    // Act: Render the component
    render(<TranscriptionPad />);

    // Assert: Check for initial text and buttons
    expect(screen.getByText('Press "Start Recording" to begin.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('should display the correct UI when in the listening state', () => {
    // Arrange: This time, we set isListening to true
    (useSpeechRecognition as any).mockReturnValue({
      isListening: true,
      transcript: 'Testing...',
      setTranscript: mockSetTranscript,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      hasRecognitionSupport: true,
    });

    // Act: Render the component
    render(<TranscriptionPad />);

    // Assert: Check for the "listening" state UI
    expect(screen.getByText('Recording in progress...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Testing...')).toBeInTheDocument();
  });

  it('should call startListening when the record button is clicked', () => {
    // Arrange
    (useSpeechRecognition as any).mockReturnValue({
      isListening: false,
      transcript: '',
      setTranscript: mockSetTranscript,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      hasRecognitionSupport: true,
    });
    render(<TranscriptionPad />);
    const recordButton = screen.getByRole('button', { name: /start recording/i });

    // Act: Click the button
    fireEvent.click(recordButton);

    // Assert: Check that our mock function was called
    expect(mockStartListening).toHaveBeenCalledOnce();
  });

  it('should call the setTranscript function when the clear button is clicked', () => {
    // Arrange
    (useSpeechRecognition as any).mockReturnValue({
      isListening: false,
      transcript: 'Some text',
      setTranscript: mockSetTranscript,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      hasRecognitionSupport: true,
    });
    render(<TranscriptionPad />);
    const clearButton = screen.getByRole('button', { name: /clear text/i });
    
    // Act: Click the button
    fireEvent.click(clearButton);

    // Assert: Check that the hook's setter was called with an empty string
    expect(mockSetTranscript).toHaveBeenCalledWith('');
  });
  it('should display an error message when the hook provides an error', () => {
    // Arrange: Mock the hook to return an error message
    (useSpeechRecognition as any).mockReturnValue({
      isListening: false,
      transcript: '',
      error: 'This is a test error.', // Provide a test error
      setTranscript: vi.fn(),
      startListening: vi.fn(),
      stopListening: vi.fn(),
      hasRecognitionSupport: true,
    });

    // Act
    render(<TranscriptionPad />);

    // Assert
    expect(screen.getByText('This is a test error.')).toBeInTheDocument();
});
});