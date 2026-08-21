# BOOM BAP CHOP SHOP - Operations

## Deploy

Local project:

```bash
cd /Users/emotionbeat/ProjetsWeb/boombapchopshop
git status --short
git push origin main
```

VPS:

```bash
ssh fabrice@187.77.174.83
cd /var/www/sites/boombapchopshop
git pull origin main
```

Avoid `git add .` when `supabase/.temp/cli-latest` is modified locally.

## Supabase Changes

Deploy Edge Functions after editing files in `supabase/functions/...`:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy validate-promo-code
supabase functions deploy stripe-webhook
supabase functions deploy send-collector-card
supabase functions deploy send-contact-email
supabase functions deploy download-file
supabase functions deploy chatbot
```

Apply the collector card order fields and private storage bucket once:

```bash
supabase db query --linked --file supabase-collector-card-migration.sql
```

After a successful payment, `stripe-webhook` sends the normal confirmation first, then calls `send-collector-card`. That function requests one high-resolution PNG collector card per purchased beat from the private VPS renderer, attaches it to a separate email, and records the result in `orders.collector_card_status`.

## Collector card renderer

The collector card is a visual bonus, not the legal licence contract. It is rendered as a 1536 x 1024 PNG by `collector-card-renderer/` on the VPS, so the approved design is composited with the real cover at full quality.

After pulling the repository on the VPS:

```bash
cd /var/www/sites/boombapchopshop/collector-card-renderer
npm ci --omit=dev
sudo cp boombap-collector-card-renderer.service /etc/systemd/system/
sudo cp collector-card-renderer.nginx.conf /etc/nginx/snippets/
sudo nano /etc/boombap-collector-card-renderer.env
sudo systemctl daemon-reload
sudo systemctl enable --now boombap-collector-card-renderer
```

Set a long, random `COLLECTOR_CARD_RENDERER_SECRET` in `/etc/boombap-collector-card-renderer.env`, then configure the same value in Supabase along with:

```text
COLLECTOR_CARD_RENDERER_URL=https://boombapchopshop.art/internal/collector-card/render
```

Include `/etc/nginx/snippets/collector-card-renderer.nginx.conf` inside the HTTPS server block for `boombapchopshop.art`, then test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl http://127.0.0.1:3032/health
```

Apply one-off SQL files:

```bash
supabase db query --linked --file FILE_NAME.sql
```

## Umami analytics

The public site loads Umami only when `umamiWebsiteId` is configured in `src/config.js`. The private custom dashboard lives in `analytics-dashboard/` and must run server-side on the VPS so Umami API credentials never reach the browser.

Recommended production host: `stats.boombapchopshop.art`, proxied by Nginx to `127.0.0.1:3021` and protected with a dedicated Basic Auth file. See `analytics-dashboard/README.md` for the environment variables and setup sequence.

## Launch Check

After each prod deploy, test:

- public site loads the latest version
- catalogue search, sort, and tags
- beat preview playback
- cart add/remove
- beat checkout to Stripe
- mix/mastering service checkout to Stripe
- contact form
- newsletter signup
- delivery email
- private download links

## Daily Monitoring

Check these during launch week:

- Supabase Edge Function logs
- Supabase `orders`
- Supabase `newsletter_subscribers`
- Stripe Developers -> Events
- Resend Emails

Watch for:

- Supabase 500 errors
- Stripe webhook failures
- Resend bounced or failed emails
- invalid or expired download links
- orders without delivery email

## If A Customer Does Not Receive Email

1. Check Stripe payment status.
2. Check Supabase `orders` by customer email or order number.
3. Check `stripe-webhook` logs.
4. Check Resend email status.
5. If payment is valid but email failed, resend manually from the order details or prepare the download links manually.

## If Download Link Fails

1. Check the order exists and is paid.
2. Check `download-file` logs.
3. Confirm the file exists in the private `deliverables` bucket.
4. If the link expired, regenerate or resend the delivery email.

## If Checkout Fails

1. Check `create-checkout-session` logs.
2. Confirm `STRIPE_SECRET_KEY` is set in Supabase secrets.
3. Confirm `SITE_URL` points to the production domain.
4. Check Stripe Developers -> Events for rejected requests.

## If Contact Form Fails

1. Check `send-contact-email` logs.
2. Confirm `RESEND_API_KEY` is set.
3. Confirm `ORDER_FROM_EMAIL` is verified in Resend.
4. Tell the visitor to email `contact@boombapchopshop.art` directly if needed.

## Useful URLs

- Site: https://boombapchopshop.art/
- Supabase project: https://supabase.com/dashboard/project/lmospzejrynbwsuaravd
- Contact email: contact@boombapchopshop.art
