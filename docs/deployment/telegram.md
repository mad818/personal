# Telegram Bot — Setup Guide

Nexus Prime can receive messages via Telegram and route them to the agent system.

## Prerequisites

- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A publicly reachable URL for your Nexus Prime instance (e.g. via Cloudflare Tunnel, ngrok, or a VPS)

## 1. Create the bot

1. Open Telegram and message `@BotFather`
2. Send `/newbot` and follow the prompts
3. Copy the HTTP API token (looks like `1234567890:ABCdef...`)

## 2. Configure environment

Add to `.env.local`:

```
TELEGRAM_BOT_TOKEN=<telegram-bot-token>
TELEGRAM_SECRET=<telegram-webhook-secret>
```

`TELEGRAM_SECRET` is a string you choose. Telegram will include it in every webhook call header so you can verify the request is genuine.

## 3. Register the webhook

Replace `YOUR_DOMAIN` and `YOUR_SECRET` with your values:

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook\
?url=https://YOUR_DOMAIN/api/telegram\
&secret_token=YOUR_SECRET"
```

Expected response: `{"ok":true,"result":true}`

## 4. Test it

Message your bot in Telegram. The message will be dispatched to JANSKY (the default orchestrator agent) and the response will be sent back to your chat.

## Security notes

- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_SECRET` are server-only env vars — never expose them to the client
- The route validates the `x-telegram-bot-api-secret-token` header on every request
- Only text messages are processed; stickers, images, and other media are silently ignored
- Replies are capped at 3,800 characters (Telegram's limit is 4,096)

## Architecture

```
User DMs bot
  → Telegram servers
    → POST /api/telegram (webhook)
      → dispatchToAgent() calls /api/ai
        → JANSKY response
          → sendMessage() sends reply back to user
```

The webhook returns HTTP 200 immediately, then dispatches the agent call asynchronously. This prevents Telegram from retrying the webhook due to a slow AI response.
