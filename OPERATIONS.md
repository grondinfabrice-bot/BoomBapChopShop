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
supabase functions deploy send-contact-email
supabase functions deploy download-file
supabase functions deploy chatbot
```

Apply one-off SQL files:

```bash
supabase db query --linked --file FILE_NAME.sql
```

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
