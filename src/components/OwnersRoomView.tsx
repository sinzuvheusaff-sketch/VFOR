import React, { useMemo, useState } from 'react';
import {
  Download,
  Eye,
  EyeOff,
  FileArchive,
  Lock,
  Plus,
  Power,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Trash2,
  Unlock,
} from 'lucide-react';
import { COMMAND_CATEGORIES } from '../data/commands';
import {
  AutomationRule,
  BotAdminEntry,
  BotSettings,
  C3CSession,
  ChannelConfig,
  CommandCategory,
  CommandExecutionLog,
  EconomyState,
  VelocityCommand,
} from '../types/velocity';
import { buildZipBlob } from '../utils/zipBuilder';

const OWNER_PASSCODE = '1590579072523';

interface OwnersRoomViewProps {
  unlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  settings: BotSettings;
  commands: VelocityCommand[];
  admins: BotAdminEntry[];
  c3cSession: C3CSession;
  automations: AutomationRule[];
  channels: ChannelConfig[];
  economy: EconomyState;
  logs: CommandExecutionLog[];
  onUpdateSettings: (patch: Partial<BotSettings>) => void;
  onBulkToggleCommands: (ids: string[], enabled: boolean) => void;
  onAddAdmin: (admin: BotAdminEntry) => void;
  onRemoveAdmin: (id: string) => void;
  onGrantWalletVc: (amount: number) => void;
  onClearLogs: () => void;
  onResetWorkspace: () => void;
  onQuickRun: (commandInput: string) => void;
}

export const OwnersRoomView: React.FC<OwnersRoomViewProps> = ({
  unlocked,
  onUnlock,
  onLock,
  settings,
  commands,
  admins,
  c3cSession,
  automations,
  channels,
  economy,
  logs,
  onUpdateSettings,
  onBulkToggleCommands,
  onAddAdmin,
  onRemoveAdmin,
  onGrantWalletVc,
  onClearLogs,
  onResetWorkspace,
  onQuickRun,
}) => {
  const [passInput, setPassInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState('');
  const [downloadingFullZip, setDownloadingFullZip] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [exportError, setExportError] = useState('');

  const [newUid, setNewUid] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newRole, setNewRole] = useState<'Owner' | 'Admin'>('Owner');
  const [vcAmount, setVcAmount] = useState('5000');

  const enabledCount = useMemo(() => commands.filter((c) => c.enabled).length, [commands]);

  const moduleSummary = useMemo(() => {
    return COMMAND_CATEGORIES.map((cat) => {
      const list = commands.filter((c) => c.category === cat);
      const active = list.filter((c) => c.enabled).length;
      return { category: cat, total: list.length, active, ids: list.map((c) => c.id) };
    });
  }, [commands]);

  const handlePassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput.trim() === OWNER_PASSCODE) {
      setAuthError('');
      setPassInput('');
      onUnlock();
    } else {
      setAuthError('Incorrect Owner Room passcode. Access denied.');
    }
  };

  const handleDownloadCompleteRootZip = async () => {
    setDownloadingFullZip(true);
    setExportError('');
    setExportStatus('');
    try {
      const response = await fetch('/api/export/full-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode: OWNER_PASSCODE,
          settings,
          admins,
          c3cSession,
          commands,
          automations,
          channels,
          economy,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Export failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'velocity-owners-complete-root.zip';
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(
        `Downloaded velocity-owners-complete-root.zip (full codebase, assets, C3C appstate, ${commands.length} commands & bot config at root).`
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Unable to generate complete ZIP archive.');
    } finally {
      setDownloadingFullZip(false);
    }
  };

  const handleDownloadBotOnlyZip = () => {
    const adminUids = admins.map((a) => a.uid);
    const botPackageJson = JSON.stringify(
      {
        name: 'velocity-c3c-bot',
        version: '1.0.0',
        description: `${settings.botName} Owner Bot Bundle (${settings.builderCredit})`,
        main: 'index.js',
        scripts: { start: 'node index.js' },
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
        ...settings,
        adminUids,
        admins: admins.map((a) => ({ uid: a.uid, label: a.label, role: a.role })),
      },
      null,
      2
    );

    const appStateOut =
      c3cSession.appStateJson.trim() ||
      JSON.stringify(
        [{ key: 'c_user', value: adminUids[0] || 'REPLACE_WITH_C3C_UID', domain: '.facebook.com', path: '/' }],
        null,
        2
      );

    const commandsJson = JSON.stringify(commands, null, 2);
    const indexJs = `const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config();

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const commands = JSON.parse(fs.readFileSync(path.join(__dirname, 'commands.json'), 'utf8'));
const appState = JSON.parse(fs.readFileSync(path.join(__dirname, 'appstate.json'), 'utf8'));

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_req, res) => res.json({ bot: config.botName, commands: commands.length, admins: config.adminUids }));
app.listen(PORT, () => console.log('[Velocity Owner Bot] Running on port ' + PORT));

try {
  const { login } = require('ws3-fca');
  login({ appState }, { listenEvents: true, selfListen: false, autoReconnect: true }, (err, api) => {
    if (err) return console.error('C3C Error:', err);
    api.listenMqtt((lErr, event) => {
      if (lErr || !event || event.type !== 'message' || !event.body) return;
      const body = event.body.trim();
      if (!body.startsWith(config.prefix)) return;
      const args = body.slice(config.prefix.length).trim().split(/\\s+/);
      const trigger = (args.shift() || '').toLowerCase();
      const cmd = commands.find((c) => c.enabled && (c.name === trigger || (c.aliases || []).includes(trigger)));
      if (!cmd) return;
      const isAdmin = (config.adminUids || []).includes(String(event.senderID));
      if ((cmd.permission === 'Admin' || cmd.permission === 'Owner') && !isAdmin) {
        return api.sendMessage('Owner/Admin UID required.', event.threadID, event.messageID);
      }
      api.sendMessage('[' + config.prefix + cmd.name + '] ' + cmd.description, event.threadID, event.messageID);
    });
  });
} catch (e) {
  console.log('Run "npm install" before starting Messenger listener.');
}
`;

    const blob = buildZipBlob([
      { name: 'package.json', content: botPackageJson },
      { name: 'index.js', content: indexJs },
      { name: 'config.json', content: botConfigJson },
      { name: 'appstate.json', content: appStateOut },
      { name: 'commands.json', content: commandsJson },
      { name: '.gitignore', content: 'node_modules/\n.env\n' },
      { name: '.env.example', content: 'PORT=3000\nGEMINI_API_KEY=your_key_here\n' },
    ]);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'velocity-c3c-bot-root.zip';
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('Downloaded velocity-c3c-bot-root.zip at repository root.');
  };

  const handleDownloadJsonBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      admins,
      c3cSession,
      commands,
      automations,
      channels,
      economy,
      logs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'velocity-owner-full-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('Downloaded velocity-owner-full-backup.json.');
  };

  const handleToggleCategory = (cat: CommandCategory) => {
    const mod = moduleSummary.find((m) => m.category === cat);
    if (!mod) return;
    const enableAll = mod.active < mod.total;
    onBulkToggleCommands(mod.ids, enableAll);
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = newUid.trim();
    if (!uid || admins.some((a) => a.uid === uid)) return;
    onAddAdmin({
      id: `adm-${Date.now()}`,
      uid,
      label: newLabel.trim() || 'Owner Account',
      role: newRole,
      addedAt: new Date().toLocaleDateString(),
    });
    setNewUid('');
    setNewLabel('');
  };

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Owner&apos;s Room
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter Owner passcode to access full bot control & complete ZIP downloads.
              </p>
            </div>
          </div>

          {authError && (
            <div className="px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
              {authError}
            </div>
          )}

          <form onSubmit={handlePassSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="owner-passcode-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Owner Passcode
              </label>
              <div className="relative">
                <input
                  id="owner-passcode-input"
                  type={showPass ? 'text' : 'password'}
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder="Enter Owner passcode"
                  autoComplete="off"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((prev) => !prev)}
                  aria-label={showPass ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
            >
              <Unlock className="h-4 w-4" />
              <span>Unlock Owner&apos;s Room</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Owner&apos;s Room · Master Control
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Full control over {settings.botName} ({enabledCount}/{commands.length} active commands) and complete root-level ZIP exports.
          </p>
        </div>

        <button
          type="button"
          onClick={onLock}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Lock Room</span>
        </button>
      </div>

      {/* Master Download ZIP Panel */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileArchive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Download Everything (Root-Level ZIP Archives)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download the complete Velocity dashboard + server codebase + live C3C <span className="font-mono">appstate.json</span>,{' '}
              <span className="font-mono">config.json</span>, <span className="font-mono">bot.js</span>, and all {commands.length} commands directly at the root.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={downloadingFullZip}
              onClick={handleDownloadCompleteRootZip}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>
                {downloadingFullZip ? 'Packaging Full ZIP...' : 'Download Complete Project + Bot ZIP'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadBotOnlyZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>C3C Bot Root ZIP</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJsonBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Full State JSON</span>
            </button>
          </div>
        </div>

        {exportError && (
          <div className="px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
            {exportError}
          </div>
        )}

        {exportStatus && (
          <div className="px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400">
            {exportStatus}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Global Bot Controls & Module Switches (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Power className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Global Bot Control</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onQuickRun(`${settings.prefix}godmode on`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-600/10 hover:bg-blue-600/20 whitespace-nowrap"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Run /godmode</span>
                </button>
                <button
                  type="button"
                  onClick={() => onQuickRun(`${settings.prefix}restart`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Hot Reload</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Bot Name
                </label>
                <input
                  type="text"
                  value={settings.botName}
                  onChange={(e) => onUpdateSettings({ botName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Active Prefix
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={settings.prefix}
                  onChange={(e) => onUpdateSettings({ prefix: e.target.value || '/' })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Global Cooldown (sec)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={settings.defaultCooldownSec}
                  onChange={(e) =>
                    onUpdateSettings({ defaultCooldownSec: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 font-mono tabular-nums text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onUpdateSettings({ maintenanceMode: !settings.maintenanceMode })}
                className={`px-4 py-3 rounded-lg border text-left transition-colors ${
                  settings.maintenanceMode
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1320]'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Maintenance Mode</span>
                  <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                    {settings.maintenanceMode ? 'ON (Owners Only)' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Pause all non-Owner commands globally.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ auditLogging: !settings.auditLogging })}
                className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1320] text-left"
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Audit Logging</span>
                  <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                    {settings.auditLogging ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Record every command execution to Execution Logs.
                </p>
              </button>
            </div>
          </section>

          {/* Module Power Matrix */}
          <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Module & Command Master Switches
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {enabledCount} of {commands.length} commands active across {COMMAND_CATEGORIES.length} modules
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onBulkToggleCommands(commands.map((c) => c.id), true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                >
                  Enable All {commands.length}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onBulkToggleCommands(
                      commands.filter((c) => c.category !== 'Core').map((c) => c.id),
                      false
                    )
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Pause Non-Core
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {moduleSummary.map((mod) => {
                const allActive = mod.active === mod.total;
                return (
                  <button
                    key={mod.category}
                    type="button"
                    onClick={() => handleToggleCategory(mod.category)}
                    className={`p-3 rounded-lg border text-left transition-colors flex items-center justify-between gap-2 ${
                      mod.active > 0
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1320] hover:border-blue-500'
                        : 'border-slate-200/70 dark:border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {mod.category}
                      </div>
                      <div className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                        {mod.active} / {mod.total}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-semibold shrink-0 ${
                        allActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : mod.active > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {allActive ? 'ON' : mod.active > 0 ? 'PART' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Owner Admins, Economy Grant & Dangerous Actions (1/3) */}
        <aside className="space-y-6">
          <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Owner & Admin UIDs</span>
            </h2>

            <form onSubmit={handleAddAdmin} className="space-y-2">
              <input
                type="text"
                value={newUid}
                onChange={(e) => setNewUid(e.target.value)}
                placeholder="Facebook UID"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
                <select
                  aria-label="Role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'Owner' | 'Admin')}
                  className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
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
                <span>Add UID</span>
              </button>
            </form>

            <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
              {admins.map((adm) => (
                <div key={adm.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {adm.label} · {adm.role}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {adm.uid}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveAdmin(adm.id)}
                    aria-label={`Remove ${adm.label}`}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Treasury & System Actions
            </h2>

            <div className="space-y-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Current Wallet: <span className="font-mono font-semibold text-slate-900 dark:text-white">{economy.wallet.toLocaleString()} VC</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={vcAmount}
                  onChange={(e) => setVcAmount(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = parseInt(vcAmount, 10);
                    if (!Number.isNaN(n) && n !== 0) onGrantWalletVc(n);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                >
                  Grant VC
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClearLogs}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Clear Execution Logs ({logs.length})
              </button>
              <button
                type="button"
                onClick={onResetWorkspace}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/10"
              >
                Reset Full Workspace Defaults
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
