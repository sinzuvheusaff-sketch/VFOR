import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const OWNER_ROOM_PASSCODE = '1590579072523';

const CONFIG_PATH = path.join(__dirname, 'config.json');
const APPSTATE_PATH = path.join(__dirname, 'appstate.json');
const COMMANDS_PATH = path.join(__dirname, 'commands.json');

interface BotRuntimeState {
  status: 'idle' | 'connecting' | 'connected' | 'error';
  botUid: string | null;
  message: string;
  lastUpdated: string | null;
}

const botRuntime: BotRuntimeState = {
  status: 'idle',
  botUid: null,
  message: 'Waiting for real C3C appstate.json cookies.',
  lastUpdated: null,
};

let activeStopListener: (() => void) | null = null;

function readJsonSafe<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32Buffer(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildBufferZip(entries: { name: string; data: Buffer }[]): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const cleanName = entry.name.replace(/\\/g, '/').replace(/^\/+/, '');
    const nameBuf = Buffer.from(cleanName, 'utf8');
    const dataBuf = entry.data;
    const crc = crc32Buffer(dataBuf);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dataBuf.length, 18);
    local.writeUInt32LE(dataBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    localChunks.push(local, dataBuf);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(dataBuf.length, 20);
    central.writeUInt32LE(dataBuf.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    centralChunks.push(central);
    offset += local.length + dataBuf.length;
  }

  const centralSize = centralChunks.reduce((sum, c) => sum + c.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, ...centralChunks, eocd]);
}

function collectProjectFiles(rootDir: string, currentDir = rootDir): { name: string; data: Buffer }[] {
  const skipDirs = new Set(['node_modules', 'dist', '.git', '.aistudio']);
  const results: { name: string; data: Buffer }[] = [];

  for (const item of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (skipDirs.has(item.name)) continue;
    const fullPath = path.join(currentDir, item.name);
    if (item.isDirectory()) {
      results.push(...collectProjectFiles(rootDir, fullPath));
    } else if (item.isFile()) {
      if (item.name === '.env') continue;
      const rel = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      results.push({ name: rel, data: fs.readFileSync(fullPath) });
    }
  }

  return results;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  const startedAt = Date.now();

  async function runLiveBotReply(
    cmd: { name: string; category: string; description: string },
    rawArg: string,
    senderID: string,
    threadID: string,
    config: { botName?: string; builderCredit?: string; prefix?: string },
    commandsCount: number
  ): Promise<string> {
    const prefix = config.prefix || '/';
    if (cmd.name === 'help' || cmd.name === 'menu') {
      return `${config.botName || 'Velocity'} (${config.builderCredit || 'Built by Nadeus Cartel'})\nPrefix: ${prefix} | Active Commands: ${commandsCount}\nTry ${prefix}ai, ${prefix}tweet, ${prefix}music, ${prefix}joke, ${prefix}godmode`;
    }
    if (cmd.name === 'ping') return 'Pong! Velocity C3C Messenger bot is online.';
    if (cmd.name === 'uptime') return `Uptime: ${Math.floor((Date.now() - startedAt) / 1000)}s`;
    if (cmd.name === 'id') return `Sender UID: ${senderID}\nThread ID: ${threadID}`;
    if (cmd.name === 'tweet') return `[X / TWEET]\n@${senderID}: "${rawArg || 'Velocity live!'}"`;
    if (cmd.name === 'music' || cmd.name === 'opm' || cmd.name === 'kpop' || cmd.name === 'jpop') {
      return `[MUSIC · ${cmd.name.toUpperCase()}]\nNow Queued: ${rawArg || 'Raining in Manila — Lola Amour'}`;
    }
    if (cmd.name === 'godmode') {
      return `[GODMODE ACTIVE] Owner UID ${senderID} verified across ${commandsCount} commands.`;
    }
    if (cmd.category === 'AI') {
      if (!ai) return 'GEMINI_API_KEY is missing in environment secrets.';
      const res = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Mode: ${cmd.name}. Prompt: ${rawArg || 'Say hello from Velocity.'}`,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      });
      return res.text?.trim() || 'No AI output generated.';
    }
    return `[${prefix}${cmd.name} · ${cmd.category}] ${cmd.description}${rawArg ? `\nInput: ${rawArg}` : ''}`;
  }

  function startC3CListener() {
    if (activeStopListener) {
      try {
        activeStopListener();
      } catch {
        // ignore stop errors
      }
      activeStopListener = null;
    }

    const appState = readJsonSafe<{ key?: string; name?: string; value?: string }[]>(APPSTATE_PATH, []);
    if (!Array.isArray(appState) || appState.length === 0) {
      botRuntime.status = 'idle';
      botRuntime.botUid = null;
      botRuntime.message = 'Waiting for C3C appstate.json cookies.';
      botRuntime.lastUpdated = new Date().toISOString();
      return;
    }

    const isPlaceholder = appState.some(
      (c) =>
        String(c.value || '').includes('REPLACE_WITH_C3C_UID') ||
        String(c.value || '').includes('sample_c3c_session_token')
    );
    if (isPlaceholder) {
      botRuntime.status = 'idle';
      botRuntime.botUid = null;
      botRuntime.message = 'Sample template saved; replace with real Facebook C3C cookies to connect live.';
      botRuntime.lastUpdated = new Date().toISOString();
      return;
    }

    try {
      const ws3 = require('ws3-fca') as {
        login: (
          cred: { appState: unknown[] },
          opts: Record<string, unknown>,
          cb: (err: unknown, api: any) => void
        ) => void;
      };

      botRuntime.status = 'connecting';
      botRuntime.message = 'Connecting to Facebook Messenger via ws3-fca...';
      botRuntime.lastUpdated = new Date().toISOString();

      ws3.login(
        { appState },
        { listenEvents: true, selfListen: false, autoReconnect: true, online: true },
        (err, api) => {
          if (err || !api) {
            botRuntime.status = 'error';
            botRuntime.botUid = null;
            botRuntime.message =
              err instanceof Error ? err.message : 'C3C AppState rejected or expired.';
            botRuntime.lastUpdated = new Date().toISOString();
            return;
          }

          const uid = typeof api.getCurrentUserID === 'function' ? String(api.getCurrentUserID()) : null;
          botRuntime.status = 'connected';
          botRuntime.botUid = uid;
          botRuntime.message = `Connected live to Messenger${uid ? ` (UID ${uid})` : ''}.`;
          botRuntime.lastUpdated = new Date().toISOString();
          console.log(`[Velocity C3C] Live listener active${uid ? ` for UID ${uid}` : ''}`);

          const stop = api.listenMqtt(async (listenErr: unknown, event: any) => {
            if (listenErr || !event || event.type !== 'message' || !event.body) return;

            const cfg = readJsonSafe<{
              botName?: string;
              builderCredit?: string;
              prefix?: string;
              maintenanceMode?: boolean;
              adminUids?: string[];
            }>(CONFIG_PATH, { prefix: '/', adminUids: [] });

            const cmds = readJsonSafe<
              {
                name: string;
                aliases?: string[];
                category: string;
                description: string;
                permission: string;
                enabled: boolean;
              }[]
            >(COMMANDS_PATH, []);

            const prefix = cfg.prefix || '/';
            const body = String(event.body).trim();
            if (!body.startsWith(prefix)) return;

            const args = body.slice(prefix.length).trim().split(/\s+/);
            const trigger = (args.shift() || '').toLowerCase();
            const rawArg = args.join(' ');
            const cmd = cmds.find(
              (c) => c.enabled !== false && (c.name === trigger || (c.aliases || []).includes(trigger))
            );
            if (!cmd) return;

            const adminSet = new Set((cfg.adminUids || []).map(String));
            const isAdmin = adminSet.has(String(event.senderID));

            if (cfg.maintenanceMode && !isAdmin) {
              api.sendMessage('Velocity is in Maintenance Mode (Owners/Admins only).', event.threadID, event.messageID);
              return;
            }
            if ((cmd.permission === 'Admin' || cmd.permission === 'Owner') && !isAdmin) {
              api.sendMessage('Permission denied: Bot Admin UID required.', event.threadID, event.messageID);
              return;
            }

            try {
              const reply = await runLiveBotReply(
                cmd,
                rawArg,
                String(event.senderID),
                String(event.threadID),
                cfg,
                cmds.length
              );
              api.sendMessage(reply, event.threadID, event.messageID);
            } catch (execErr: unknown) {
              const msg = execErr instanceof Error ? execErr.message : 'Execution failed.';
              api.sendMessage(`Command error: ${msg}`, event.threadID, event.messageID);
            }
          });

          if (typeof stop === 'function') {
            activeStopListener = stop;
          }
        }
      );
    } catch (e: unknown) {
      botRuntime.status = 'error';
      botRuntime.message = e instanceof Error ? e.message : 'Failed to initialize ws3-fca runtime.';
      botRuntime.lastUpdated = new Date().toISOString();
    }
  }

  app.get('/api/c3c/status', (_req, res) => {
    const cfg = readJsonSafe<{ adminUids?: string[]; prefix?: string }>(CONFIG_PATH, {});
    const cmds = readJsonSafe<unknown[]>(COMMANDS_PATH, []);
    res.json({
      ...botRuntime,
      prefix: cfg.prefix || '/',
      adminCount: Array.isArray(cfg.adminUids) ? cfg.adminUids.length : 0,
      commandsCount: Array.isArray(cmds) ? cmds.length : 0,
    });
  });

  app.post('/api/c3c/sync', (req, res) => {
    try {
      const { appStateJson, config, commands } = req.body as {
        appStateJson?: string;
        config?: Record<string, unknown>;
        commands?: unknown[];
      };

      if (typeof appStateJson === 'string') {
        const trimmed = appStateJson.trim();
        fs.writeFileSync(APPSTATE_PATH, trimmed ? trimmed : '[]', 'utf8');
      }
      if (config && typeof config === 'object') {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
      }
      if (Array.isArray(commands)) {
        fs.writeFileSync(COMMANDS_PATH, JSON.stringify(commands, null, 2), 'utf8');
      }

      startC3CListener();
      res.json({ ok: true, runtime: botRuntime });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync C3C config.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/ai/command', async (req, res) => {
    try {
      const { mode, prompt } = req.body as { mode?: string; prompt?: string };
      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Prompt text is required for AI commands.' });
        return;
      }

      if (!ai) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured in server environment secrets. Add it in Settings > Secrets to enable live AI commands.',
        });
        return;
      }

      const systemMap: Record<string, string> = {
        ai: 'You are Velocity AI, a crisp, helpful command-line assistant built by Nadeus Cartel. Keep responses concise, accurate, and easy to read in a chat/terminal card.',
        summarize:
          'Summarize the provided text into 3-5 crisp, plain-text bullet points highlighting key facts.',
        codeai:
          'Provide clean, production-grade TypeScript/JavaScript or requested code with minimal concise explanation.',
        translateai:
          'Translate the text naturally as requested by the user. If no target language is specified, translate between English and Tagalog.',
        rewrite:
          'Rewrite the provided text cleanly according to the requested tone (formal, casual, concise, or Taglish).',
        brainstorm:
          'Generate 5 concrete, creative ideas tailored to the prompt in a clean numbered list.',
        explain:
          'Explain the concept clearly in plain everyday language with one practical example.',
        roastai:
          'Write a lighthearted, playful, friendly tech/developer roast. Keep it clean and witty.',
      };

      const systemInstruction = systemMap[mode || 'ai'] || systemMap.ai;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt.trim(),
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const text = response.text?.trim() || 'No response returned by model.';
      res.json({ text });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI command request failed.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/export/full-zip', (req, res) => {
    try {
      const { passcode, settings, admins, c3cSession, commands, automations, channels, economy } =
        req.body as {
          passcode?: string;
          settings?: Record<string, unknown>;
          admins?: { uid: string; label: string; role: string }[];
          c3cSession?: { appStateJson?: string };
          commands?: unknown[];
          automations?: unknown[];
          channels?: unknown[];
          economy?: Record<string, unknown>;
        };

      if (passcode !== OWNER_ROOM_PASSCODE) {
        res.status(403).json({ error: 'Invalid Owner Room passcode.' });
        return;
      }

      const projectFiles = collectProjectFiles(__dirname);
      const adminUids = Array.isArray(admins) ? admins.map((a) => a.uid) : [];

      const extraRootFiles: { name: string; content: string }[] = [
        {
          name: 'config.json',
          content: JSON.stringify(
            {
              ...(settings || {}),
              adminUids,
              admins: admins || [],
            },
            null,
            2
          ),
        },
        {
          name: 'appstate.json',
          content:
            c3cSession?.appStateJson?.trim() ||
            JSON.stringify(
              [{ key: 'c_user', value: adminUids[0] || 'REPLACE_WITH_C3C_UID', domain: '.facebook.com', path: '/' }],
              null,
              2
            ),
        },
        {
          name: 'commands.json',
          content: JSON.stringify(commands || [], null, 2),
        },
        {
          name: 'workspace-backup.json',
          content: JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              settings: settings || {},
              admins: admins || [],
              automations: automations || [],
              channels: channels || [],
              economy: economy || {},
              commandsCount: Array.isArray(commands) ? commands.length : 0,
            },
            null,
            2
          ),
        },
      ];

      const overrideNames = new Set(extraRootFiles.map((f) => f.name));
      const allEntries = [
        ...projectFiles.filter((f) => !overrideNames.has(f.name)),
        ...extraRootFiles.map((e) => ({ name: e.name, data: Buffer.from(e.content, 'utf8') })),
      ];

      const zipBuffer = buildBufferZip(allEntries);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="velocity-owners-complete-root.zip"');
      res.send(zipBuffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ZIP export failed.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Velocity server listening on http://0.0.0.0:${PORT}`);
    startC3CListener();
  });
}

startServer();
