import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { useLogin } from '../../hooks/useAuth';
import { MAX_LOGIN_ATTEMPTS } from '../../store/authStore';
import styles from './LoginForm.module.css';

const loginSchema = z.object({
  email: z.email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { mutateAsync, isPending, isError, error, isLocked, attemptsRemaining } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      // mutateAsync rejette en cas d'échec ; l'état d'erreur est déjà reflété par isError/error
      // ci-dessus au prochain rendu, donc rien à faire de plus dans le catch.
      await mutateAsync(values);
      navigate('/dashboard');
    } catch {
      // volontairement vide
    }
  }

  return (
    <Card className={styles.card}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
        <h1 className={styles.title}>Connexion</h1>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={styles.input}
            {...register('email')}
          />
          {errors.email && <p className={styles.fieldError}>{errors.email.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={styles.input}
            {...register('password')}
          />
          {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}
        </div>

        {isLocked && (
          <p className={styles.lockWarning} role="alert">
            Trop de tentatives échouées. Réessayez dans un instant.
          </p>
        )}

        {!isLocked && attemptsRemaining < MAX_LOGIN_ATTEMPTS && attemptsRemaining > 0 && (
          <p className={styles.attemptsWarning}>
            {attemptsRemaining} tentative{attemptsRemaining > 1 ? 's' : ''} restante
            {attemptsRemaining > 1 ? 's' : ''} avant blocage.
          </p>
        )}

        {isError && !isLocked && (
          <p className={styles.formError} role="alert">
            {error?.message ?? 'Identifiants incorrects.'}
          </p>
        )}

        <Button type="submit" disabled={isPending || isLocked} className={styles.submit}>
          {isPending ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>
    </Card>
  );
}
