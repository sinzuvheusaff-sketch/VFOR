import React, { useEffect, useMemo, useState } from 'react';
import { Play, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { COMMAND_CATEGORIES } from '../data/commands';
import {
  BotSettings,
  CommandCategory,
  PermissionLevel,
  VelocityCommand,
} from '../types/velocity';

interface CommandsViewProps {
  commands: VelocityCommand[];
  settings: BotSettings;
  initialCategory?: 'All' | CommandCategory;
  onClearInitialCategory?: () => void;
  onToggleCommand: (id: string) => void;
  onBulkToggle: (ids: string[], enabled: boolean) => void;
  onUpdateCommand: (id: string, patch: Partial<VelocityCommand>) => void;
  onDeleteCustomCommand: (id: string) => void;
  onOpenNewModal: () => void;
  onRunInConsole: (commandInput: string) => void;
}

export const CommandsView: React.FC<CommandsViewProps> = ({
  commands,
  settings,
  initialCategory = 'All',
  onClearInitialCategory,
  onToggleCommand,
  onBulkToggle,
  onUpdateCommand,
  onDeleteCustomCommand,
  onOpenNewModal,
  onRunInConsole,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | CommandCategory>(initialCategory);
  const [permissionFilter, setPermissionFilter] = useState<'All' | PermissionLevel>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Enabled' | 'Disabled'>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inlineTestInput, setInlineTestInput] = useState('');

  useEffect(() => {
    if (initialCategory !== 'All') {
      setCategoryFilter(initialCategory);
      onClearInitialCategory?.();
    }
  }, [initialCategory, onClearInitialCategory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commands.filter((cmd) => {
      if (categoryFilter !== 'All' && cmd.category !== categoryFilter) return false;
      if (permissionFilter !== 'All' && cmd.permission !== permissionFilter) return false;
      if (statusFilter === 'Enabled' && !cmd.enabled) return false;
      if (statusFilter === 'Disabled' && cmd.enabled) return false;
      if (!q) return true;
      return (
        cmd.name.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.aliases.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [commands, search, categoryFilter, permissionFilter, statusFilter]);

  const selectedCommand = useMemo(
    () => commands.find((c) => c.id === selectedId) || null,
    [commands, selectedId]
  );

  const openInspector = (cmd: VelocityCommand) => {
    setSelectedId(cmd.id);
    setInlineTestInput(`${settings.prefix}${cmd.examples[0] || cmd.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Command Directory
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {commands.length} total commands · {commands.filter((c) => c.enabled).length} enabled across {COMMAND_CATEGORIES.length} operational modules
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onBulkToggle(filtered.map((c) => c.id), true)}
            className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Enable Visible
          </button>
          <button
            type="button"
            onClick={() => onBulkToggle(filtered.map((c) => c.id), false)}
            className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Disable Visible
          </button>
          <button
            type="button"
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Command</span>
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategoryFilter('All')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            categoryFilter === 'All'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All ({commands.length})
        </button>
        {COMMAND_CATEGORIES.map((cat) => {
          const count = commands.filter((c) => c.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & Secondary Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by command trigger, alias, or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              aria-label="Filter by permission"
              value={permissionFilter}
              onChange={(e) => setPermissionFilter(e.target.value as 'All' | PermissionLevel)}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="All">All Permissions</option>
              <option value="Everyone">Everyone</option>
              <option value="Moderator">Moderator</option>
              <option value="Admin">Admin</option>
              <option value="Owner">Owner</option>
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
            {(['All', 'Enabled', 'Disabled'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* High-Density Command Table */}
      <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              No commands match the current filter
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Clear your search or reset category filters to inspect all {commands.length} commands.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('All');
                setPermissionFilter('All');
                setStatusFilter('All');
              }}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Command & Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Permission</th>
                  <th className="py-3 px-4 text-right">Cooldown</th>
                  <th className="py-3 px-4 text-right">Runs</th>
                  <th className="py-3 px-4 text-center">Active</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80 text-sm">
                {filtered.map((cmd) => (
                  <tr
                    key={cmd.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      selectedId === cmd.id ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td
                      onClick={() => openInspector(cmd)}
                      className="py-3 px-6 cursor-pointer max-w-md"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                          {settings.prefix}
                          {cmd.name}
                        </span>
                        {cmd.aliases.length > 0 && (
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                            · {cmd.aliases.slice(0, 2).join(', ')}
                          </span>
                        )}
                        {cmd.isCustom && (
                          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            · Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {cmd.description}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {cmd.category}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {cmd.permission}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {cmd.cooldownSec}s
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {cmd.executions.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={cmd.enabled}
                        aria-label={`Toggle ${cmd.name}`}
                        onClick={() => onToggleCommand(cmd.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          cmd.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
                            cmd.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openInspector(cmd)}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => onRunInConsole(`${settings.prefix}${cmd.examples[0] || cmd.name}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 whitespace-nowrap"
                        >
                          <Play className="h-3 w-3" />
                          <span>Test</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Command Inspector Slide-Over Drawer */}
      {selectedCommand && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setSelectedId(null)}
            aria-hidden="true"
          />
          <aside
            aria-label="Command Inspector"
            className="relative z-10 w-full max-w-md h-full bg-white dark:bg-[#0D1320] border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                  {settings.prefix}
                  {selectedCommand.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedCommand.category} · {selectedCommand.executions.toLocaleString()} total runs
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close inspector"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Description
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedCommand.description}
                </p>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Syntax Usage
                </div>
                <div className="px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100">
                  {settings.prefix}
                  {selectedCommand.usage}
                </div>
              </div>

              {selectedCommand.examples.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Examples
                  </div>
                  <div className="space-y-1.5">
                    {selectedCommand.examples.map((ex, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setInlineTestInput(`${settings.prefix}${ex}`)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-colors"
                      >
                        {settings.prefix}
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Permission Level
                  </label>
                  <select
                    value={selectedCommand.permission}
                    onChange={(e) =>
                      onUpdateCommand(selectedCommand.id, {
                        permission: e.target.value as PermissionLevel,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="Moderator">Moderator</option>
                    <option value="Admin">Admin</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Cooldown (sec)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={selectedCommand.cooldownSec}
                    onChange={(e) =>
                      onUpdateCommand(selectedCommand.id, {
                        cooldownSec: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Test Launch */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Run Command in Console
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inlineTestInput}
                    onChange={(e) => setInlineTestInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onRunInConsole(inlineTestInput);
                      setSelectedId(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap shrink-0"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Execute</span>
                  </button>
                </div>
              </div>

              {selectedCommand.isCustom && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteCustomCommand(selectedCommand.id);
                      setSelectedId(null);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Custom Command</span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
