// src/components/TranscriptionPad.tsx
import React, { useEffect, useRef, useState } from 'react';
import styles from './TranscriptionPad.module.css';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

type TranscriptionPadProps = {
  onTranscriptChange?: (text: string) => void;
};

export function TranscriptionPad({ onTranscriptChange }: TranscriptionPadProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const {
    isListening,
    transcript,
    setTranscript,
    error,
    autoRestart, // <-- NEW: Get auto-restart state
    setAutoRestart, // <-- NEW: Get auto-restart control
    startListening,
    stopListening,
    hasRecognitionSupport,
    clearTranscript,
  } = useSpeechRecognition();

  useEffect(() => {
    if (onTranscriptChange) {
      onTranscriptChange(transcript);
    }
  }, [transcript, onTranscriptChange]);

  const showCopyStatus = (message: string) => {
    setCopyStatus(message);
    window.setTimeout(() => setCopyStatus(''), 2000);
  };

  const handleCopy = async () => {
    const text = transcript ?? '';
    if (!text.trim()) {
      return;
    }
    try {
      const canUseClipboardAPI =
        typeof navigator !== 'undefined' && (navigator as any).clipboard &&
        typeof (navigator as any).clipboard.writeText === 'function' &&
        typeof window !== 'undefined' && (window as any).isSecureContext;

      if (canUseClipboardAPI) {
        await (navigator as any).clipboard.writeText(text);
        showCopyStatus('Copied to clipboard');
        return;
      }

      // Fallback: select the textarea content and use execCommand('copy')
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
        const successful = document.execCommand && document.execCommand('copy');
        // Clear selection
        window.getSelection()?.removeAllRanges();
        if (successful) {
          showCopyStatus('Copied to clipboard');
          return;
        }
      }

      throw new Error('Copy not supported');
    } catch {
      showCopyStatus('Copy failed');
    }
  };

  return (
    <div className={styles.container}>
      {/* --- NEW: Conditional Error Display --- */}
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : (
        <p className={styles.status}>
          {isListening ? 'Recording in progress...' : 'Press "Start Recording" to begin.'}
          {!hasRecognitionSupport && ' (Warning: Your browser does not support speech recognition.)'}
        </p>
      )}

      <textarea
        className={styles.textarea}
        placeholder="Your transcribed text will appear here..."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        ref={textareaRef}
      />

      <div className={styles.controls}>
        <button
          className={`${styles.button} ${styles.recordButton}`}
          onClick={isListening ? stopListening : startListening}
          disabled={!hasRecognitionSupport}
        >
          {isListening ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={handleCopy}
          disabled={!transcript || !transcript.trim()}
        >
          Copy Text
        </button>
        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={() => clearTranscript()}
        >
          Clear Text
        </button>
      </div>
      
      {/* NEW: Auto-restart toggle */}
      <div className={styles.autoRestartControl}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={autoRestart}
            onChange={(e) => setAutoRestart(e.target.checked)}
            className={styles.checkbox}
          />
          <span className={styles.checkboxText}>
            Auto-restart recording when it stops
          </span>
        </label>
      </div>
      {copyStatus && <p className={styles.status}>{copyStatus}</p>}
    </div>
  );
}