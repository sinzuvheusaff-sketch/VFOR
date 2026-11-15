import React from 'react';
import { Menu, Plus, Terminal } from 'lucide-react';
import { BotSettings, NavSection } from '../types/velocity';

interface TopBarProps {
  activeSection: NavSection;
  settings: BotSettings;
  onOpenMobileMenu: () => void;
  onPrimaryAction: () => void;
}

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Overview',
  commands: 'Commands',
  runner: 'Command Runner',
  c3c: 'C3C Login & ZIP',
  owners: "Owner's Room",
  automations: 'Automations',
  channels: 'Channels',
  logs: 'Execution Logs',
  settings: 'Settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  settings,
  onOpenMobileMenu,
  onPrimaryAction,
}) => {
  const isCommandsSection = activeSection === 'commands';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-white/95 dark:bg-[#0D1320]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800/80">
      {/* Left: Mobile menu trigger + Breadcrumb trail */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="font-display font-semibold text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            {settings.botName}
          </span>
          <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
            /
          </span>
          <span className="text-slate-600 dark:text-slate-300 truncate">
            {SECTION_LABELS[activeSection]}
          </span>
        </div>
      </div>

      {/* Right: Single primary action button */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onPrimaryAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0D1320]"
        >
          {isCommandsSection ? (
            <>
              <Plus className="h-4 w-4 shrink-0" />
              <span>Create Command</span>
            </>
          ) : (
            <>
              <Terminal className="h-4 w-4 shrink-0" />
              <span>Open Runner</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
