# Velocity — Bot Command Dashboard & C3C Messenger Runtime

**Built by Nadeus Cartel**

All files are organized directly at the repository root so you can upload straight to GitHub and deploy on Render, Railway, Replit, Heroku, or any Node.js 22+ VPS.

## Features
- **573 Built-in Commands across 17 Modules** (AI, Tweet, Music, Video Saving, Banners, Games, Anime, Economy, Moderation, Social, Security, Automation)
- **Live C3C FBState (`appstate.json`) Messenger Listener** powered by `ws3-fca` + **Bot Admin UID Enforcement**
- **Customizable Dashboard Widgets**, **Server-side Gemini AI**, and **Passcode-Protected Owner's Room**

## Quick Start (Local or VPS)
```bash
npm install
npm run build
npm start
```

For development mode with live Vite middleware:
```bash
npm run dev
```

## C3C Bot Activation
1. Paste or upload your exported C3C `appstate.json` cookie array inside **C3C Login & ZIP** (or replace `appstate.json` directly in the repository root).
2. Add your Facebook numeric UID under **Bot Admin UIDs** (or inside `config.json` -> `adminUids`).
3. Set `GEMINI_API_KEY` in `.env` or your hosting dashboard's Environment Secrets to enable AI commands.
