import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { ChannelConfig } from '../types/velocity';

interface ChannelsViewProps {
  channels: ChannelConfig[];
  onToggleChannel: (id: string) => void;
  onUpdateModeration: (id: string, level: ChannelConfig['moderationLevel']) => void;
  onAddChannel: (channel: ChannelConfig) => void;
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({
  channels,
  onToggleChannel,
  onUpdateModeration,
  onAddChannel,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<ChannelConfig['platform']>('Discord');
  const [memberCount, setMemberCount] = useState(120);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddChannel({
      id: `ch-${Date.now()}`,
      name: name.trim(),
      platform,
      memberCount: Math.max(1, memberCount),
      moderationLevel: 'Standard',
      active: true,
      commandsToday: 0,
    });
    setName('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Connected Channels
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage group chats, Discord servers, and Telegram relays connected to Velocity
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{showAdd ? 'Close Form' : 'Connect Channel'}</span>
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Channel / Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cartel Beta Squad"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ChannelConfig['platform'])}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Discord">Discord</option>
              <option value="Messenger">Messenger</option>
              <option value="Telegram">Telegram</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={memberCount}
              onChange={(e) => setMemberCount(Number(e.target.value))}
              aria-label="Member count"
              className="w-24 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-300 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
            >
              Save
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-3 px-6">Channel</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4 text-right">Members</th>
                <th className="py-3 px-4 text-right">Runs Today</th>
                <th className="py-3 px-4">Moderation Tier</th>
                <th className="py-3 px-6 text-right">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80 text-sm">
              {channels.map((ch) => (
                <tr key={ch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    {ch.name}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {ch.platform}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {ch.memberCount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {ch.commandsToday.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <select
                      aria-label={`Moderation tier for ${ch.name}`}
                      value={ch.moderationLevel}
                      onChange={(e) =>
                        onUpdateModeration(
                          ch.id,
                          e.target.value as ChannelConfig['moderationLevel']
                        )
                      }
                      className="px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Relaxed">Relaxed</option>
                      <option value="Standard">Standard</option>
                      <option value="Strict">Strict</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ch.active}
                      aria-label={`Toggle ${ch.name}`}
                      onClick={() => onToggleChannel(ch.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ${
                        ch.active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
                          ch.active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
