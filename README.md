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
