# Omni-ERP

Application web de gestion d'entreprise développée en React et TypeScript. Elle réunit
huit modules métier — authentification, tableau de bord, gestion de projets, ressources
humaines, relation client, ressources d'entreprise, intelligence d'affaires et
paramètres — autour de six sources de données distinctes.

Projet réalisé en équipe de trois dans le cadre de la formation.

---

## Sommaire

- [Démarrage rapide](#démarrage-rapide)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Sources de données](#sources-de-données)
- [Commandes disponibles](#commandes-disponibles)
- [Tests](#tests)
- [Choix techniques](#choix-techniques)
- [Sécurité](#sécurité)
- [Supervision](#supervision)
- [Conventions d'équipe](#conventions-déquipe)
- [Répartition du travail](#répartition-du-travail)

---

## Démarrage rapide

### Prérequis

Node.js 20.11 ou supérieur, et npm.

### Installation

```bash
git clone https://github.com/YussefBen/Omni-ERP.git
cd Omni-ERP
npm install
cp .env.example .env
```

### Configuration

Le fichier `.env` n'est pas versionné : chaque poste dispose de ses propres clés.
Ouvrez-le et renseignez les valeurs manquantes.

| Variable | Rôle | Où l'obtenir |
|---|---|---|
| `VITE_OPENWEATHER_API_KEY` | Widget météo du tableau de bord | Compte gratuit sur openweathermap.org, onglet API keys |
| `VITE_JSON_SERVER_URL` | API locale | Laisser `http://localhost:3001` |
| `VITE_SENTRY_DSN` | Remontée des erreurs (Sentry) | Fournie par l'équipe, un seul projet partagé |
| `VITE_GA4_MEASUREMENT_ID` | Mesure d'audience (Google Analytics 4) | Fournie par l'équipe, une seule propriété partagée |
| `VITE_FLAGSMITH_ENVIRONMENT_KEY` | Feature flags et canary release | Fournie par l'équipe, un seul environnement partagé |
| `VITE_SLACK_WEBHOOK_URL` | Alertes Slack (service down, erreur critique) | Fournie par l'équipe |
| `VITE_HONEYCOMB_API_KEY` | Traçage OpenTelemetry des appels API | Fournie par l'équipe |

Sentry, GA4, Flagsmith, Slack et Honeycomb sont **facultatifs en développement** : sans
ces variables, chaque outil se désactive silencieusement (avertissement en console),
l'application continue de fonctionner normalement. Contrairement à OpenWeatherMap, ce
sont des clés **de projet**, partagées par toute l'équipe plutôt qu'une par personne —
demandez-les à Jessica plutôt que de créer vos propres comptes.

La clé OpenWeatherMap met jusqu'à deux heures à s'activer après création. En son absence,
le widget météo affiche un message explicite plutôt qu'une erreur.

### Lancement

Deux terminaux sont nécessaires : l'un pour l'API locale, l'autre pour l'application.

```bash
npm run server   # API locale sur le port 3001
npm run dev      # application sur le port 5173
```

---

## Stack technique

| Domaine | Outil | Raison du choix |
|---|---|---|
| Construction | Vite | Démarrage instantané, rechargement à chaud |
| Langage | TypeScript | Typage strict sur toute la base de code |
| Interface | React 19 | — |
| Données distantes | React Query | Cache, invalidation, mises à jour optimistes |
| État global | Zustand | Léger, sans code répétitif |
| Requêtes HTTP | Axios | Intercepteurs, une instance par source |
| Navigation | React Router | — |
| Formulaires | React Hook Form et Zod | Validation typée, messages par règle |
| Graphiques | Recharts | Composants React natifs |
| Listes longues | react-window | Virtualisation |
| Événements | RxJS | Motif Observateur pour le pipeline et les notifications |
| Tests | Vitest, Testing Library, MSW | Interception réseau, tests déterministes |
| Sécurité | DOMPurify | Assainissement des saisies |
| Export | jsPDF | Génération de rapports côté navigateur |

---

## Architecture

L'organisation suit une structure **par domaine métier** plutôt que par couche
technique. Chaque domaine regroupe ses composants, hooks, services, magasin d'état et
types, et expose un point d'entrée unique.

```
src/
├── features/
│   ├── auth/          authentification, rôles, protection des routes
│   ├── dashboard/     écran d'accueil, météo, notifications
│   ├── pms/           projets, tâches, commentaires
│   ├── hrm/           employés, équipes, congés, présence
│   ├── crm/           clients, pipeline de vente, satisfaction
│   ├── erp/           produits, commandes, fournisseurs, stocks
│   ├── bi/            indicateurs, analyses, export
│   ├── security/      journal d'audit, limitation, protection CSRF
│   ├── settings/      préférences du compte
│   └── monitoring/    supervision, mesures, indicateurs web
├── shared/
│   ├── components/    bibliothèque de composants
│   ├── config/        URLs des API, constantes
│   ├── context/       thème clair et sombre
│   ├── hooks/         hooks réutilisables
│   ├── mocks/         interception réseau pour les tests
│   ├── types/         types partagés entre domaines
│   └── utils/         assainissement, politique de mots de passe
├── lib/
│   └── query/         configuration du client de cache
├── test/              environnement de test
├── App.tsx
├── main.tsx
├── providers.tsx      contextes globaux
└── router.tsx         routes de l'application
```

### Points d'entrée par domaine

Chaque domaine expose un fichier `index.ts`. Les écrans et les autres domaines importent
depuis ce point d'entrée, jamais depuis les fichiers internes :

```tsx
import { useClients, useNps } from '@/features/crm';
import { useProducts, useLowStockAlerts } from '@/features/erp';
```

La structure interne d'un domaine peut ainsi évoluer sans casser le code des autres
membres de l'équipe.

### Documentation par domaine

Un README détaille les hooks disponibles, la forme exacte de leurs retours et les pièges
courants :

- [Relation client](src/features/crm/README.md)
- [Ressources d'entreprise](src/features/erp/README.md)
- [Intelligence d'affaires](src/features/bi/README.md)
- [Tableau de bord](src/features/dashboard/README.md)

---

## Sources de données

Six sources alimentent l'application.

| Source | Données | Domaines |
|---|---|---|
| DummyJSON | Clients, produits, commandes | CRM, ERP |
| JSONPlaceholder | Projets, tâches, avis clients | PMS, CRM |
| Reqres.in | Comptes utilisateurs | Authentification |
| RandomUser | Profils employés | Ressources humaines |
| OpenWeatherMap | Météo et prévisions | Tableau de bord |
| JSON Server | Données métier persistées | Tous |

### Contournements documentés

Trois données nécessaires au métier ne sont fournies par aucune API. Elles sont dérivées
de façon **déterministe** — un même identifiant produit toujours la même valeur — pour
que les indicateurs restent stables d'un rafraîchissement à l'autre.

| Donnée manquante | Solution retenue |
|---|---|
| Rôle utilisateur, absent de Reqres | Dérivé de l'identifiant du compte |
| Note de satisfaction, absente des commentaires JSONPlaceholder | Dérivée de l'identifiant du commentaire par hachage |
| Statut et date des commandes, absents des paniers DummyJSON | Stockés localement et joints aux lignes distantes |

---

## Commandes disponibles

| Commande | Effet |
|---|---|
| `npm run dev` | Lance l'application en développement |
| `npm run server` | Lance l'API locale sur le port 3001 |
| `npm run build` | Vérifie les types puis construit la version de production |
| `npm run preview` | Sert la version construite |
| `npm run lint` | Analyse statique du code |
| `npm run test` | Lance les tests en surveillance |
| `npm run coverage` | Lance les tests et produit le rapport de couverture |
| `npm run lighthouse` | Mesure performance, accessibilité et référencement |

Avant chaque envoi sur le dépôt :

```bash
npx tsc -b && npm run build && npx vitest run
```

---

## Tests

583 tests répartis sur 46 fichiers.

Les appels réseau sont interceptés par MSW : les tests ne dépendent ni d'une connexion,
ni de la disponibilité des API, et peuvent affirmer des valeurs exactes.

```bash
npm run coverage
```

Le rapport détaillé est produit dans `coverage/index.html`.

### Couverture par domaine

| Domaine | Instructions |
|---|---|
| Intelligence d'affaires | 98 à 100 % |
| Sécurité | 97 à 99 % |
| Relation client | 87 à 95 % |
| Ressources d'entreprise | 93 à 97 % |
| Tableau de bord | 91 à 100 % |
| Utilitaires partagés | 98 % |
| Ressources humaines | Fonctions dérivées et hooks couverts |
| Gestion de projets | Fonctions dérivées, hooks et mutations optimistes couverts |
| Paramètres | Couvert |
| Supervision (monitoring) | Health checks couverts (cas ok, down, dégradé) |
| Authentification | Rôle dérivé, connexion, inscription et session couverts |
| Composants d'interface | à compléter |

### Ce qui est testé

Les transformations de données, les règles métier et le comportement des mutations en
cas d'échec. Le comportement des bibliothèques tierces ne l'est pas : vérifier que le
gestionnaire de cache met bien en cache reviendrait à tester du code qui n'est pas le
nôtre.

Deux défauts réels ont été identifiés par les tests, tous deux invisibles depuis
l'interface : une dérive d'arrondi sur les montants clients, et un blocage de connexion
qui devenait permanent au lieu de durer une minute.

---

## Choix techniques

### Mises à jour optimistes

Les mutations du pipeline de vente appliquent le changement immédiatement, sans attendre
la réponse du serveur, et le rétablissent si celui-ci refuse. Les requêtes en cours sont
annulées avant l'application du changement : sans cette précaution, une réponse tardive
écraserait l'état optimiste par des données périmées.

### Motif Observateur

Un bus d'événements RxJS relie les mutations aux écrans qui souhaitent en être informés.
Le code qui déplace une opportunité ignore qui l'écoute, ce qui permet d'ajouter une
notification ou un journal sans le modifier. L'événement n'est publié qu'après
confirmation du serveur : notifier un déplacement annulé induirait l'utilisateur en
erreur.

### Une seule définition par calcul

Aucune formule métier n'est dupliquée. Le taux de rotation des stocks est défini dans le
domaine ERP et importé par l'intelligence d'affaires ; le calcul du score de satisfaction
et le taux de conversion viennent du CRM. Une modification de formule ne touche qu'un
seul fichier.

### Comparaison des indicateurs

Chaque indicateur porte sa valeur courante, celle de la période précédente de durée
égale, l'écart en pourcentage et le sens de variation. Un drapeau signale les cas où une
baisse est favorable — ruptures de stock, retards, annulations — pour que l'interface
n'ait pas à reconstituer la règle métier.

### Limites assumées

Deux indicateurs n'ont pas de valeur passée : il n'existe pas de photographie historique
du stock, et JSONPlaceholder ne date pas ses commentaires. Ces limitations sont
documentées dans le code plutôt que masquées par une comparaison fabriquée.

La prévision de chiffre d'affaires expose son coefficient de détermination, ce qui permet
à l'écran de signaler une tendance peu marquée au lieu de présenter un chiffre incertain
comme une certitude.

**Suppression restreinte sur les projets et tâches d'origine JSONPlaceholder.** Les 100
premiers projets et les 200 premières tâches viennent de JSONPlaceholder, une API en
lecture seule qui simule des écritures sans jamais les enregistrer réellement. Un
`DELETE` qui « réussirait » dessus serait un mensonge : l'élément réapparaîtrait au
prochain rafraîchissement. La création et la modification fonctionnent sans restriction
sur tous les projets et toutes les tâches (la modification est stockée localement en
surcharge) ; seule la suppression est bloquée pour les éléments d'origine externe, avec
un message d'erreur explicite plutôt qu'un échec silencieux. Suppression illimitée pour
tout projet ou toute tâche créés dans l'application.

---

## Sécurité

Les mesures mises en place et leurs limites sont détaillées dans
[docs/SECURITY.md](docs/SECURITY.md).

En résumé :

| Mesure | Portée |
|---|---|
| En-têtes HTTP et politique de sécurité du contenu | Protection réelle |
| Assainissement des saisies | Protection réelle |
| Politique de mots de passe | Protection réelle |
| Gestion des secrets hors du dépôt | Protection réelle |
| Journal d'audit | Partielle |
| Limitation des tentatives de connexion | Démonstration du motif |
| Protection CSRF | Démonstration du motif |

Les trois dernières supposent un serveur applicatif qui décide. Le projet n'en ayant pas,
elles sont implémentées de bout en bout mais leur garantie reste théorique. Cette
distinction est explicite plutôt que présentée comme un dispositif homogène.

---

## Supervision

Bonus monitoring, sept mesures mises en place.

| Mesure | Portée |
|---|---|
| Suivi des erreurs (Sentry) | Erreurs de rendu et mutations en échec, avec l'utilisateur associé |
| Web Vitals | Cinq métriques Core Web Vitals mesurées en continu |
| Analyse d'audience (GA4) | Pages vues automatiques, événements métier à la charge de chaque domaine |
| Feature flags et canary release | Activation par flag, tirage local à 10 % indépendant de la connexion |
| Intégration continue (Lighthouse CI) | Score mesuré à chaque envoi sur `dev`, un seul passage |
| Alertes Slack | Service indisponible détecté, ou erreur critique de rendu |
| Traçage distribué (OpenTelemetry) | Chaque appel réseau instrumenté automatiquement, envoyé à Honeycomb |

### Ce qui est réel, ce qui est démonstratif

Le suivi des erreurs, les Web Vitals, l'audience et le traçage sont des mesures directes,
sans limite de principe : ce qu'ils rapportent reflète l'état réel de l'application.

Le canary release est **simulé côté client** plutôt que par segment Flagsmith : chaque
navigateur tire un nombre une seule fois, le conserve, et l'utilise pour décider s'il
fait partie des 10 %. Suffisant pour démontrer le principe, mais un vrai découpage par
segment (compte utilisateur, région) demanderait la configuration Flagsmith payante.

L'alerte Slack utilise le mode `no-cors` du navigateur : le message part bien, mais le
code ne peut pas vérifier que Slack l'a reçu (la réponse n'est pas lisible). Une panne
prolongée ne déclenche qu'une seule alerte, pas une par minute, pour éviter le bruit.

Le score Lighthouse varie d'un envoi à l'autre selon la charge du serveur qui exécute le
test : un seul passage est mesuré par envoi plutôt qu'une moyenne, pour garder le pipeline
rapide.

---

## Conventions d'équipe

### Messages de commit

Format `[domaine] Action`, en français.

```
[crm] Ajout du hook useClients
[test] Tests des mutations optimistes du pipeline
[docs] Mise à jour du README
```

### Branches

Une branche par personne, fusionnée dans `dev` par demande de tirage. La branche `main`
est protégée et ne reçoit que les versions stables.

### Format des hooks de données

Tout hook de lecture renvoie la même forme, pour que l'interface puisse consommer
n'importe lequel de la même façon :

```ts
{ data, isLoading, isError, error, refetch }
```

Les hooks de mutation :

```ts
{ mutate, mutateAsync, isPending, isError, error }
```

### Fichiers partagés

`db.json`, `package.json`, `shared/` et la configuration sont modifiés après avoir
prévenu l'équipe. Toute nouvelle dépendance est signalée pour que chacun relance
l'installation.

---

## Répartition du travail

| Membre | Périmètre |
|---|---|
| Jessica | Authentification, gestion de projets, ressources humaines, paramètres, supervision |
| Youssef | Relation client, ressources d'entreprise, intelligence d'affaires, tableau de bord, sécurité |
| Rafael | Interface complète, composants partagés, accessibilité, performance |