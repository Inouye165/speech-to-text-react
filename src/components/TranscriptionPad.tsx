// src/components/TranscriptionPad.tsx
import styles from './TranscriptionPad.module.css';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

export function TranscriptionPad() {
  const {
    isListening,
    transcript,
    setTranscript, // <-- NEW: Get the setter function
    startListening,
    stopListening,
    hasRecognitionSupport,
  } = useSpeechRecognition();

  return (
    <div className={styles.container}>
      <p className={styles.status}>
        {isListening ? 'Recording in progress...' : 'Press "Start Recording" to begin.'}
        {!hasRecognitionSupport &&
          ' (Warning: Your browser does not support speech recognition.)'}
      </p>

      <textarea
        className={styles.textarea}
        placeholder="Your transcribed text will appear here..."
        value={transcript} // <-- Bind value to transcript from hook
        onChange={(e) => setTranscript(e.target.value)} // <-- Allow manual edits
      />

      <div className={styles.controls}>
        <button
          className={`${styles.button} ${styles.recordButton}`}
          onClick={isListening ? stopListening : startListening}
          disabled={!hasRecognitionSupport}
        >
          {isListening ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button className={`${styles.button} ${styles.secondaryButton}`}>
          Copy Text
        </button>
        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={() => setTranscript('')} // <-- Wire up the Clear button
        >
          Clear Text
        </button>
      </div>
    </div>
  );
}