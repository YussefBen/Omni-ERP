import { useCallback, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ThemeToggle } from '@/shared/components/ThemeToggle/ThemeToggle';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { routePreloaders } from '../../router';
import styles from './AppLayout.module.css';

interface NavItem {
  to: string;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// Les écrans sont regroupés par domaine métier, dans le même ordre que
// l'organisation du code. Un utilisateur qui cherche les fournisseurs les
// trouve à côté des produits et des commandes, pas dans une liste à plat
// de treize entrées.
const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '/dashboard', label: 'Tableau de bord' },
      { to: '/reports', label: 'Rapports' },
    ],
  },
  {
    title: 'Relation client',
    items: [
      { to: '/clients', label: 'Clients' },
      { to: '/pipeline', label: 'Pipeline' },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { to: '/products', label: 'Produits' },
      { to: '/orders', label: 'Commandes' },
      { to: '/suppliers', label: 'Fournisseurs' },
    ],
  },
  {
    title: 'Projets',
    items: [{ to: '/projects', label: 'Projets' }],
  },
  {
    title: 'Ressources humaines',
    items: [
      { to: '/employees', label: 'Employés' },
      { to: '/teams', label: 'Équipes' },
      { to: '/leave-requests', label: 'Congés' },
    ],
  },
  {
    title: 'Compte',
    items: [{ to: '/settings', label: 'Paramètres' }],
  },
];

// Chaque écran déclare les données qu'il consultera en premier. Survoler
// un lien lance leur chargement, en plus du fichier de l'écran lui-même.
const DATA_PREFETCHERS: Record<string, () => void> = {};

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Précharge le fichier de l'écran survolé, et ses données si elles sont
  // déclarées. Un survol dure quelques centaines de millisecondes, ce qui
  // suffit largement : au clic, tout est déjà en cache.
  const preload = useCallback(
    (to: string) => {
      routePreloaders[to]?.();
      DATA_PREFETCHERS[to]?.();
    },
    // queryClient est stable pour toute la durée de vie de l'application.
    [queryClient],
  );

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className={styles.layout}>
      {/* Permet d'atteindre le contenu sans parcourir tout le menu au
          clavier. Visible uniquement quand il reçoit le focus. */}
      <a href="#main-content" className={styles.skipLink}>
        Aller au contenu principal
      </a>

      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <span aria-hidden="true">☰</span>
        </button>

        <span className={styles.brand}>Omni-ERP</span>

        <div className={styles.topbarActions}>
          {!isOnline && (
            // role="status" annonce le changement aux lecteurs d'écran
            // sans interrompre ce qui est en cours de lecture.
            <span role="status" className={styles.offlineBadge}>
              Hors ligne
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      <nav
        id="main-navigation"
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}
        aria-label="Navigation principale"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className={styles.navGroup}>
            <h2 className={styles.navGroupTitle}>{group.title}</h2>
            <ul className={styles.navList}>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                    }
                    // aria-current indique aux lecteurs d'écran quelle page
                    // est affichée, ce que la couleur seule ne transmet pas.
                    aria-current={location.pathname === item.to ? 'page' : undefined}
                    onMouseEnter={() => preload(item.to)}
                    onFocus={() => preload(item.to)}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Ferme le menu au clic à côté, sur petit écran. Purement décoratif
          pour un lecteur d'écran, d'où aria-hidden. */}
      {menuOpen && (
        <div className={styles.overlay} onClick={closeMenu} aria-hidden="true" />
      )}

      <main id="main-content" className={styles.content} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}