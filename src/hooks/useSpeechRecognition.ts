// src/hooks/useSpeechRecognition.ts
import { useState, useEffect, useRef } from 'react';

// --- TYPE DEFINITIONS for Web Speech API ---
// This ensures TypeScript knows about the API's properties and events.
interface SpeechRecognitionResult {
  isFinal: boolean;
  [key: number]: {
    transcript: string;
  };
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResult[];
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

// --- THE HOOK ---
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new (SpeechRecognition as any)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // --- IMPROVED LOGIC ---
    // This now handles both interim and final results for a real-time experience.
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const currentTranscript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');
      setTranscript(currentTranscript);
    };

    // Add explicit types to fix the TypeScript errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
    };
    
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  return {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    hasRecognitionSupport: !!SpeechRecognition,
  };
};

export default useSpeechRecognition;