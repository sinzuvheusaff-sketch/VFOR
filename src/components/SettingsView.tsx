import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { DEFAULT_USER_PFP } from '../data/commands';
import { BotSettings, VelocityCommand } from '../types/velocity';

interface SettingsViewProps {
  settings: BotSettings;
  commands: VelocityCommand[];
  onUpdateSettings: (partial: Partial<BotSettings>) => void;
  onResetWorkspace: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  commands,
  onUpdateSettings,
  onResetWorkspace,
}) => {
  const [savedNotice, setSavedNotice] = useState('');
  const pfpInputRef = useRef<HTMLInputElement>(null);

  const handlePrefixChoice = (p: string) => {
    onUpdateSettings({ prefix: p });
    setSavedNotice(`Command prefix updated to "${p}".`);
    setTimeout(() => setSavedNotice(''), 2500);
  };

  const handlePfpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateSettings({ pfpUrl: reader.result });
        setSavedNotice('Operator profile picture updated.');
        setTimeout(() => setSavedNotice(''), 2500);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExportConfig = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      commandsCount: commands.length,
      commands,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'velocity-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Workspace Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Configure Velocity runtime behavior, operator PFP, prefix routing, appearance, and backups
        </p>
      </div>

      {savedNotice && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {savedNotice}
        </div>
      )}

      {/* Operator Profile Picture */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
            <img
              src={settings.pfpUrl || DEFAULT_USER_PFP}
              alt="Operator profile picture"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Operator Profile Picture (PFP)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Shown in the sidebar profile and used by <span className="font-mono">/wbanner</span> & <span className="font-mono">/avatar</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={pfpInputRef}
            type="file"
            accept="image/*"
            onChange={handlePfpUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => pfpInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload PFP</span>
          </button>
          {settings.pfpUrl !== DEFAULT_USER_PFP && (
            <button
              type="button"
              onClick={() => onUpdateSettings({ pfpUrl: DEFAULT_USER_PFP })}
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 whitespace-nowrap"
            >
              Restore Default
            </button>
          )}
        </div>
      </section>

      {/* Identity & Prefix */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Bot Identity & Command Prefix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Changes apply immediately across the Command Directory and Command Runner
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Bot Display Name
            </label>
            <input
              type="text"
              value={settings.botName}
              onChange={(e) => onUpdateSettings({ botName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Builder Attribution
            </label>
            <input
              type="text"
              value={settings.builderCredit}
              onChange={(e) => onUpdateSettings({ builderCredit: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Command Prefix
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {['/', '!', '.', '?', '$'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePrefixChoice(p)}
                className={`px-3.5 py-2 rounded-lg font-mono text-sm font-semibold border transition-colors ${
                  settings.prefix === p
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-[#0D1320] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-500'
                }`}
              >
                {p}
              </button>
            ))}
            <input
              type="text"
              maxLength={3}
              value={settings.prefix}
              onChange={(e) => onUpdateSettings({ prefix: e.target.value || '/' })}
              aria-label="Custom prefix"
              className="w-20 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 font-mono text-sm text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Runtime & Appearance */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-5">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Operational Controls & Theme
        </h2>

        <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-200/70 dark:border-slate-800/80">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              Interface Theme
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Switch between dark slate console mode and crisp light mode
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onUpdateSettings({ theme: t })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  settings.theme === t
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-200/70 dark:border-slate-800/80">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              Maintenance Mode
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Restricts non-owner commands while applying updates
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.maintenanceMode}
            aria-label="Toggle maintenance mode"
            onClick={() => onUpdateSettings({ maintenanceMode: !settings.maintenanceMode })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ${
              settings.maintenanceMode ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
                settings.maintenanceMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              Audit Logging
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Record every Command Runner dispatch into Execution Logs
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.auditLogging}
            aria-label="Toggle audit logging"
            onClick={() => onUpdateSettings({ auditLogging: !settings.auditLogging })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ${
              settings.auditLogging ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
                settings.auditLogging ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Backup & Reset */}
      <section className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Configuration Backup
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download all {commands.length} command definitions or restore factory defaults
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportConfig}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={onResetWorkspace}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-500/10 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </section>
    </div>
  );
};
