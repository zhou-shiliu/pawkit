import styles from './MoodText.module.css';

interface MoodTextProps {
  mood: string;
}

export function MoodText({ mood }: MoodTextProps) {
  return <p className={styles.mood}>{mood}</p>;
}
