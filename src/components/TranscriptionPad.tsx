// src/components/TranscriptionPad.tsx
import { useState } from 'react'; // Import ONLY useState
import styles from './TranscriptionPad.module.css';

export function TranscriptionPad() {
  // --- STATE MANAGEMENT ---
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcribedText, setTranscribedText] = useState<string>('');

  // --- EVENT HANDLERS ---
  const handleRecordClick = () => {
    setIsRecording((prevState) => !prevState);
  };

  const handleClearClick = () => {
    setTranscribedText('');
  };

  return (
    <div className={styles.container}>
      <p className={styles.status}>
        {isRecording ? 'Recording in progress...' : 'Press "Start Recording" to begin.'}
      </p>

      <textarea
        className={styles.textarea}
        placeholder="Your transcribed text will appear here..."
        value={transcribedText}
        onChange={(e) => setTranscribedText(e.target.value)}
      />

      <div className={styles.controls}>
        <button
          className={`${styles.button} ${styles.recordButton}`}
          onClick={handleRecordClick}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button className={`${styles.button} ${styles.secondaryButton}`}>
          Copy Text
        </button>
        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={handleClearClick}
        >
          Clear Text
        </button>
      </div>
    </div>
  );
}