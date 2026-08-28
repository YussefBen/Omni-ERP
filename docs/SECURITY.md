# Politique de sécurité — Omni-ERP

Mesures de sécurité mises en place, avec pour chacune ce qu'elle protège
réellement et ce qu'elle ne protège pas.

---

## En-têtes HTTP

Appliqués par Vercel via `vercel.json`. Ce sont de vrais en-têtes HTTP,
pas des balises `<meta>` de repli : le navigateur les applique strictement.

### Content-Security-Policy

Chaque directive autorise le strict nécessaire.

| Directive | Valeur | Raison |
|---|---|---|
| `default-src` | `'self'` | Tout est refusé par défaut, chaque exception est explicite |
| `script-src` | `'self'` | Aucun script inline ni CDN : un script injecté ne s'exécute pas |
| `style-src` | `'self' 'unsafe-inline'` | Les CSS Modules génèrent des styles inline |
| `img-src` | `'self' data:` + CDN des API | Vignettes produits et icônes météo |
| `connect-src` | `'self'` + les 6 API | Seules ces origines peuvent être appelées en XHR |
| `object-src` | `'none'` | Aucun plugin, vecteur d'attaque obsolète |
| `frame-ancestors` | `'none'` | L'application ne peut pas être placée dans une iframe |
| `base-uri` | `'self'` | Empêche la réécriture de l'URL de base des ressources |
| `form-action` | `'self'` | Un formulaire ne peut pas soumettre vers un domaine tiers |

**Ce que ça protège.** Un script injecté par une faille XSS ne s'exécute pas,
et ne peut pas exfiltrer de données vers un domaine non listé. C'est la seconde
ligne de défense derrière la sanitisation.

**Ce que ça ne protège pas.** `'unsafe-inline'` sur `style-src` laisse passer
l'injection de styles, ce qui permet certaines attaques par superposition
visuelle. La supprimer demanderait d'abandonner les CSS Modules.

### Autres en-têtes

| En-tête | Effet |
|---|---|
| `X-Content-Type-Options: nosniff` | Le navigateur respecte le type déclaré, sans le deviner |
| `X-Frame-Options: DENY` | Protection anti-détournement de clic, pour les navigateurs anciens |
| `Referrer-Policy` | L'URL complète n'est pas transmise aux domaines tiers |
| `Permissions-Policy` | Caméra, micro, géolocalisation et paiement désactivés |
| `Strict-Transport-Security` | Force HTTPS pendant un an |
| `Cross-Origin-Opener-Policy` | Isole le contexte de navigation |

---

## Protection XSS

DOMPurify assainit toute saisie libre **avant stockage**, et non seulement
à l'affichage : une donnée déjà enregistrée peut provenir d'une saisie
antérieure au filtrage.

Champs concernés : notes sur les fiches clients, commentaires d'évaluation
fournisseur, motifs de mouvement de stock, et les avis clients issus de
JSONPlaceholder — une API externe reste une source non fiable.

`dangerouslySetInnerHTML` n'est utilisé qu'à un seul endroit, dans le composant
`SafeHtml`, et uniquement sur du contenu déjà assaini.

**Ce que ça protège.** L'injection de balises et d'attributs événementiels
dans les champs de saisie. Cette mesure s'exécute là où se trouve la menace :
elle est réellement efficace.

---

## Politique de mots de passe

Validation Zod : huit caractères minimum, majuscule, minuscule, chiffre,
caractère spécial, et rejet des mots de passe figurant dans les listes courantes.

Un indicateur de force est calculé pendant la saisie. La longueur y pèse
au-delà du minimum requis : une phrase de passe longue résiste mieux au
cassage qu'un mot court complexifié, conformément aux recommandations
actuelles du NIST.

La politique n'est pas réappliquée à la connexion : un compte créé avant
son entrée en vigueur doit rester utilisable.

**Ce que ça protège.** Réellement efficace : la contrainte s'applique à la
création du mot de passe, donc à la source.

---

## Limitation des tentatives de connexion

Trois échecs par minute et par adresse e-mail, avec fenêtre glissante.
Le compteur repart de zéro à l'expiration du blocage.

**Écart avec l'énoncé.** Le comptage par adresse IP demandé n'est pas
réalisable depuis un navigateur, qui n'y a pas accès. Le comptage par
identifiant a été retenu : il empêche l'attaque ciblée sur un compte précis,
ce qui est l'objectif principal d'une telle mesure.

**Ce que ça ne protège pas.** Le compteur vit en mémoire du navigateur.
Un rechargement de page le remet à zéro, et une attaque automatisée
n'utiliserait pas le navigateur. C'est un garde-fou d'interface, pas une
protection. Une limitation réelle se fait côté serveur.

Le stockage local a été écarté volontairement : il donnerait l'illusion
d'une persistance alors qu'il suffit de le vider pour la contourner.

---

## Journal d'audit

Collection `auditLog` dans la base locale. Chaque action critique enregistre
l'utilisateur, la date, l'action, le résultat et un contexte : connexions
réussies et échouées, blocages, modifications de statut, suppressions, exports.

La lecture est réservée au rôle administrateur. La restriction est appliquée
dans le hook et non seulement à l'affichage : sans le rôle, aucune requête
n'est émise.

L'adresse IP n'étant pas accessible depuis un navigateur, le journal
enregistre l'agent utilisateur et l'origine, qui restent exploitables
en investigation.

**Ce que ça ne protège pas.** Le journal est écrit par le client lui-même :
rien n'empêche de ne pas écrire, ou d'écrire faux. Un journal fiable est
écrit par le serveur, à partir de ce qu'il observe.

---

## Protection CSRF

Jeton de 256 bits tiré du générateur cryptographique du navigateur, conservé
en `sessionStorage` — il disparaît avec l'onglet, contrairement au stockage
local. Un intercepteur Axios l'ajoute aux requêtes POST, PUT, PATCH et DELETE.

La comparaison des jetons parcourt toute la chaîne quelle que soit la position
du premier écart, pour ne pas laisser fuir d'information par le temps
d'exécution.

**Limite assumée.** Le projet n'a pas de serveur applicatif : JSON Server
stocke ce qu'on lui envoie sans rien vérifier. Aucune contrepartie ne valide
donc le jeton, et la vérification a lieu côté client — or un attaquant contrôle
le navigateur de sa victime.

Le mécanisme est implémenté dans son intégralité — génération, transmission,
vérification, rotation — de sorte qu'un branchement sur une véritable API ne
demanderait que de déplacer la vérification côté serveur. En l'état, il
démontre le motif de conception sans constituer une protection.

---

## Gestion des secrets

Les clés d'API ne figurent jamais dans le code. Elles sont lues depuis un
fichier `.env` exclu du dépôt, documenté par un `.env.example` qui indique
les variables attendues sans en révéler les valeurs. Chaque poste de travail
dispose de sa propre clé.

Les appels à DummyJSON restreignent explicitement les champs demandés :
les réponses brutes contiennent mots de passe, numéros de carte bancaire et
identifiants nationaux, qui ne transitent donc jamais jusqu'à l'application.

---

## Synthèse

| Mesure | Protection réelle | Démonstration |
|---|---|---|
| En-têtes de sécurité | Oui | — |
| Sanitisation XSS | Oui | — |
| Politique de mots de passe | Oui | — |
| Gestion des secrets | Oui | — |
| Journal d'audit | Partielle | — |
| Limitation des tentatives | Non | Oui |
| Protection CSRF | Non | Oui |

Les trois dernières mesures supposent un serveur qui décide. En son absence,
elles sont implémentées de bout en bout mais leur garantie reste théorique.
Ce document les distingue explicitement plutôt que de présenter l'ensemble
comme un dispositif homogène.