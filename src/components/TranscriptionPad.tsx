// src/components/TranscriptionPad.tsx
import styles from './TranscriptionPad.module.css';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

export function TranscriptionPad() {
  const {
    isListening,
    transcript,
    setTranscript,
    error, // <-- NEW: Get the error message
    startListening,
    stopListening,
    hasRecognitionSupport,
  } = useSpeechRecognition();

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
      />

      <div className={styles.controls}>
        <button
          className={`${styles.button} ${styles.recordButton}`}
          onClick={isListening ? stopListening : startListening}
          disabled={!hasRecognitionSupport}
        >
          {isListening ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button className={`${styles.button} ${styles.secondaryButton}`}>Copy Text</button>
        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={() => setTranscript('')}
        >
          Clear Text
        </button>
      </div>
    </div>
  );
}