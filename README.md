# Site de la SFDC – Société française de dentisterie en cancérologie

Site statique publié sur **Cloudflare Pages** (domaine principal : `sfdc-cancer.fr`),
avec des **Pages Functions** pour les formulaires et les fichiers stockés dans **R2**.

## Structure

| Dossier | Rôle |
|---|---|
| `src/pages/` | Contenu des pages (une page = un `index.html` avec ses métadonnées JSON en tête) |
| `src/partials/` | Gabarit commun : `<head>`, en-tête, pied de page |
| `static/` | Fichiers copiés tels quels : CSS, JS, polices, images, `_headers`, `_redirects`, `robots.txt` |
| `functions/` | Fonctions Cloudflare : `/api/contact` (contact et demandes d'adhésion), `/documents/*`, `/medias/*`, redirection des domaines |
| `server/` | Code partagé par les fonctions |
| `build.mjs` | Générateur sans dépendance → `dist/` |

Pour modifier un texte, éditez le fichier de la page dans `src/pages/`. L'en-tête et le pied de page communs sont dans `src/partials/`.

## Commandes

```bash
npm run build      # génère dist/
```

```bash
npm run check      # génère dist/ et vérifie les liens internes
```

```bash
npm run dev        # serveur local avec fonctions et R2 simulé (http://localhost:8788)
```

## Déploiement Cloudflare Pages

1. Cloudflare → Workers & Pages → Créer → Pages → Connecter le dépôt GitHub `site-sfdc`.
2. Réglages de build : commande `npm run build`, dossier de sortie `dist`.
3. La liaison R2 `SFDC_BUCKET` → bucket `database-sfdc` est déclarée dans `wrangler.toml`.
4. Domaines personnalisés : ajouter `sfdc-cancer.fr`, `www.sfdc-cancer.fr`, `dentcancer.fr`,
   `www.dentcancer.fr`, `dentcancer.com` et `www.dentcancer.com` au projet Pages.
   `functions/_middleware.js` redirige (301) tous les domaines secondaires vers `https://sfdc-cancer.fr`.
   Alternative possible : une règle « Bulk Redirects » dans Cloudflare.
5. **Adhésions** : la page « Adhérer » renvoie vers le formulaire de contact (`/contact/?sujet=adhesion`).
   Les demandes sont enregistrées dans `formulaires/adhesions/` ; le bureau répond par e-mail avec le
   montant de la cotisation et le RIB (paiement par virement).

## Organisation du bucket R2 `database-sfdc`

| Préfixe | Contenu | Accès |
|---|---|---|
| `formulaires/adhesions/AAAA/MM/*.json` | Demandes d'adhésion (profil « Demande d'adhésion » du formulaire de contact) | privé (tableau de bord Cloudflare) |
| `formulaires/contact/AAAA/MM/*.json` | Messages de contact | privé |
| `documents/` | PDF publics → `https://sfdc-cancer.fr/documents/<fichier>`. Un fichier déposé ici remplace celui du dépôt (`static/documents/`) | public en lecture |
| `medias/` | Photos définitives → `https://sfdc-cancer.fr/medias/<fichier>` | public en lecture |

> Ne jamais déposer de fichier confidentiel dans `documents/` ou `medias/` : ces préfixes sont publics.

Les formulaires sont protégés contre les robots (champ piège et délai minimal) et ne conservent pas l'adresse IP.
Aucune notification e-mail n'est envoyée pour l'instant : consultez le bucket, ou ajoutez plus tard un service d'envoi.

## Contenus à compléter

Voir [`CONTENU-A-COMPLETER.md`](CONTENU-A-COMPLETER.md). Sur le site, chaque élément manquant
apparaît sous la forme d'un repère jaune « À compléter ».
Pour les lister : `grep -rn 'class="todo"' src/`.
