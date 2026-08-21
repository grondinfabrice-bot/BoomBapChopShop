# Collector card renderer

Private Node.js renderer used by the `send-collector-card` Supabase function. It produces a 1536 x 1024 PNG using the approved collector-card artwork, the true cover and live order metadata.

It listens only on `127.0.0.1:3032`. Nginx exposes the single `/internal/collector-card/render` route to Supabase over HTTPS, protected again by a long shared secret.

## Local check

```bash
cd collector-card-renderer
npm install
COLLECTOR_CARD_RENDERER_SECRET='a-secret-with-at-least-32-characters' npm start
curl http://127.0.0.1:3032/health
```

## Production

Follow the commands in `OPERATIONS.md`. The matching Supabase secrets are:

```text
COLLECTOR_CARD_RENDERER_URL=https://boombapchopshop.art/internal/collector-card/render
COLLECTOR_CARD_RENDERER_SECRET=<same value as /etc/boombap-collector-card-renderer.env>
```
