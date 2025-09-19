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
  const [error, setError] = useState<string | null>(null); // <-- NEW: Error state
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalizedTranscriptRef = useRef<string>('');

  const startListening = () => {
    if (isListening || !SpeechRecognition) return;

    setError(null); // <-- NEW: Clear previous errors
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

    // --- NEW: Expanded Error Handling ---
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      switch (event.error) {
        case 'not-allowed':
          setError('Microphone permission denied. Please allow access in your browser settings.');
          break;
        case 'no-speech':
          setError('No speech was detected. Please try again.');
          break;
        case 'network':
          setError('A network error occurred. Please check your connection.');
          break;
        default:
          setError('An unknown error occurred.');
          break;
      }
    };
    
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    finalizedTranscriptRef.current = '';
    setTranscript('');
    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
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
    error, // <-- NEW: Expose error state
    startListening,
    stopListening,
    hasRecognitionSupport: !!SpeechRecognition,
    clearTranscript,
  };
};

export default useSpeechRecognition;