import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Toast } from '@/shared/components/Toast/Toast';
import { useSettings } from '../../hooks/useSettings';
import styles from './ProfileSettings.module.css';

const LANGUAGE_LABELS: Record<'fr' | 'en', string> = {
  fr: 'Français',
  en: 'English',
};

const profileSettingsSchema = z.object({
  displayName: z.string().min(1, 'Le nom affiché est requis'),
  language: z.enum(['fr', 'en']),
});

type ProfileSettingsValues = z.infer<typeof profileSettingsSchema>;

export function ProfileSettings() {
  const { data, setDisplayName, setLanguage } = useSettings();
  const [showSaved, setShowSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileSettingsValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: data,
  });

  useEffect(() => {
    if (!showSaved) return;
    const timeoutId = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [showSaved]);

  // setDisplayName/setLanguage viennent d'un store Zustand local : c'est synchrone, aucun appel
  // réseau, donc pas d'état isPending à gérer ici contrairement aux autres formulaires du projet.
  function onSubmit(values: ProfileSettingsValues) {
    setDisplayName(values.displayName);
    setLanguage(values.language);
    setShowSaved(true);
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Profil</h2>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
        <div className={styles.field}>
          <label htmlFor="displayName" className={styles.label}>
            Nom affiché
          </label>
          <input id="displayName" className={styles.input} {...register('displayName')} />
          {errors.displayName && <p className={styles.fieldError}>{errors.displayName.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="language" className={styles.label}>
            Langue
          </label>
          <select id="language" className={styles.select} {...register('language')}>
            {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={!isDirty}>
          Enregistrer
        </Button>
      </form>

      {showSaved && <Toast message="Préférences enregistrées" variant="success" />}
    </Card>
  );
}
