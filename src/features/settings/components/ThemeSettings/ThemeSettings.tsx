import { useTheme } from '@/shared/context/useTheme';
import { Card } from '@/shared/components/Card/Card';
import styles from './ThemeSettings.module.css';

// Le ThemeContext n'expose que toggleTheme (bascule), pas de setTheme direct :
// on ne bascule donc que si la cible choisie diffère du thème actuel.
export function ThemeSettings() {
  const { theme, toggleTheme } = useTheme();

  function selectTheme(target: 'light' | 'dark') {
    if (theme !== target) toggleTheme();
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Apparence</h2>
      <p className={styles.description}>Choisis l&apos;apparence de l&apos;application.</p>

      <div className={styles.options} role="radiogroup" aria-label="Thème">
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'light'}
          className={`${styles.option} ${theme === 'light' ? styles.optionActive : ''}`}
          onClick={() => selectTheme('light')}
        >
          ☀️ Clair
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'dark'}
          className={`${styles.option} ${theme === 'dark' ? styles.optionActive : ''}`}
          onClick={() => selectTheme('dark')}
        >
          🌙 Sombre
        </button>
      </div>
    </Card>
  );
}
