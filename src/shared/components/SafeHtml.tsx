// Affichage de contenu HTML provenant d'une saisie utilisateur.
// Seul endroit de l'application où dangerouslySetInnerHTML est autorisé,
// et uniquement parce que le contenu est assaini juste avant.

import { useMemo } from 'react';
import { sanitizeHtml } from '@/shared/utils/sanitize';

interface SafeHtmlProps {
  html: string;
  className?: string;
  // Élément conteneur, div par défaut.
  as?: 'div' | 'span' | 'p';
}

export function SafeHtml({ html, className, as: Tag = 'div' }: SafeHtmlProps) {
  // L'assainissement est refait à chaque changement de contenu, jamais mis
  // en cache au-delà : une valeur assainie ne doit pas suivre une valeur
  // modifiée entre-temps.
  const clean = useMemo(() => sanitizeHtml(html), [html]);

  return <Tag className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}