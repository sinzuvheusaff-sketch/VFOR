import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { CommandExecutionLog } from '../types/velocity';

interface LogsViewProps {
  logs: CommandExecutionLog[];
  onQuickRun: (rawInput: string) => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ logs, onQuickRun }) => {
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'All' | 'Completed' | 'Blocked' | 'Error'>(
    'All'
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (outcomeFilter !== 'All' && l.outcome !== outcomeFilter) return false;
      if (!q) return true;
      return (
        l.rawInput.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        l.channel.toLowerCase().includes(q) ||
        l.outputSummary.toLowerCase().includes(q)
      );
    });
  }, [logs, search, outcomeFilter]);

  const handleExportCsv = () => {
    const header = 'Timestamp,Command,Input,Category,Operator,Channel,Outcome,DurationMs,Summary';
    const rows = filtered.map((l) =>
      [
        l.timestamp,
        l.commandName,
        `"${l.rawInput.replace(/"/g, '""')}"`,
        l.category,
        l.actor,
        `"${l.channel.replace(/"/g, '""')}"`,
        l.outcome,
        l.durationMs,
        `"${l.outputSummary.replace(/"/g, '""')}"`,
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'velocity-execution-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Execution Logs
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Audit trail of all dispatched commands, blocked invocations, and latency timings
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs by command, operator, channel, or summary..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
          {(['All', 'Completed', 'Blocked', 'Error'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setOutcomeFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                outcomeFilter === status
                  ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-3 px-6">Time</th>
                <th className="py-3 px-4">Input</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-6 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                    No execution entries match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => onQuickRun(log.rawInput)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <td className="py-3 px-6 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {log.rawInput}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-sm truncate">
                      {log.outputSummary}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {log.actor} · {log.channel}
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
                    <td className="py-3 px-6 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.durationMs} ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
