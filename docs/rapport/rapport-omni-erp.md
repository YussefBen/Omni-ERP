# Omni-ERP

## Rapport de projet

**Application web de gestion d'entreprise — React et TypeScript**

Jessica Dubois · Youssef Ben Chouchane · Rafael Da Silva Mesquita

Septembre 2026

Dépôt : github.com/YussefBen/Omni-ERP
Démonstration : https://omni-erp-nine.vercel.app

---

## Sommaire

1. Introduction
2. Architecture générale
3. Choix techniques
4. Qualité et tests
5. Défis rencontrés et solutions
6. Axes d'amélioration
7. Conclusion
8. Annexes

---

# 1. Introduction

## 1.1 Contexte et objectif

Omni-ERP est une application web de gestion d'entreprise réunissant huit modules
métier : authentification, tableau de bord, gestion de projets, ressources humaines,
relation client, ressources d'entreprise, intelligence d'affaires et paramètres.

Le projet répond à une contrainte structurante : l'application ne dispose d'aucun
serveur applicatif propre. Elle s'alimente auprès de six sources de données externes
imposées, dont aucune n'a été conçue pour cet usage. Cette contrainte a orienté une
part importante des décisions techniques, et constitue le fil conducteur de ce rapport.

| Source          | Données fournies              | Domaines concernés  |
| --------------- | ----------------------------- | ------------------- |
| DummyJSON       | Clients, produits, paniers    | CRM, ERP            |
| JSONPlaceholder | Projets, tâches, commentaires | PMS, CRM            |
| Reqres.in       | Comptes utilisateurs          | Authentification    |
| RandomUser      | Profils employés              | Ressources humaines |
| OpenWeatherMap  | Météo et prévisions           | Tableau de bord     |
| JSON Server     | Données métier persistées     | Tous                |

## 1.2 Organisation de l'équipe

Le travail a été réparti par domaine plutôt que par couche technique, chaque membre
prenant la responsabilité complète de son périmètre.

| Membre  | Périmètre                                                                                    |
| ------- | -------------------------------------------------------------------------------------------- |
| Jessica | Authentification, gestion de projets, ressources humaines, paramètres, supervision           |
| Youssef | Relation client, ressources d'entreprise, intelligence d'affaires, tableau de bord, sécurité |
| Rafael  | Interface complète, composants partagés, accessibilité, performance                          |

Cette répartition supposait de fixer des conventions avant d'écrire la première ligne
de code, faute de quoi trois bases hétérogènes auraient été impossibles à assembler.
Ces conventions sont détaillées en section 2.4.

## 1.3 Méthode de travail

Le développement s'est organisé en trois semaines, chacune close par une intégration
complète.

| Semaine | Objectif                                            |
| ------- | --------------------------------------------------- |
| 1       | Socle commun, conventions, premiers domaines métier |
| 2       | Domaines restants, bonus sécurité et supervision    |
| 3       | Tests, interface, documentation, déploiement        |

Le dépôt suit un modèle à trois niveaux : une branche par personne, une branche
d'intégration `dev`, et une branche `main` protégée qui ne reçoit que les versions
stables. Chaque fusion passe par une demande de tirage, ce qui a permis de tracer
l'avancement et de relire le travail des autres.

---

# 2. Architecture générale

## 2.1 Organisation par domaine métier

Deux façons de structurer un projet React coexistent. **Par couche technique** : un
dossier `components`, un dossier `hooks`, un dossier `services`, chacun contenant les
fichiers de tous les domaines. **Par domaine métier** : un dossier par métier,
contenant ses propres composants, hooks et services.

Nous avons retenu la seconde.

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
├── shared/            composants, utilitaires et types communs
├── lib/               configuration du client de cache
└── test/              environnement de test
```

La raison première était organisationnelle. À trois en parallèle, une structure par
couche aurait signifié modifier les mêmes dossiers en permanence, et chaque fusion
aurait produit des conflits. Avec une structure par domaine, celui qui travaille sur le
CRM ne touche jamais aux fichiers du PMS.

Le bénéfice technique est apparu ensuite. Chaque domaine expose un point d'entrée
unique, et les autres importent uniquement depuis celui-ci :

```tsx
// Ce que les écrans écrivent
import { useClients, useNps } from "@/features/crm";

// Ce qu'ils n'écrivent jamais
import { useClients } from "@/features/crm/hooks/useClients";
```

La structure interne d'un domaine peut ainsi être réorganisée sans casser le code des
autres, tant que le point d'entrée expose les mêmes fonctions.

## 2.2 Trois niveaux dans chaque domaine

| Niveau           | Rôle                                                                 | Dépendances |
| ---------------- | -------------------------------------------------------------------- | ----------- |
| Service          | Seul à parler HTTP. Connaît les URLs, convertit les réponses brutes. | Axios       |
| Fonctions métier | Calculs purs : entrée, sortie, rien d'autre.                         | aucune      |
| Hooks            | Déclenchent les appels, appliquent les calculs au résultat.          | React Query |

Cette séparation a une conséquence directe sur les tests. Les fonctions métier n'ayant
aucune dépendance, elles se testent en trois lignes :

```ts
expect(getSegment(11900)).toBe("Enterprise");
```

Là où tester la même règle à travers un composant demanderait de monter React, simuler
un appel réseau et attendre le rendu.

## 2.3 Normalisation des données externes

Les API renvoient des structures que nous ne contrôlons pas. Chaque service les
convertit en types internes avant transmission.

Ce n'est pas une précaution de style. Voici ce que DummyJSON renvoie pour un
utilisateur, hors des champs utiles :

```json
{
  "password": "emilyspass",
  "ssn": "900-590-289",
  "bank": { "cardNumber": "9289760655481815", "cardExpire": "03/26" },
  "crypto": { "wallet": "0xb9fc2fe63b2a6c003f1c324c3bfa53259162181a" }
}
```

Mot de passe, numéro de sécurité sociale, carte bancaire, portefeuille de
cryptomonnaie. Aucune de ces données n'a sa place dans un CRM. Les appels restreignent
donc explicitement les champs demandés :

```ts
clientsApi.get("/users", {
  params: { select: "firstName,lastName,email,phone,company,address" },
});
```

Le second bénéfice est l'isolation : si une API renomme un champ, une seule fonction est
à corriger.

## 2.4 Conventions d'équipe

Trois conventions ont été fixées avant le développement, et se sont révélées
déterminantes pour l'assemblage.

**Format unique de retour des hooks.** Tout hook de lecture renvoie la même forme, quel
que soit le domaine :

```ts
{ data, isLoading, isError, error, refetch }
```

L'interface peut ainsi consommer indifféremment n'importe quel domaine, sans apprendre
trois conventions différentes.

**Messages de commit normalisés.** Format `[domaine] Action`, en français. L'historique
reste lisible et permet de retrouver quand une décision a été prise.

**Fichiers partagés annoncés.** `db.json`, `package.json`, `shared/` et la
configuration ne sont modifiés qu'après avoir prévenu l'équipe. Toute nouvelle
dépendance est signalée pour que chacun relance l'installation.

---

# 3. Choix techniques

## 3.1 Pile technique

| Domaine           | Outil                        | Raison du choix                              |
| ----------------- | ---------------------------- | -------------------------------------------- |
| Construction      | Vite                         | Démarrage instantané, rechargement à chaud   |
| Langage           | TypeScript                   | Typage strict sur toute la base de code      |
| Interface         | React 19                     | —                                            |
| Données distantes | React Query                  | Cache, invalidation, mises à jour optimistes |
| État global       | Zustand                      | Léger, sans code répétitif                   |
| Requêtes HTTP     | Axios                        | Intercepteurs, une instance par source       |
| Formulaires       | React Hook Form et Zod       | Validation typée, messages par règle         |
| Graphiques        | Recharts                     | Composants React natifs                      |
| Listes longues    | react-window                 | Virtualisation                               |
| Événements        | RxJS                         | Motif Observateur                            |
| Tests             | Vitest, Testing Library, MSW | Interception réseau, tests déterministes     |
| Sécurité          | DOMPurify                    | Assainissement des saisies                   |
| Export            | jsPDF                        | Génération côté navigateur                   |
| Hébergement       | Vercel et Render             | Application statique et API de données       |

Deux choix méritent une justification.

**Zustand plutôt que Redux.** Le projet n'a que deux états véritablement globaux : la
session utilisateur et les préférences d'affichage. Redux aurait imposé actions,
réducteurs et middleware pour deux magasins de quinze lignes.

**React Query plutôt qu'un état global pour les données distantes.** Les données
serveur ne sont pas de l'état applicatif : elles ont un cycle de vie propre, avec
péremption, revalidation et invalidation. Les traiter comme de l'état global aurait
signifié réécrire ce mécanisme à la main.

## 3.2 Authentification et permissions

L'authentification s'appuie sur Reqres.in, seule source imposée à fournir des comptes
utilisateurs. L'API ne renvoie qu'un jeton à la connexion, jamais le profil complet : le
service recherche donc l'adresse courriel dans la liste des comptes (deux pages, six
comptes chacune) pour reconstituer une identité exploitable.

```ts
async function findUserByEmail(email: string) {
  const [page1, page2] = await Promise.all([
    reqresApi.get("/users", { params: { page: 1 } }),
    reqresApi.get("/users", { params: { page: 2 } }),
  ]);
  return [...page1.data.data, ...page2.data.data].find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
}
```

**La session.** Un jeton d'expiration simulé est posé à 30 minutes, stocké dans un
magasin Zustand persistant. Un contrôle périodique le renouvelle automatiquement tant
que l'utilisateur reste actif, et déconnecte silencieusement au-delà — Reqres n'exposant
aucune notion d'expiration réelle, ce mécanisme est entièrement recréé côté client.

**Le rôle utilisateur.** Reqres n'a pas de notion de rôle. La même logique que pour le
NPS en section 5.1 s'applique : une fonction de hachage déterministe dérive un rôle à
partir de l'identifiant du compte, garantissant qu'un même compte obtient toujours le
même rôle sans nécessiter de stockage séparé.

| Rôle           | Autorise typiquement                              |
| -------------- | -------------------------------------------------- |
| Administrateur | Toutes les actions, y compris la suppression       |
| Manager        | Validation des demandes, modification des données  |
| Utilisateur    | Consultation, création de ses propres éléments     |

Deux composants d'ordre supérieur exploitent ce rôle sans dupliquer la logique de
vérification : `withAuth` redirige vers la connexion si aucune session n'est active,
`withPermissions` masque un composant entier si le rôle courant ne figure pas dans la
liste autorisée.

```tsx
export const DeleteButton = withPermissions(RawDeleteButton, ["admin"]);
```

`ProtectedRoute` répond au même besoin au niveau du routeur plutôt que du composant, pour
les cas où l'on protège un ensemble d'écrans plutôt qu'un élément isolé.

Trois tentatives de connexion échouées déclenchent un blocage d'une minute, entièrement
côté client — un compteur en mémoire du navigateur, sans garantie contre un appel direct
à l'API en dehors de l'interface. Cette limite est la même que celle décrite pour le
rate limiting en section 5.2, et le défaut découvert sur son expiration est détaillé en
section 5.4.

## 3.3 Gestion de projets et ressources humaines

**Une source externe qui n'écrit jamais réellement.** JSONPlaceholder fournit les
projets et les tâches, mais n'enregistre aucune écriture malgré des réponses qui
paraissent correctes. Toute modification est donc dirigée vers JSON Server sous forme
de surcharge, identifiée par le même identifiant que l'élément d'origine, et jointe à la
lecture :

```ts
const override = overrideMap.get(post.id);
return {
  id: post.id,
  title: override?.title ?? post.title,
  status: override?.status ?? deriveProjectStatus(post.id),
};
```

Un projet créé entièrement dans l'application reçoit un identifiant attribué par JSON
Server. Cette différence de convention entre les deux sources s'est révélée être à
l'origine d'un défaut décrit en section 5.4.

**Suppression restreinte.** Supprimer un élément d'origine externe est refusé, avec un
message explicite plutôt qu'un faux succès : au rafraîchissement suivant, JSONPlaceholder
n'ayant jamais vraiment supprimé quoi que ce soit, l'élément serait réapparu. Seuls les
éléments créés dans l'application peuvent être réellement supprimés.

**Mutations optimistes.** Le déplacement d'une tâche sur le tableau applique le même
motif que celui détaillé en section 3.4 pour le pipeline de vente — annulation des
requêtes en vol, sauvegarde, modification immédiate, retour arrière en cas d'échec. Seules
les modifications en bénéficient : une création optimiste demanderait de réconcilier un
identifiant temporaire avec celui fourni par le serveur, pour un gain limité sur une
action ponctuelle.

**Ressources humaines.** La fiche d'un employé fusionne deux sources indépendantes par
position dans leurs listes respectives : Reqres pour l'identité du compte, RandomUser
pour des coordonnées réalistes. Département, équipe et compétences n'existant dans
aucune des deux, ils sont dérivés de l'identifiant selon le même principe déterministe
qu'en authentification.

L'analyse des écarts de compétences compare une liste de compétences requises à celles
disponibles dans l'équipe :

```ts
function getSkillGapAnalysis(required: string[], employees: Employee[]) {
  return required.map((skill) => ({
    skill,
    availableCount: employees.filter((e) => e.skills.includes(skill)).length,
  }));
}
```

Le solde de congés se calcule à la lecture plutôt que d'être stocké, à partir des
demandes déjà validées :

```ts
const usedDays = requests
  .filter((r) => r.status === "approved")
  .reduce((total, r) => total + countLeaveDays(r.startDate, r.endDate), 0);
const remainingDays = ANNUAL_LEAVE_DAYS - usedDays;
```

Ce calcul à la volée évite qu'un solde stocké ne diverge du détail des demandes qui le
composent — le même principe que la note fournisseur en annexe 8.2.

## 3.4 Relation client et pipeline de vente

Le pipeline de vente se manipule par glisser-déposer. Attendre la réponse du serveur
avant de déplacer visuellement une carte produirait un délai perceptible à chaque
action.

Les mutations appliquent donc le changement immédiatement dans le cache, puis émettent
la requête en arrière-plan :

| Moment      | Action                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| `onMutate`  | Annuler les requêtes en vol, sauvegarder l'état, appliquer le changement |
| Requête     | Envoyée en arrière-plan                                                  |
| `onError`   | Restaurer l'état sauvegardé                                              |
| `onSuccess` | Publier l'événement de changement d'étape                                |
| `onSettled` | Invalider le cache pour resynchroniser                                   |

Trois précautions méritent explication.

**Annuler les requêtes en vol.** Sans cela, une lecture partie deux secondes plus tôt
peut revenir après notre modification et écraser l'affichage avec les anciennes
données. Le déplacement semblerait s'annuler tout seul.

**Sauvegarder avant de modifier.** C'est ce qui distingue une mise à jour optimiste
d'une simple modification locale : sans copie de l'état antérieur, il n'y a rien à
restaurer en cas de refus.

**Invalider après coup, succès ou échec.** Le serveur reste la référence.
L'invalidation force une relecture qui corrige tout écart résiduel.

## 3.5 Motif Observateur

Le pipeline devait notifier l'interface à chaque changement d'étape. La solution
directe aurait lié le CRM au tableau de bord :

```ts
// Ce qu'on a évité
onSuccess: () => {
  afficherNotification("Opportunité déplacée"); // le CRM connaît l'affichage
};
```

Un bus d'événements RxJS évite ce couplage. La mutation publie, sans savoir qui
écoute :

```ts
// Ce qu'on a fait
onSuccess: () => {
  publishPipelineEvent({ type: "stage-changed", opportunityId, toStage });
};
```

On peut ensuite ajouter une notification, un journal d'audit ou une animation sans
jamais rouvrir le fichier de la mutation.

**Deux décisions à retenir.** Le bus utilise un `Subject` et non un `BehaviorSubject` :
ce dernier rejoue son dernier message à tout nouvel abonné, et un écran ouvert dix
minutes après un déplacement afficherait une notification pour un événement déjà
traité. Et l'événement est publié dans `onSuccess`, pas dans `onMutate` : publier au
moment de la mise à jour optimiste notifierait un déplacement susceptible d'être
annulé.

Le même mécanisme sert aux notifications applicatives, ce qui permet à n'importe quel
domaine d'émettre un message sans connaître l'écran qui l'affiche.

## 3.6 Indicateurs et analyses

Chaque indicateur du tableau de bord porte quatre informations :

```ts
{
  value: 12000,          // période courante
  previousValue: 10000,  // période précédente, de durée égale
  deltaPercent: 20,      // écart
  direction: 'hausse',   // sens
  lowerIsBetter: false   // une hausse est-elle une bonne nouvelle ?
}
```

Deux raffinements ajoutés à l'usage.

**Un seuil de stabilité de 2 %.** Sans lui, un indicateur passant de 100 à 101
s'affiche en hausse. Sur vingt indicateurs, le tableau de bord signalerait du bruit en
permanence.

**Un drapeau de lecture inversée.** Pour les ruptures de stock, les retards et les
annulations, une baisse est une bonne nouvelle. Sans cette information portée par la
donnée, chaque écran devrait reconstituer la règle métier :

```tsx
<span className={isFavorable(kpi) ? 'vert' : 'rouge'}>
```

**Une seule définition par calcul.** Le taux de rotation des stocks est défini dans le
domaine ERP et importé par la BI ; le NPS et le taux de conversion viennent du CRM.
L'enjeu n'est pas d'économiser des lignes, mais d'éviter que deux écrans affichent des
valeurs divergentes pour le même indicateur.

## 3.7 Interface et composants partagés

> **[À COMPLÉTER — Rafael]**
>
> Points à couvrir :
>
> - La bibliothèque de composants et les principes retenus
> - Le thème clair et sombre, et comment il est propagé
> - La virtualisation des listes longues et son effet mesuré
> - Les choix d'accessibilité : navigation au clavier, attributs ARIA, contrastes
> - Les états de chargement et d'erreur

## 3.8 Supervision et mesure

Bonus complémentaire aux quatre domaines métier, ce module répond à une question
distincte : une fois l'application en service, comment savoir qu'elle fonctionne
correctement, et être averti rapidement si ce n'est pas le cas.

**Suivi des erreurs.** Toute exception non gérée, ainsi que les mutations React Query en
échec, sont envoyées à Sentry avec le contexte de l'utilisateur connecté (identifiant et
rôle, jamais ses données personnelles). L'`ErrorBoundary` partagé, déjà prévu par
Rafael, expose exactement le point d'extension nécessaire.

**Web Vitals.** Les cinq métriques standard du secteur (CLS, INP, LCP, FCP, TTFB) sont
mesurées en continu via le paquet officiel `web-vitals`, plutôt qu'une mesure de
performance maison moins comparable à un référentiel connu.

**Analyse d'audience.** Google Analytics 4 enregistre automatiquement chaque changement
de route. Le suivi des événements métier (création d'un projet, ajout d'une tâche) reste
à la charge de chaque domaine, seul responsable de savoir quand un événement significatif
survient.

**Feature flags et canary release — ce qui est réel, ce qui est simulé.** Flagsmith
gère l'activation ou la désactivation d'une fonctionnalité par environnement, ce qui est
une fonctionnalité réelle du service. Le tirage des 10 % d'utilisateurs qui voient une
nouveauté en premier, en revanche, est simulé côté client plutôt que géré par un vrai
segment Flagsmith, dont la segmentation avancée relève de leur offre payante :

```ts
const bucket = Math.floor(Math.random() * 100); // tiré une seule fois, conservé localement
const isInCanaryGroup = bucket < 10;
```

Le tirage n'a lieu qu'une fois par navigateur, sinon un même utilisateur changerait de
groupe à chaque rafraîchissement — ce qui viderait le principe même d'un déploiement
progressif.

**Intégration continue.** Un contrôle Lighthouse s'exécute automatiquement à chaque envoi
sur `dev` via GitHub Actions, plutôt qu'une vérification manuelle ponctuelle. Un seul
passage est effectué par exécution pour garder le pipeline rapide, au prix d'une légère
variabilité du score d'un envoi à l'autre.

**Alertes automatiques.** Une panne détectée sur l'un des six services externes, ou une
erreur critique de rendu, déclenche un message Slack. L'envoi utilise le mode `no-cors`
du navigateur, Slack ne renvoyant pas d'en-têtes autorisant une lecture normale de sa
réponse depuis un site tiers : le message part bien, mais le code ne peut pas confirmer
sa réception. Une seule alerte est émise par début de panne, pour éviter un message par
minute tant qu'un service reste indisponible.

**Traçage distribué.** OpenTelemetry instrumente `XMLHttpRequest` plutôt que `fetch` : en
navigateur, Axios repose en interne sur `XMLHttpRequest`, et instrumenter `fetch`
n'aurait tracé aucun des appels réels de l'application. Chaque échange réseau, quel que
soit le domaine qui l'initie, est ainsi chronométré et envoyé à Honeycomb sans qu'aucun
service n'ait eu à s'en préoccuper individuellement.

**Le coût de l'instrumentation.** Ce module a eu deux effets de bord sur le reste du
projet, décrits en section 5.5 : l'en-tête de traçage ajouté à chaque requête a été
refusé par plusieurs API, et l'une des bibliothèques recourt à l'évaluation dynamique de
chaînes, ce qui a demandé d'assouplir la politique de sécurité du contenu.

---

# 4. Qualité et tests

## 4.1 Périmètre et couverture

Le projet compte **625 tests répartis sur 55 fichiers**, pour une couverture globale de
**85 %**, au-dessus du seuil de 80 % fixé par le cahier des charges.

| Domaine                 | Couverture d'instructions |
| ----------------------- | ------------------------- |
| Paramètres              | 100 %                     |
| Intelligence d'affaires | 98 à 100 %                |
| Sécurité                | 97 à 99 %                 |
| Relation client         | 97 %                      |
| Ressources d'entreprise | 93 à 97 %                 |
| Tableau de bord         | 91 à 100 %                |
| Gestion de projets      | 86 à 96 %                 |
| Ressources humaines     | 88 à 100 %                |
| Authentification        | 74 à 98 %                 |
| Composants d'interface  | _à compléter_             |

## 4.2 Ce qui est testé

| Catégorie              | Exemples                                          | Environnement                     |
| ---------------------- | ------------------------------------------------- | --------------------------------- |
| Fonctions métier pures | NPS, transitions du pipeline, rotation des stocks | aucun                             |
| Hooks de données       | `useClients`, `useOrders`, `useKPIs`              | React Query + interception réseau |
| Mutations              | déplacement, création, suppression, évaluation    | idem, avec cas d'échec            |

Les mutations sont toujours testées **dans les deux sens** : le cas nominal, mais
surtout le cas d'échec avec vérification du retour arrière. Une mutation qui réussit ne
prouve pas grand-chose ; c'est quand le serveur refuse que le mécanisme montre sa
valeur.

## 4.3 Pourquoi simuler le réseau

Les appels aux sources externes sont interceptés par MSW, qui répond à leur place avec
des jeux de données réduits.

**Les tests ne dépendent de rien d'extérieur.** Ni connexion, ni disponibilité des API.
Ils donnent le même résultat sur n'importe quelle machine, à n'importe quel moment.

**Les valeurs deviennent prévisibles.** Avec trois clients au lieu de deux cents, un
test peut affirmer une valeur exacte :

```ts
// Emily a deux paniers : 900 € et 11 000 €
expect(emily.totalSpent).toBe(11900);
expect(emily.segment).toBe("Enterprise");
```

Sur les données réelles, il aurait fallu se contenter de `toBeGreaterThan(0)`, ce qui
ne vérifie presque rien.

**Les pannes se simulent en une ligne.** Faire répondre un code 500 permet de vérifier
que l'application dégrade proprement au lieu de planter.

**L'interception protège aussi de l'extérieur.** Les services de supervision ont dû être
ajoutés aux règles d'interception : sans cela, chaque exécution de la suite de tests
publiait de vraies alertes dans le canal de discussion de l'équipe et envoyait des
traces au service de mesure. Un test ne doit rien produire au-delà de son propre
résultat.

## 4.4 Ce qui n'est pas testé, et pourquoi

Le comportement des bibliothèques tierces est exclu. Vérifier que React Query met bien
en cache reviendrait à tester le travail de quelqu'un d'autre, et à lier nos tests à
des détails d'implémentation susceptibles de changer.

## 4.5 Les cas limites, là où se logent les erreurs

Une part importante des tests porte sur les situations où le calcul n'a pas de réponse
évidente : liste vide, division par zéro, valeur de référence nulle, valeurs exactement
à la frontière de deux catégories.

Un score de 6 est un détracteur, un score de 7 un passif. Une inégalité stricte au lieu
d'une inégalité large, et tout le calcul du NPS se décale sans que rien ne semble
anormal à l'écran.

Deux tests vérifient des propriétés qu'aucune manipulation manuelle ne révélerait.

Le premier appelle **cinquante fois** la fonction de hachage avec le même identifiant
et vérifie qu'elle renvoie toujours la même valeur. Sans cette garantie, le NPS
changerait à chaque rafraîchissement.

Le second **monte puis démonte trois fois** un composant abonné au bus d'événements
avant de publier un message, et vérifie qu'un seul abonné réagit. Sans libération au
démontage, chaque montage empilerait un abonné jamais libéré — une fuite mémoire
invisible en usage normal.

---

# 5. Défis rencontrés et solutions

## 5.1 Des données absentes des API imposées

**Le problème.** Trois informations nécessaires au métier n'existent dans aucune des
sources imposées.

| Donnée manquante           | Source          | Conséquence                       |
| -------------------------- | --------------- | --------------------------------- |
| Note de satisfaction       | JSONPlaceholder | Le NPS ne peut pas être calculé   |
| Statut et date de commande | DummyJSON       | Aucun suivi ni analyse temporelle |
| Rôle utilisateur           | Reqres          | Aucune gestion de permissions     |

**La solution.** Deux stratégies selon la nature de la donnée.

_Dériver, quand la donnée peut se déduire._ Le score de satisfaction et le rôle
utilisateur sont calculés à partir d'un identifiant, par une fonction de hachage. Le
point essentiel est le **déterminisme** : un identifiant donné produit toujours la même
valeur. Un tirage aléatoire aurait fait varier le NPS à chaque rafraîchissement, et
rendu l'application impossible à tester puisqu'aucune valeur n'aurait été prévisible.

_Stocker, quand la donnée relève d'une décision._ Le statut d'une commande résulte
d'une action humaine. Il est donc enregistré dans la base locale et joint aux lignes
distantes à la lecture :

```
DummyJSON /carts     →  lignes de commande, montants
JSON Server /orders  →  statut, date, dernière modification
                     ↓
                Commande complète
```

Ce choix résout au passage l'absence de dates, sans laquelle aucune analyse temporelle
n'aurait été possible.

## 5.2 Un serveur qui n'existe pas

**Le problème.** Le bonus sécurité demande une protection CSRF, une limitation des
tentatives de connexion et un journal d'audit. Or ces trois mesures reposent
normalement sur un serveur applicatif : refuser une requête sans jeton valide, bloquer
une adresse IP, écrire un journal qu'un client ne peut pas falsifier.

Ici, JSON Server enregistre ce qu'on lui envoie sans rien vérifier, et les API
publiques ignorent la notion d'utilisateur connecté.

**La solution.** Implémenter les mécanismes complètement, puis documenter précisément
leur portée réelle.

| Mesure                     | Protection réelle ? | Pourquoi                                            |
| -------------------------- | ------------------- | --------------------------------------------------- |
| Assainissement des saisies | Oui                 | S'exécute là où se trouve la menace : le navigateur |
| Politique de mots de passe | Oui                 | La validation a lieu avant l'envoi                  |
| En-têtes de sécurité       | Oui                 | Appliqués par l'hébergeur, hors de portée du client |
| Secrets hors du dépôt      | Partielle           | Protège de la diffusion publique, pas de la lecture |
| Journal d'audit            | Partielle           | Écrit par le client, donc falsifiable               |
| Limitation des tentatives  | Non                 | Compteur en mémoire du navigateur, contournable     |
| Protection CSRF            | Non                 | Aucun serveur ne vérifie le jeton                   |

**Une limite structurelle sur les secrets.** Vite n'expose au navigateur que les
variables préfixées `VITE_`. Toute clé utilisée par l'application est donc lisible dans
le code envoyé au client : il suffit d'ouvrir les outils de développement pour la
retrouver. Cela vaut pour la clé météo, mais aussi pour l'adresse du canal d'alerte et
la clé du service de traçage.

Les tenir hors du dépôt protège de leur diffusion publique sur la plateforme de
versionnage, pas de leur lecture par un visiteur du site. C'est une conséquence directe
de l'absence de serveur : sans intermédiaire pour porter les clés, une application
front-end ne peut rien cacher.

Cette distinction nous a paru préférable à la présentation d'un dispositif homogène qui
aurait laissé croire à une protection inexistante.

## 5.3 Deux indicateurs sans passé

**Le problème.** Le tableau de bord compare chaque indicateur à la période précédente.
Le nombre de ruptures de stock est un instantané — il n'existe aucune photographie de
l'état du stock la semaine dernière. Et le NPS porte sur des commentaires que
JSONPlaceholder ne date pas.

**La solution.** Assumer la limite. Ces deux indicateurs affichent une variation nulle,
et le code explique pourquoi. Fabriquer une valeur antérieure aurait produit un écart
dénué de sens.

La même logique gouverne la prévision de chiffre d'affaires. La régression linéaire
renvoie son coefficient de détermination :

```ts
{ points: [...], slope: 3000, confidence: 0.04 }
```

Un R² de 0,04 signifie que la tendance est quasi inexistante. L'interface peut donc
afficher « tendance peu marquée, prévision indicative » au lieu de présenter un chiffre
incertain comme une certitude.

## 5.4 Trois défauts découverts en cours de projet

**Une dérive d'arrondi.** L'agrégation des achats d'un client arrondissait le total
après chaque commande plutôt qu'une seule fois à la fin.

```
Deux commandes de 33,333 €

Calcul erroné :  arrondi(33,33 + 33,333) = 66,66 €
Calcul correct : arrondi(33,333 + 33,333) = 66,67 €
```

Un centime sur deux commandes, mais l'erreur s'accumule : sur cinquante commandes,
l'écart devient visible sur une fiche client. Aucune manipulation dans l'interface ne
l'aurait révélé — le montant affiché paraissait plausible.

**Un blocage permanent.** La limitation des tentatives de connexion bloque un compte
après trois échecs, pendant une minute. Le compteur ne repartait pas de zéro à
l'expiration :

```
3 échecs         → compteur = 3, blocage jusqu'à T+60s
T+61s, tentative → compteur toujours à 3 → rebloqué immédiatement
```

Un blocage prévu pour durer une minute devenait définitif. Seul un test simulant
l'écoulement du temps a permis de le voir.

**Une date impossible à calculer.** L'échéance d'un projet est dérivée de son
identifiant par un calcul modulo, qui suppose un identifiant numérique — ce que fournit
JSONPlaceholder. Mais un projet créé depuis l'application reçoit un identifiant
alphanumérique attribué par JSON Server :

```
seed = "fDx0YJ7-L0o"
seed % 61                    →  NaN
new Date(Date.now() + NaN)   →  Invalid Date
date.toISOString()           →  RangeError: Invalid time value
```

L'exception remontait jusqu'au tableau de bord, qui n'affichait plus rien du tout. Le
défaut illustre le fil conducteur du projet : deux sources aux conventions différentes,
et un code qui suppose la forme de l'une sans la vérifier.

Contrairement aux deux précédents, celui-ci n'a pas été trouvé par les tests. Ceux du
domaine utilisaient tous des identifiants numériques, comme JSONPlaceholder — le cas
alphanumérique n'apparaissait qu'après une création réelle dans l'application. Il a
fallu le déploiement, puis un point d'arrêt sur exception, pour le localiser.

La correction normalise le seed par hachage lorsqu'il s'agit d'une chaîne, selon le même
principe que le score de satisfaction en 5.1.

## 5.5 Le prix d'une politique de sécurité réellement appliquée

La politique de sécurité du contenu n'est pas un fichier qu'on écrit une fois. Chaque
service ajouté au projet a demandé de l'étendre, et deux incidents ont marqué la mise en
production.

**Vingt requêtes bloquées.** Après le premier déploiement, l'application ne chargeait
aucune donnée métier. La politique n'autorisait que les six API du projet, et les quatre
services de supervision ajoutés ensuite — suivi d'erreurs, mesure d'audience, indicateurs
web, traçage — n'y figuraient pas.

**Une bibliothèque qui évalue des chaînes.** L'application ne démarrait pas du tout en
production, sans message d'erreur exploitable. La cause était un appel à l'évaluation
dynamique de code, utilisé par l'une des bibliothèques d'instrumentation, que la
directive `script-src` interdit par défaut. Autoriser `'unsafe-eval'` a résolu le
blocage, au prix d'une protection réellement affaiblie : c'est précisément cette
directive qui empêche l'exécution de code injecté sous forme de chaîne.

**Un en-tête refusé par les API.** Le traçage distribué ajoute un en-tête à chaque
requête sortante, ce qui déclenche une vérification préalable côté navigateur. Plusieurs
API imposées refusent cet en-tête, ce qui bloquait l'intégralité des appels en
développement. Le traçage doit être restreint aux points d'accès du projet.

Ces trois incidents partagent la même leçon : une mesure de sécurité qui ne bloque
jamais rien n'est probablement pas appliquée. Le coût de maintenance est le signe qu'elle
fonctionne.

## 5.6 Difficultés de coordination

> **[À COMPLÉTER — ensemble]**
>
> Quelques pistes vécues :
>
> - Les fichiers partagés modifiés sans prévenir, et le temps perdu à chercher une
>   erreur venant d'ailleurs
> - Les dépendances ajoutées sans annonce, qui cassaient la compilation chez les autres
> - Les chemins d'import relatifs, source récurrente d'erreurs, et le passage à l'alias
> - Ce qui a bien fonctionné : les conventions posées tôt, les demandes de tirage

---

# 6. Axes d'amélioration

## 6.1 Un serveur applicatif

La limite la plus structurante du projet est l'absence de backend. Elle empêche toute
protection réelle contre le CSRF, toute limitation de débit fiable, tout journal d'audit
non falsifiable, et rend impossible de garder un secret côté application.

Le déploiement a contourné une partie du problème en hébergeant l'API de données sur une
instance distante, ce qui rend l'application pleinement fonctionnelle en ligne. Mais
cette instance n'est pas un backend pour autant : aucune règle métier, aucune
authentification, aucune validation ne s'y applique. Elle stocke ce qu'on lui envoie.

L'implémentation actuelle est conçue pour rendre le déplacement simple : la vérification
du jeton CSRF est isolée dans une fonction unique, et la porter côté serveur ne
demanderait pas de réécrire le reste.

## 6.2 Chargement différé des dépendances lourdes

La bibliothèque de génération de PDF pèse environ 400 kilooctets et ne sert que sur les
écrans d'analyse. Elle est actuellement incluse dans le paquet principal : tout
utilisateur qui ouvre l'application la télécharge, même s'il n'exporte jamais.

```ts
// Chargée seulement au premier export
const { default: jsPDF } = await import("jspdf");
```

La modification n'a pas été faite faute de pouvoir mesurer avant et après sur des
écrans définitifs.

## 6.3 Filtrage des clients par statut et segment

La liste des clients ne peut pas être filtrée sur ces deux critères. Le segment étant
calculé à la lecture et non stocké, un filtrage côté serveur est impossible ; un
filtrage côté client donnerait des résultats incohérents avec la pagination — on
filtrerait la page affichée, pas l'ensemble.

## 6.4 Historisation des états instantanés

Enregistrer périodiquement l'état du stock permettrait de suivre l'évolution des
ruptures dans le temps, ce qui est plus utile qu'un décompte instantané, et lèverait la
limite décrite en 5.3.

## 6.5 Normalisation systématique des identifiants

Le défaut décrit en 5.4 vient d'un calcul qui suppose la forme d'un identifiant. Le même
risque existe partout où deux sources aux conventions différentes alimentent un même
domaine. Une normalisation appliquée à l'entrée de chaque service, plutôt qu'au cas par
cas dans les fonctions de calcul, écarterait toute la famille de défauts d'un coup.

## 6.6 Autres pistes

**Segmentation réelle du canary release.** Le tirage à 10 % décrit en 3.8 est simulé
côté client. Un vrai plan Flagsmith permettrait de cibler par compte ou par région
plutôt que par un tirage aléatoire local, et de piloter la bascule vers 50 % puis 100 %
depuis leur interface plutôt qu'en modifiant le code.

**Historique des demandes de congés.** Le solde se recalcule à la lecture à partir des
demandes validées, ce qui est fiable mais ne conserve aucune trace d'un solde antérieur
à une date donnée — utile pour un futur export de bilan social par exemple.

> **[À COMPLÉTER — Rafael]**
>
> Deux ou trois axes propres à votre domaine.

---

# 7. Conclusion

Le projet a livré une application couvrant huit domaines métier, alimentée par six
sources de données hétérogènes, avec une couverture de tests de 85 %.

La contrainte des API imposées s'est révélée plus formatrice qu'un backend sur mesure
ne l'aurait été. Elle a obligé à composer avec des données incomplètes, à décider ce
qui pouvait être dérivé et ce qui devait être stocké, et à documenter ces choix plutôt
que de les laisser implicites.

L'écriture des tests a modifié notre rapport au code. Les défauts découverts n'étaient
pas des erreurs d'inattention mais des raisonnements incomplets : arrondir trop tôt,
oublier de réinitialiser un compteur, supposer la forme d'une donnée. Formuler ce que le
code doit faire, avant de vérifier qu'il le fait, impose une précision que la relecture
seule n'apporte pas.

La mise en production a enseigné autre chose encore. Un défaut peut traverser six cents
tests sans être vu, parce que les tests reproduisent les hypothèses de celui qui les
écrit. Le déploiement, lui, confronte le code à des conditions qu'on n'avait pas prévues
— et c'est précisément pour cela qu'il doit intervenir tôt plutôt que la veille du rendu.

Enfin, le travail à trois sur une base commune a montré la valeur des conventions
posées tôt. Le format unique de retour des hooks, décidé avant la première ligne de
code, a permis à l'interface de consommer indifféremment n'importe quel domaine. À
l'inverse, chaque fichier partagé modifié sans prévenir a coûté du temps à tout le
monde.

---

# 8. Annexes

## 8.1 Conformité au cahier des charges — CRM

| Exigence                                        | Réalisation                                          |
| ----------------------------------------------- | ---------------------------------------------------- |
| Service de connexion à DummyJSON                | `crmService.ts`, instance dédiée, champs restreints  |
| Type Client avec statut, segment, historique    | Statut saisi, segment calculé, commandes rattachées  |
| Type Opportunity avec commercial responsable    | Champ `owner` obligatoire, mutation de réassignation |
| Types PipelineStage et Feedback                 | 6 étapes avec probabilité, avis normalisés           |
| Hooks useClients, useOpportunities, useFeedback | Livrés au format commun                              |
| Logique du pipeline                             | Transitions contraintes, étapes terminales           |
| Calcul du NPS                                   | Promoteurs 9-10, passifs 7-8, détracteurs 0-6        |
| Observer Pattern avec RxJS                      | Bus d'événements + `usePipelineObserver`             |

## 8.2 Conformité — ERP

| Exigence                                    | Réalisation                                               |
| ------------------------------------------- | --------------------------------------------------------- |
| Service DummyJSON et JSON Server            | `erpService.ts`, une instance par source                  |
| Types Product, Order, OrderStatus, Supplier | Livrés, avec niveau de stock dérivé                       |
| Fournisseur avec évaluation                 | Note recalculée à la lecture, rattachement par catégorie  |
| Hooks useProducts, useOrders, useSuppliers  | Pagination, recherche, filtres                            |
| Alerte de réapprovisionnement               | Tri par criticité, quantité manquante, valeur du réassort |
| Historique des mouvements de stock          | Généré par les changements de statut des commandes        |
| Taux de rotation                            | Fonction pure réutilisée par la BI                        |
| Recherche temporisée                        | Hook `useDebounce` partagé                                |

## 8.3 Conformité — BI et tableau de bord

| Exigence                               | Réalisation                                         |
| -------------------------------------- | --------------------------------------------------- |
| Agrégation sur l'écran d'accueil       | `useDashboardData` : indicateurs, alertes, météo    |
| Météo et prévisions                    | OpenWeatherMap, relevés agrégés par jour            |
| Notifications internes                 | Bus utilisable depuis n'importe quel domaine        |
| Indicateurs de tous les domaines       | 20 indicateurs sur 5 domaines                       |
| Comparaison avec la période précédente | Valeur, écart, sens, drapeau de lecture             |
| Analyses et prévisions                 | Séries mensuelles, répartition, régression linéaire |
| Export PDF et CSV                      | Génération côté navigateur, sans serveur            |

## 8.4 Conformité — Sécurité

| Exigence                           | Réalisation                                                          |
| ---------------------------------- | -------------------------------------------------------------------- |
| Validation forte des mots de passe | 6 critères, indicateur de force, rejet des mots courants             |
| Protection XSS                     | DOMPurify sur toutes les saisies libres                              |
| Protection CSRF                    | Jeton par session, rotation, intercepteur Axios                      |
| Rate limiting                      | 3 tentatives par minute et par identifiant                           |
| Journal d'audit                    | Actions sensibles tracées, consultation réservée aux administrateurs |
| En-têtes de sécurité               | CSP, HSTS, X-Frame-Options et 4 autres via `vercel.json`             |

## 8.5 Conformité — Authentification, PMS, HRM

| Exigence                                                        | Réalisation                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Service de connexion à Reqres.in                                | `authService.ts` : login, register, fetchUsers, updateUser, deleteUser               |
| Rôle utilisateur                                                | Dérivé de l'identifiant par hachage déterministe (admin/manager/user)                |
| Session avec expiration et rafraîchissement                     | Jeton simulé de 30 min, renouvelé tant que l'utilisateur reste actif                 |
| Persistance de session, connexion automatique après inscription | Magasin Zustand persistant ; `useRegister` ouvre la session sans écran intermédiaire |
| Protection des routes et des actions                            | `ProtectedRoute`, `withAuth`, `withPermissions`                                      |
| Limitation des tentatives de connexion                          | 3 échecs, blocage d'une minute (limite décrite en 5.2)                               |
| Service RandomUser + Reqres pour les employés                   | `hrmService.ts`, fusion par position                                                 |
| Congés et présence sur JSON Server                              | `useLeaveRequests`, `usePresence`, cycle demande → validation                        |
| Recherche et filtres employés                                   | `useEmployees(filters)` : nom, compétences, disponibilité                            |
| Analyse des écarts de compétences                               | `getSkillGapAnalysis`                                                                |
| Solde de congés                                                 | Calculé à la lecture depuis les demandes validées                                    |
| Service JSONPlaceholder + JSON Server pour les projets          | `pmsService.ts`, surcharge locale jointe aux données externes                        |
| Types Project, Task, Comment                                    | Livrés, avec `estimatedHours` sur les tâches                                         |
| Pagination sur projets et tâches                                | `useProjects(filters)`, `useTasks(projectId)`                                        |
| Commentaires sur projets et tâches                              | `useComments(target)`, avec modification et suppression                              |
| Calcul de la progression d'un projet                            | `getProjectProgress`, fonction pure réutilisée dans le service et les KPI            |
| Mutations avec mise à jour optimiste                            | Sur toutes les modifications, projets et tâches                                      |
| Préférences de compte                                           | `useSettings` : nom affiché, langue, persistées localement                           |

## 8.6 Conformité — Interface

> **[À COMPLÉTER — Rafael]**

## 8.7 Ressources du projet

| Ressource             | Adresse                                                    |
| --------------------- | ---------------------------------------------------------- |
| Dépôt                 | github.com/YussefBen/Omni-ERP                              |
| Démonstration         | https://omni-erp-nine.vercel.app                           |
| API de données        | https://omni-erp-api.onrender.com                          |
| Documentation d'API   | https://documenter.getpostman.com/view/48786203/2sBYAvwr1q |
| Politique de sécurité | `docs/SECURITY.md`                                         |

L'instance hébergeant l'API de données relève d'une offre gratuite : elle se met en
veille après quinze minutes d'inactivité, et la première requête suivante peut prendre
une cinquantaine de secondes.