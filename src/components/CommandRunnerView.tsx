import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Download, RotateCcw, Terminal } from 'lucide-react';
import { COMMAND_CATEGORIES } from '../data/commands';
import { BotSettings, ConsoleEntry, VelocityCommand } from '../types/velocity';

interface CommandRunnerViewProps {
  commands: VelocityCommand[];
  settings: BotSettings;
  entries: ConsoleEntry[];
  pendingInput: string;
  onClearPendingInput: () => void;
  onExecute: (rawInput: string) => Promise<void>;
  onClearConsole: () => void;
  onVotePoll: (entryId: string, optionIndex: number) => void;
  onPlayTicTacToe: (entryId: string, cellIndex: number) => void;
}

export const CommandRunnerView: React.FC<CommandRunnerViewProps> = ({
  commands,
  settings,
  entries,
  pendingInput,
  onClearPendingInput,
  onExecute,
  onClearConsole,
  onVotePoll,
  onPlayTicTacToe,
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [running, setRunning] = useState(false);
  const [selectedVideoFormat, setSelectedVideoFormat] = useState<Record<string, number>>({});
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingInput) {
      setInput(pendingInput);
      onClearPendingInput();
      inputRef.current?.focus();
    }
  }, [pendingInput, onClearPendingInput]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  const suggestions = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed.startsWith(settings.prefix)) return [];
    const token = trimmed.slice(settings.prefix.length).split(' ')[0].toLowerCase();
    if (trimmed.includes(' ')) return [];
    return commands
      .filter(
        (c) =>
          c.enabled &&
          (c.name.startsWith(token) || c.aliases.some((a) => a.startsWith(token)))
      )
      .slice(0, 6);
  }, [input, commands, settings.prefix]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = input.trim();
    if (!raw || running) return;
    setRunning(true);
    setHistory((prev) => [raw, ...prev.slice(0, 29)]);
    setHistoryIndex(-1);
    setInput('');
    await onExecute(raw);
    setRunning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIdx);
      setInput(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      setInput(`${settings.prefix}${suggestions[0].name} `);
    }
  };

  const downloadBannerSvg = (title: string, subtitle: string, accent: string) => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="240" viewBox="0 0 800 240">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090D16" />
      <stop offset="100%" stop-color="${accent}" />
    </linearGradient>
  </defs>
  <rect width="800" height="240" rx="16" fill="url(#bg)" />
  <text x="48" y="112" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="38" font-weight="700">${esc(title)}</text>
  <text x="48" y="156" fill="#CBD5E1" font-family="system-ui, sans-serif" font-size="20">${esc(subtitle)}</text>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `velocity-banner.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadVideoSpec = (entry: ConsoleEntry) => {
    if (!entry.videoData) return;
    const idx = selectedVideoFormat[entry.id] ?? 0;
    const fmt = entry.videoData.formats[idx] || entry.videoData.formats[0];
    const spec = JSON.stringify(
      {
        platform: entry.videoData.platform,
        videoId: entry.videoData.videoId,
        sourceUrl: entry.videoData.sourceUrl,
        selectedFormat: fmt,
        cliCommand:
          fmt.label.includes('MP3')
            ? `yt-dlp -x --audio-format mp3 "${entry.videoData.sourceUrl}"`
            : `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" "${entry.videoData.sourceUrl}"`,
      },
      null,
      2
    );
    const blob = new Blob([spec], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.videoData.videoId}-save-spec.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTweetSvg = (tweet: NonNullable<ConsoleEntry['tweetData']>) => {
    const safeName = tweet.displayName.replace(/[<>&"]/g, '');
    const safeHandle = tweet.handle.replace(/[<>&"]/g, '');
    const safeText = tweet.text.slice(0, 140).replace(/[<>&"]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="280" viewBox="0 0 800 280"><rect width="800" height="280" rx="18" fill="#0F172A"/><circle cx="72" cy="70" r="28" fill="#2563EB"/><text x="72" y="78" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="22" font-weight="700">${safeName.charAt(0).toUpperCase()}</text><text x="116" y="64" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="22" font-weight="700">${safeName}</text><text x="116" y="88" fill="#94A3B8" font-family="monospace" font-size="15">${safeHandle} · ${tweet.timestamp}</text><text x="48" y="152" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="24">${safeText}</text><text x="48" y="232" fill="#64748B" font-family="monospace" font-size="15">Replies ${tweet.replies}   Reposts ${tweet.reposts}   Likes ${tweet.likes}   · Velocity</text></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'velocity-tweet.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickPresets = useMemo(
    () => [
      `${settings.prefix}tweet @nadeus Velocity 550+ commands live!`,
      `${settings.prefix}music opm`,
      `${settings.prefix}ai Give 3 crisp Tagalog bot taglines`,
      `${settings.prefix}wbanner @nadeus`,
      `${settings.prefix}ascii VELOCITY`,
      `${settings.prefix}savevid https://www.youtube.com/watch?v=dQw4w9WgXcQ`,
      `${settings.prefix}tictactoe`,
      `${settings.prefix}slots 200`,
      `${settings.prefix}godmode on`,
      `${settings.prefix}daily`,
      `${settings.prefix}qr https://velocity.nadeus.dev`,
      `${settings.prefix}help`,
    ],
    [settings.prefix]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Command Runner
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Test all {commands.length} Velocity commands live · Prefix is{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {settings.prefix}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onClearConsole}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Clear Output</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Console Output + Input (2/3) */}
        <section className="lg:col-span-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden min-h-[540px] max-h-[680px]">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
              <Terminal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Interactive Dispatch Session</span>
            </span>
            <span className="tabular-nums">{entries.length} responses</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {entries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Ready for command input
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Type {settings.prefix}help below or click any preset command on the right to inspect structured responses.
                </p>
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {entry.rawInput}
                    </span>
                    <span className="font-mono tabular-nums text-slate-400 shrink-0">
                      {entry.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span
                      className={
                        entry.status === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : entry.status === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {entry.title}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-all">
                    {entry.lines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>

                  {entry.kvPairs && entry.kvPairs.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                      {entry.kvPairs.map((kv, i) => (
                        <div key={i}>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {kv.label}
                          </div>
                          <div className="text-xs font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100 truncate">
                            {kv.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Banner Card */}
                  {entry.bannerData && (
                    <div className="pt-2 space-y-2.5">
                      <div
                        style={{
                          background: `linear-gradient(135deg, #090D16 0%, ${entry.bannerData.accent} 100%)`,
                        }}
                        className="p-5 rounded-xl border border-slate-700/80 flex items-center justify-between gap-4 text-white"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {entry.bannerData.showAvatar && entry.bannerData.avatarUrl && (
                            <img
                              src={entry.bannerData.avatarUrl}
                              alt="Profile avatar"
                              referrerPolicy="no-referrer"
                              className="h-14 w-14 rounded-full object-cover border-2 border-white/30 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-display text-lg font-bold tracking-tight truncate">
                              {entry.bannerData.title}
                            </div>
                            <div className="text-xs text-slate-200/90 truncate mt-0.5">
                              {entry.bannerData.subtitle}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          downloadBannerSvg(
                            entry.bannerData!.title,
                            entry.bannerData!.subtitle,
                            entry.bannerData!.accent
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-blue-500"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download SVG Banner</span>
                      </button>
                    </div>
                  )}

                  {/* Tweet Card */}
                  {entry.tweetData && (
                    <div className="pt-2 space-y-2.5">
                      <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-3">
                          {entry.tweetData.avatarUrl && (
                            <img
                              src={entry.tweetData.avatarUrl}
                              alt={entry.tweetData.displayName}
                              referrerPolicy="no-referrer"
                              className="h-10 w-10 rounded-full object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white truncate">
                              <span>{entry.tweetData.displayName}</span>
                              <span className="text-blue-500 text-xs">✓</span>
                            </div>
                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {entry.tweetData.handle} · {entry.tweetData.timestamp}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                          {entry.tweetData.text}
                        </p>
                        <div className="flex items-center gap-6 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                          <span>Replies {entry.tweetData.replies}</span>
                          <span>Reposts {entry.tweetData.reposts}</span>
                          <span>Likes {entry.tweetData.likes}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadTweetSvg(entry.tweetData!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-blue-500"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Tweet SVG</span>
                      </button>
                    </div>
                  )}

                  {/* Video Saver Card */}
                  {entry.videoData && (
                    <div className="pt-2 space-y-3">
                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
                        {entry.videoData.thumbnailUrl && (
                          <img
                            src={entry.videoData.thumbnailUrl}
                            alt={entry.videoData.title}
                            referrerPolicy="no-referrer"
                            className="w-full sm:w-40 h-24 rounded-md object-cover bg-slate-900 shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {entry.videoData.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {entry.videoData.platform} · {entry.videoData.duration}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {entry.videoData.formats.map((fmt, fIdx) => {
                              const active = (selectedVideoFormat[entry.id] ?? 0) === fIdx;
                              return (
                                <button
                                  key={fmt.label}
                                  type="button"
                                  onClick={() =>
                                    setSelectedVideoFormat((prev) => ({
                                      ...prev,
                                      [entry.id]: fIdx,
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                                    active
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-slate-50 dark:bg-[#0D1320] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {fmt.label} · {fmt.size}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => downloadVideoSpec(entry)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Save Media Spec JSON</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Playable Tic-Tac-Toe Board */}
                  {entry.tictactoeData && (
                    <div className="pt-2 space-y-2">
                      <div className="grid grid-cols-3 gap-1.5 w-40">
                        {entry.tictactoeData.board.map((cell, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            disabled={cell !== '' || entry.tictactoeData!.status !== 'playing'}
                            onClick={() => onPlayTicTacToe(entry.id, cIdx)}
                            className="h-12 w-12 rounded-md bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700 font-display text-base font-bold text-slate-900 dark:text-white hover:border-blue-500 disabled:cursor-default"
                          >
                            {cell}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {entry.tictactoeData.status === 'win'
                          ? 'You win! (+100 VC)'
                          : entry.tictactoeData.status === 'lose'
                            ? 'Velocity wins this round.'
                            : entry.tictactoeData.status === 'draw'
                              ? 'Match ended in a draw.'
                              : 'Your turn (X)'}
                      </div>
                    </div>
                  )}

                  {entry.qrMatrix && (
                    <div className="pt-2">
                      <div className="inline-block p-2.5 bg-white rounded-lg border border-slate-200">
                        <svg
                          width="126"
                          height="126"
                          viewBox={`0 0 ${entry.qrMatrix.length} ${entry.qrMatrix.length}`}
                          role="img"
                          aria-label="Generated QR code"
                        >
                          {entry.qrMatrix.map((row, r) =>
                            row.map((filled, c) =>
                              filled ? (
                                <rect
                                  key={`${r}-${c}`}
                                  x={c}
                                  y={r}
                                  width={1}
                                  height={1}
                                  fill="#0F172A"
                                />
                              ) : null
                            )
                          )}
                        </svg>
                      </div>
                    </div>
                  )}

                  {entry.pollData && (
                    <div className="pt-2 space-y-2">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {entry.pollData.question}
                      </div>
                      <div className="space-y-1.5">
                        {entry.pollData.options.map((opt, idx) => {
                          const totalVotes = entry.pollData!.options.reduce(
                            (s, o) => s + o.votes,
                            0
                          );
                          const pct =
                            totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => onVotePoll(entry.id, idx)}
                              className="w-full text-left px-3 py-2 rounded-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors flex items-center justify-between text-xs"
                            >
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {opt.label}
                              </span>
                              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                {opt.votes} ({pct}%)
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={scrollEndRef} />
          </div>

          {suggestions.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1320] flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] text-slate-400 shrink-0">Tab to complete:</span>
              {suggestions.map((cmd) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    setInput(`${settings.prefix}${cmd.name} `);
                    inputRef.current?.focus();
                  }}
                  className="px-2 py-1 rounded text-xs font-mono text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-blue-500 whitespace-nowrap shrink-0"
                >
                  {settings.prefix}
                  {cmd.name}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1320] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter command (e.g. ${settings.prefix}ai, ${settings.prefix}savevid, ${settings.prefix}tictactoe)...`}
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={running || !input.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <span>{running ? 'Running...' : 'Run'}</span>
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          </form>
        </section>

        {/* Quick Command Launcher (1/3) */}
        <aside className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-5">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Quick Presets
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any sample to execute immediately
            </p>
          </div>

          <div className="space-y-1.5">
            {quickPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onExecute(preset)}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0D1320] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 font-mono text-xs text-slate-700 dark:text-slate-300 transition-colors truncate"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Loaded Modules
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              {COMMAND_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>{cat}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {commands.filter((c) => c.category === cat && c.enabled).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
