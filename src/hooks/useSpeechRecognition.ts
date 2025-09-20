// src/hooks/useSpeechRecognition.ts
import { useState, useRef } from 'react';

// (TypeScript interfaces remain the same)
interface SpeechRecognitionResult {
  isFinal: boolean;
  [key: number]: {
    transcript: string;
  };
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResult[];
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent {
    error: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [autoRestart, setAutoRestart] = useState(true); // <-- NEW: Auto-restart control
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalizedTranscriptRef = useRef<string>('');
  const shouldRestartRef = useRef<boolean>(false); // <-- NEW: Track restart intent

  const startListening = () => {
    if (isListening || !SpeechRecognition) return;

    setError(null);
    shouldRestartRef.current = true; // <-- NEW: Mark that we want to keep recording
    const recognition = new (SpeechRecognition as any)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Build transcript incrementally from resultIndex
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const textSegment = result[0].transcript;
        if ((result as any).isFinal) {
          finalizedTranscriptRef.current += textSegment;
        } else {
          interimText += textSegment;
        }
      }
      setTranscript(finalizedTranscriptRef.current + interimText);
    };

    // --- Enhanced Error Handling with Auto-Restart ---
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      switch (event.error) {
        case 'not-allowed':
          setError('Microphone permission denied. Please allow access in your browser settings.');
          shouldRestartRef.current = false; // Don't restart for permission errors
          break;
        case 'no-speech':
          // Auto-restart for no speech detected (common and recoverable)
          if (autoRestart && shouldRestartRef.current) {
            setTimeout(() => {
              if (shouldRestartRef.current) startListening();
            }, 1000);
          } else {
            setError('No speech was detected. Please try again.');
          }
          break;
        case 'network':
          setError('A network error occurred. Please check your connection.');
          // Don't auto-restart for network errors
          break;
        case 'aborted':
          // User or system aborted - don't restart
          shouldRestartRef.current = false;
          break;
        default:
          setError('An unknown error occurred.');
          break;
      }
    };
    
    // --- NEW: Auto-restart on end ---
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if we were supposed to be listening and auto-restart is enabled
      if (autoRestart && shouldRestartRef.current) {
        setTimeout(() => {
          if (shouldRestartRef.current) {
            startListening();
          }
        }, 100); // Small delay to prevent rapid restart loops
      }
    };
    recognitionRef.current = recognition;
    finalizedTranscriptRef.current = '';
    setTranscript('');
    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
    shouldRestartRef.current = false; // <-- NEW: Stop auto-restart when user stops
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const clearTranscript = () => {
    finalizedTranscriptRef.current = '';
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    setTranscript,
    error,
    autoRestart, // <-- NEW: Expose auto-restart control
    setAutoRestart, // <-- NEW: Allow toggling auto-restart
    startListening,
    stopListening,
    hasRecognitionSupport: !!SpeechRecognition,
    clearTranscript,
  };
};

export default useSpeechRecognition;