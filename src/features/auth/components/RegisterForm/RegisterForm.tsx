import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { useRegister } from '../../hooks/useAuth';
import styles from './RegisterForm.module.css';

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'Le prénom est requis'),
    lastName: z.string().min(1, 'Le nom est requis'),
    email: z.email('Adresse email invalide'),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    confirmPassword: z.string().min(1, 'La confirmation est requise'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const navigate = useNavigate();
  const { mutateAsync, isPending, isError, error } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      // ⚠️ Reqres (POST /register) n'accepte que { email, password }. firstName/lastName sont
      // collectés et validés côté formulaire (consigne pédagogique) mais ne sont PAS transmis
      // à l'API et ne sont donc persistés nulle part pour l'instant. À clarifier en équipe :
      // faut-il les envoyer à useSettings() après l'auto-login pour les conserver ?
      await mutateAsync({ email: values.email, password: values.password });
      navigate('/dashboard');
    } catch {
      // volontairement vide : erreur déjà exposée via isError/error ci-dessus
    }
  }

  return (
    <Card className={styles.card}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
        <h1 className={styles.title}>Inscription</h1>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="firstName" className={styles.label}>
              Prénom
            </label>
            <input id="firstName" className={styles.input} {...register('firstName')} />
            {errors.firstName && <p className={styles.fieldError}>{errors.firstName.message}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="lastName" className={styles.label}>
              Nom
            </label>
            <input id="lastName" className={styles.input} {...register('lastName')} />
            {errors.lastName && <p className={styles.fieldError}>{errors.lastName.message}</p>}
          </div>
        </div>

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
            autoComplete="new-password"
            className={styles.input}
            {...register('password')}
          />
          {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirmer le mot de passe
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={styles.input}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className={styles.fieldError}>{errors.confirmPassword.message}</p>
          )}
        </div>

        {isError && (
          <p className={styles.formError} role="alert">
            {error?.message ?? "Une erreur est survenue lors de l'inscription."}
          </p>
        )}

        <Button type="submit" disabled={isPending} className={styles.submit}>
          {isPending ? 'Inscription...' : "S'inscrire"}
        </Button>
      </form>
    </Card>
  );
}
