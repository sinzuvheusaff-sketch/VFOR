import React, { useState } from 'react';
import { X } from 'lucide-react';
import { COMMAND_CATEGORIES } from '../data/commands';
import { CommandCategory, PermissionLevel, VelocityCommand } from '../types/velocity';

interface NewCommandModalProps {
  prefix: string;
  onClose: () => void;
  onCreate: (cmd: VelocityCommand) => void;
}

export const NewCommandModal: React.FC<NewCommandModalProps> = ({
  prefix,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [aliasesRaw, setAliasesRaw] = useState('');
  const [category, setCategory] = useState<CommandCategory>('Utility');
  const [permission, setPermission] = useState<PermissionLevel>('Everyone');
  const [cooldownSec, setCooldownSec] = useState(3);
  const [description, setDescription] = useState('');
  const [responseTemplate, setResponseTemplate] = useState(
    'Hello {user}, custom Velocity response for "{args}" on {date}.'
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanName) {
      setError('Enter a valid lowercase command name (letters, numbers, hyphens).');
      return;
    }
    if (!description.trim()) {
      setError('Provide a short description of what this command does.');
      return;
    }
    if (!responseTemplate.trim()) {
      setError('Provide a response template to execute when triggered.');
      return;
    }

    const aliases = aliasesRaw
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    const newCmd: VelocityCommand = {
      id: `cmd-custom-${Date.now()}`,
      name: cleanName,
      aliases,
      category,
      description: description.trim(),
      usage: `${cleanName} [args]`,
      examples: [`${cleanName} sample`],
      permission,
      cooldownSec: Math.max(0, Math.min(300, cooldownSec)),
      enabled: true,
      executions: 0,
      lastUsed: 'Never',
      isCustom: true,
      responseTemplate: responseTemplate.trim(),
    };

    onCreate(newCmd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-cmd-title"
        className="relative z-10 w-full max-w-lg rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="new-cmd-title" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Create Custom Command
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Immediately callable with {prefix} inside Command Runner
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Command Trigger
              </label>
              <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden">
                <span className="px-3 py-2 font-mono text-sm text-slate-500 border-r border-slate-300 dark:border-slate-700">
                  {prefix}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="announce"
                  className="w-full px-3 py-2 bg-transparent text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Aliases (comma-separated)
              </label>
              <input
                type="text"
                value={aliasesRaw}
                onChange={(e) => setAliasesRaw(e.target.value)}
                placeholder="ann, say"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CommandCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMMAND_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Permission
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as PermissionLevel)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Everyone">Everyone</option>
                <option value="Moderator">Moderator</option>
                <option value="Admin">Admin</option>
                <option value="Owner">Owner</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Cooldown (sec)
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={cooldownSec}
                onChange={(e) => setCooldownSec(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sends a formatted cartel update to the active channel."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Response Template
            </label>
            <textarea
              rows={3}
              value={responseTemplate}
              onChange={(e) => setResponseTemplate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Variables: {'{user}'}, {'{args}'}, {'{prefix}'}, {'{date}'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Save Command
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
