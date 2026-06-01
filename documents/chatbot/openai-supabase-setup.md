# BOOM BAP CHOP SHOP - OpenAI Chatbot Setup

This guide explains how to activate the AI chatbot through Supabase Edge Functions.

## 1. Required Secrets

Add your OpenAI API key to Supabase:

```bash
supabase secrets set OPENAI_API_KEY="your_openai_api_key_here"
```

Optional: choose the model.

```bash
supabase secrets set OPENAI_MODEL="gpt-5.4-mini"
```

If `OPENAI_MODEL` is not set, the function uses `gpt-5.4-mini`.

## 2. Deploy The Function

```bash
supabase functions deploy chatbot
```

The function is configured with `verify_jwt = false` in `supabase/config.toml`, like the current checkout functions.

## 3. Local Test Payload

After deployment, test with:

```bash
supabase functions invoke chatbot --body '{
  "message": "Quelle licence choisir pour une sortie serieuse avec stems ?",
  "language": "fr",
  "history": []
}'
```

Expected meaning:

- the answer should be in French;
- it should recommend WAV + Stems;
- it should mention serious release / engineer mix / stems;
- it must not invent custom terms.

## 4. Site Behavior

The site now tries the AI function first.

If the AI function is unavailable, missing, or not configured, the chatbot automatically falls back to the local rule-based answers.

This keeps the site usable during setup.

## 5. Important Production Notes

Do not put `OPENAI_API_KEY` in frontend code.

Keep it only as a Supabase secret.

Review the AI responses with the test scenarios in:

```text
documents/chatbot/chatbot-test-scenarios.md
```

The system prompt is in:

```text
documents/chatbot/ai-system-prompt.md
```

The full source-of-truth knowledge base is in:

```text
documents/chatbot/boombapchopshop-knowledge-base.md
```
