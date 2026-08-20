# BOOM BAP CHOP SHOP analytics dashboard

The dashboard is a small Node server designed to run privately on the VPS beside the existing Umami instance. It keeps Umami API credentials on the server and serves a custom BOOM BAP CHOP SHOP interface.

## VPS configuration

Create a server-only environment file outside the Git checkout, for example `/home/fabrice/services/boombap-analytics.env`, using `.env.example` as the template. Use the existing Umami API client credentials and the website ID created for `boombapchopshop.art`.

Run the dashboard with:

```bash
cd /var/www/sites/boombapchopshop/analytics-dashboard
set -a; . /home/fabrice/services/boombap-analytics.env; set +a
node server.mjs
```

For production, use a systemd service and proxy `stats.boombapchopshop.art` through Nginx to `127.0.0.1:3021`, protected with a dedicated `auth_basic_user_file`.

## Umami setup

Create a separate Umami website for:

- `boombapchopshop.art`
- `www.boombapchopshop.art`

Copy its website ID into the public site's `src/config.js` as `umamiWebsiteId`. The website ID is public by design; API client credentials must remain only in the server environment file.
