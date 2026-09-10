import { Link } from 'react-router-dom';
import { RegisterForm } from '@/features/auth/components/RegisterForm/RegisterForm';
import styles from './RegisterPage.module.css';

export function RegisterPage() {
  return (
    <div className={styles.wrapper}>
      <RegisterForm />
      <p className={styles.link}>
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </div>
  );
}
