# BoomBapChopShop

## Etat actuel

Le site a maintenant deux facons de lire le contenu:

- **Nouvelle methode conseillee:** l'interface admin privee avec Supabase.
- **Ancienne methode de secours:** les fichiers du projet, utiles tant que Supabase n'est pas encore branche.

Tu n'auras pas besoin d'ajouter les beats en JSON une fois Supabase configure. Tu passeras par une page admin avec des champs et des boutons d'upload.

## Nouvelle methode: interface admin

Une fois Supabase configure, ouvre le site avec `#admin` a la fin de l'adresse.

- Exemple local: `http://127.0.0.1:4173/#admin`
- Exemple en ligne: `https://ton-site.com/#admin`

Depuis cette interface, tu peux ajouter:

- un beat avec titre, description, BPM, key, duree, prix et tags;
- une image cover;
- une preview audio;
- un article de blog;
- un statut publie / brouillon.

## Ancienne methode de secours: fichiers du projet

Pour l'instant, le catalogue est gere depuis le fichier `src/data/beats.js`.

1. Exporte une preview MP3 de ton beat.
   - Utilise plutot un extrait tagge ou watermarked.
   - Garde le fichier leger, par exemple MP3 128 ou 192 kbps.

2. Place le fichier dans `audio/previews/`.
   - Exemple : `audio/previews/midtown-stories.mp3`
   - Utilise des noms simples : minuscules, tirets, pas d'espaces.

3. Ajoute ou modifie une entree dans `src/data/beats.js`.

```js
{
  id: 9,
  name: "MIDTOWN STORIES",
  subtitle: "soul sample / subway drums",
  bpm: 90,
  key: "Eb Min",
  duration: "2:46",
  durationSeconds: 166,
  previewUrl: "./audio/previews/midtown-stories.mp3",
  coverUrl: "./images/covers/midtown-stories.jpg",
  price: 29.99,
  tags: ["boom bap", "soul", "90s"]
}
```

4. Ajoute un visuel si tu en as un.
   - Place l'image dans `images/covers/`.
   - Format conseille : JPG ou PNG carre, idealement 1200 x 1200 px.
   - Si `coverUrl` est vide, le site garde le visuel automatique avec le titre.

5. Verifie le site.
   - Clique sur la ligne du beat.
   - Si `previewUrl` est vide, le site indique que la preview n'est pas encore ajoutee.
   - Si le chemin pointe vers un MP3 existant, le lecteur joue le fichier.

## Configuration Supabase

Le site peut maintenant charger les beats et les articles depuis Supabase, tout en gardant les donnees locales comme secours si Supabase n'est pas encore configure.

1. Cree un projet Supabase.
2. Dans Supabase, ouvre SQL Editor et lance le contenu de `supabase-schema.sql`.
3. Dans Authentication, cree ton utilisateur admin avec email + mot de passe.
4. Dans Authentication > Users, copie le UID de ton utilisateur admin.
5. Dans SQL Editor, lance cette requete en remplacant le UID:

```sql
insert into public.admin_users (user_id)
values ('COLLE-LE-UID-ICI');
```

6. Dans `src/config.js`, ajoute:

```js
window.BBCS_CONFIG = {
  supabaseUrl: "https://TON-PROJET.supabase.co",
  supabaseAnonKey: "TA-CLE-ANON",
};
```

7. Ouvre le site avec `#admin` a la fin de l'adresse.

La page admin n'apparait pas dans la navigation publique. Les donnees restent protegees par l'authentification Supabase et les regles RLS du schema. Seuls les utilisateurs ajoutes dans `admin_users` peuvent ecrire dans le catalogue et le blog.

## Prochaine etape conseillee

Quand l'admin Supabase est valide, la prochaine etape sera de brancher le paiement et la livraison automatique des fichiers achetes.

## Test email de commande

Le checkout peut appeler une Supabase Edge Function nommee `send-order-email`.
Elle envoie au client un email de confirmation avec les liens vers les contrats PDF applicables a sa commande.

Pre-requis:

- un compte Resend;
- un domaine ou email expediteur verifie dans Resend;
- la CLI Supabase connectee au projet.

Variables serveur a configurer:

```bash
supabase secrets set RESEND_API_KEY="TA_CLE_RESEND"
supabase secrets set ORDER_FROM_EMAIL="BOOM BAP CHOP SHOP <orders@ton-domaine.com>"
supabase secrets set ORDER_REPLY_TO="contact@ton-domaine.com"
supabase secrets set SITE_URL="https://ton-site.com"
supabase secrets set BBCS_SUPABASE_SECRET_KEY="TA_CLE_SECRETE_SUPABASE"
```

Deploiement de la fonction:

```bash
supabase functions deploy send-order-email
```

Test direct:

```bash
supabase functions invoke send-order-email --body '{
  "email": "client@example.com",
  "total": 14.99,
  "currency": "EUR",
  "siteUrl": "https://ton-site.com",
  "items": [
    {
      "name": "STAIRCASE SWAGGER",
      "license": "MP3 Basic",
      "price": 14.99,
      "contractUrl": "./documents/licenses/licence-non-exclusive-mp3-100k-streams.pdf"
    }
  ]
}'
```

Pour la production finale, l'appel email devra partir apres confirmation reelle du paiement, pas seulement apres le bouton de demo.

## Table des commandes

La table `orders` conserve l'historique des commandes demo puis, plus tard, des vraies commandes payees.
La fonction genere aussi un PDF personnalise par licence et le stocke dans le bucket prive `contracts`.
L'email client contient un lien signe temporaire vers ce PDF personnalise.

Pour l'ajouter a Supabase sans relancer tout le schema:

```bash
supabase db execute --file supabase-orders-schema.sql
```

Si ta version de Supabase CLI ne supporte pas `db execute`, ouvre Supabase > SQL Editor et colle le contenu de `supabase-orders-schema.sql`.

## Stripe Checkout en mode test

La fonction `create-checkout-session` cree une commande `pending_payment`, cree une session Stripe Checkout et renvoie l'URL de paiement au site.
La fonction `stripe-webhook` ecoute ensuite le paiement valide, passe la commande en `paid`, genere les contrats personnalises et envoie l'email de livraison.

Secret a configurer avec la cle test Stripe:

```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
supabase functions deploy create-checkout-session
```

Apres creation du webhook dans Stripe, configurer son secret de signature:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
supabase functions deploy stripe-webhook
```
