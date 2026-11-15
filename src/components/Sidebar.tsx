import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Command,
  FileText,
  Hash,
  KeyRound,
  LayoutDashboard,
  Lock,
  Settings,
  Terminal,
  Workflow,
  X,
} from 'lucide-react';
import { BotSettings, NavSection } from '../types/velocity';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  settings: BotSettings;
  commandCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'commands', label: 'Commands', icon: Command },
  { id: 'runner', label: 'Command Runner', icon: Terminal },
  { id: 'c3c', label: 'C3C Login & ZIP', icon: KeyRound },
  { id: 'owners', label: "Owner's Room", icon: Lock },
  { id: 'automations', label: 'Automations', icon: Workflow },
  { id: 'channels', label: 'Channels', icon: Hash },
  { id: 'logs', label: 'Execution Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  settings,
  commandCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const [emblemError, setEmblemError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [settings.pfpUrl]);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-[#0D1320] border-r border-slate-200 dark:border-slate-800/80 w-64 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            {!emblemError ? (
              <img
                src="/src/assets/images/velocity_emblem_1794743656235.jpg"
                alt="Velocity emblem"
                referrerPolicy="no-referrer"
                onError={() => setEmblemError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <Bot className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {settings.botName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {settings.builderCredit}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Primary workspace navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3 whitespace-nowrap">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </span>
              {item.id === 'commands' && (
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {commandCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Workspace Summary + Operator Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            <span>Prefix</span>
          </span>
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
            {settings.prefix}
          </span>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200">
            {!avatarError && settings.pfpUrl ? (
              <img
                src={settings.pfpUrl}
                alt="Nadeus Cartel operator"
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>NC</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              Nadeus Cartel
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Workspace Owner
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
