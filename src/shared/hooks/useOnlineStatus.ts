// État de connexion réseau du navigateur.
//
// Exemple canonique de useSyncExternalStore : la source de vérité est
// navigator.onLine, une valeur qui vit hors de React et change sans que
// React en soit informé. Le hook s'y abonne plutôt que de recopier l'état
// dans un useState synchronisé par un useEffect.
//
// L'intérêt par rapport à useState + useEffect : React lit la valeur au
// moment exact où il en a besoin, ce qui évite d'afficher un état périmé
// pendant le rendu concurrent.

import { useSyncExternalStore } from 'react';

// S'abonne aux deux événements du navigateur et renvoie la fonction
// de désabonnement, comme l'attend useSyncExternalStore.
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);

  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

// Valeur utilisée au rendu côté serveur, où navigator n'existe pas.
// On suppose la connexion active : c'est le cas le plus fréquent, et
// afficher un bandeau « hors ligne » sur une page servie par le réseau
// serait absurde.
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Indique si le navigateur est connecté au réseau.
 *
 * ```tsx
 * const isOnline = useOnlineStatus();
 * if (!isOnline) return <Banner>Connexion perdue</Banner>;
 * ```
 *
 * Une limite à connaître : `navigator.onLine` signale l'existence d'une
 * interface réseau active, pas l'accès réel à Internet. Un poste connecté
 * à un réseau local sans passerelle est déclaré en ligne.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}