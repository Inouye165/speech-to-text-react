import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import useSpeechRecognition from '../useSpeechRecognition';

// Mock the Web Speech API
const mockRecognition = {
  continuous: false,
  interimResults: false,
  lang: '',
  start: vi.fn(),
  stop: vi.fn(),
  onresult: null,
  onerror: null,
  onend: null,
};

// Mock window.SpeechRecognition
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: vi.fn(() => mockRecognition),
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: vi.fn(() => mockRecognition),
});

describe('useSpeechRecognition - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecognition.onresult = null;
    mockRecognition.onerror = null;
    mockRecognition.onend = null;
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBe(null);
    expect(result.current.autoRestart).toBe(true);
    // Note: hasRecognitionSupport depends on browser environment
    expect(typeof result.current.hasRecognitionSupport).toBe('boolean');
  });

  it('should toggle auto-restart setting', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.autoRestart).toBe(true);

    act(() => {
      result.current.setAutoRestart(false);
    });

    expect(result.current.autoRestart).toBe(false);
  });

  it('should clear transcript when clearTranscript is called', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.clearTranscript();
    });

    expect(result.current.transcript).toBe('');
  });

  it('should handle speech recognition end', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    // Simulate speech recognition end
    act(() => {
      if (mockRecognition.onend) {
        mockRecognition.onend({} as any);
      }
    });

    expect(result.current.isListening).toBe(false);
  });
});
