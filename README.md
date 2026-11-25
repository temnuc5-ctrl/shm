# SHMECOS — Écosystème numérique SHM Al Amal

Trois applications web (et Android via Capacitor) qui partagent la même base
Supabase et la même charte : **Admin** (chefs), **User** (membres) et
**Rapport** (rapports & séances).

```
SHMECOS
├── Admin    Portail des chefs — supervision, membres, adhésion, présence, Adnane.ai
├── User     Portail des membres — profil, adhésion, anachid, documents, rapports
└── Rapport  Application rapports/séances — saisie terrain, PDF, hors ligne
```

---

## 1. Démarrage local

Chaque application est un projet Vite + React + TypeScript indépendant.

```bash
npm install
cp .env.example .env      # renseigner les variables (jamais commitées)
npm run dev               # http://localhost:8080
npm run build             # build client + serveur (Admin/Rapport)
npm run build:client      # build SPA seul (User)
```

Prérequis : **Node 20+**. Le backend (Admin, User, Rapport) est un Express
empaqueté en fonction Netlify ; les données vivent dans **Supabase**.

---

## 2. Variables d'environnement

### Côté navigateur (préfixe `VITE_`, donc public)

| Variable | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique (protégée par RLS) |
| `VITE_API_BASE_URL` | URL de l'API si le site et l'API sont sur des domaines différents |
| `VITE_BADGE_ENCRYPTION_KEY` | Clé AES-256 (base64, 32 octets) des badges QR — **identique sur Admin et User** |
| `VITE_MEMBERS_PORTAL_URL` | Lien vers le portail membres (Admin) |

### Côté serveur uniquement (jamais de préfixe `VITE_`)

| Variable | Rôle |
|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Accès serveur à la base |
| `JWT_SECRET` | Signature des sessions (**différent** entre Admin, User et Rapport) |
| `DEVICE_TOKEN_SECRET` | Jetons d'appareil de confiance (hors ligne) |
| `FIELD_ACCESS_KEY` | Clé d'équipe « accès terrain » (Admin) |
| `MARKETPLACE_KEY_ENCRYPTION_SECRET` | Chiffrement de la clé marketplace (64 hex) |
| `CREAO_API_KEY` | **Fournisseur IA recommandé** pour Adnane.ai |
| `CREAO_API_BASE`, `CREAO_CHAT_PATH`, `CREAO_MODEL` | Endpoint IA (défauts : `https://api.creao.com`, `/v1/chat/completions`, `creao`) |
| `GEMINI_API_KEY` | Repli si aucune clé CREAO |
| `SMTP_*`, `CORS_ORIGIN` | E-mails transactionnels, origines autorisées |

> Les `.env.example` ne contiennent que des valeurs factices. Ne commitez
> jamais un `.env` réel : `SUPABASE_SERVICE_ROLE_KEY` donne un accès total.

---

## 2 bis. Connexion (table Supabase)

Les comptes du portail Rapports vivent dans la table **`rapport_users`** :

1. Exécuter `supabase/AUTH.sql` dans Supabase → SQL Editor (crée la table,
   active RLS et n'ouvre aucune policy : seul le serveur y accède).
2. Créer un compte (mot de passe et PIN hachés en bcrypt) :

```bash
node scripts/create-user.mjs --first Adnane --last Bennani \
  --birth 1990-05-12 --pin 1234 --password "motdepasse" --role chef
```

3. La connexion passe par `POST /api/auth/login` : le serveur vérifie le
   compte, applique un verrouillage après 5 échecs (15 min) et renvoie un JWT
   de 30 jours. Aucun identifiant n'est présent dans le code du site.

Dans l'APK, renseigner `VITE_API_BASE_URL` (URL du site déployé) pour que la
connexion atteigne l'API.

## 3. Sessions et hors ligne

| Application | Durée de session | Stockage |
|---|---|---|
| Admin (chefs) | **21 jours** | `@capacitor/preferences` (Android) / `localStorage` |
| User (membres) | **30 jours** | idem |

- La session survit à la fermeture de l'app et au redémarrage du téléphone.
- **Admin** : la clé terrain et le jeton d'appareil permettent de lire les
  membres et de pointer les présences sans réseau. Un appareil « clé terrain »
  ne reçoit jamais les téléphones des responsables ni les informations
  médicales.
- **User** : anachid, documents et favoris sont lisibles hors ligne (camp
  d'été, zones blanches).

---

## 4. Nouveautés de cette version

### Admin — Adnane.ai
- Onglet **Assistant** : fournisseur **CREAO** en priorité (`CREAO_API_KEY`),
  Gemini en repli, message clair si aucune clé n'est configurée.
- Onglet **Rapport** : génère un **PDF analytique A4** à la charte SHM à partir
  des rapports et séances de Supabase — **sans clé IA**. Mêmes calculs que
  l'agent « Rapports Supabase ».
- Modification et suppression d'un membre depuis le site : historique de
  présence supprimé proprement, compte lié traité, erreurs remontées.
- Boutons « Connexion terrain », « Espace de stockage » et « Clé marketplace »
  réparés.

### User — Anachid & favoris
- **Téléchargement PDF réparé** : la fiche est rendue hors écran puis exportée
  en vrai PDF (jsPDF). L'ancien bouton ouvrait une fenêtre bloquée par le
  navigateur / la WebView et ne produisait aucun fichier.
- **Favoris hors ligne** : bouton « المفضلة » sur chaque نشيد + page
  **المفضلة** (filtres par type, lecture des paroles, suppression). Le contenu
  est copié dans `localStorage`, donc accessible sans réseau.

### Rapport
- Icône SHM, en-tête et titre corrects, session persistante, pages nettoyées.

---

## 5. Sécurité

- Aucun secret dans le code livré ; les `.env.example` sont des modèles.
- L'API refuse tout jeton expiré ou émis par l'autre portail (audiences
  distinctes `shm-chefs` / membres).
- Limitation de débit sur connexion, inscription, PIN, IA et actions
  destructrices.
- Corps de requête limité à 1 Mo (80 Mo réservé à la galerie).
- En-têtes durcis côté API (CSP `default-src 'none'`, HSTS, `X-Frame-Options`,
  CORP/COOP) et côté site (CSP Netlify).
- RLS Supabase : la clé `anon` est publique par conception ; la sécurité des
  données repose sur les politiques RLS, jamais sur le secret de la clé.
- Badges QR : AES-256-GCM, clé partagée entre les deux portails, empreinte
  non réversible affichée dans « Mon compte » pour vérifier la concordance.

---

## 6. Déploiement

**Netlify** (recommandé) : build `npm run build` (ou `build:client` pour User),
dossier `dist/spa`, fonctions `netlify/functions`. Renseigner les variables
d'environnement dans *Site settings → Environment variables*.

**Android (Capacitor)** :

```bash
npm run build
npx cap sync android
npx cap open android      # ou build via GitHub Actions
```

Les icônes de l'application proviennent de `public/` (mipmaps Android
régénérés à partir du logo SHM).

---

## 7. Structure

```
client/            React (pages, composants, lib)
  lib/rapports/    Moteur de rapport analytique (Admin)
  lib/favorites.ts Favoris hors ligne (User)
server/            Express : routes API, middlewares, lib
netlify/functions/ Point d'entrée Netlify
public/            Icônes, manifeste PWA, service worker
android/           Projet Capacitor (Admin)
```

---

## 8. Support

Un problème, une question ? Contactez l'équipe numérique SHM Al Amal.
Ce fichier est le seul document Markdown du dépôt : tout le reste a été
supprimé pour alléger les livraisons.
