# BoomBapChopShop

## Ajouter une instrumentale

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

## Prochaine etape conseillee

Quand l'ecoute des previews est stable, la prochaine etape sera de brancher le paiement et la livraison automatique des fichiers achetes.
