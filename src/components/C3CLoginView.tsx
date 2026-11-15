import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  KeyRound,
  Plus,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import { BotAdminEntry, BotSettings, C3CSession, VelocityCommand } from '../types/velocity';
import { buildZipBlob } from '../utils/zipBuilder';

interface C3CLoginViewProps {
  session: C3CSession;
  admins: BotAdminEntry[];
  settings: BotSettings;
  commands: VelocityCommand[];
  onSaveSession: (session: C3CSession) => void;
  onAddAdmin: (admin: BotAdminEntry) => void;
  onRemoveAdmin: (id: string) => void;
}

interface ParsedCookie {
  key?: string;
  name?: string;
  value?: string;
  domain?: string;
}

export const C3CLoginView: React.FC<C3CLoginViewProps> = ({
  session,
  admins,
  settings,
  commands,
  onSaveSession,
  onAddAdmin,
  onRemoveAdmin,
}) => {
  const [rawJson, setRawJson] = useState(session.appStateJson);
  const [parseError, setParseError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [newUid, setNewUid] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newRole, setNewRole] = useState<'Owner' | 'Admin'>('Admin');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncToBackend = async (appStateText: string, nextAdmins: BotAdminEntry[]) => {
    try {
      await fetch('/api/c3c/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appStateJson: appStateText,
          config: {
            botName: settings.botName,
            builderCredit: settings.builderCredit,
            prefix: settings.prefix,
            defaultCooldownSec: settings.defaultCooldownSec,
            maintenanceMode: settings.maintenanceMode,
            adminUids: nextAdmins.map((a) => a.uid),
            admins: nextAdmins.map((a) => ({ uid: a.uid, label: a.label, role: a.role })),
          },
          commands: commands.map((c) => ({
            name: c.name,
            aliases: c.aliases,
            category: c.category,
            permission: c.permission,
            cooldownSec: c.cooldownSec,
            enabled: c.enabled,
            usage: `${settings.prefix}${c.usage}`,
            description: c.description,
          })),
        }),
      });
    } catch {
      // Non-fatal if offline
    }
  };

  const validateAndConnect = async (jsonText: string) => {
    setParseError('');
    setStatusMessage('');
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setParseError('Paste your C3C FBState / appstate.json cookie array first.');
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as ParsedCookie[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setParseError('AppState must be a non-empty JSON array of Facebook session cookies.');
        return;
      }

      const cUser = parsed.find((c) => (c.key || c.name) === 'c_user');
      const xs = parsed.find((c) => (c.key || c.name) === 'xs');
      const detectedUid = cUser?.value ? String(cUser.value) : null;

      onSaveSession({
        appStateJson: trimmed,
        detectedUid,
        cookieCount: parsed.length,
        hasXsCookie: Boolean(xs?.value),
        connected: true,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      let updatedAdmins = admins;
      if (detectedUid && !admins.some((a) => a.uid === detectedUid)) {
        const ownerEntry: BotAdminEntry = {
          id: `adm-${Date.now()}`,
          uid: detectedUid,
          label: 'C3C Primary Account',
          role: 'Owner',
          addedAt: new Date().toLocaleDateString(),
        };
        onAddAdmin(ownerEntry);
        updatedAdmins = [...admins, ownerEntry];
      }

      await syncToBackend(trimmed, updatedAdmins);

      setStatusMessage(
        detectedUid
          ? `C3C AppState linked & synced to server (${parsed.length} cookies · UID ${detectedUid}).`
          : `C3C AppState saved & synced (${parsed.length} cookies). Add your numeric Admin UID manually if c_user was omitted.`
      );
    } catch {
      setParseError('Invalid JSON format. Ensure you copied the full C3C FBState JSON array.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setRawJson(text);
      validateAndConnect(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadTemplate = () => {
    const template = JSON.stringify(
      [
        { key: 'c_user', value: '100094827103845', domain: '.facebook.com', path: '/' },
        { key: 'xs', value: 'sample_c3c_session_token_replace_with_real', domain: '.facebook.com', path: '/' },
        { key: 'datr', value: 'sample_datr_cookie_value', domain: '.facebook.com', path: '/' },
        { key: 'fr', value: 'sample_fr_cookie_value', domain: '.facebook.com', path: '/' },
      ],
      null,
      2
    );
    setRawJson(template);
    setParseError('');
    setStatusMessage('Loaded C3C FBState format template. Replace values with your real C3C export.');
  };

  const handleClearSession = () => {
    setRawJson('');
    setParseError('');
    setStatusMessage('');
    onSaveSession({
      appStateJson: '',
      detectedUid: null,
      cookieCount: 0,
      hasXsCookie: false,
      connected: false,
      updatedAt: null,
    });
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = newUid.trim();
    if (!uid) return;
    if (admins.some((a) => a.uid === uid)) return;
    onAddAdmin({
      id: `adm-${Date.now()}`,
      uid,
      label: newLabel.trim() || 'Bot Admin',
      role: newRole,
      addedAt: new Date().toLocaleDateString(),
    });
    setNewUid('');
    setNewLabel('');
  };

  const handleDownloadRootZip = () => {
    const adminUids = admins.map((a) => a.uid);
    const botPackageJson = JSON.stringify(
      {
        name: 'velocity-c3c-bot',
        version: '1.0.0',
        description: `${settings.botName} Messenger & Multi-Command Bot (${settings.builderCredit})`,
        main: 'index.js',
        type: 'commonjs',
        scripts: {
          start: 'node index.js',
        },
        dependencies: {
          'ws3-fca': '^3.5.2',
          '@google/genai': '^2.32.0',
          dotenv: '^17.2.3',
          express: '^4.21.2',
        },
      },
      null,
      2
    );

    const botConfigJson = JSON.stringify(
      {
        botName: settings.botName,
        builderCredit: settings.builderCredit,
        prefix: settings.prefix,
        defaultCooldownSec: settings.defaultCooldownSec,
        maintenanceMode: settings.maintenanceMode,
        adminUids,
        admins: admins.map((a) => ({ uid: a.uid, label: a.label, role: a.role })),
        enabledCommandsCount: commands.filter((c) => c.enabled).length,
      },
      null,
      2
    );

    const appStateOut =
      session.appStateJson.trim() ||
      JSON.stringify(
        [{ key: 'c_user', value: adminUids[0] || 'REPLACE_WITH_C3C_UID', domain: '.facebook.com', path: '/' }],
        null,
        2
      );

    const commandsManifestJson = JSON.stringify(
      commands.map((c) => ({
        name: c.name,
        aliases: c.aliases,
        category: c.category,
        permission: c.permission,
        cooldownSec: c.cooldownSec,
        enabled: c.enabled,
        usage: `${settings.prefix}${c.usage}`,
        description: c.description,
      })),
      null,
      2
    );

    const indexJs = `/**
 * ${settings.botName} Bot Entry Point (Repository Root)
 * ${settings.builderCredit}
 * C3C AppState + Admin UID + ${commands.length} Commands Runner
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config();

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const commands = JSON.parse(fs.readFileSync(path.join(__dirname, 'commands.json'), 'utf8'));
const appState = JSON.parse(fs.readFileSync(path.join(__dirname, 'appstate.json'), 'utf8'));

let aiClient = null;
if (process.env.GEMINI_API_KEY) {
  try {
    const { GoogleGenAI } = require('@google/genai');
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    console.warn('Gemini SDK optional initialization skipped:', e.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const startedAt = Date.now();

app.get('/', (_req, res) => {
  res.json({
    bot: config.botName,
    credit: config.builderCredit,
    prefix: config.prefix,
    admins: config.adminUids,
    commandsLoaded: commands.length,
    appStateCookies: Array.isArray(appState) ? appState.length : 0,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
  });
});

app.listen(PORT, () => {
  console.log(\`[\${config.botName}] Health server listening on port \${PORT}\`);
  console.log(\`[\${config.botName}] \${config.builderCredit}\`);
  console.log(\`[\${config.botName}] Loaded \${commands.length} commands | Admins: \${config.adminUids.join(', ')}\`);
});

async function handleBotCommand(cmd, args, rawArg, event) {
  const name = cmd.name;
  if (name === 'help' || name === 'menu') {
    const cats = [...new Set(commands.map((c) => c.category))];
    return \`\${config.botName} (\${config.builderCredit})\\nPrefix: \${config.prefix} | Loaded: \${commands.length} commands\\nModules: \${cats.join(', ')}\`;
  }
  if (name === 'ping') return 'Pong! Velocity C3C runtime active.';
  if (name === 'uptime') return \`Uptime: \${Math.floor((Date.now() - startedAt) / 1000)}s\`;
  if (name === 'id') return \`Sender UID: \${event.senderID} | Thread ID: \${event.threadID}\`;
  if (name === 'tweet') return \`[X / TWEET CARD]\\n@\${event.senderID}: "\${rawArg || 'Velocity 550+ commands live!'}"\`;
  if (name === 'music' || name === 'opm' || name === 'kpop' || name === 'jpop') {
    return \`[MUSIC QUEUE · \${name.toUpperCase()}] Selected: \${rawArg || 'Raining in Manila — Lola Amour'}\`;
  }
  if (name === 'godmode') {
    return \`[GODMODE ACTIVE] Owner UID \${event.senderID} verified across \${commands.length} commands.\`;
  }
  if (cmd.category === 'AI') {
    if (!aiClient) return 'GEMINI_API_KEY is not configured in .env for AI commands.';
    const res = await aiClient.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: \`Command mode: \${name}. User request: \${rawArg || 'Introduce Velocity concisely.'}\`,
    });
    return res.text || 'No AI output generated.';
  }
  return \`[\${config.prefix}\${name} · \${cmd.category}] \${cmd.description}\${rawArg ? '\\nInput: ' + rawArg : ''}\`;
}

// Start C3C / ws3-fca Listener automatically on boot
try {
  const { login } = require('ws3-fca');
  login({ appState }, { listenEvents: true, selfListen: false, autoReconnect: true }, (err, api) => {
    if (err) {
      console.error('C3C Login error (check appstate.json):', err);
      return;
    }
    console.log(\`[\${config.botName}] Connected to Messenger via C3C AppState!\`);

    api.listenMqtt(async (listenErr, event) => {
      if (listenErr || !event || event.type !== 'message' || !event.body) return;
      const body = event.body.trim();
      if (!body.startsWith(config.prefix)) return;

      const args = body.slice(config.prefix.length).trim().split(/\\s+/);
      const trigger = (args.shift() || '').toLowerCase();
      const rawArg = args.join(' ');
      const cmd = commands.find((c) => c.enabled && (c.name === trigger || (c.aliases || []).includes(trigger)));
      if (!cmd) return;

      const isAdmin = config.adminUids.includes(String(event.senderID));
      if ((cmd.permission === 'Admin' || cmd.permission === 'Owner') && !isAdmin) {
        api.sendMessage('Permission denied: Bot Admin UID required.', event.threadID, event.messageID);
        return;
      }

      try {
        const reply = await handleBotCommand(cmd, args, rawArg, event);
        api.sendMessage(reply, event.threadID, event.messageID);
      } catch (execErr) {
        api.sendMessage(\`Command error: \${execErr.message}\`, event.threadID, event.messageID);
      }
    });
  });
} catch (e) {
  console.log('Install dependencies with "npm install" before starting Messenger listener.');
}
`;

    const gitignore = `node_modules/
.env
*.log
`;

    const envExample = `PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
`;

    const readmeMd = `# ${settings.botName} — C3C Messenger Bot

${settings.builderCredit}

All files in this archive sit directly at the **repository root** (no wrapper subfolder) so you can upload straight to GitHub and deploy on Node.js / Replit / Railway / Render / VPS.

## Root Files
- \`index.js\` — Main C3C AppState listener + Express health server + ${commands.length} command router
- \`config.json\` — Bot prefix (\`${settings.prefix}\`), Bot Admin UIDs (${adminUids.join(', ') || 'none'}), and settings
- \`appstate.json\` — Your C3C FBState cookie session
- \`commands.json\` — Full export of ${commands.length} Velocity commands (including \`tweet\`, \`music\`, AI, games, anime, economy, moderation, banners, and \`godmode\`)
- \`package.json\` — Node.js dependencies
- \`.env.example\` — Environment variable template
- \`.gitignore\` — Excludes \`node_modules/\` and \`.env\`

## Quick Start
\`\`\`bash
npm install
npm start
\`\`\`
`;

    const blob = buildZipBlob([
      { name: 'package.json', content: botPackageJson },
      { name: 'index.js', content: indexJs },
      { name: 'config.json', content: botConfigJson },
      { name: 'appstate.json', content: appStateOut },
      { name: 'commands.json', content: commandsManifestJson },
      { name: 'README.md', content: readmeMd },
      { name: '.gitignore', content: gitignore },
      { name: '.env.example', content: envExample },
    ]);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'velocity-c3c-root-github.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            C3C Login, Bot Admin & Root Export
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Configure your C3C FBState AppState session, assign Bot Admin UIDs, and export a root-level GitHub ZIP bundle.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadRootZip}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Download Root GitHub ZIP</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* C3C AppState Paste / Upload (2/3) */}
        <section className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>C3C FBState / AppState Session</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Paste your exported C3C appstate JSON array or upload your <span className="font-mono">appstate.json</span> file.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload JSON</span>
              </button>
              <button
                type="button"
                onClick={handleLoadTemplate}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                Sample Template
              </button>
            </div>
          </div>

          {parseError && (
            <div className="px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
              {parseError}
            </div>
          )}

          {statusMessage && (
            <div className="px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <textarea
            rows={10}
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            placeholder='[{"key":"c_user","value":"1000...","domain":".facebook.com","path":"/"}, {"key":"xs","value":"..."}]'
            className="w-full p-3.5 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {session.connected ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Session linked · {session.cookieCount} cookies
                  {session.detectedUid ? ` · UID ${session.detectedUid}` : ''}
                  {session.updatedAt ? ` · Saved ${session.updatedAt}` : ''}
                </span>
              ) : (
                <span>No C3C AppState linked yet</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {session.connected && (
                <button
                  type="button"
                  onClick={handleClearSession}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 whitespace-nowrap"
                >
                  Disconnect
                </button>
              )}
              <button
                type="button"
                onClick={() => validateAndConnect(rawJson)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
              >
                Validate & Connect C3C
              </button>
            </div>
          </div>
        </section>

        {/* Bot Admin UIDs + Root Export Info (1/3) */}
        <aside className="space-y-6">
          <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Bot Admin UIDs</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assign Facebook UIDs allowed to run Admin and Owner commands.
              </p>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-2.5">
              <input
                type="text"
                value={newUid}
                onChange={(e) => setNewUid(e.target.value)}
                placeholder="Numeric UID (e.g. 100094827103845)"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. Nadeus)"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  aria-label="Admin role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'Owner' | 'Admin')}
                  className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Owner">Owner</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!newUid.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Bot Admin</span>
              </button>
            </form>

            <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80 pt-2">
              {admins.map((adm) => (
                <div key={adm.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {adm.label} · {adm.role}
                    </div>
                    <div className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 truncate">
                      {adm.uid}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveAdmin(adm.id)}
                    aria-label={`Remove admin ${adm.label}`}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              Root-Level GitHub ZIP Contents
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Every file inside <span className="font-mono">velocity-c3c-root-github.zip</span> sits directly at the repository root—no nested wrapper folder:
            </p>
            <ul className="text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
              <li>package.json</li>
              <li>index.js</li>
              <li>config.json ({admins.length} admins)</li>
              <li>appstate.json</li>
              <li>commands.json ({commands.length} cmds)</li>
              <li>README.md</li>
              <li>.env.example</li>
              <li>.gitignore</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};
