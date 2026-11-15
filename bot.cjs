/**
 * Velocity Standalone C3C Messenger Bot (Repository Root)
 * Built by Nadeus Cartel
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { login } = require('ws3-fca');

const configPath = path.join(__dirname, 'config.json');
const commandsPath = path.join(__dirname, 'commands.json');
const appStatePath = path.join(__dirname, 'appstate.json');

function loadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

let aiClient = null;
if (process.env.GEMINI_API_KEY) {
  try {
    const { GoogleGenAI } = require('@google/genai');
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch {
    aiClient = null;
  }
}

const startedAt = Date.now();

async function executeBotReply(cmd, args, rawArg, event, config, commands) {
  const prefix = config.prefix || '/';
  const name = cmd.name;

  if (name === 'help' || name === 'menu') {
    const cats = [...new Set(commands.map((c) => c.category))];
    return `${config.botName || 'Velocity'} (${config.builderCredit || 'Built by Nadeus Cartel'})\nPrefix: ${prefix} | Active Commands: ${commands.filter((c) => c.enabled !== false).length}\nModules: ${cats.join(', ')}`;
  }
  if (name === 'ping') return 'Pong! Velocity C3C runtime active.';
  if (name === 'uptime') return `Uptime: ${Math.floor((Date.now() - startedAt) / 1000)}s`;
  if (name === 'id') return `Sender UID: ${event.senderID}\nThread ID: ${event.threadID}`;
  if (name === 'tweet') {
    return `[X / TWEET]\n@${event.senderID}: "${rawArg || 'Velocity 573 commands live!'}"`;
  }
  if (name === 'music' || name === 'opm' || name === 'kpop' || name === 'jpop') {
    return `[MUSIC · ${name.toUpperCase()}]\nNow Queued: ${rawArg || 'Raining in Manila — Lola Amour'}`;
  }
  if (name === 'joke') {
    const jokes = [
      'Why do programmers prefer dark mode? Because light attracts bugs.',
      'A SQL query walks into a bar and asks two tables: "Can I join you?"',
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (name === 'coinflip') return `Coin Flip: ${Math.random() > 0.5 ? 'HEADS' : 'TAILS'}`;
  if (name === '8ball') return `Oracle: ${['Yes, definitely.', 'Indicators point to yes.', 'Ask again shortly.', 'Unlikely right now.'][Math.floor(Math.random() * 4)]}`;
  if (name === 'godmode') return `GODMODE ACTIVE for Owner UID ${event.senderID} across ${commands.length} commands.`;

  if (cmd.category === 'AI') {
    if (!aiClient) return 'Set GEMINI_API_KEY in your environment variables to use AI commands.';
    const res = await aiClient.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Mode: ${name}. Prompt: ${rawArg || 'Introduce Velocity briefly.'}`,
    });
    return (res.text || 'No response.').trim();
  }

  return `[${prefix}${name} · ${cmd.category}] ${cmd.description}${rawArg ? `\nInput: ${rawArg}` : ''}`;
}

function startStandaloneBot() {
  const config = loadJson(configPath, { botName: 'Velocity', prefix: '/', adminUids: [] });
  const commands = loadJson(commandsPath, []);
  const appState = loadJson(appStatePath, []);

  if (!Array.isArray(appState) || appState.length === 0) {
    console.log('[Velocity Bot] appstate.json is empty. Add your C3C cookie array to start Messenger listener.');
    return;
  }

  const isSample = appState.some(
    (c) => String(c.value || '').includes('REPLACE_WITH_C3C_UID') || String(c.value || '').includes('sample_c3c')
  );
  if (isSample) {
    console.log('[Velocity Bot] Sample placeholder in appstate.json detected. Replace with real C3C cookies to connect.');
    return;
  }

  login({ appState }, { listenEvents: true, selfListen: false, autoReconnect: true }, (err, api) => {
    if (err) {
      console.error('[Velocity Bot] C3C login failed:', err);
      return;
    }

    const botUid = typeof api.getCurrentUserID === 'function' ? api.getCurrentUserID() : 'connected';
    console.log(`[Velocity Bot] Logged in as UID ${botUid} | Commands: ${commands.length}`);

    api.listenMqtt(async (listenErr, event) => {
      if (listenErr || !event || event.type !== 'message' || !event.body) return;

      const liveConfig = loadJson(configPath, config);
      const liveCommands = loadJson(commandsPath, commands);
      const prefix = liveConfig.prefix || '/';
      const body = event.body.trim();
      if (!body.startsWith(prefix)) return;

      const args = body.slice(prefix.length).trim().split(/\s+/);
      const trigger = (args.shift() || '').toLowerCase();
      const rawArg = args.join(' ');

      const cmd = liveCommands.find(
        (c) => c.enabled !== false && (c.name === trigger || (c.aliases || []).includes(trigger))
      );
      if (!cmd) return;

      const isAdmin = (liveConfig.adminUids || []).map(String).includes(String(event.senderID));
      if ((cmd.permission === 'Admin' || cmd.permission === 'Owner') && !isAdmin) {
        api.sendMessage('Permission denied: Bot Admin UID required.', event.threadID, event.messageID);
        return;
      }

      try {
        const reply = await executeBotReply(cmd, args, rawArg, event, liveConfig, liveCommands);
        api.sendMessage(reply, event.threadID, event.messageID);
      } catch (e) {
        api.sendMessage(`Error: ${e.message}`, event.threadID, event.messageID);
      }
    });
  });
}

if (require.main === module) {
  startStandaloneBot();
}

module.exports = { startStandaloneBot };
