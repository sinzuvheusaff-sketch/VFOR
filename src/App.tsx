/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { AutomationsView } from './components/AutomationsView';
import { C3CLoginView } from './components/C3CLoginView';
import { ChannelsView } from './components/ChannelsView';
import { CommandRunnerView } from './components/CommandRunnerView';
import { CommandsView } from './components/CommandsView';
import { LogsView } from './components/LogsView';
import { NewCommandModal } from './components/NewCommandModal';
import { OverviewView } from './components/OverviewView';
import { OwnersRoomView } from './components/OwnersRoomView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import {
  DEFAULT_USER_PFP,
  DEFAULT_WIDGET_LAYOUT,
  INITIAL_AUTOMATIONS,
  INITIAL_CHANNELS,
  INITIAL_COMMANDS,
  INITIAL_ECONOMY,
  INITIAL_LOGS,
  INITIAL_SETTINGS,
  WIDGET_CATALOG,
} from './data/commands';
import { executeVelocityCommand } from './engine/commandExecutor';
import {
  AutomationRule,
  BotAdminEntry,
  BotSettings,
  C3CSession,
  ChannelConfig,
  CommandCategory,
  CommandExecutionLog,
  ConsoleEntry,
  DashboardWidgetConfig,
  DashboardWidgetId,
  EconomyState,
  NavSection,
  VelocityCommand,
} from './types/velocity';

const STORAGE_KEYS = {
  commands: 'velocity_commands_v1',
  settings: 'velocity_settings_v1',
  automations: 'velocity_automations_v1',
  channels: 'velocity_channels_v1',
  logs: 'velocity_logs_v1',
  economy: 'velocity_economy_v1',
  widgets: 'velocity_dashboard_widgets_v1',
  c3cSession: 'velocity_c3c_session_v1',
  admins: 'velocity_bot_admins_v1',
};

const INITIAL_C3C_SESSION: C3CSession = {
  appStateJson: '',
  detectedUid: null,
  cookieCount: 0,
  hasXsCookie: false,
  connected: false,
  updatedAt: null,
};

const INITIAL_ADMINS: BotAdminEntry[] = [
  {
    id: 'adm-1',
    uid: '100094827103845',
    label: 'Nadeus Cartel Owner',
    role: 'Owner',
    addedAt: '2026-11-15',
  },
];

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadMergedSettings(): BotSettings {
  const stored = loadStored<Partial<BotSettings>>(STORAGE_KEYS.settings, {});
  return {
    ...INITIAL_SETTINGS,
    ...stored,
    pfpUrl: stored.pfpUrl && !stored.pfpUrl.includes('nadeus_operator_avatar') ? stored.pfpUrl : DEFAULT_USER_PFP,
  };
}

function loadMergedCommands(): VelocityCommand[] {
  const stored = loadStored<VelocityCommand[]>(STORAGE_KEYS.commands, INITIAL_COMMANDS);
  const storedById = new Map(stored.map((c) => [c.id, c]));
  const mergedBuiltIns = INITIAL_COMMANDS.map((def) => {
    const existing = storedById.get(def.id);
    return existing
      ? {
          ...def,
          enabled: existing.enabled,
          executions: existing.executions,
          permission: existing.permission,
          cooldownSec: existing.cooldownSec,
        }
      : def;
  });
  const customOnly = stored.filter((c) => c.isCustom);
  return [...customOnly, ...mergedBuiltIns];
}

function loadMergedWidgets(): DashboardWidgetConfig[] {
  const stored = loadStored<DashboardWidgetConfig[]>(STORAGE_KEYS.widgets, DEFAULT_WIDGET_LAYOUT);
  const validIds = new Set(WIDGET_CATALOG.map((w) => w.id));
  const filtered = stored.filter((w) => validIds.has(w.id));
  const seen = new Set(filtered.map((w) => w.id));
  const missing = DEFAULT_WIDGET_LAYOUT.filter((w) => !seen.has(w.id));
  return [...filtered, ...missing];
}

function checkTicTacToeWinner(b: ('' | 'X' | 'O')[]): 'X' | 'O' | 'draw' | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, c, d] of lines) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return b.every((cell) => cell !== '') ? 'draw' : null;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newCmdModalOpen, setNewCmdModalOpen] = useState(false);
  const [pendingRunnerInput, setPendingRunnerInput] = useState('');
  const [commandsCategoryJump, setCommandsCategoryJump] = useState<'All' | CommandCategory>('All');
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);

  const [settings, setSettings] = useState<BotSettings>(loadMergedSettings);
  const [commands, setCommands] = useState<VelocityCommand[]>(loadMergedCommands);
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(loadMergedWidgets);
  const [c3cSession, setC3cSession] = useState<C3CSession>(() =>
    loadStored(STORAGE_KEYS.c3cSession, INITIAL_C3C_SESSION)
  );
  const [admins, setAdmins] = useState<BotAdminEntry[]>(() =>
    loadStored(STORAGE_KEYS.admins, INITIAL_ADMINS)
  );
  const [automations, setAutomations] = useState<AutomationRule[]>(() =>
    loadStored(STORAGE_KEYS.automations, INITIAL_AUTOMATIONS)
  );
  const [channels, setChannels] = useState<ChannelConfig[]>(() =>
    loadStored(STORAGE_KEYS.channels, INITIAL_CHANNELS)
  );
  const [logs, setLogs] = useState<CommandExecutionLog[]>(() =>
    loadStored(STORAGE_KEYS.logs, INITIAL_LOGS)
  );
  const [economy, setEconomy] = useState<EconomyState>(() =>
    loadStored(STORAGE_KEYS.economy, INITIAL_ECONOMY)
  );

  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([
    {
      id: 'init-welcome',
      timestamp: '00:00:00',
      rawInput: '/stats',
      commandName: 'stats',
      status: 'success',
      title: 'Velocity Command Console Ready',
      lines: [
        `Built by Nadeus Cartel · ${INITIAL_COMMANDS.length} commands ready across AI, Banners, Video, Games, Moderation & Economy.`,
      ],
    },
  ]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.commands, JSON.stringify(commands)); } catch { /* ignore */ }
  }, [commands]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.widgets, JSON.stringify(widgets)); } catch { /* ignore */ }
  }, [widgets]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.c3cSession, JSON.stringify(c3cSession)); } catch { /* ignore */ }
  }, [c3cSession]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.admins, JSON.stringify(admins)); } catch { /* ignore */ }
  }, [admins]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.automations, JSON.stringify(automations)); } catch { /* ignore */ }
  }, [automations]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.channels, JSON.stringify(channels)); } catch { /* ignore */ }
  }, [channels]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(logs)); } catch { /* ignore */ }
  }, [logs]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.economy, JSON.stringify(economy)); } catch { /* ignore */ }
  }, [economy]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [settings.theme]);

  const updateSettings = useCallback((partial: Partial<BotSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleExecuteCommand = useCallback(
    async (rawInput: string, sourceChannel = 'Command Runner'): Promise<ConsoleEntry> => {
      const start = performance.now();
      const entry = await executeVelocityCommand(rawInput, {
        commands,
        settings,
        economy,
        automations,
        updateEconomy: setEconomy,
        updateSettings,
      });
      const elapsed = Math.max(1, Math.round(performance.now() - start));

      setConsoleEntries((prev) => [...prev, entry]);

      const matchedCmd = commands.find((c) => c.name === entry.commandName);
      if (matchedCmd && entry.status === 'success') {
        setCommands((prev) =>
          prev.map((c) =>
            c.id === matchedCmd.id
              ? { ...c, executions: c.executions + 1, lastUsed: 'Just now' }
              : c
          )
        );
      }

      if (settings.auditLogging) {
        const logRow: CommandExecutionLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          commandName: entry.commandName,
          rawInput,
          category: matchedCmd?.category || 'Core',
          actor: '@nadeus',
          channel: sourceChannel,
          durationMs: elapsed,
          outcome:
            entry.status === 'success'
              ? 'Completed'
              : entry.status === 'warning'
                ? 'Blocked'
                : 'Error',
          timestamp: entry.timestamp,
          outputSummary: entry.lines[0] || entry.title,
        };
        setLogs((prev) => [logRow, ...prev.slice(0, 99)]);
      }

      return entry;
    },
    [commands, settings, economy, automations, updateSettings]
  );

  const handleLaunchCommand = useCallback((rawInput: string) => {
    setActiveSection('runner');
    setPendingRunnerInput(rawInput);
  }, []);

  const handleToggleWidget = (id: DashboardWidgetId) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleMoveWidget = (id: DashboardWidgetId, direction: 'up' | 'down') => {
    setWidgets((prev) => {
      const enabledList = prev.filter((w) => w.enabled);
      const pos = enabledList.findIndex((w) => w.id === id);
      if (pos === -1) return prev;
      const swapPos = direction === 'up' ? pos - 1 : pos + 1;
      if (swapPos < 0 || swapPos >= enabledList.length) return prev;
      const targetId = enabledList[swapPos].id;

      const idxA = prev.findIndex((w) => w.id === id);
      const idxB = prev.findIndex((w) => w.id === targetId);
      const copy = [...prev];
      [copy[idxA], copy[idxB]] = [copy[idxB], copy[idxA]];
      return copy;
    });
  };

  const handleReorderWidget = (draggedId: DashboardWidgetId, targetId: DashboardWidgetId) => {
    setWidgets((prev) => {
      const fromIdx = prev.findIndex((w) => w.id === draggedId);
      const toIdx = prev.findIndex((w) => w.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  };

  const handleToggleWidgetSpan = (id: DashboardWidgetId) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, span: w.span === 'full' ? 'half' : 'full' } : w
      )
    );
  };

  const handleVotePoll = (entryId: string, optionIndex: number) => {
    setConsoleEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId || !entry.pollData) return entry;
        return {
          ...entry,
          pollData: {
            ...entry.pollData,
            options: entry.pollData.options.map((opt, idx) =>
              idx === optionIndex ? { ...opt, votes: opt.votes + 1 } : opt
            ),
          },
        };
      })
    );
  };

  const handlePlayTicTacToe = (entryId: string, cellIndex: number) => {
    setConsoleEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId || !entry.tictactoeData) return entry;
        const { board, status } = entry.tictactoeData;
        if (status !== 'playing' || board[cellIndex] !== '') return entry;

        const next = [...board];
        next[cellIndex] = 'X';
        const afterPlayer = checkTicTacToeWinner(next);
        if (afterPlayer === 'X') {
          setEconomy((e) => ({ ...e, wallet: e.wallet + 100 }));
          return { ...entry, tictactoeData: { board: next, status: 'win' } };
        }
        if (afterPlayer === 'draw') {
          return { ...entry, tictactoeData: { board: next, status: 'draw' } };
        }

        const emptyIdx = next.map((v, i) => (v === '' ? i : -1)).filter((i) => i !== -1);
        if (emptyIdx.length > 0) {
          const botPick = emptyIdx[Math.floor(Math.random() * emptyIdx.length)];
          next[botPick] = 'O';
        }
        const afterBot = checkTicTacToeWinner(next);
        return {
          ...entry,
          tictactoeData: {
            board: next,
            status: afterBot === 'O' ? 'lose' : afterBot === 'draw' ? 'draw' : 'playing',
          },
        };
      })
    );
  };

  const handleResetWorkspace = () => {
    setSettings(INITIAL_SETTINGS);
    setCommands(INITIAL_COMMANDS);
    setWidgets(DEFAULT_WIDGET_LAYOUT);
    setC3cSession(INITIAL_C3C_SESSION);
    setAdmins(INITIAL_ADMINS);
    setAutomations(INITIAL_AUTOMATIONS);
    setChannels(INITIAL_CHANNELS);
    setLogs(INITIAL_LOGS);
    setEconomy(INITIAL_ECONOMY);
  };

  const handleTopBarAction = () => {
    if (activeSection === 'commands') {
      setNewCmdModalOpen(true);
    } else {
      setActiveSection('runner');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#090D16] dark:text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        settings={settings}
        commandCount={commands.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          settings={settings}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onPrimaryAction={handleTopBarAction}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {activeSection === 'overview' && (
            <OverviewView
              commands={commands}
              logs={logs}
              automations={automations}
              channels={channels}
              economy={economy}
              settings={settings}
              widgets={widgets}
              onToggleWidget={handleToggleWidget}
              onMoveWidget={handleMoveWidget}
              onReorderWidget={handleReorderWidget}
              onToggleWidgetSpan={handleToggleWidgetSpan}
              onResetWidgets={() => setWidgets(DEFAULT_WIDGET_LAYOUT)}
              onNavigate={setActiveSection}
              onOpenCategoryInCommands={(cat) => {
                setCommandsCategoryJump(cat);
                setActiveSection('commands');
              }}
              onQuickRun={handleLaunchCommand}
              onExecuteInline={(raw) => handleExecuteCommand(raw, 'Dashboard Widget')}
            />
          )}

          {activeSection === 'commands' && (
            <CommandsView
              commands={commands}
              settings={settings}
              initialCategory={commandsCategoryJump}
              onClearInitialCategory={() => setCommandsCategoryJump('All')}
              onToggleCommand={(id) =>
                setCommands((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)))
              }
              onBulkToggle={(ids, enabled) => {
                const set = new Set(ids);
                setCommands((prev) => prev.map((c) => (set.has(c.id) ? { ...c, enabled } : c)));
              }}
              onUpdateCommand={(id, patch) =>
                setCommands((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
              }
              onDeleteCustomCommand={(id) =>
                setCommands((prev) => prev.filter((c) => c.id !== id))
              }
              onOpenNewModal={() => setNewCmdModalOpen(true)}
              onRunInConsole={handleLaunchCommand}
            />
          )}

          {activeSection === 'runner' && (
            <CommandRunnerView
              commands={commands}
              settings={settings}
              entries={consoleEntries}
              pendingInput={pendingRunnerInput}
              onClearPendingInput={() => setPendingRunnerInput('')}
              onExecute={(raw) => handleExecuteCommand(raw, 'Command Runner').then(() => undefined)}
              onClearConsole={() => setConsoleEntries([])}
              onVotePoll={handleVotePoll}
              onPlayTicTacToe={handlePlayTicTacToe}
            />
          )}

          {activeSection === 'c3c' && (
            <C3CLoginView
              session={c3cSession}
              admins={admins}
              settings={settings}
              commands={commands}
              onSaveSession={setC3cSession}
              onAddAdmin={(adm) => setAdmins((prev) => [...prev, adm])}
              onRemoveAdmin={(id) => setAdmins((prev) => prev.filter((a) => a.id !== id))}
            />
          )}

          {activeSection === 'owners' && (
            <OwnersRoomView
              unlocked={ownerUnlocked}
              onUnlock={() => setOwnerUnlocked(true)}
              onLock={() => setOwnerUnlocked(false)}
              settings={settings}
              commands={commands}
              admins={admins}
              c3cSession={c3cSession}
              automations={automations}
              channels={channels}
              economy={economy}
              logs={logs}
              onUpdateSettings={updateSettings}
              onBulkToggleCommands={(ids, enabled) => {
                const set = new Set(ids);
                setCommands((prev) => prev.map((c) => (set.has(c.id) ? { ...c, enabled } : c)));
              }}
              onAddAdmin={(adm) => setAdmins((prev) => [...prev, adm])}
              onRemoveAdmin={(id) => setAdmins((prev) => prev.filter((a) => a.id !== id))}
              onGrantWalletVc={(amount) =>
                setEconomy((prev) => ({ ...prev, wallet: Math.max(0, prev.wallet + amount) }))
              }
              onClearLogs={() => setLogs([])}
              onResetWorkspace={handleResetWorkspace}
              onQuickRun={handleLaunchCommand}
            />
          )}

          {activeSection === 'automations' && (
            <AutomationsView
              automations={automations}
              onToggleRule={(id) =>
                setAutomations((prev) =>
                  prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
                )
              }
              onAddRule={(rule) => setAutomations((prev) => [rule, ...prev])}
              onDeleteRule={(id) =>
                setAutomations((prev) => prev.filter((a) => a.id !== id))
              }
            />
          )}

          {activeSection === 'channels' && (
            <ChannelsView
              channels={channels}
              onToggleChannel={(id) =>
                setChannels((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
                )
              }
              onUpdateModeration={(id, moderationLevel) =>
                setChannels((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, moderationLevel } : c))
                )
              }
              onAddChannel={(ch) => setChannels((prev) => [ch, ...prev])}
            />
          )}

          {activeSection === 'logs' && (
            <LogsView logs={logs} onQuickRun={handleLaunchCommand} />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              settings={settings}
              commands={commands}
              onUpdateSettings={updateSettings}
              onResetWorkspace={handleResetWorkspace}
            />
          )}
        </main>

        <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {settings.botName} · {settings.builderCredit}
          </span>
          <span className="tabular-nums">
            {commands.length} commands loaded · {admins.length} bot admins · Prefix "{settings.prefix}"
          </span>
        </footer>
      </div>

      {newCmdModalOpen && (
        <NewCommandModal
          prefix={settings.prefix}
          onClose={() => setNewCmdModalOpen(false)}
          onCreate={(cmd) => setCommands((prev) => [cmd, ...prev])}
        />
      )}
    </div>
  );
}
