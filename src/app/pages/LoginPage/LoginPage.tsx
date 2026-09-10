import { Link } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/LoginForm/LoginForm';
import styles from './LoginPage.module.css';

export function LoginPage() {
  return (
    <div className={styles.wrapper}>
      <LoginForm />
      <p className={styles.link}>
        Pas encore de compte ? <Link to="/register">S'inscrire</Link>
      </p>
    </div>
  );
}
