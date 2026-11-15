import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CornerDownLeft,
  GripVertical,
  LayoutGrid,
  Play,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { COMMAND_CATEGORIES, WEEKLY_ACTIVITY, WIDGET_CATALOG } from '../data/commands';
import {
  AutomationRule,
  BotSettings,
  ChannelConfig,
  CommandCategory,
  CommandExecutionLog,
  ConsoleEntry,
  DashboardWidgetConfig,
  DashboardWidgetId,
  EconomyState,
  NavSection,
  VelocityCommand,
} from '../types/velocity';

interface OverviewViewProps {
  commands: VelocityCommand[];
  logs: CommandExecutionLog[];
  automations: AutomationRule[];
  channels: ChannelConfig[];
  economy: EconomyState;
  settings: BotSettings;
  widgets: DashboardWidgetConfig[];
  onToggleWidget: (id: DashboardWidgetId) => void;
  onMoveWidget: (id: DashboardWidgetId, direction: 'up' | 'down') => void;
  onReorderWidget: (draggedId: DashboardWidgetId, targetId: DashboardWidgetId) => void;
  onToggleWidgetSpan: (id: DashboardWidgetId) => void;
  onResetWidgets: () => void;
  onNavigate: (section: NavSection) => void;
  onOpenCategoryInCommands: (category: CommandCategory) => void;
  onQuickRun: (commandInput: string) => void;
  onExecuteInline: (rawInput: string) => Promise<ConsoleEntry>;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  commands,
  logs,
  automations,
  channels,
  economy,
  settings,
  widgets,
  onToggleWidget,
  onMoveWidget,
  onReorderWidget,
  onToggleWidgetSpan,
  onResetWidgets,
  onNavigate,
  onOpenCategoryInCommands,
  onQuickRun,
  onExecuteInline,
}) => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<DashboardWidgetId | null>(null);
  const [dragOverId, setDragOverId] = useState<DashboardWidgetId | null>(null);

  // Inline Command Pad state
  const [inlineCmd, setInlineCmd] = useState('');
  const [inlineResult, setInlineResult] = useState<ConsoleEntry | null>(null);
  const [inlineBusy, setInlineBusy] = useState(false);

  const enabledCommands = commands.filter((c) => c.enabled).length;
  const totalExecutions = commands.reduce((sum, c) => sum + c.executions, 0);
  const activeChannels = channels.filter((c) => c.active).length;
  const activeAutomations = automations.filter((a) => a.enabled).length;
  const maxWeekly = Math.max(...WEEKLY_ACTIVITY.map((d) => d.total), 1);

  const topCommands = [...commands]
    .filter((c) => c.enabled)
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 6);

  const activeWidgets = widgets.filter((w) => w.enabled);

  const handleInlineSubmit = async (e?: React.FormEvent, preset?: string) => {
    if (e) e.preventDefault();
    const raw = (preset ?? inlineCmd).trim();
    if (!raw || inlineBusy) return;
    setInlineBusy(true);
    const res = await onExecuteInline(raw);
    setInlineResult(res);
    if (!preset) setInlineCmd('');
    setInlineBusy(false);
  };

  const renderWidgetBody = (id: DashboardWidgetId) => {
    switch (id) {
      case 'kpi-summary':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Commands
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {enabledCommands}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  of {commands.length} registered
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {COMMAND_CATEGORIES.length} modules · {commands.filter((c) => c.isCustom).length} custom
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Dispatches
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {totalExecutions.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +14.2% vs last week
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Avg parser latency · 11 ms
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Connected Channels
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {activeChannels}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  of {channels.length} configured
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Discord · Messenger · Telegram
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Automation Rules
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {activeAutomations}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  active triggers
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Keyword · Join · Scheduled
              </div>
            </div>
          </div>
        );

      case 'weekly-volume':
        return (
          <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Weekly Command Volume
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily executions across active modules
                </p>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {hoveredDay !== null
                  ? `${WEEKLY_ACTIVITY[hoveredDay].day}: ${WEEKLY_ACTIVITY[hoveredDay].total.toLocaleString()} runs`
                  : 'Peak: Sat · 1,620 runs'}
              </div>
            </div>

            <div className="w-full h-52 flex items-end gap-3 pt-4">
              {WEEKLY_ACTIVITY.map((d, idx) => {
                const pct = Math.round((d.total / maxWeekly) * 100);
                const isHovered = hoveredDay === idx;
                return (
                  <div
                    key={d.day}
                    onMouseEnter={() => setHoveredDay(idx)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end cursor-default"
                  >
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mb-2">
                      {d.total.toLocaleString()}
                    </div>
                    <div className="w-full max-w-[44px] flex-1 flex items-end">
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full rounded-t-md transition-colors duration-150 ${
                          isHovered
                            ? 'bg-blue-500 dark:bg-blue-400'
                            : 'bg-blue-600/80 dark:bg-blue-600/75'
                        }`}
                      />
                    </div>
                    <div className="mt-2.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                      {d.day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'top-commands':
        return (
          <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col h-full">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Most Used Commands
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('commands')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>View all {commands.length}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80 flex-1">
              {topCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {settings.prefix}
                        {cmd.name}
                      </span>
                      <span className="text-xs text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {cmd.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      {cmd.executions.toLocaleString()} executions
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onQuickRun(`${settings.prefix}${cmd.examples[0] || cmd.name}`)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Play className="h-3 w-3" />
                    <span>Run</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'quick-terminal':
        return (
          <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4 h-full">
            <div>
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Inline Command Pad
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('runner')}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                >
                  Full console
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Fire any command immediately without leaving your dashboard
              </p>
            </div>

            <form onSubmit={(e) => handleInlineSubmit(e)} className="flex items-center gap-2">
              <input
                type="text"
                value={inlineCmd}
                onChange={(e) => setInlineCmd(e.target.value)}
                placeholder={`Try ${settings.prefix}uuid, ${settings.prefix}calc 48*12, or ${settings.prefix}daily`}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={inlineBusy || !inlineCmd.trim()}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <span>Run</span>
                <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                `${settings.prefix}uuid`,
                `${settings.prefix}ping`,
                `${settings.prefix}fact`,
                `${settings.prefix}currency 100 USD PHP`,
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => handleInlineSubmit(undefined, sample)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>

            {inlineResult && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={
                      inlineResult.status === 'success'
                        ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                        : inlineResult.status === 'warning'
                          ? 'font-semibold text-amber-600 dark:text-amber-400'
                          : 'font-semibold text-red-600 dark:text-red-400'
                    }
                  >
                    {inlineResult.title}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-400">
                    {inlineResult.timestamp}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-700 dark:text-slate-300 space-y-0.5 break-all">
                  {inlineResult.lines.slice(0, 4).map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'category-breakdown':
        return (
          <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 h-full">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Module Coverage
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any module to inspect its commands
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {COMMAND_CATEGORIES.length} modules
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {COMMAND_CATEGORIES.map((cat) => {
                const total = commands.filter((c) => c.category === cat).length;
                const active = commands.filter((c) => c.category === cat && c.enabled).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onOpenCategoryInCommands(cat)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 transition-colors text-left"
                  >
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {cat}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {active}/{total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'economy-vault':
        return (
          <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-5 h-full">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Nadeus Treasury & Streak
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live operator balance synced with economy commands
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Wallet</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                  {economy.wallet.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Vault Bank</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                  {economy.bank.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Daily Streak</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {economy.streak}d
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => handleInlineSubmit(undefined, `${settings.prefix}daily`)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
              >
                Claim Daily
              </button>
              <button
                type="button"
                onClick={() => handleInlineSubmit(undefined, `${settings.prefix}work`)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                Run Work Shift
              </button>
            </div>
          </div>
        );

      case 'channel-pulse':
        return (
          <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden h-full">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Connected Channels
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Active groups across Discord, Messenger, and Telegram
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('channels')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Manage channels
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="px-6 py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {ch.name}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {ch.platform} · {ch.moderationLevel} moderation
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 tabular-nums font-mono">
                    <span className="text-slate-500 dark:text-slate-400">
                      {ch.commandsToday} runs
                    </span>
                    <span
                      className={
                        ch.active
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-slate-400'
                      }
                    >
                      {ch.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'recent-feed':
        return (
          <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Recent Execution Feed
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest dispatches recorded across active channels
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('logs')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Full audit log
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-6">Command</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4 text-right">Duration</th>
                    <th className="py-3 px-6 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80 text-sm">
                  {logs.slice(0, 6).map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => onQuickRun(log.rawInput)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-6 font-mono text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {log.rawInput}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {log.actor}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {log.channel}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span
                          className={
                            log.outcome === 'Completed'
                              ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                              : log.outcome === 'Blocked'
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : 'text-red-600 dark:text-red-400 font-medium'
                          }
                        >
                          {log.outcome}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {log.durationMs} ms
                      </td>
                      <td className="py-3 px-6 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Intro + Customize Widgets Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Velocity Command Operations
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {settings.builderCredit} · Manage {commands.length} modular commands, automation triggers, and customizable dashboard widgets.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:block text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
            Prefix:{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {settings.prefix}
            </span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span>{settings.maintenanceMode ? 'Maintenance Mode' : 'Operational'}</span>
          </div>

          <button
            type="button"
            onClick={() => setCustomizeOpen((v) => !v)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
              customizeOpen
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{customizeOpen ? 'Done Customizing' : 'Customize Widgets'}</span>
          </button>
        </div>
      </div>

      {/* Widget Catalog & Layout Picker Panel */}
      {customizeOpen && (
        <section
          aria-label="Dashboard widget configurator"
          className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-blue-500/40 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Customize Dashboard Layout</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Toggle widgets below, drag cards by their grip handle, or use arrows and width controls to arrange your workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetWidgets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Default Layout</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WIDGET_CATALOG.map((def) => {
              const cfg = widgets.find((w) => w.id === def.id);
              const isEnabled = cfg?.enabled ?? false;
              return (
                <div
                  key={def.id}
                  className={`p-3.5 rounded-lg border transition-colors flex flex-col justify-between gap-3 ${
                    isEnabled
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/40'
                      : 'bg-slate-50 dark:bg-[#0D1320] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {def.title}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        aria-label={`Toggle ${def.title} widget`}
                        onClick={() => onToggleWidget(def.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ${
                          isEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {def.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Active Widgets Grid */}
      {activeWidgets.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            All dashboard widgets are currently hidden
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enable widgets from the configurator or restore the default layout.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
            >
              Choose Widgets
            </button>
            <button
              type="button"
              onClick={onResetWidgets}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"
            >
              Restore Defaults
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {activeWidgets.map((widgetCfg, idx) => {
            const def = WIDGET_CATALOG.find((d) => d.id === widgetCfg.id);
            const isFull = widgetCfg.span === 'full';
            const isDragTarget = dragOverId === widgetCfg.id && draggedId !== widgetCfg.id;

            return (
              <section
                key={widgetCfg.id}
                draggable={customizeOpen}
                onDragStart={() => setDraggedId(widgetCfg.id)}
                onDragOver={(e) => {
                  if (!customizeOpen) return;
                  e.preventDefault();
                  setDragOverId(widgetCfg.id);
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedId && draggedId !== widgetCfg.id) {
                    onReorderWidget(draggedId, widgetCfg.id);
                  }
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                className={`${isFull ? 'lg:col-span-2' : 'lg:col-span-1'} ${
                  isDragTarget ? 'ring-2 ring-blue-500 rounded-xl' : ''
                } flex flex-col gap-2`}
              >
                {customizeOpen && (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="h-4 w-4 text-slate-400 cursor-grab shrink-0" />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {def?.title || widgetCfg.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {def?.allowResize && (
                        <button
                          type="button"
                          onClick={() => onToggleWidgetSpan(widgetCfg.id)}
                          className="px-2 py-1 rounded text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-blue-500 whitespace-nowrap"
                        >
                          {widgetCfg.span === 'full' ? 'Half Width' : 'Full Width'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onMoveWidget(widgetCfg.id, 'up')}
                        aria-label={`Move ${def?.title} up`}
                        className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111827] disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === activeWidgets.length - 1}
                        onClick={() => onMoveWidget(widgetCfg.id, 'down')}
                        aria-label={`Move ${def?.title} down`}
                        className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111827] disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleWidget(widgetCfg.id)}
                        aria-label={`Hide ${def?.title}`}
                        className="p-1 rounded text-slate-500 hover:text-red-500 hover:bg-red-500/10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex-1">{renderWidgetBody(widgetCfg.id)}</div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
