import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AutomationRule } from '../types/velocity';

interface AutomationsViewProps {
  automations: AutomationRule[];
  onToggleRule: (id: string) => void;
  onAddRule: (rule: AutomationRule) => void;
  onDeleteRule: (id: string) => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  automations,
  onToggleRule,
  onAddRule,
  onDeleteRule,
}) => {
  const [testPhrase, setTestPhrase] = useState('who built velocity?');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('');
  const [matchMode, setMatchMode] = useState<'Contains' | 'Exact' | 'StartsWith'>('Contains');
  const [response, setResponse] = useState('');
  const [channelScope, setChannelScope] = useState('All Channels');

  const simulatedMatch = useMemo(() => {
    const q = testPhrase.trim().toLowerCase();
    if (!q) return null;
    return (
      automations.find((rule) => {
        if (!rule.enabled || rule.triggerType !== 'Keyword') return false;
        const p = rule.pattern.toLowerCase();
        if (rule.matchMode === 'Exact') return q === p;
        if (rule.matchMode === 'StartsWith') return q.startsWith(p);
        return q.includes(p);
      }) || null
    );
  }, [automations, testPhrase]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pattern.trim() || !response.trim()) return;
    onAddRule({
      id: `auto-${Date.now()}`,
      name: name.trim(),
      triggerType: 'Keyword',
      pattern: pattern.trim(),
      matchMode,
      response: response.trim(),
      channelScope,
      enabled: true,
      hits: 0,
    });
    setName('');
    setPattern('');
    setResponse('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Automation Rules
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Configure keyword auto-responders, member onboarding greetings, and scheduled dispatches
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{showAdd ? 'Close Form' : 'New Rule'}</span>
        </button>
      </div>

      {/* Add Rule Form */}
      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Rule Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Support Link Hint"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Keyword Pattern
              </label>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="need help"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-300 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Match Mode
              </label>
              <select
                value={matchMode}
                onChange={(e) => setMatchMode(e.target.value as 'Contains' | 'Exact' | 'StartsWith')}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Contains">Contains</option>
                <option value="Exact">Exact</option>
                <option value="StartsWith">Starts With</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Automated Response
              </label>
              <input
                type="text"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type `/help` or reach out in #public-support."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Channel Scope
              </label>
              <input
                type="text"
                value={channelScope}
                onChange={(e) => setChannelScope(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
            >
              Save Rule
            </button>
          </div>
        </form>
      )}

      {/* Live Trigger Simulator */}
      <section className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="text-xs font-semibold text-slate-900 dark:text-white">
          Trigger Match Simulator
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testPhrase}
            onChange={(e) => setTestPhrase(e.target.value)}
            placeholder="Type a sample channel message to test keyword rules..."
            className="flex-1 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="px-4 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-800 text-xs flex items-center">
            {simulatedMatch ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Matched "{simulatedMatch.name}": {simulatedMatch.response}
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                No active keyword rule matched
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Rules List */}
      <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800/80">
        {automations.map((rule) => (
          <div
            key={rule.id}
            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  {rule.name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  · {rule.triggerType} · {rule.matchMode} · {rule.channelScope}
                </span>
              </div>
              <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                Pattern: "{rule.pattern}"
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Reply: {rule.response}
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {rule.hits.toLocaleString()} hits
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                aria-label={`Toggle ${rule.name}`}
                onClick={() => onToggleRule(rule.id)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ${
                  rule.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
                    rule.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => onDeleteRule(rule.id)}
                aria-label={`Delete ${rule.name}`}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
