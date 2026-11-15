import {
  AutomationRule,
  BotSettings,
  ConsoleEntry,
  EconomyState,
  VelocityCommand,
} from '../types/velocity';

export interface ExecutionContext {
  commands: VelocityCommand[];
  settings: BotSettings;
  economy: EconomyState;
  automations: AutomationRule[];
  updateEconomy: (updater: (prev: EconomyState) => EconomyState) => void;
  updateSettings: (partial: Partial<BotSettings>) => void;
}

function tokenizeArgs(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '"';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if ((ch === '"' || ch === "'") && (!inQuotes || ch === quoteChar)) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = ch;
      } else {
        inQuotes = false;
      }
      continue;
    }
    if (ch === ' ' && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function safeMathEval(expr: string): number {
  const sanitized = expr.replace(/\^/g, '**').replace(/,/g, '');
  if (!/^[0-9+\-*/().%\s*]+$/.test(sanitized)) {
    throw new Error('Only numbers and +, -, *, /, %, ^, () operators are allowed.');
  }
  const fn = new Function(`"use strict"; return (${sanitized});`);
  const result = fn();
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('Expression did not produce a finite number.');
  }
  return result;
}

function generateDeterministicQR(payload: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = border || inner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  let seed = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    seed ^= payload.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      const onTiming = r === 6 || c === 6;
      if (inTopLeft || inTopRight || inBottomLeft || onTiming) continue;
      seed ^= (r * 31 + c * 17) >>> 0;
      seed = Math.imul(seed, 16777619);
      grid[r][c] = (seed & 1) === 1;
    }
  }

  return grid;
}

const ASCII_FONT: Record<string, string[]> = {
  A: [' ███ ', '█   █', '█████', '█   █', '█   █'],
  B: ['████ ', '█   █', '████ ', '█   █', '████ '],
  C: [' ████', '█    ', '█    ', '█    ', ' ████'],
  D: ['████ ', '█   █', '█   █', '█   █', '████ '],
  E: ['█████', '█    ', '████ ', '█    ', '█████'],
  F: ['█████', '█    ', '████ ', '█    ', '█    '],
  G: [' ████', '█    ', '█  ██', '█   █', ' ████'],
  H: ['█   █', '█   █', '█████', '█   █', '█   █'],
  I: ['█████', '  █  ', '  █  ', '  █  ', '█████'],
  J: ['█████', '   █ ', '   █ ', '█  █ ', ' ██  '],
  K: ['█   █', '█  █ ', '███  ', '█  █ ', '█   █'],
  L: ['█    ', '█    ', '█    ', '█    ', '█████'],
  M: ['█   █', '██ ██', '█ █ █', '█   █', '█   █'],
  N: ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
  O: [' ███ ', '█   █', '█   █', '█   █', ' ███ '],
  P: ['████ ', '█   █', '████ ', '█    ', '█    '],
  Q: [' ███ ', '█   █', '█ █ █', '█  █ ', ' ██ █'],
  R: ['████ ', '█   █', '████ ', '█  █ ', '█   █'],
  S: [' ████', '█    ', ' ███ ', '    █', '████ '],
  T: ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
  U: ['█   █', '█   █', '█   █', '█   █', ' ███ '],
  V: ['█   █', '█   █', '█   █', ' █ █ ', '  █  '],
  W: ['█   █', '█   █', '█ █ █', '██ ██', '█   █'],
  X: ['█   █', ' █ █ ', '  █  ', ' █ █ ', '█   █'],
  Y: ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
  Z: ['█████', '   █ ', '  █  ', ' █   ', '█████'],
  '0': [' ███ ', '█  ██', '█ █ █', '██  █', ' ███ '],
  '1': ['  █  ', ' ██  ', '  █  ', '  █  ', '█████'],
  '2': ['████ ', '    █', ' ███ ', '█    ', '█████'],
  '3': ['████ ', '    █', ' ███ ', '    █', '████ '],
  '4': ['█   █', '█   █', '█████', '    █', '    █'],
  '5': ['█████', '█    ', '████ ', '    █', '████ '],
  '6': [' ████', '█    ', '████ ', '█   █', ' ███ '],
  '7': ['█████', '    █', '   █ ', '  █  ', '  █  '],
  '8': [' ███ ', '█   █', ' ███ ', '█   █', ' ███ '],
  '9': [' ███ ', '█   █', ' ████', '    █', '████ '],
  '-': ['     ', '     ', '█████', '     ', '     '],
  ' ': ['  ', '  ', '  ', '  ', '  '],
};

function renderAsciiArt(text: string): string[] {
  const clean = text.toUpperCase().slice(0, 12);
  const rows = ['', '', '', '', ''];
  for (const ch of clean) {
    const glyph = ASCII_FONT[ch] || ASCII_FONT[' '];
    for (let r = 0; r < 5; r++) {
      rows[r] += glyph[r] + ' ';
    }
  }
  return rows;
}

function parseVideoUrl(url: string) {
  const lower = url.toLowerCase();
  let platform = 'Direct Video';
  let videoId = 'vid_' + Math.abs(url.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16).slice(0, 8);
  let thumbnailUrl: string | undefined;

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/);
  if (ytMatch) {
    platform = 'YouTube';
    videoId = ytMatch[1];
    thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  } else if (lower.includes('tiktok.com')) {
    platform = 'TikTok';
    const ttMatch = url.match(/video\/(\d+)/);
    if (ttMatch) videoId = ttMatch[1];
  } else if (lower.includes('instagram.com') || lower.includes('reels')) {
    platform = 'Instagram Reels';
  } else if (lower.includes('facebook.com') || lower.includes('fb.watch')) {
    platform = 'Facebook Video';
  } else if (lower.includes('x.com') || lower.includes('twitter.com')) {
    platform = 'X / Twitter';
  }

  return { platform, videoId, thumbnailUrl };
}

async function computeSha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(text);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').repeat(8);
}

async function computeHmacSha256(secret: string, payload: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return computeSha256(`${secret}:${payload}`);
}

async function callServerAi(mode: string, prompt: string): Promise<{ text?: string; error?: string }> {
  try {
    const res = await fetch('/api/ai/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, prompt }),
    });
    const data = (await res.json()) as { text?: string; error?: string };
    if (!res.ok) {
      return { error: data.error || `AI endpoint returned HTTP ${res.status}` };
    }
    return { text: data.text };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unable to reach AI backend endpoint.' };
  }
}

const WEATHER_DATA: Record<string, { tempC: number; condition: string; humidity: number; windKmh: number }> = {
  manila: { tempC: 31, condition: 'Partly Cloudy', humidity: 74, windKmh: 16 },
  cebu: { tempC: 30, condition: 'Warm Breeze', humidity: 72, windKmh: 19 },
  davao: { tempC: 29, condition: 'Light Showers', humidity: 80, windKmh: 11 },
  tokyo: { tempC: 18, condition: 'Clear Sky', humidity: 54, windKmh: 14 },
  singapore: { tempC: 31, condition: 'Humid Overcast', humidity: 82, windKmh: 12 },
  london: { tempC: 12, condition: 'Cool Mist', humidity: 78, windKmh: 21 },
  'new york': { tempC: 15, condition: 'Crisp Sun', humidity: 48, windKmh: 18 },
};

const DICTIONARY: Record<string, { pos: string; def: string; example: string }> = {
  latency: {
    pos: 'noun',
    def: 'The delay between a user action or request and the corresponding system response.',
    example: 'Velocity keeps command dispatch latency under 15ms.',
  },
  idempotent: {
    pos: 'adjective',
    def: 'An operation that produces the same result even if executed multiple times.',
    example: 'PUT configuration updates should be idempotent.',
  },
  cartel: {
    pos: 'noun',
    def: 'An organized alliance or syndicate operating under shared rules and branding.',
    example: 'Velocity is engineered and maintained by Nadeus Cartel.',
  },
  velocity: {
    pos: 'noun',
    def: 'Speed in a given direction; throughput rate of executed commands or tasks.',
    example: 'High command velocity keeps active channels responsive.',
  },
};

const TRANSLATIONS: Record<string, Record<string, string>> = {
  tl: {
    hello: 'Kumusta',
    'good morning': 'Magandang umaga',
    'good morning team': 'Magandang umaga team',
    welcome: 'Maligayang pagdating',
    'thank you': 'Salamat',
    faster: 'Mas mabilis',
  },
  ja: {
    hello: 'こんにちは (Konnichiwa)',
    'good morning': 'おはようございます (Ohayō gozaimasu)',
    welcome: 'ようこそ (Yōkoso)',
    'thank you': 'ありがとうございます (Arigatō gozaimasu)',
  },
  es: {
    hello: 'Hola',
    'good morning': 'Buenos días',
    welcome: 'Bienvenido',
    'thank you': 'Gracias',
  },
  en: {
    kumusta: 'Hello',
    salamat: 'Thank you',
    'magandang umaga': 'Good morning',
  },
};

const QUOTES = [
  '"Simplicity is prerequisite to reliability." — Edsger W. Dijkstra',
  '"Make it work, make it right, make it fast." — Kent Beck',
  '"Programs must be written for people to read, and only incidentally for machines to execute." — Harold Abelson',
  '"Speed is a feature when accuracy is already solved." — Nadeus Cartel Engineering',
];

const FACTS = [
  'The first computer bug was an actual moth found trapped in a Harvard Mark II relay in 1947.',
  'SHA-256 produces a 256-bit digest with 2^256 possible combinations—more than atoms in the observable universe.',
  'TypeScript compiles away all type annotations at build time, adding zero runtime overhead.',
  'HTTP status code 418 ("I\'m a teapot") was defined in RFC 2324 as an April Fools specification in 1998.',
];

const TRIVIA_POOL = [
  {
    q: 'Which HTTP status code indicates "Too Many Requests" for rate limiting?',
    options: ['403 Forbidden', '429 Too Many Requests', '502 Bad Gateway'],
    answer: '429 Too Many Requests',
  },
  {
    q: 'What is the time complexity of looking up a key in a balanced hash map on average?',
    options: ['O(1)', 'O(log n)', 'O(n)'],
    answer: 'O(1)',
  },
  {
    q: 'Which bitwise operation clears or flips bits in a SHA-256 compression round?',
    options: ['XOR', 'CONCAT', 'MOD'],
    answer: 'XOR',
  },
];

const MORSE_MAP: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.', ' ': '/',
};

const HTTP_STATUSES: Record<number, { text: string; group: string; advice: string }> = {
  200: { text: 'OK', group: '2xx Success', advice: 'Request succeeded cleanly.' },
  201: { text: 'Created', group: '2xx Success', advice: 'New resource created on server.' },
  204: { text: 'No Content', group: '2xx Success', advice: 'Succeeded with empty response body.' },
  400: { text: 'Bad Request', group: '4xx Client Error', advice: 'Validate request syntax and JSON payload.' },
  401: { text: 'Unauthorized', group: '4xx Client Error', advice: 'Provide valid authentication credentials.' },
  403: { text: 'Forbidden', group: '4xx Client Error', advice: 'Authenticated caller lacks permission.' },
  404: { text: 'Not Found', group: '4xx Client Error', advice: 'Verify endpoint path or resource ID.' },
  429: { text: 'Too Many Requests', group: '4xx Client Error', advice: 'Back off and respect Retry-After header.' },
  500: { text: 'Internal Server Error', group: '5xx Server Error', advice: 'Inspect backend logs for unhandled exception.' },
  502: { text: 'Bad Gateway', group: '5xx Server Error', advice: 'Upstream service returned invalid response.' },
  503: { text: 'Service Unavailable', group: '5xx Server Error', advice: 'Upstream overloaded or under maintenance.' },
};

const FX_USD_BASE: Record<string, number> = {
  USD: 1,
  PHP: 58.4,
  EUR: 0.92,
  JPY: 154.2,
  SGD: 1.34,
  GBP: 0.79,
};

const SHOP_ITEMS = [
  { key: 'shield', name: 'Raid Shield', price: 600, desc: 'Protects wallet against one heist attempt.' },
  { key: 'vip', name: 'Cartel VIP Pass', price: 1500, desc: 'Unlocks priority command routing badge.' },
  { key: 'booster', name: 'Streak Booster', price: 900, desc: 'Adds +25% bonus on next work shift.' },
  { key: 'keycard', name: 'Nadeus Keycard', price: 2500, desc: 'Collector credential in operator inventory.' },
];

export async function executeVelocityCommand(
  rawInput: string,
  ctx: ExecutionContext
): Promise<ConsoleEntry> {
  const trimmed = rawInput.trim();
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const id = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const prefix = ctx.settings.prefix;
  const withoutPrefix = trimmed.startsWith(prefix)
    ? trimmed.slice(prefix.length).trim()
    : trimmed;

  const tokens = tokenizeArgs(withoutPrefix);
  const cmdToken = (tokens[0] || '').toLowerCase();
  const args = tokens.slice(1);
  const argString = args.join(' ');

  if (!cmdToken) {
    return {
      id,
      timestamp,
      rawInput: trimmed,
      commandName: 'empty',
      status: 'warning',
      title: 'No command specified',
      lines: [`Type ${prefix}help to list all ${ctx.commands.length} Velocity commands.`],
    };
  }

  const matched = ctx.commands.find(
    (c) => c.name.toLowerCase() === cmdToken || c.aliases.some((a) => a.toLowerCase() === cmdToken)
  );

  if (!matched) {
    return {
      id,
      timestamp,
      rawInput: trimmed,
      commandName: cmdToken,
      status: 'error',
      title: `Unknown command "${cmdToken}"`,
      lines: [
        `No command or alias matches "${cmdToken}".`,
        `Try ${prefix}help or check the Command Directory for available triggers.`,
      ],
    };
  }

  if (ctx.settings.maintenanceMode && matched.permission !== 'Owner' && matched.name !== 'help') {
    return {
      id,
      timestamp,
      rawInput: trimmed,
      commandName: matched.name,
      status: 'warning',
      title: 'Maintenance Mode Active',
      lines: [
        `Command "${prefix}${matched.name}" is paused while Maintenance Mode is enabled.`,
        `Disable Maintenance Mode in Settings to resume member commands.`,
      ],
    };
  }

  if (!matched.enabled) {
    return {
      id,
      timestamp,
      rawInput: trimmed,
      commandName: matched.name,
      status: 'warning',
      title: `Command Disabled: ${prefix}${matched.name}`,
      lines: [
        `This command is currently toggled off in the Command Directory.`,
        `Re-enable it from Commands to allow execution.`,
      ],
    };
  }

  if (matched.isCustom && matched.responseTemplate) {
    const rendered = matched.responseTemplate
      .replace(/\{user\}/gi, '@nadeus')
      .replace(/\{args\}/gi, argString || '(no arguments)')
      .replace(/\{prefix\}/gi, prefix)
      .replace(/\{date\}/gi, new Date().toLocaleDateString());
    return {
      id,
      timestamp,
      rawInput: trimmed,
      commandName: matched.name,
      status: 'success',
      title: `Custom Command · ${prefix}${matched.name}`,
      lines: [rendered],
    };
  }

  // AI MODULE (Server-side @google/genai)
  if (matched.category === 'AI') {
    const aiPrompt = argString || `Demonstrate the "${matched.name}" AI mode concisely for Velocity by Nadeus Cartel.`;
    const aiRes = await callServerAi(matched.name, aiPrompt);
    if (aiRes.error) {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'error',
        title: `AI Error · ${prefix}${matched.name}`,
        lines: [aiRes.error],
      };
    }
    return {
      id,
      timestamp,
      rawInput: trimmed,
      commandName: matched.name,
      status: 'success',
      title: `Velocity AI · ${prefix}${matched.name}`,
      lines: (aiRes.text || '').split('\n'),
      kvPairs: [{ label: 'Model', value: 'Gemini 4 Hydrogen' }],
    };
  }

  const CANONICAL_ROUTE: Record<string, string> = {
    menu: 'help',
    botinfo: 'stats',
    reload: 'restart',
    customprefix: 'prefix',
    calculator: 'calc',
    'tic-tac-toe': 'tictactoe',
    passwordgenerator: 'password',
    clearwarn: 'clearwarns',
    whois: 'userinfo',
    pfp: 'avatar',
    worldclock: 'timezone',
    unitconvert: 'convert',
    currencyinfo: 'currency',
    dictionary: 'define',
    wikipedia: 'wiki',
    wordcount: 'textstats',
    textcount: 'textstats',
    nickname: 'nick',
    groupinfo: 'serverinfo',
    timer: 'stopwatch',
    richlist: 'leaderboard',
    wyr: 'wouldyourather',
    riddlegame: 'riddle',
    quickmath: 'mathquiz',
    numberguess: 'guessnumber',
    flagquiz: 'guessflag',
    animalquiz: 'guessanimal',
    emojiquiz: 'guessemoji',
    capitalquiz: 'guesscapital',
    geographyquiz: 'guesscountry',
    moviequiz: 'guessmovie',
    animeguess: 'guessanime',
    personalitytest: 'personality',
    compatibilitytest: 'compatibility',
    secretmessage: 'anonymous',
    anonymousmessage: 'anonymous',
    confessionbox: 'confession',
    wantedposter: 'wanted',
    rankimage: 'rankcard',
    achievementimage: 'achievementcard',
    friendcard: 'friendshipcard',
    animewall: 'animewallpaper',
    randomwaifu: 'waifu',
    randomhusbando: 'husbando',
    custombotname: 'customname',
    databasebackup: 'backup',
  };

  const routeName = CANONICAL_ROUTE[matched.name] || matched.name;

  switch (routeName) {
    // CORE
    case 'help': {
      const target = args[0]?.toLowerCase();
      if (target) {
        const found = ctx.commands.find((c) => c.name === target || c.aliases.includes(target));
        if (!found) {
          return {
            id,
            timestamp,
            rawInput: trimmed,
            commandName: 'help',
            status: 'error',
            title: `Command "${target}" not found`,
            lines: [`Run ${prefix}help without arguments to browse all categories.`],
          };
        }
        return {
          id,
          timestamp,
          rawInput: trimmed,
          commandName: 'help',
          status: 'success',
          title: `Command Reference · ${prefix}${found.name}`,
          lines: [found.description],
          kvPairs: [
            { label: 'Syntax', value: `${prefix}${found.usage}` },
            { label: 'Category', value: found.category },
            { label: 'Permission', value: found.permission },
            { label: 'Cooldown', value: `${found.cooldownSec}s` },
            { label: 'Aliases', value: found.aliases.length ? found.aliases.join(', ') : 'None' },
            { label: 'Example', value: `${prefix}${found.examples[0] || found.name}` },
          ],
        };
      }

      const activeCount = ctx.commands.filter((c) => c.enabled).length;
      const byCat = ctx.commands.reduce<Record<string, string[]>>((acc, c) => {
        if (!acc[c.category]) acc[c.category] = [];
        acc[c.category].push(`${prefix}${c.name}`);
        return acc;
      }, {});
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'help',
        status: 'success',
        title: `Velocity Command Index (${activeCount}/${ctx.commands.length} active)`,
        lines: Object.entries(byCat).map(([cat, list]) => `${cat}: ${list.join(', ')}`),
        kvPairs: [
          { label: 'Maintainer', value: ctx.settings.builderCredit },
          { label: 'Active Prefix', value: prefix },
        ],
      };
    }

    case 'ping': {
      const simulatedMs = Math.floor(6 + Math.random() * 11);
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'ping',
        status: 'success',
        title: 'Gateway Dispatch Nominal',
        lines: ['Round-trip command pipeline responded cleanly.'],
        kvPairs: [
          { label: 'Gateway RTT', value: `${simulatedMs} ms` },
          { label: 'Parser Time', value: '0.4 ms' },
          { label: 'Prefix', value: prefix },
        ],
      };
    }

    case 'uptime': {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'uptime',
        status: 'success',
        title: 'Velocity Runtime Uptime',
        lines: ['Continuous worker session active without restarts.'],
        kvPairs: [
          { label: 'Uptime', value: '14d 07h 22m 41s' },
          { label: 'Active Channels', value: '4 / 5' },
          { label: 'Builder', value: ctx.settings.builderCredit },
        ],
      };
    }

    case 'stats': {
      const totalExec = ctx.commands.reduce((s, c) => s + c.executions, 0);
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'stats',
        status: 'success',
        title: `${ctx.settings.botName} System Summary`,
        lines: [`${ctx.settings.builderCredit} · Multi-channel command operations suite.`],
        kvPairs: [
          { label: 'Loaded Commands', value: `${ctx.commands.length}` },
          { label: 'Enabled', value: `${ctx.commands.filter((c) => c.enabled).length}` },
          { label: 'Total Executions', value: totalExec.toLocaleString() },
          { label: 'Active Prefix', value: prefix },
        ],
      };
    }

    case 'prefix': {
      if (!args[0]) {
        return {
          id,
          timestamp,
          rawInput: trimmed,
          commandName: 'prefix',
          status: 'success',
          title: 'Current Command Prefix',
          lines: [`Active prefix is "${prefix}". Pass a new symbol to update it.`],
        };
      }
      const nextPrefix = args[0].slice(0, 3);
      ctx.updateSettings({ prefix: nextPrefix });
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'prefix',
        status: 'success',
        title: 'Workspace Prefix Updated',
        lines: [`All commands now trigger with "${nextPrefix}" (e.g. ${nextPrefix}help).`],
      };
    }

    case 'restart': {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'restart',
        status: 'success',
        title: 'Command Registry Reloaded',
        lines: [`Flushed cooldown cache and re-indexed ${ctx.commands.length} command handlers.`],
      };
    }

    case 'changelog': {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'changelog',
        status: 'success',
        title: 'Velocity Release Notes',
        lines: [
          `• Expanded registry to ${ctx.commands.length} commands across 14 modules.`,
          '• Added AI suite powered by Gemini 4 Hydrogen.',
          '• Added Banners suite (ASCII block art, downloadable SVG cards, PFP banners).',
          '• Added Video Saving suite (savevid, mp3, clip, thumbnail, watermark, gif).',
          '• Added playable Games suite (tictactoe, blackjack, slots, mines, scramble).',
        ],
      };
    }

    case 'credits': {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'credits',
        status: 'success',
        title: 'Velocity Attribution',
        lines: [`${ctx.settings.botName} — ${ctx.settings.builderCredit}.`],
        kvPairs: [
          { label: 'Organization', value: 'Nadeus Cartel' },
          { label: 'Commands Loaded', value: `${ctx.commands.length}` },
        ],
      };
    }

    // BANNERS
    case 'banner': {
      const text = (argString || 'NADEUS CARTEL').toUpperCase();
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'banner',
        status: 'success',
        title: 'Announcement Banner',
        lines: ['==============================', `  ${text}`, '=============================='],
      };
    }

    case 'ascii': {
      const text = argString || 'VELOCITY';
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'ascii',
        status: 'success',
        title: `ASCII Block Banner · ${text.toUpperCase().slice(0, 12)}`,
        lines: renderAsciiArt(text),
      };
    }

    case 'gbanner': {
      const title = args[0] || 'VELOCITY OPERATIONS';
      const subtitle = args[1] || ctx.settings.builderCredit;
      const accent = /^#[0-9a-fA-F]{6}$/.test(args[2] || '') ? args[2] : '#2563EB';
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'gbanner',
        status: 'success',
        title: 'Visual SVG Banner Card',
        lines: [`Generated high-contrast banner card for "${title}".`],
        bannerData: { title, subtitle, accent, showAvatar: false },
      };
    }

    case 'wbanner': {
      const member = argString || '@nadeus';
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'wbanner',
        status: 'success',
        title: `Welcome Banner · ${member}`,
        lines: [`Rendered welcome banner with operator PFP.`],
        bannerData: {
          title: `Welcome, ${member}`,
          subtitle: `${ctx.settings.botName} · ${ctx.settings.builderCredit}`,
          accent: '#1D4ED8',
          showAvatar: true,
          avatarUrl: ctx.settings.pfpUrl,
        },
      };
    }

    case 'box': {
      const msg = argString || 'Velocity by Nadeus Cartel';
      const width = Math.min(Math.max(msg.length + 4, 20), 60);
      const top = '╔' + '═'.repeat(width) + '╗';
      const mid = '║  ' + msg.slice(0, width - 4).padEnd(width - 4, ' ') + '  ║';
      const bot = '╚' + '═'.repeat(width) + '╝';
      return { id, timestamp, rawInput: trimmed, commandName: 'box', status: 'success', title: 'Framed Box Message', lines: [top, mid, bot] };
    }

    case 'divider': {
      const label = argString ? ` ${argString.toUpperCase()} ` : '';
      const line = label ? `──────────${label}──────────` : '────────────────────────────────';
      return { id, timestamp, rawInput: trimmed, commandName: 'divider', status: 'success', title: 'Section Divider', lines: [line] };
    }

    // VIDEO SAVING
    case 'savevid': {
      const url = args[0] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const info = parseVideoUrl(url);
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'savevid',
        status: 'success',
        title: `Video Saver · ${info.platform}`,
        lines: [`Parsed ${info.platform} media source (${info.videoId}). Select quality below to export.`],
        videoData: {
          sourceUrl: url,
          platform: info.platform,
          videoId: info.videoId,
          title: `${info.platform} Media (${info.videoId})`,
          duration: '01:42',
          thumbnailUrl: info.thumbnailUrl,
          formats: [
            { label: '1080p Full HD MP4', size: '24.6 MB', codec: 'H.264 + AAC' },
            { label: '720p HD MP4', size: '13.2 MB', codec: 'H.264 + AAC' },
            { label: 'Audio Only MP3', size: '3.9 MB', codec: '320 kbps' },
          ],
        },
      };
    }

    case 'mp3': {
      const url = args[0] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const info = parseVideoUrl(url);
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'mp3',
        status: 'success',
        title: `Audio Extractor · ${info.platform}`,
        lines: [`Prepared 320kbps MP3 extraction stream for ${info.videoId}.`],
        kvPairs: [
          { label: 'Source', value: info.platform },
          { label: 'Format', value: 'MP3 · 320 kbps' },
          { label: 'Command', value: `yt-dlp -x --audio-format mp3 "${url}"` },
        ],
      };
    }

    case 'clip': {
      const url = args[0] || 'https://youtu.be/demo';
      const start = args[1] || '00:15';
      const end = args[2] || '00:45';
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'clip',
        status: 'success',
        title: `Video Clipper · ${start} to ${end}`,
        lines: [`ffmpeg -ss ${start} -to ${end} -i "${url}" -c copy clip_${start.replace(':', '')}.mp4`],
      };
    }

    case 'thumbnail': {
      const url = args[0] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const info = parseVideoUrl(url);
      const thumb = info.thumbnailUrl || 'No direct YouTube thumbnail detected for non-YouTube URL.';
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'thumbnail',
        status: 'success',
        title: `Cover Thumbnail · ${info.platform}`,
        lines: [thumb],
        videoData: info.thumbnailUrl
          ? {
              sourceUrl: url,
              platform: info.platform,
              videoId: info.videoId,
              title: `Thumbnail Preview (${info.videoId})`,
              duration: 'Image',
              thumbnailUrl: info.thumbnailUrl,
              formats: [{ label: 'HQ Thumbnail JPG', size: '480×360', codec: 'JPEG' }],
            }
          : undefined,
      };
    }

    case 'watermark': {
      const url = args[0] || 'https://www.tiktok.com/@nadeus/video/741298?is_from_webapp=1';
      const cleaned = url.split('?')[0];
      const info = parseVideoUrl(cleaned);
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'watermark',
        status: 'success',
        title: `Clean Video Link · ${info.platform}`,
        lines: [`Stripped tracking parameters -> ${cleaned}`, 'Ready for watermark-free HD save pipeline.'],
      };
    }

    case 'gif': {
      const url = args[0] || 'https://youtu.be/demo';
      const fps = parseInt(args[1] || '15', 10) || 15;
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'gif',
        status: 'success',
        title: `Video to GIF Pipeline (${fps} fps)`,
        lines: [`ffmpeg -i "${url}" -vf "fps=${fps},scale=640:-1:flags=lanczos" output.gif`],
      };
    }

    // GAMES
    case 'tictactoe': {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'tictactoe',
        status: 'success',
        title: 'Tic-Tac-Toe (You = X · Velocity = O)',
        lines: ['Click any empty square below to make your move.'],
        tictactoeData: {
          board: ['', '', '', '', '', '', '', '', ''],
          status: 'playing',
        },
      };
    }

    case 'blackjack': {
      const bet = Math.min(Math.max(parseInt(args[0] || '100', 10) || 100, 10), ctx.economy.wallet || 100);
      if (ctx.economy.wallet < bet) {
        return { id, timestamp, rawInput: trimmed, commandName: 'blackjack', status: 'error', title: 'Insufficient VC', lines: [`Wallet holds ${ctx.economy.wallet.toLocaleString()} VC.`] };
      }
      const draw = () => Math.min(10, 2 + Math.floor(Math.random() * 10));
      const player = draw() + draw();
      const dealer = draw() + draw();
      const win = player <= 21 && (dealer > 21 || player > dealer);
      const push = player === dealer;
      const delta = push ? 0 : win ? bet : -bet;
      ctx.updateEconomy((prev) => ({ ...prev, wallet: Math.max(0, prev.wallet + delta) }));
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'blackjack',
        status: win ? 'success' : push ? 'warning' : 'error',
        title: push ? 'Blackjack · Push' : win ? `Blackjack · Won +${bet} VC` : `Blackjack · Lost -${bet} VC`,
        lines: [`Your Hand: ${player}  |  Dealer Hand: ${dealer}`],
      };
    }

    case 'slots': {
      const bet = Math.min(Math.max(parseInt(args[0] || '100', 10) || 100, 10), Math.max(ctx.economy.wallet, 10));
      if (ctx.economy.wallet < bet) {
        return { id, timestamp, rawInput: trimmed, commandName: 'slots', status: 'error', title: 'Insufficient VC', lines: [`Wallet holds ${ctx.economy.wallet.toLocaleString()} VC.`] };
      }
      const symbols = ['7', 'BAR', 'DIAMOND', 'CHERRY', 'STAR'];
      const r1 = symbols[Math.floor(Math.random() * symbols.length)];
      const r2 = symbols[Math.floor(Math.random() * symbols.length)];
      const r3 = symbols[Math.floor(Math.random() * symbols.length)];
      let multiplier = 0;
      if (r1 === r2 && r2 === r3) multiplier = r1 === '7' ? 5 : 3;
      else if (r1 === r2 || r2 === r3 || r1 === r3) multiplier = 1.5;

      const delta = multiplier > 0 ? Math.round(bet * multiplier - bet) : -bet;
      ctx.updateEconomy((prev) => ({ ...prev, wallet: Math.max(0, prev.wallet + delta) }));
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'slots',
        status: delta >= 0 ? 'success' : 'warning',
        title: delta > 0 ? `Slots · Won +${delta} VC` : `Slots · Lost ${bet} VC`,
        lines: [`[ ${r1}  |  ${r2}  |  ${r3} ]`, `Wallet: ${(ctx.economy.wallet + delta).toLocaleString()} VC`],
      };
    }

    case 'coinflip': {
      const pick = (args[0] || '').toLowerCase();
      const bet = parseInt(args[1] || '0', 10) || 0;
      const side = crypto.getRandomValues(new Uint32Array(1))[0] % 2 === 0 ? 'heads' : 'tails';
      if (bet > 0 && (pick === 'heads' || pick === 'tails')) {
        if (ctx.economy.wallet < bet) {
          return { id, timestamp, rawInput: trimmed, commandName: 'coinflip', status: 'error', title: 'Insufficient VC', lines: [`Wallet has ${ctx.economy.wallet.toLocaleString()} VC.`] };
        }
        const won = pick === side;
        const delta = won ? bet : -bet;
        ctx.updateEconomy((prev) => ({ ...prev, wallet: Math.max(0, prev.wallet + delta) }));
        return {
          id,
          timestamp,
          rawInput: trimmed,
          commandName: 'coinflip',
          status: won ? 'success' : 'warning',
          title: `Coin Flip · ${side.toUpperCase()} (${won ? `+${bet} VC` : `-${bet} VC`})`,
          lines: [`You called ${pick}. Updated wallet: ${(ctx.economy.wallet + delta).toLocaleString()} VC`],
        };
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'coinflip', status: 'success', title: 'Coin Flip', lines: [`Result: ${side.toUpperCase()}`] };
    }

    case 'rps': {
      const userMove = (args[0] || '').toLowerCase();
      const moves = ['rock', 'paper', 'scissors'] as const;
      if (!moves.includes(userMove as (typeof moves)[number])) {
        return { id, timestamp, rawInput: trimmed, commandName: 'rps', status: 'error', title: 'Invalid Move', lines: [`Choose rock, paper, or scissors. Example: ${prefix}rps rock`] };
      }
      const botMove = moves[Math.floor(Math.random() * 3)];
      const outcome =
        userMove === botMove
          ? 'Draw'
          : (userMove === 'rock' && botMove === 'scissors') ||
              (userMove === 'paper' && botMove === 'rock') ||
              (userMove === 'scissors' && botMove === 'paper')
            ? 'You win'
            : 'Velocity wins';
      return { id, timestamp, rawInput: trimmed, commandName: 'rps', status: 'success', title: `RPS · ${outcome}`, lines: [`You played ${userMove} · Velocity played ${botMove}.`] };
    }

    case 'roll': {
      const notation = (args[0] || '1d20').toLowerCase();
      const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
      if (!match) {
        return { id, timestamp, rawInput: trimmed, commandName: 'roll', status: 'error', title: 'Invalid Dice Notation', lines: [`Use NdS+M format, e.g. ${prefix}roll 2d20+4`] };
      }
      const count = Math.min(parseInt(match[1], 10), 20);
      const sides = Math.min(parseInt(match[2], 10), 1000);
      const mod = match[3] ? parseInt(match[3], 10) : 0;
      const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
      const total = rolls.reduce((a, b) => a + b, 0) + mod;
      return { id, timestamp, rawInput: trimmed, commandName: 'roll', status: 'success', title: `Dice Roll · ${notation}`, lines: [`Rolls: [${rolls.join(', ')}]${mod ? (mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`) : ''} = ${total}`] };
    }

    case 'trivia': {
      const item = TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)];
      return { id, timestamp, rawInput: trimmed, commandName: 'trivia', status: 'success', title: 'Knowledge Trivia', lines: [item.q, `Options: ${item.options.join('  |  ')}`, `Verified Answer: ${item.answer}`] };
    }

    case 'guess': {
      const num = parseInt(args[0] || '', 10);
      if (Number.isNaN(num) || num < 1 || num > 10) {
        return { id, timestamp, rawInput: trimmed, commandName: 'guess', status: 'error', title: 'Invalid Guess', lines: [`Pick a number between 1 and 10. Example: ${prefix}guess 7`] };
      }
      const secret = 1 + Math.floor(Math.random() * 10);
      const won = num === secret;
      if (won) ctx.updateEconomy((prev) => ({ ...prev, wallet: prev.wallet + 150 }));
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'guess',
        status: won ? 'success' : 'warning',
        title: won ? 'Exact Match! +150 VC' : `Missed (Secret was ${secret})`,
        lines: [won ? 'Credited +150 VC to your wallet.' : `You guessed ${num}; Velocity rolled ${secret}.`],
      };
    }

    case 'scramble': {
      const words = [
        { word: 'VELOCITY', hint: 'Name of this bot platform' },
        { word: 'CARTEL', hint: 'Nadeus organization' },
        { word: 'TYPESCRIPT', hint: 'Typed superset of JavaScript' },
        { word: 'AUTOMATION', hint: 'Keyword trigger workflows' },
      ];
      const pick = words[Math.floor(Math.random() * words.length)];
      const shuffled = pick.word.split('').sort(() => Math.random() - 0.5).join('');
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'scramble',
        status: 'success',
        title: 'Word Scramble Challenge',
        lines: [`Scrambled: ${shuffled}`, `Hint: ${pick.hint}`, `Answer: ${pick.word}`],
      };
    }

    case 'mines': {
      const bet = Math.min(Math.max(parseInt(args[0] || '100', 10) || 100, 10), Math.max(ctx.economy.wallet, 10));
      if (ctx.economy.wallet < bet) {
        return { id, timestamp, rawInput: trimmed, commandName: 'mines', status: 'error', title: 'Insufficient VC', lines: [`Wallet has ${ctx.economy.wallet.toLocaleString()} VC.`] };
      }
      const win = Math.random() > 0.4;
      const payout = win ? Math.round(bet * 1.45) - bet : -bet;
      ctx.updateEconomy((prev) => ({ ...prev, wallet: Math.max(0, prev.wallet + payout) }));
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'mines',
        status: win ? 'success' : 'warning',
        title: win ? `Mines Cleared · +${payout} VC` : `Hit a Mine · -${bet} VC`,
        lines: [
          '💎 💎 💣 💎',
          '💎 💎 💎 💣',
          '💣 💎 💎 💎',
          `Wallet: ${(ctx.economy.wallet + payout).toLocaleString()} VC`,
        ],
      };
    }

    // MODERATION
    case 'kick':
    case 'ban':
    case 'softban':
    case 'unban':
    case 'mute':
    case 'unmute':
    case 'warn': {
      const target = args[0];
      if (!target) {
        return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'error', title: 'Missing Target User', lines: [`Usage: ${prefix}${matched.usage}`] };
      }
      const reason = args.slice(1).join(' ') || 'No reason provided';
      const actionMap: Record<string, string> = {
        kick: 'Removed from channel',
        ban: 'Permanently banned',
        softban: 'Softbanned (messages purged)',
        unban: 'Ban lifted',
        mute: 'Muted',
        unmute: 'Unmuted',
        warn: 'Official strike logged',
      };
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: `Moderation Receipt · ${matched.name.toUpperCase()}`,
        lines: ['Action recorded in audit ledger.'],
        kvPairs: [
          { label: 'Target', value: target },
          { label: 'Outcome', value: actionMap[matched.name] },
          { label: 'Reason', value: reason },
          { label: 'Moderator', value: '@nadeus' },
        ],
      };
    }

    case 'warnings': {
      const target = args[0] || '@user31';
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'warnings',
        status: 'success',
        title: `Moderation Strikes · ${target}`,
        lines: ['1. [2026-11-10] Excessive caps in #general — issued by @kael_mod'],
        kvPairs: [{ label: 'Active Strikes', value: '1 / 3' }],
      };
    }

    case 'clearwarns': {
      const target = args[0];
      if (!target) {
        return { id, timestamp, rawInput: trimmed, commandName: 'clearwarns', status: 'error', title: 'Missing Target User', lines: [`Usage: ${prefix}clearwarns <@user>`] };
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'clearwarns', status: 'success', title: 'Strikes Cleared', lines: [`Reset active moderation warning count for ${target} to 0.`] };
    }

    case 'purge': {
      const count = parseInt(args[0] || '', 10);
      if (Number.isNaN(count) || count < 1 || count > 100) {
        return { id, timestamp, rawInput: trimmed, commandName: 'purge', status: 'error', title: 'Invalid Message Count', lines: [`Specify an integer between 1 and 100. Example: ${prefix}purge 25`] };
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'purge', status: 'success', title: 'Bulk Purge Completed', lines: [`Cleared ${count} recent messages${args[1] ? ` authored by ${args[1]}` : ''}.`] };
    }

    case 'lock':
    case 'unlock': {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: matched.name === 'lock' ? 'Channel Locked' : 'Channel Unlocked',
        lines: [matched.name === 'lock' ? `Send permissions restricted to Moderators+. Reason: ${argString || 'Routine lockdown'}` : `Standard posting permissions restored.`],
      };
    }

    case 'slowmode': {
      const sec = parseInt(args[0] ?? '', 10);
      if (Number.isNaN(sec) || sec < 0 || sec > 21600) {
        return { id, timestamp, rawInput: trimmed, commandName: 'slowmode', status: 'error', title: 'Invalid Interval', lines: [`Provide seconds between 0 and 21600.`] };
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'slowmode', status: 'success', title: sec === 0 ? 'Slowmode Disabled' : `Slowmode Set to ${sec}s`, lines: [sec === 0 ? 'Standard message pacing restored.' : `Members may send one message every ${sec} seconds.`] };
    }

    case 'nick': {
      const target = args[0];
      const nextNick = args.slice(1).join(' ');
      if (!target || !nextNick) {
        return { id, timestamp, rawInput: trimmed, commandName: 'nick', status: 'error', title: 'Invalid Arguments', lines: [`Usage: ${prefix}nick <@user> <new_nickname>`] };
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'nick', status: 'success', title: 'Nickname Updated', lines: [`Renamed ${target} to "${nextNick}".`] };
    }

    case 'role': {
      const op = (args[0] || '').toLowerCase();
      const target = args[1];
      const role = args.slice(2).join(' ');
      if (!['add', 'remove'].includes(op) || !target || !role) {
        return { id, timestamp, rawInput: trimmed, commandName: 'role', status: 'error', title: 'Invalid Arguments', lines: [`Usage: ${prefix}role <add|remove> <@user> <role_name>`] };
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'role', status: 'success', title: `Role ${op === 'add' ? 'Assigned' : 'Removed'}`, lines: [`${op === 'add' ? 'Granted' : 'Revoked'} role "${role}" for ${target}.`] };
    }

    case 'antiraid': {
      const mode = (args[0] || 'status').toLowerCase();
      return { id, timestamp, rawInput: trimmed, commandName: 'antiraid', status: 'success', title: `Anti-Raid Shield (${mode.toUpperCase()})`, lines: [mode === 'off' ? 'Strict join-rate verification paused.' : 'Anti-raid threshold active: max 5 new joins per 10s.'] };
    }

    case 'nuke': {
      if (args[0]?.toLowerCase() !== 'confirm') {
        return { id, timestamp, rawInput: trimmed, commandName: 'nuke', status: 'warning', title: 'Confirmation Required', lines: [`Run ${prefix}nuke confirm to recreate and clear the channel.`] };
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'nuke', status: 'success', title: 'Channel Reset Complete', lines: ['Channel cloned with existing permissions and message backlog cleared.'] };
    }

    // ECONOMY
    case 'balance': {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'balance',
        status: 'success',
        title: 'Velocity Credit Ledger',
        lines: [`Inventory: ${ctx.economy.inventory.join(', ') || 'Empty'}`],
        kvPairs: [
          { label: 'Wallet', value: `${ctx.economy.wallet.toLocaleString()} VC` },
          { label: 'Vault Bank', value: `${ctx.economy.bank.toLocaleString()} VC` },
          { label: 'Net Worth', value: `${(ctx.economy.wallet + ctx.economy.bank).toLocaleString()} VC` },
          { label: 'Daily Streak', value: `${ctx.economy.streak} days` },
        ],
      };
    }

    case 'daily': {
      const bonus = 500 + ctx.economy.streak * 50;
      const nextStreak = ctx.economy.streak + 1;
      ctx.updateEconomy((prev) => ({ ...prev, wallet: prev.wallet + bonus, streak: nextStreak, lastDailyTimestamp: Date.now() }));
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'daily',
        status: 'success',
        title: 'Daily Reward Credited',
        lines: [`Added +${bonus.toLocaleString()} VC to your wallet.`],
        kvPairs: [
          { label: 'New Wallet', value: `${(ctx.economy.wallet + bonus).toLocaleString()} VC` },
          { label: 'Active Streak', value: `${nextStreak} days` },
        ],
      };
    }

    case 'work': {
      const tasks = ['Optimized gateway routing rules', 'Audited channel moderation logs', 'Synced Nadeus Cartel webhook relay', 'Indexed custom slash aliases'];
      const reward = 180 + Math.floor(Math.random() * 140);
      const task = tasks[Math.floor(Math.random() * tasks.length)];
      ctx.updateEconomy((prev) => ({ ...prev, wallet: prev.wallet + reward }));
      return { id, timestamp, rawInput: trimmed, commandName: 'work', status: 'success', title: 'Shift Completed', lines: [`${task} — earned +${reward} VC.`], kvPairs: [{ label: 'Updated Wallet', value: `${(ctx.economy.wallet + reward).toLocaleString()} VC` }] };
    }

    case 'beg': {
      const grant = 45 + Math.floor(Math.random() * 85);
      ctx.updateEconomy((prev) => ({ ...prev, wallet: prev.wallet + grant }));
      return { id, timestamp, rawInput: trimmed, commandName: 'beg', status: 'success', title: 'Sponsor Grant', lines: [`Nadeus Cartel sponsor dropped +${grant} VC into your wallet.`] };
    }

    case 'crime': {
      const success = Math.random() > 0.42;
      const delta = success ? 350 + Math.floor(Math.random() * 250) : -Math.min(ctx.economy.wallet, 200);
      ctx.updateEconomy((prev) => ({ ...prev, wallet: Math.max(0, prev.wallet + delta) }));
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'crime',
        status: success ? 'success' : 'warning',
        title: success ? `Operation Succeeded (+${delta} VC)` : `Operation Busted (${delta} VC)`,
        lines: [success ? `Cleared +${delta} VC from high-risk cartel run.` : `Paid ${Math.abs(delta)} VC fine.`],
      };
    }

    case 'invest': {
      const amount = parseInt(args[0] || '', 10);
      if (Number.isNaN(amount) || amount <= 0 || amount > ctx.economy.wallet) {
        return { id, timestamp, rawInput: trimmed, commandName: 'invest', status: 'error', title: 'Invalid Investment', lines: [`Specify an amount up to ${ctx.economy.wallet.toLocaleString()} VC.`] };
      }
      const roiPct = (Math.random() * 0.45 - 0.12);
      const delta = Math.round(amount * roiPct);
      ctx.updateEconomy((prev) => ({ ...prev, wallet: Math.max(0, prev.wallet + delta) }));
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'invest',
        status: delta >= 0 ? 'success' : 'warning',
        title: `Market Yield · ${delta >= 0 ? '+' : ''}${delta} VC`,
        lines: [`Return: ${(roiPct * 100).toFixed(1)}% on ${amount.toLocaleString()} VC.`],
      };
    }

    case 'deposit': {
      const raw = (args[0] || '').toLowerCase();
      const amount = raw === 'all' ? ctx.economy.wallet : parseInt(raw, 10);
      if (Number.isNaN(amount) || amount <= 0 || amount > ctx.economy.wallet) {
        return { id, timestamp, rawInput: trimmed, commandName: 'deposit', status: 'error', title: 'Invalid Deposit Amount', lines: [`Wallet has ${ctx.economy.wallet.toLocaleString()} VC available.`] };
      }
      ctx.updateEconomy((prev) => ({ ...prev, wallet: prev.wallet - amount, bank: prev.bank + amount }));
      return { id, timestamp, rawInput: trimmed, commandName: 'deposit', status: 'success', title: 'Vault Deposit Confirmed', lines: [`Moved ${amount.toLocaleString()} VC into protected vault storage.`] };
    }

    case 'withdraw': {
      const raw = (args[0] || '').toLowerCase();
      const amount = raw === 'all' ? ctx.economy.bank : parseInt(raw, 10);
      if (Number.isNaN(amount) || amount <= 0 || amount > ctx.economy.bank) {
        return { id, timestamp, rawInput: trimmed, commandName: 'withdraw', status: 'error', title: 'Invalid Withdrawal Amount', lines: [`Vault bank holds ${ctx.economy.bank.toLocaleString()} VC.`] };
      }
      ctx.updateEconomy((prev) => ({ ...prev, bank: prev.bank - amount, wallet: prev.wallet + amount }));
      return { id, timestamp, rawInput: trimmed, commandName: 'withdraw', status: 'success', title: 'Vault Withdrawal Confirmed', lines: [`Moved ${amount.toLocaleString()} VC to your active wallet.`] };
    }

    case 'transfer': {
      const target = args[0];
      const amount = parseInt(args[1] || '', 10);
      if (!target || Number.isNaN(amount) || amount <= 0 || amount > ctx.economy.wallet) {
        return { id, timestamp, rawInput: trimmed, commandName: 'transfer', status: 'error', title: 'Transfer Failed', lines: [`Usage: ${prefix}transfer <@user> <amount>`] };
      }
      ctx.updateEconomy((prev) => ({ ...prev, wallet: prev.wallet - amount }));
      return { id, timestamp, rawInput: trimmed, commandName: 'transfer', status: 'success', title: 'Peer Transfer Dispatched', lines: [`Transferred ${amount.toLocaleString()} VC to ${target}.`] };
    }

    case 'gift': {
      const target = args[0];
      const item = args.slice(1).join(' ');
      if (!target || !item) {
        return { id, timestamp, rawInput: trimmed, commandName: 'gift', status: 'error', title: 'Invalid Gift Arguments', lines: [`Usage: ${prefix}gift <@user> <item_name>`] };
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'gift', status: 'success', title: 'Item Gifted', lines: [`Sent "${item}" to ${target}.`] };
    }

    case 'rob': {
      const target = args[0] || '@soren';
      const success = Math.random() > 0.45;
      const delta = success ? 250 + Math.floor(Math.random() * 200) : -Math.min(ctx.economy.wallet, 180);
      ctx.updateEconomy((prev) => ({ ...prev, wallet: Math.max(0, prev.wallet + delta) }));
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'rob',
        status: success ? 'success' : 'warning',
        title: success ? `Heist Succeeded vs ${target}` : `Heist Intercepted vs ${target}`,
        lines: [success ? `Secured +${delta} VC from ${target}.` : `Paid ${Math.abs(delta)} VC penalty.`],
      };
    }

    case 'shop': {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'shop',
        status: 'success',
        title: 'Velocity Credit Shop',
        lines: SHOP_ITEMS.map((item) => `[${item.key}] ${item.name} — ${item.price.toLocaleString()} VC (${item.desc})`),
      };
    }

    case 'buy': {
      const key = (args[0] || '').toLowerCase();
      const item = SHOP_ITEMS.find((i) => i.key === key);
      if (!item) {
        return { id, timestamp, rawInput: trimmed, commandName: 'buy', status: 'error', title: 'Item Not Found', lines: [`Run ${prefix}shop to view valid item keys (shield, vip, booster, keycard).`] };
      }
      if (ctx.economy.wallet < item.price) {
        return { id, timestamp, rawInput: trimmed, commandName: 'buy', status: 'error', title: 'Insufficient Wallet Credits', lines: [`${item.name} costs ${item.price.toLocaleString()} VC.`] };
      }
      ctx.updateEconomy((prev) => ({ ...prev, wallet: prev.wallet - item.price, inventory: [...prev.inventory, item.name] }));
      return { id, timestamp, rawInput: trimmed, commandName: 'buy', status: 'success', title: `Purchased ${item.name}`, lines: [`Deducted ${item.price.toLocaleString()} VC and added item to inventory.`] };
    }

    case 'inventory': {
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'inventory',
        status: 'success',
        title: `Operator Inventory (${ctx.economy.inventory.length} items)`,
        lines: ctx.economy.inventory.length ? ctx.economy.inventory.map((i, idx) => `${idx + 1}. ${i}`) : ['Inventory is empty. Visit /shop to purchase perks.'],
      };
    }

    case 'leaderboard': {
      const net = ctx.economy.wallet + ctx.economy.bank;
      const rows = [
        { name: '@nadeus (You)', score: net },
        { name: '@kael_mod', score: 19840 },
        { name: '@aria_ops', score: 16420 },
        { name: '@soren', score: 12190 },
        { name: '@vex_dev', score: 9450 },
      ].sort((a, b) => b.score - a.score);
      return { id, timestamp, rawInput: trimmed, commandName: 'leaderboard', status: 'success', title: 'Velocity Credit Leaderboard', lines: rows.map((r, idx) => `${idx + 1}. ${r.name} — ${r.score.toLocaleString()} VC`) };
    }

    case 'networth': {
      const total = ctx.economy.wallet + ctx.economy.bank + ctx.economy.inventory.length * 500;
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'networth',
        status: 'success',
        title: 'Net Worth Breakdown',
        lines: [`Combined valuation: ${total.toLocaleString()} VC`],
        kvPairs: [
          { label: 'Wallet', value: `${ctx.economy.wallet.toLocaleString()} VC` },
          { label: 'Vault', value: `${ctx.economy.bank.toLocaleString()} VC` },
          { label: 'Items', value: `${ctx.economy.inventory.length}` },
        ],
      };
    }

    // UTILITY, DEVELOPER, SECURITY, INFORMATION, MEDIA, FUN, AUTOMATION
    case 'calc': {
      if (!argString) {
        return { id, timestamp, rawInput: trimmed, commandName: 'calc', status: 'error', title: 'Missing Expression', lines: [`Example: ${prefix}calc (1450 * 0.12) + 250`] };
      }
      try {
        const result = safeMathEval(argString);
        return { id, timestamp, rawInput: trimmed, commandName: 'calc', status: 'success', title: 'Arithmetic Result', lines: [`${argString} = ${result}`] };
      } catch (err) {
        return { id, timestamp, rawInput: trimmed, commandName: 'calc', status: 'error', title: 'Evaluation Error', lines: [err instanceof Error ? err.message : 'Invalid syntax.'] };
      }
    }

    case 'translate': {
      const lang = (args[0] || '').toLowerCase();
      const phrase = args.slice(1).join(' ');
      if (!lang || !phrase) {
        return { id, timestamp, rawInput: trimmed, commandName: 'translate', status: 'error', title: 'Missing Language or Text', lines: [`Usage: ${prefix}translate <tl|ja|es|en> <text>`] };
      }
      const dict = TRANSLATIONS[lang];
      const translated = dict?.[phrase.toLowerCase()] || `[${lang.toUpperCase()} preview] ${phrase}`;
      return { id, timestamp, rawInput: trimmed, commandName: 'translate', status: 'success', title: `Translation (${lang.toUpperCase()})`, lines: [translated] };
    }

    case 'weather': {
      const city = argString || 'Manila';
      const entry = WEATHER_DATA[city.toLowerCase()] || { tempC: 24 + (city.length % 7), condition: 'Clear Interval', humidity: 60 + (city.length % 20), windKmh: 12 + (city.length % 10) };
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'weather',
        status: 'success',
        title: `Weather Report · ${city}`,
        lines: [`Current atmospheric snapshot for ${city}.`],
        kvPairs: [
          { label: 'Temperature', value: `${entry.tempC}°C` },
          { label: 'Condition', value: entry.condition },
          { label: 'Humidity', value: `${entry.humidity}%` },
          { label: 'Wind', value: `${entry.windKmh} km/h` },
        ],
      };
    }

    case 'qr': {
      const target = argString || 'https://velocity.nadeus.dev';
      return { id, timestamp, rawInput: trimmed, commandName: 'qr', status: 'success', title: 'QR Matrix Generated (21×21)', lines: [`Encoded payload: ${target}`], qrMatrix: generateDeterministicQR(target) };
    }

    case 'base64': {
      const mode = (args[0] || '').toLowerCase();
      const text = args.slice(1).join(' ');
      if ((mode !== 'encode' && mode !== 'decode') || !text) {
        return { id, timestamp, rawInput: trimmed, commandName: 'base64', status: 'error', title: 'Invalid Arguments', lines: [`Usage: ${prefix}base64 <encode|decode> <text>`] };
      }
      try {
        const out = mode === 'encode' ? btoa(unescape(encodeURIComponent(text))) : decodeURIComponent(escape(atob(text)));
        return { id, timestamp, rawInput: trimmed, commandName: 'base64', status: 'success', title: `Base64 ${mode === 'encode' ? 'Encoded' : 'Decoded'}`, lines: [out] };
      } catch {
        return { id, timestamp, rawInput: trimmed, commandName: 'base64', status: 'error', title: 'Invalid Base64 Input', lines: ['Could not decode the supplied Base64 string.'] };
      }
    }

    case 'hash': {
      if (!argString) return { id, timestamp, rawInput: trimmed, commandName: 'hash', status: 'error', title: 'Missing Payload', lines: [`Usage: ${prefix}hash <text>`] };
      return { id, timestamp, rawInput: trimmed, commandName: 'hash', status: 'success', title: 'SHA-256 Cryptographic Digest', lines: [await computeSha256(argString)] };
    }

    case 'password': {
      const len = Math.min(Math.max(parseInt(args[0] || '16', 10) || 16, 8), 64);
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-';
      const arr = new Uint32Array(len);
      crypto.getRandomValues(arr);
      const pass = Array.from(arr, (n) => charset[n % charset.length]).join('');
      return { id, timestamp, rawInput: trimmed, commandName: 'password', status: 'success', title: `Generated Credential (${len} chars)`, lines: [pass] };
    }

    case 'convert': {
      const val = parseFloat(args[0] || '');
      const from = (args[1] || '').toLowerCase();
      const to = (args[2] === 'to' ? args[3] : args[2] || '').toLowerCase();
      if (Number.isNaN(val) || !from || !to) return { id, timestamp, rawInput: trimmed, commandName: 'convert', status: 'error', title: 'Invalid Unit Syntax', lines: [`Example: ${prefix}convert 100 km to mi`] };
      let out: number | null = null;
      if (from === 'km' && to === 'mi') out = val * 0.621371;
      else if (from === 'mi' && to === 'km') out = val * 1.60934;
      else if (from === 'kg' && to === 'lb') out = val * 2.20462;
      else if (from === 'lb' && to === 'kg') out = val * 0.453592;
      else if (from === 'c' && to === 'f') out = (val * 9) / 5 + 32;
      else if (from === 'f' && to === 'c') out = ((val - 32) * 5) / 9;
      else if (from === 'mb' && to === 'gb') out = val / 1024;
      else if (from === 'gb' && to === 'mb') out = val * 1024;
      if (out === null) return { id, timestamp, rawInput: trimmed, commandName: 'convert', status: 'error', title: 'Unsupported Unit Pair', lines: ['Supported pairs: km/mi, kg/lb, c/f, mb/gb.'] };
      return { id, timestamp, rawInput: trimmed, commandName: 'convert', status: 'success', title: 'Unit Conversion', lines: [`${val} ${from} = ${out.toFixed(4).replace(/\.?0+$/, '')} ${to}`] };
    }

    case 'json': {
      if (!argString) return { id, timestamp, rawInput: trimmed, commandName: 'json', status: 'error', title: 'Empty JSON Payload', lines: [`Usage: ${prefix}json {"key":"value"}`] };
      try {
        return { id, timestamp, rawInput: trimmed, commandName: 'json', status: 'success', title: 'Valid JSON Payload', lines: JSON.stringify(JSON.parse(argString), null, 2).split('\n') };
      } catch (err) {
        return { id, timestamp, rawInput: trimmed, commandName: 'json', status: 'error', title: 'Malformed JSON', lines: [err instanceof Error ? err.message : 'Syntax error.'] };
      }
    }

    case 'urlencode':
      return argString ? { id, timestamp, rawInput: trimmed, commandName: 'urlencode', status: 'success', title: 'URL Encoded', lines: [encodeURIComponent(argString)] } : { id, timestamp, rawInput: trimmed, commandName: 'urlencode', status: 'error', title: 'Missing Text', lines: [`Usage: ${prefix}urlencode <text>`] };

    case 'urldecode':
      try {
        return argString ? { id, timestamp, rawInput: trimmed, commandName: 'urldecode', status: 'success', title: 'URL Decoded', lines: [decodeURIComponent(argString)] } : { id, timestamp, rawInput: trimmed, commandName: 'urldecode', status: 'error', title: 'Missing Payload', lines: [`Usage: ${prefix}urldecode <encoded>`] };
      } catch {
        return { id, timestamp, rawInput: trimmed, commandName: 'urldecode', status: 'error', title: 'Malformed URI', lines: ['Invalid percent-encoded input.'] };
      }

    case 'timestamp': {
      const epochSec = args[0] ? parseInt(args[0], 10) : Math.floor(Date.now() / 1000);
      if (Number.isNaN(epochSec)) return { id, timestamp, rawInput: trimmed, commandName: 'timestamp', status: 'error', title: 'Invalid Epoch', lines: ['Provide integer Unix seconds.'] };
      const d = new Date(epochSec * 1000);
      return { id, timestamp, rawInput: trimmed, commandName: 'timestamp', status: 'success', title: 'Timestamp Inspector', lines: [`ISO-8601: ${d.toISOString()}`, `Local: ${d.toLocaleString()}`] };
    }

    case 'countdown': {
      const targetStr = args[0] || '2026-12-31';
      const targetDate = new Date(targetStr);
      if (Number.isNaN(targetDate.getTime())) return { id, timestamp, rawInput: trimmed, commandName: 'countdown', status: 'error', title: 'Invalid Date', lines: ['Use YYYY-MM-DD format.'] };
      const diffMs = targetDate.getTime() - Date.now();
      return { id, timestamp, rawInput: trimmed, commandName: 'countdown', status: 'success', title: `Countdown · ${targetStr}`, lines: [`${Math.floor(diffMs / 86400000)} days remaining.`] };
    }

    case 'stopwatch':
      return { id, timestamp, rawInput: trimmed, commandName: 'stopwatch', status: 'success', title: `Stopwatch · ${argString || 'lap'}`, lines: [`Marked at ${timestamp}.`] };

    case 'slugify':
      return argString ? { id, timestamp, rawInput: trimmed, commandName: 'slugify', status: 'success', title: 'Slugified String', lines: [argString.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')] } : { id, timestamp, rawInput: trimmed, commandName: 'slugify', status: 'error', title: 'Missing Text', lines: [`Usage: ${prefix}slugify <text>`] };

    case 'case': {
      const mode = (args[0] || '').toLowerCase();
      const words = args.slice(1).join(' ').trim().split(/[\s_-]+/).filter(Boolean);
      if (!mode || words.length === 0) return { id, timestamp, rawInput: trimmed, commandName: 'case', status: 'error', title: 'Invalid Syntax', lines: [`Usage: ${prefix}case <camel|snake|kebab|upper|title> <text>`] };
      let out = words.join(' ');
      if (mode === 'camel') out = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join('');
      else if (mode === 'snake') out = words.map((w) => w.toLowerCase()).join('_');
      else if (mode === 'kebab') out = words.map((w) => w.toLowerCase()).join('-');
      else if (mode === 'upper') out = words.join(' ').toUpperCase();
      else if (mode === 'title') out = words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return { id, timestamp, rawInput: trimmed, commandName: 'case', status: 'success', title: `Case Transform (${mode})`, lines: [out] };
    }

    case 'uuid': {
      const count = Math.min(Math.max(parseInt(args[0] || '1', 10) || 1, 1), 10);
      return { id, timestamp, rawInput: trimmed, commandName: 'uuid', status: 'success', title: `Generated ${count} UUID v4`, lines: Array.from({ length: count }, () => crypto.randomUUID()) };
    }

    case 'jwt': {
      const parts = (args[0] || '').split('.');
      if (parts.length < 2) return { id, timestamp, rawInput: trimmed, commandName: 'jwt', status: 'error', title: 'Invalid JWT', lines: ['Expected header.payload.signature format.'] };
      try {
        const decodeSeg = (s: string) => JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
        return { id, timestamp, rawInput: trimmed, commandName: 'jwt', status: 'success', title: 'Decoded JWT Claims', lines: [`Header: ${JSON.stringify(decodeSeg(parts[0]))}`, `Payload: ${JSON.stringify(decodeSeg(parts[1]), null, 2)}`] };
      } catch {
        return { id, timestamp, rawInput: trimmed, commandName: 'jwt', status: 'error', title: 'JWT Decode Failed', lines: ['Unable to parse payload JSON.'] };
      }
    }

    case 'regex': {
      const pattern = args[0];
      const text = args.slice(1).join(' ');
      if (!pattern || !text) return { id, timestamp, rawInput: trimmed, commandName: 'regex', status: 'error', title: 'Missing Args', lines: [`Usage: ${prefix}regex "<pattern>" <text>`] };
      try {
        const matches = text.match(new RegExp(pattern, 'g')) || [];
        return { id, timestamp, rawInput: trimmed, commandName: 'regex', status: 'success', title: `Regex Matches (${matches.length})`, lines: matches.length ? matches : ['No matches found.'] };
      } catch (err) {
        return { id, timestamp, rawInput: trimmed, commandName: 'regex', status: 'error', title: 'Regex Error', lines: [err instanceof Error ? err.message : 'Invalid pattern.'] };
      }
    }

    case 'cron': {
      const expr = argString || '*/15 * * * *';
      const f = expr.trim().split(/\s+/);
      if (f.length !== 5) return { id, timestamp, rawInput: trimmed, commandName: 'cron', status: 'error', title: 'Invalid Cron', lines: ['Expected 5 fields.'] };
      return { id, timestamp, rawInput: trimmed, commandName: 'cron', status: 'success', title: `Cron · ${expr}`, lines: [`Min: ${f[0]} · Hour: ${f[1]} · Day: ${f[2]} · Month: ${f[3]} · Weekday: ${f[4]}`] };
    }

    case 'http': {
      const code = parseInt(args[0] || '', 10);
      const info = HTTP_STATUSES[code];
      return info
        ? { id, timestamp, rawInput: trimmed, commandName: 'http', status: 'success', title: `HTTP ${code} ${info.text}`, lines: [info.advice] }
        : { id, timestamp, rawInput: trimmed, commandName: 'http', status: 'warning', title: `HTTP ${code || '?'}`, lines: ['Supported codes: 200, 201, 204, 400, 401, 403, 404, 429, 500, 502, 503.'] };
    }

    case 'binary': {
      const mode = (args[0] || '').toLowerCase();
      const val = args.slice(1).join(' ');
      if ((mode !== 'encode' && mode !== 'decode') || !val) return { id, timestamp, rawInput: trimmed, commandName: 'binary', status: 'error', title: 'Invalid Syntax', lines: [`Usage: ${prefix}binary <encode|decode> <val>`] };
      const out = mode === 'encode' ? Array.from(val).map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ') : val.trim().split(/\s+/).map((b) => String.fromCharCode(parseInt(b, 2))).join('');
      return { id, timestamp, rawInput: trimmed, commandName: 'binary', status: 'success', title: `Binary ${mode}`, lines: [out] };
    }

    case 'hex': {
      const mode = (args[0] || '').toLowerCase();
      const val = args.slice(1).join(' ');
      if ((mode !== 'encode' && mode !== 'decode') || !val) return { id, timestamp, rawInput: trimmed, commandName: 'hex', status: 'error', title: 'Invalid Syntax', lines: [`Usage: ${prefix}hex <encode|decode> <val>`] };
      const out = mode === 'encode' ? Array.from(new TextEncoder().encode(val)).map((b) => b.toString(16).padStart(2, '0')).join(' ') : val.replace(/\s+/g, '').match(/.{1,2}/g)?.map((h) => String.fromCharCode(parseInt(h, 16))).join('') || '';
      return { id, timestamp, rawInput: trimmed, commandName: 'hex', status: 'success', title: `Hex ${mode}`, lines: [out] };
    }

    case 'morse':
      return argString ? { id, timestamp, rawInput: trimmed, commandName: 'morse', status: 'success', title: 'Morse Code', lines: [argString.toUpperCase().split('').map((c) => MORSE_MAP[c] || '').filter(Boolean).join(' ')] } : { id, timestamp, rawInput: trimmed, commandName: 'morse', status: 'error', title: 'Missing Text', lines: [`Usage: ${prefix}morse <text>`] };

    case 'lorem': {
      const n = Math.min(Math.max(parseInt(args[0] || '2', 10) || 2, 1), 5);
      const pool = ['Velocity routes modular commands with low latency.', 'Nadeus Cartel maintains strict operational logging.', 'Customizable widgets keep high-frequency metrics visible.', 'Tabular figures align numeric tables cleanly.', 'Automation triggers monitor active channels continuously.'];
      return { id, timestamp, rawInput: trimmed, commandName: 'lorem', status: 'success', title: `Placeholder (${n} sentences)`, lines: [pool.slice(0, n).join(' ')] };
    }

    case 'diff': {
      if (!args[0] || !args[1]) return { id, timestamp, rawInput: trimmed, commandName: 'diff', status: 'error', title: 'Two Strings Required', lines: [`Usage: ${prefix}diff "a" "b"`] };
      const a = new Set(args[0].split(/\s+/));
      const b = new Set(args[1].split(/\s+/));
      return { id, timestamp, rawInput: trimmed, commandName: 'diff', status: 'success', title: 'Word Diff', lines: [`Removed: ${[...a].filter((w) => !b.has(w)).join(', ') || 'None'}`, `Added: ${[...b].filter((w) => !a.has(w)).join(', ') || 'None'}`] };
    }

    case 'semver': {
      const ver = (args[0] || '').replace(/^v/, '');
      const bump = (args[1] || 'patch').toLowerCase();
      const p = ver.split('.').map(Number);
      if (p.length !== 3 || p.some(Number.isNaN)) return { id, timestamp, rawInput: trimmed, commandName: 'semver', status: 'error', title: 'Invalid Semver', lines: [`Example: ${prefix}semver 2.4.1 minor`] };
      if (bump === 'major') { p[0]++; p[1] = 0; p[2] = 0; } else if (bump === 'minor') { p[1]++; p[2] = 0; } else { p[2]++; }
      return { id, timestamp, rawInput: trimmed, commandName: 'semver', status: 'success', title: `Semver Bump (${bump})`, lines: [`${ver} -> ${p.join('.')}`] };
    }

    case 'curlgen': {
      const method = (args[0] || 'GET').toUpperCase();
      const url = args[1] || 'https://api.velocity.dev/v1/dispatch';
      return { id, timestamp, rawInput: trimmed, commandName: 'curlgen', status: 'success', title: 'cURL Snippet', lines: [method === 'GET' ? `curl -X GET "${url}"` : `curl -X ${method} "${url}" -H "Content-Type: application/json" -d '{"source":"velocity"}'`] };
    }

    case 'passcheck': {
      if (!argString) return { id, timestamp, rawInput: trimmed, commandName: 'passcheck', status: 'error', title: 'Missing Sample', lines: [`Usage: ${prefix}passcheck <sample>`] };
      const pool = (/[a-z]/.test(argString) ? 26 : 0) + (/[A-Z]/.test(argString) ? 26 : 0) + (/[0-9]/.test(argString) ? 10 : 0) + (/[^a-zA-Z0-9]/.test(argString) ? 32 : 0);
      const entropy = Math.round(argString.length * Math.log2(Math.max(pool, 1)));
      return { id, timestamp, rawInput: trimmed, commandName: 'passcheck', status: 'success', title: `Password Audit · ${entropy >= 80 ? 'Strong' : entropy >= 50 ? 'Moderate' : 'Weak'}`, lines: [`Length: ${argString.length} chars · Entropy: ${entropy} bits`] };
    }

    case 'hmac': {
      if (!args[0] || args.length < 2) return { id, timestamp, rawInput: trimmed, commandName: 'hmac', status: 'error', title: 'Missing Arguments', lines: [`Usage: ${prefix}hmac <secret> <payload>`] };
      return { id, timestamp, rawInput: trimmed, commandName: 'hmac', status: 'success', title: 'HMAC-SHA256 Signature', lines: [await computeHmacSha256(args[0], args.slice(1).join(' '))] };
    }

    case 'rot13':
      return argString ? { id, timestamp, rawInput: trimmed, commandName: 'rot13', status: 'success', title: 'ROT13 Cipher', lines: [argString.replace(/[a-zA-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26) + (c <= 'Z' ? 65 : 97)))] } : { id, timestamp, rawInput: trimmed, commandName: 'rot13', status: 'error', title: 'Missing Text', lines: [`Usage: ${prefix}rot13 <text>`] };

    case 'redact':
      return argString ? { id, timestamp, rawInput: trimmed, commandName: 'redact', status: 'success', title: 'Redacted Output', lines: [argString.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]').replace(/\b(sk-[a-zA-Z0-9_-]{8,}|Bearer\s+[a-zA-Z0-9._-]+)\b/g, '[REDACTED_SECRET]')] } : { id, timestamp, rawInput: trimmed, commandName: 'redact', status: 'error', title: 'Missing Text', lines: [`Usage: ${prefix}redact <text>`] };

    case 'ipinfo': {
      const ip = args[0] || '';
      const o = ip.split('.').map(Number);
      if (o.length !== 4 || o.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return { id, timestamp, rawInput: trimmed, commandName: 'ipinfo', status: 'error', title: 'Invalid IPv4', lines: [`Example: ${prefix}ipinfo 192.168.1.45`] };
      const scope = o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168) ? 'Private RFC 1918' : o[0] === 127 ? 'Loopback' : 'Public Routable';
      return { id, timestamp, rawInput: trimmed, commandName: 'ipinfo', status: 'success', title: `IPv4 · ${ip}`, lines: [`Classification: ${scope}`] };
    }

    case 'cidr': {
      const [ip, maskStr] = (args[0] || '').split('/');
      const mask = parseInt(maskStr || '', 10);
      if (!ip || Number.isNaN(mask) || mask < 0 || mask > 32) return { id, timestamp, rawInput: trimmed, commandName: 'cidr', status: 'error', title: 'Invalid CIDR', lines: [`Example: ${prefix}cidr 10.0.0.0/24`] };
      const total = Math.pow(2, 32 - mask);
      return { id, timestamp, rawInput: trimmed, commandName: 'cidr', status: 'success', title: `Subnet · ${args[0]}`, lines: [`Total IPs: ${total.toLocaleString()} · Usable Hosts: ${(mask >= 31 ? total : total - 2).toLocaleString()}`] };
    }

    case 'token': {
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      return { id, timestamp, rawInput: trimmed, commandName: 'token', status: 'success', title: 'Generated Token', lines: [`${args[0] || 'vel_live'}_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`] };
    }

    case 'audit':
      return { id, timestamp, rawInput: trimmed, commandName: 'audit', status: 'success', title: 'Security Posture Check', lines: [`Prefix: "${prefix}"`, `Audit logging: ${ctx.settings.auditLogging ? 'Enabled' : 'Disabled'}`, `Maintenance mode: ${ctx.settings.maintenanceMode ? 'Active' : 'Off'}`] };

    case 'userinfo':
      return { id, timestamp, rawInput: trimmed, commandName: 'userinfo', status: 'success', title: `Member Dossier · ${args[0] || '@nadeus'}`, lines: [`Wallet: ${ctx.economy.wallet.toLocaleString()} VC · Streak: ${ctx.economy.streak}d`] };

    case 'serverinfo':
      return { id, timestamp, rawInput: trimmed, commandName: 'serverinfo', status: 'success', title: 'Workspace Overview', lines: [`${ctx.settings.builderCredit} · ${ctx.commands.length} commands loaded · Prefix "${prefix}"`] };

    case 'avatar':
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'avatar',
        status: 'success',
        title: `Operator PFP · ${args[0] || '@nadeus'}`,
        lines: ['Active profile image rendered in sidebar & welcome banners.'],
        bannerData: {
          title: args[0] || '@nadeus',
          subtitle: 'Active Velocity Operator Profile',
          accent: '#1E293B',
          showAvatar: true,
          avatarUrl: ctx.settings.pfpUrl,
        },
      };

    case 'define': {
      const word = (args[0] || '').toLowerCase();
      const match = DICTIONARY[word];
      return match ? { id, timestamp, rawInput: trimmed, commandName: 'define', status: 'success', title: `${word} (${match.pos})`, lines: [match.def, `Example: "${match.example}"`] } : { id, timestamp, rawInput: trimmed, commandName: 'define', status: 'warning', title: 'Not Found', lines: ['Try: latency, idempotent, cartel, or velocity.'] };
    }

    case 'wiki':
      return { id, timestamp, rawInput: trimmed, commandName: 'wiki', status: 'success', title: `Brief · ${argString || 'TypeScript'}`, lines: [`${argString || 'TypeScript'} — Reference summary retrieved.`] };

    case 'color': {
      const hex = (args[0] || '#2563EB').replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) return { id, timestamp, rawInput: trimmed, commandName: 'color', status: 'error', title: 'Invalid HEX', lines: [`Example: ${prefix}color #2563EB`] };
      const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
      return { id, timestamp, rawInput: trimmed, commandName: 'color', status: 'success', title: `Color #${hex.toUpperCase()}`, lines: [`RGB: rgb(${r}, ${g}, ${b})`] };
    }

    case 'timezone': {
      const zones = [{ city: 'Manila', tz: 'Asia/Manila' }, { city: 'Tokyo', tz: 'Asia/Tokyo' }, { city: 'Singapore', tz: 'Asia/Singapore' }, { city: 'London', tz: 'Europe/London' }, { city: 'New York', tz: 'America/New_York' }];
      return { id, timestamp, rawInput: trimmed, commandName: 'timezone', status: 'success', title: 'World Clock', lines: zones.map((z) => `${z.city}: ${new Date().toLocaleTimeString('en-US', { timeZone: z.tz, hour: '2-digit', minute: '2-digit', hour12: false })}`) };
    }

    case 'currency': {
      const amt = parseFloat(args[0] || '');
      const from = (args[1] || 'USD').toUpperCase();
      const to = (args[2] || 'PHP').toUpperCase();
      if (Number.isNaN(amt) || !FX_USD_BASE[from] || !FX_USD_BASE[to]) return { id, timestamp, rawInput: trimmed, commandName: 'currency', status: 'error', title: 'Invalid Pair', lines: [`Example: ${prefix}currency 100 USD PHP`] };
      const converted = (amt / FX_USD_BASE[from]) * FX_USD_BASE[to];
      return { id, timestamp, rawInput: trimmed, commandName: 'currency', status: 'success', title: 'Reference FX Rate', lines: [`${amt.toLocaleString()} ${from} = ${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}`] };
    }

    case 'bmi': {
      const w = parseFloat(args[0] || ''), h = parseFloat(args[1] || '');
      if (Number.isNaN(w) || Number.isNaN(h) || h <= 0) return { id, timestamp, rawInput: trimmed, commandName: 'bmi', status: 'error', title: 'Invalid Args', lines: [`Usage: ${prefix}bmi <kg> <cm>`] };
      const bmi = w / Math.pow(h / 100, 2);
      return { id, timestamp, rawInput: trimmed, commandName: 'bmi', status: 'success', title: `BMI ${bmi.toFixed(1)}`, lines: [bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'] };
    }

    case 'age': {
      const dob = new Date(args[0] || '');
      if (!args[0] || Number.isNaN(dob.getTime())) return { id, timestamp, rawInput: trimmed, commandName: 'age', status: 'error', title: 'Invalid Date', lines: [`Usage: ${prefix}age <YYYY-MM-DD>`] };
      const diff = Date.now() - dob.getTime();
      return { id, timestamp, rawInput: trimmed, commandName: 'age', status: 'success', title: 'Age Calculation', lines: [`${Math.floor(diff / (365.25 * 86400000))} years old (${Math.floor(diff / 86400000).toLocaleString()} days).`] };
    }

    case 'lyrics':
    case 'spotify': {
      const q = argString || 'Midnight City';
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: `${matched.name === 'lyrics' ? 'Lyrics' : 'Track'} · ${q}`, lines: [`Matched "${q}" · 105 BPM · 04:03`] };
    }

    case 'tts': {
      const text = argString || 'Velocity command engine online.';
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch { /* ignore */ }
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'tts', status: 'success', title: 'Speech Synthesis', lines: [`Spoke: "${text}"`] };
    }

    case 'textstats': {
      if (!argString) return { id, timestamp, rawInput: trimmed, commandName: 'textstats', status: 'error', title: 'Missing Text', lines: [`Usage: ${prefix}textstats <text>`] };
      const words = argString.trim().split(/\s+/).length;
      return { id, timestamp, rawInput: trimmed, commandName: 'textstats', status: 'success', title: 'Text Metrics', lines: [`Characters: ${argString.length} · Words: ${words}`] };
    }

    case 'reverse':
      return argString ? { id, timestamp, rawInput: trimmed, commandName: 'reverse', status: 'success', title: 'Reversed String', lines: [argString.split('').reverse().join('')] } : { id, timestamp, rawInput: trimmed, commandName: 'reverse', status: 'error', title: 'Missing Text', lines: [`Usage: ${prefix}reverse <text>`] };

    case 'vaporwave': {
      const text = argString || 'Nadeus Cartel';
      const fw = text.split('').map((c) => (c.charCodeAt(0) === 32 ? '　' : c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126 ? String.fromCharCode(c.charCodeAt(0) + 65248) : c)).join(' ');
      return { id, timestamp, rawInput: trimmed, commandName: 'vaporwave', status: 'success', title: 'Vaporwave Text', lines: [fw] };
    }

    case 'spoiler':
      return argString ? { id, timestamp, rawInput: trimmed, commandName: 'spoiler', status: 'success', title: 'Spoiler Text', lines: [`||${argString}||`] } : { id, timestamp, rawInput: trimmed, commandName: 'spoiler', status: 'error', title: 'Missing Text', lines: [`Usage: ${prefix}spoiler <text>`] };

    case 'poll': {
      const question = args[0] || 'Which deployment schedule works best?';
      const opts = args.slice(1);
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'poll',
        status: 'success',
        title: 'Interactive Channel Poll',
        lines: ['Click an option below to cast a test vote.'],
        pollData: { question, options: (opts.length >= 2 ? opts : ['Tonight 22:00', 'Tomorrow 09:00', 'Weekend']).map((label) => ({ label, votes: 0 })) },
      };
    }

    case '8ball':
      if (!argString) return { id, timestamp, rawInput: trimmed, commandName: '8ball', status: 'error', title: 'Ask a Question', lines: [`Example: ${prefix}8ball Should we ship today?`] };
      return { id, timestamp, rawInput: trimmed, commandName: '8ball', status: 'success', title: 'Oracle Response', lines: [`Q: ${argString}`, `A: ${['Confirmed — indicators point to yes.', 'Likely, proceed with verification.', 'Unclear right now; re-run diagnostics.', 'Definitely yes.'][argString.length % 4]}`] };

    case 'quote':
      return { id, timestamp, rawInput: trimmed, commandName: 'quote', status: 'success', title: 'Engineering Quote', lines: [QUOTES[Math.floor(Math.random() * QUOTES.length)]] };

    case 'choose':
      return args.length >= 2 ? { id, timestamp, rawInput: trimmed, commandName: 'choose', status: 'success', title: 'Random Selection', lines: [`Selected: ${args[Math.floor(Math.random() * args.length)]}`] } : { id, timestamp, rawInput: trimmed, commandName: 'choose', status: 'error', title: 'Need 2+ Options', lines: [`Usage: ${prefix}choose a b c`] };

    case 'roast':
      return { id, timestamp, rawInput: trimmed, commandName: 'roast', status: 'success', title: `Friendly Roast · ${args[0] || '@guest'}`, lines: [`${args[0] || '@guest'} pushes directly to main on Friday at 17:59 and blames DNS.`] };

    case 'compliment':
      return { id, timestamp, rawInput: trimmed, commandName: 'compliment', status: 'success', title: `Shoutout · ${args[0] || '@teammate'}`, lines: [`${args[0] || '@teammate'} keeps the codebase clean, fast, and reliable.`] };

    case 'fact':
      return { id, timestamp, rawInput: trimmed, commandName: 'fact', status: 'success', title: 'Did You Know', lines: [FACTS[Math.floor(Math.random() * FACTS.length)]] };

    case 'ship': {
      const n1 = args[0] || '@nadeus', n2 = args[1] || '@velocity';
      let sum = 0;
      for (const ch of `${n1}:${n2}`.toLowerCase()) sum += ch.charCodeAt(0);
      return { id, timestamp, rawInput: trimmed, commandName: 'ship', status: 'success', title: `Compatibility · ${n1} & ${n2}`, lines: [`Match score: ${(sum % 51) + 50}%`] };
    }

    case 'autoreply': {
      const sub = (args[0] || 'list').toLowerCase();
      if (sub === 'test') {
        const phrase = args.slice(1).join(' ').toLowerCase();
        const hit = ctx.automations.find((a) => a.enabled && a.triggerType === 'Keyword' && phrase.includes(a.pattern.toLowerCase()));
        return { id, timestamp, rawInput: trimmed, commandName: 'autoreply', status: hit ? 'success' : 'warning', title: hit ? `Matched: ${hit.name}` : 'No Match', lines: [hit ? hit.response : 'No active rule matched.'] };
      }
      return { id, timestamp, rawInput: trimmed, commandName: 'autoreply', status: 'success', title: 'Automation Rules', lines: ctx.automations.map((a) => `${a.enabled ? '[ON]' : '[OFF]'} ${a.name} — "${a.pattern}"`) };
    }

    case 'welcome':
      return { id, timestamp, rawInput: trimmed, commandName: 'welcome', status: 'success', title: 'Onboarding Preview', lines: [`Welcome ${args[0] || '@new_member'} to Velocity Operations (${ctx.settings.builderCredit}).`] };

    case 'schedule':
      return { id, timestamp, rawInput: trimmed, commandName: 'schedule', status: 'success', title: 'Broadcast Scheduled', lines: [`Queued in ${args[0] || '30m'}: "${args.slice(1).join(' ') || 'Check-in'}"`] };

    case 'webhook':
      return { id, timestamp, rawInput: trimmed, commandName: 'webhook', status: 'success', title: 'Webhook Check', lines: ['Outbound JSON relay verified (HTTP 200 OK · 12ms).'] };

    case 'alias': {
      const q = (args[0] || '').toLowerCase();
      if (!q) return { id, timestamp, rawInput: trimmed, commandName: 'alias', status: 'success', title: 'Registered Aliases', lines: ctx.commands.slice(0, 10).map((c) => `${prefix}${c.name} -> ${c.aliases.join(', ')}`) };
      const owner = ctx.commands.find((c) => c.name === q || c.aliases.includes(q));
      return { id, timestamp, rawInput: trimmed, commandName: 'alias', status: owner ? 'success' : 'warning', title: 'Alias Lookup', lines: [owner ? `Resolves to ${prefix}${owner.name}` : 'No command claims that alias.'] };
    }

    case 'snipe':
      return { id, timestamp, rawInput: trimmed, commandName: 'snipe', status: 'success', title: 'Deleted Message Snapshot', lines: ['[10:38:12] @guest_04 in #general: "accidentally pasted wrong staging URL"'] };

    case 'afk':
      return { id, timestamp, rawInput: trimmed, commandName: 'afk', status: 'success', title: 'AFK Status Active', lines: [`Auto-reply set: "${argString || 'Away from keyboard'}"`] };

    case 'reminder':
      return { id, timestamp, rawInput: trimmed, commandName: 'reminder', status: 'success', title: 'Reminder Armed', lines: [`Will notify @nadeus in ${args[0] || '15m'}: "${args.slice(1).join(' ') || 'Check logs'}"`] };

    case 'broadcast':
      return { id, timestamp, rawInput: trimmed, commandName: 'broadcast', status: 'success', title: 'Broadcast Dispatched', lines: [`Sent across 4 active channels: "${argString || 'Maintenance complete.'}"`] };

    // TWEET CARD
    case 'tweet': {
      const firstIsHandle = args[0]?.startsWith('@');
      const handle = firstIsHandle ? args[0] : '@nadeus_cartel';
      const displayName = firstIsHandle ? args[0].replace('@', '') : 'Nadeus Cartel';
      const tweetText = (firstIsHandle ? args.slice(1).join(' ') : argString) || 'Velocity v2.0 command engine live — 550+ commands built by Nadeus Cartel.';
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'tweet',
        status: 'success',
        title: `Tweet Card · ${handle}`,
        lines: [tweetText],
        tweetData: {
          displayName,
          handle,
          text: tweetText,
          avatarUrl: ctx.settings.pfpUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          replies: 18 + (tweetText.length % 25),
          reposts: 64 + (tweetText.length % 90),
          likes: 412 + (tweetText.length % 300),
        },
      };
    }

    // MUSIC SUITE
    case 'music':
    case 'songinfo':
    case 'musicsearch':
    case 'singer':
    case 'artist':
    case 'playlist':
    case 'randomsong':
    case 'moodmusic':
    case 'sadmusic':
    case 'opm':
    case 'kpop':
    case 'jpop': {
      const catalog: Record<string, { title: string; artist: string; bpm: number; duration: string; genre: string }[]> = {
        opm: [
          { title: 'Raining in Manila', artist: 'Lola Amour', bpm: 118, duration: '04:41', genre: 'OPM Indie Brass' },
          { title: 'Uhaw', artist: 'Dilaw', bpm: 102, duration: '04:01', genre: 'OPM Alt-Rock' },
          { title: 'Mundo', artist: 'IV of Spades', bpm: 110, duration: '05:49', genre: 'OPM Funk-Rock' },
        ],
        kpop: [
          { title: 'Super Shy', artist: 'NewJeans', bpm: 150, duration: '02:34', genre: 'K-Pop Jersey Club' },
          { title: 'Magnetic', artist: 'ILLIT', bpm: 131, duration: '02:40', genre: 'K-Pop Pluggnb' },
          { title: 'ARMAGEDDON', artist: 'aespa', bpm: 108, duration: '03:16', genre: 'K-Pop Synth-HipHop' },
        ],
        jpop: [
          { title: 'Idol', artist: 'YOASOBI', bpm: 166, duration: '03:33', genre: 'J-Pop Electro' },
          { title: 'Plastic Love', artist: 'Mariya Takeuchi', bpm: 102, duration: '04:53', genre: 'City Pop' },
          { title: 'Night Dancer', artist: 'imase', bpm: 117, duration: '03:30', genre: 'J-Pop Groove' },
        ],
        sadmusic: [
          { title: 'Glimpse of Us', artist: 'Joji', bpm: 85, duration: '03:53', genre: 'Slow Ballad' },
          { title: 'Kathang Isip', artist: 'Ben&Ben', bpm: 78, duration: '05:18', genre: 'OPM Ballad' },
        ],
      };
      const pool = catalog[routeName] || [...catalog.opm, ...catalog.kpop, ...catalog.jpop];
      const track = argString
        ? { title: argString, artist: 'Velocity Audio Queue', bpm: 116 + (argString.length % 25), duration: '03:42', genre: 'On-Demand Stream' }
        : pool[Math.floor(Math.random() * pool.length)];

      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: `Music Player · ${track.title}`,
        lines:
          routeName === 'playlist' || routeName === 'opm' || routeName === 'kpop' || routeName === 'jpop'
            ? pool.map((t, i) => `${i + 1}. ${t.title} — ${t.artist} (${t.duration} · ${t.bpm} BPM)`)
            : [`Now Playing: ${track.title} — ${track.artist}`, `Genre: ${track.genre}`],
        kvPairs: [
          { label: 'Track', value: track.title },
          { label: 'Artist', value: track.artist },
          { label: 'BPM', value: `${track.bpm}` },
          { label: 'Duration', value: track.duration },
        ],
      };
    }

    case 'bass':
    case 'speed':
    case 'volume':
    case 'audiocut':
    case 'audioconvert':
    case 'audioinfo': {
      const val = argString || (routeName === 'bass' ? '+6 dB' : routeName === 'speed' ? '1.25x' : routeName === 'volume' ? '85%' : '320 kbps AAC');
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: `Audio DSP · ${matched.name.toUpperCase()}`,
        lines: [`Applied ${matched.name} parameter: ${val}`],
      };
    }

    case 'musicquiz':
    case 'guesslyrics':
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: 'Music Lyric Challenge',
        lines: [
          'Lyric: "It\'s been raining in Manila, hindi ka ba nilalamig?"',
          'Answer: Raining in Manila — Lola Amour',
        ],
      };

    // FUN & HUMOR PACK
    case 'joke': {
      const jokes = [
        'Why do programmers prefer dark mode? Because light attracts bugs.',
        'A SQL query walks into a bar, walks up to two tables, and asks: "Can I join you?"',
        'There are 10 types of people in the world: those who understand binary and those who don\'t.',
      ];
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: 'Developer Joke', lines: [jokes[Math.floor(Math.random() * jokes.length)]] };
    }

    case 'meme':
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'meme',
        status: 'success',
        title: 'Channel Meme',
        lines: [`Top Text: "${argString || 'WORKS ON MY MACHINE'}"`, 'Bottom Text: "PUSHED DIRECTLY TO PRODUCTION"'],
      };

    case 'truth':
    case 'dare':
    case 'truthordare': {
      const truths = ['What is the funniest bug you shipped to production?', 'What command do you spam the most in group chat?'];
      const dares = ['Send a /tweet declaring Nadeus Cartel reigns supreme.', 'Rename your handle with /nick for 10 minutes.'];
      const pickTruth = routeName === 'truth' || (routeName === 'truthordare' && Math.random() > 0.5);
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: pickTruth ? 'Truth Prompt' : 'Dare Challenge',
        lines: [pickTruth ? truths[Math.floor(Math.random() * truths.length)] : dares[Math.floor(Math.random() * dares.length)]],
      };
    }

    case 'wouldyourather': {
      const dilemmas = [
        'Would you rather have 1ms ping forever OR unlimited AI credits?',
        'Would you rather debug minified JS at 3 AM OR rewrite CSS grids for IE?',
      ];
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: 'Would You Rather', lines: [dilemmas[Math.floor(Math.random() * dilemmas.length)]] };
    }

    case 'neverhaveiever':
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: 'Never Have I Ever', lines: ['Never have I ever accidentally committed an .env file to a public repo.'] };

    case 'riddle':
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: 'Riddle Challenge',
        lines: ['I have keys but no locks, space but no room, and let you enter without going outside. What am I?', 'Answer: A keyboard.'],
      };

    case 'mock':
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'mock',
        status: 'success',
        title: 'Mocking Text',
        lines: [(argString || 'velocity cartel').split('').map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join('')],
      };

    case 'clap':
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'clap',
        status: 'success',
        title: 'Clap Formatter',
        lines: [(argString || 'Built by Nadeus Cartel').trim().split(/\s+/).join(' 👏 ')],
      };

    case 'emojify': {
      const text = (argString || 'velocity').toLowerCase();
      const map: Record<string, string> = { a: '🇦', b: '🇧', c: '🇨', d: '🇩', e: '🇪', f: '🇫', g: '🇬', h: '🇭', i: '🇮', j: '🇯', k: '🇰', l: '🇱', m: '🇲', n: '🇳', o: '🇴', p: '🇵', q: '🇶', r: '🇷', s: '🇸', t: '🇹', u: '🇺', v: '🇻', w: '🇼', x: '🇽', y: '🇾', z: '🇿', ' ': '  ' };
      return { id, timestamp, rawInput: trimmed, commandName: 'emojify', status: 'success', title: 'Emojified Text', lines: [text.split('').map((ch) => map[ch] || ch).join(' ')] };
    }

    case 'emojimix':
      return { id, timestamp, rawInput: trimmed, commandName: 'emojimix', status: 'success', title: 'Emoji Mashup', lines: [`Blended ${args[0] || '🔥'} + ${args[1] || '💀'} -> [${args[0] || '🔥'}⚡${args[1] || '💀'}]`] };

    case 'rate':
    case 'howsmart':
    case 'howcool':
    case 'howlucky':
    case 'howfunny':
    case 'cringe': {
      const subject = argString || '@nadeus';
      let sum = 0;
      for (const ch of `${matched.name}:${subject}`) sum += ch.charCodeAt(0);
      const pct = (sum % 101);
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: `${matched.name.toUpperCase()} Meter`, lines: [`${subject} scored ${pct}% on ${matched.name}!`] };
    }

    case 'advice':
    case 'motivation':
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: matched.name === 'advice' ? 'Daily Advice' : 'Motivation Boost',
        lines: ['Ship small increments often, log every change, and protect your uptime.'],
      };

    case 'pickup':
    case 'insult':
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: matched.name === 'pickup' ? 'Smooth Line' : 'Playful Comeback',
        lines: [
          matched.name === 'pickup'
            ? `${args[0] || 'Hey'}, are you an API endpoint? Because my uptime spikes whenever you respond.`
            : `${args[0] || '@guest'}, your Wi-Fi signal has more stability than that take.`,
        ],
      };

    case 'zodiac': {
      const sign = (args[0] || 'Scorpio').toUpperCase();
      return { id, timestamp, rawInput: trimmed, commandName: 'zodiac', status: 'success', title: `Zodiac Reading · ${sign}`, lines: [`${sign}: High focus today—ideal window for shipping automation workflows.`] };
    }

    case 'personality': {
      const types = ['INTJ Architect', 'ENTP Strategist', 'ISTP Tactician', 'ENFJ Commander'];
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: `Personality · ${args[0] || '@nadeus'}`, lines: [`Matched Archetype: ${types[(argString.length + 1) % types.length]}`] };
    }

    // EXTENDED ECONOMY REWARDS
    case 'weekly':
    case 'monthly':
    case 'bonus':
    case 'collect':
    case 'paycheck':
    case 'interest': {
      const payoutMap: Record<string, number> = {
        weekly: 2000,
        monthly: 5000,
        bonus: 250,
        collect: 180,
        paycheck: 650,
        interest: Math.max(50, Math.round(ctx.economy.bank * 0.02)),
      };
      const amount = payoutMap[matched.name] || 250;
      ctx.updateEconomy((prev) => ({ ...prev, wallet: prev.wallet + amount }));
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: `${matched.name.toUpperCase()} Claimed (+${amount.toLocaleString()} VC)`,
        lines: [`Credited +${amount.toLocaleString()} VC to your wallet.`],
        kvPairs: [{ label: 'Updated Wallet', value: `${(ctx.economy.wallet + amount).toLocaleString()} VC` }],
      };
    }

    case 'sell': {
      if (ctx.economy.inventory.length === 0) {
        return { id, timestamp, rawInput: trimmed, commandName: 'sell', status: 'warning', title: 'Inventory Empty', lines: ['Nothing to sell. Buy items with /shop and /buy.'] };
      }
      const query = argString.toLowerCase();
      const idx = query ? ctx.economy.inventory.findIndex((i) => i.toLowerCase().includes(query)) : 0;
      if (idx === -1) {
        return { id, timestamp, rawInput: trimmed, commandName: 'sell', status: 'error', title: 'Item Not Found', lines: [`Inventory: ${ctx.economy.inventory.join(', ')}`] };
      }
      const item = ctx.economy.inventory[idx];
      const payout = 450;
      ctx.updateEconomy((prev) => ({
        ...prev,
        wallet: prev.wallet + payout,
        inventory: prev.inventory.filter((_, i) => i !== idx),
      }));
      return { id, timestamp, rawInput: trimmed, commandName: 'sell', status: 'success', title: `Sold ${item}`, lines: [`Received +${payout} VC.`] };
    }

    case 'profile':
    case 'level':
    case 'rank':
    case 'exp':
    case 'xp':
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: `Operator Rank · ${args[0] || '@nadeus'}`,
        lines: ['Nadeus Cartel Tier III Operator'],
        kvPairs: [
          { label: 'Level', value: `${Math.max(1, Math.floor((ctx.economy.wallet + ctx.economy.bank) / 1000))}` },
          { label: 'XP', value: `${((ctx.economy.wallet + ctx.economy.bank) * 3).toLocaleString()} XP` },
          { label: 'Wallet', value: `${ctx.economy.wallet.toLocaleString()} VC` },
          { label: 'Streak', value: `${ctx.economy.streak} days` },
        ],
      };

    // BANNER / POSTER / VISUAL CARDS WITH SVG PREVIEW
    case 'wanted':
    case 'rankcard':
    case 'profilecard':
    case 'welcomeimage':
    case 'goodbyeimage':
    case 'achievementcard':
    case 'birthdaycard':
    case 'couplecard':
    case 'friendshipcard':
    case 'beautifulcard':
    case 'marriagecertificate':
    case 'cover':
    case 'glass':
    case 'neon':
    case 'glitch':
    case 'poster':
    case 'logo':
    case 'gradient':
    case 'shadow':
    case 'typography':
    case 'textimage':
    case 'collage':
    case 'wallpaper':
    case 'animewallpaper':
    case 'triggered':
    case 'wasted':
    case 'rip':
    case 'jail':
    case 'passed':
    case 'approved':
    case 'rejected':
    case 'clown': {
      const accentMap: Record<string, string> = {
        triggered: '#DC2626',
        wasted: '#111827',
        rip: '#334155',
        wanted: '#B45309',
        approved: '#059669',
        rejected: '#DC2626',
        neon: '#0284C7',
        animewallpaper: '#4F46E5',
      };
      const titleText = `${matched.name.toUpperCase()}${argString ? ` · ${argString}` : ''}`;
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: `Visual Card · ${matched.name}`,
        lines: [`Rendered ${matched.name} graphic card with SVG download.`],
        bannerData: {
          title: titleText,
          subtitle: `${ctx.settings.botName} · ${ctx.settings.builderCredit}`,
          accent: accentMap[matched.name] || '#2563EB',
          showAvatar: true,
          avatarUrl: ctx.settings.pfpUrl,
        },
      };
    }

    // ANIME SUITE
    case 'anime':
    case 'manga':
    case 'waifu':
    case 'husbando':
    case 'animecharacter':
    case 'characterinfo':
    case 'animeinfo': {
      const pick = argString || (matched.name.includes('waifu') ? 'Mikasa Ackerman' : matched.name.includes('husbando') ? 'Levi Ackerman' : 'Solo Leveling');
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: `Anime Archive · ${pick}`,
        lines: [`Spotlight entry retrieved for "${pick}".`],
        kvPairs: [
          { label: 'Entry', value: pick },
          { label: 'Rating', value: '9.1 / 10' },
          { label: 'Status', value: 'Verified Archive' },
        ],
      };
    }

    case 'animequote':
      return { id, timestamp, rawInput: trimmed, commandName: 'animequote', status: 'success', title: 'Anime Quote', lines: ['"Arise." — Sung Jin-Woo, Solo Leveling'] };

    case 'animefact':
      return { id, timestamp, rawInput: trimmed, commandName: 'animefact', status: 'success', title: 'Anime Trivia Fact', lines: ['Studio ufotable and A-1 Pictures regularly use 3D camera rigs blended with 2D sakuga keyframes.'] };

    case 'animequiz':
    case 'guessanime':
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: 'Anime Trivia Quiz', lines: ['Clue: A hunter levels up alone via a mysterious System.', 'Answer: Solo Leveling'] };

    // EXTENDED GAMES & QUIZZES
    case 'mathquiz': {
      const a = 12 + Math.floor(Math.random() * 40);
      const b = 7 + Math.floor(Math.random() * 25);
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: 'Quick Math Sprint', lines: [`Solve: ${a} × ${b} + 15`, `Answer: ${a * b + 15}`] };
    }

    case 'guessnumber': {
      const guess = parseInt(args[0] || '', 10);
      const target = 1 + Math.floor(Math.random() * 100);
      if (!Number.isNaN(guess)) {
        const diff = Math.abs(guess - target);
        return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: guess === target ? 'success' : 'warning', title: `Guess Number (Target: ${target})`, lines: [guess === target ? 'Exact bullseye!' : `You guessed ${guess} (off by ${diff}).`] };
      }
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: 'Number Guess Ready', lines: [`Pass a number 1-100: ${prefix}guessnumber 42`] };
    }

    case 'wordle': {
      const secret = 'CODES';
      const guess = (args[0] || 'CLOUD').toUpperCase().slice(0, 5);
      const feedback = guess.split('').map((ch, idx) => (ch === secret[idx] ? '🟩' : secret.includes(ch) ? '🟨' : '⬛')).join('');
      return { id, timestamp, rawInput: trimmed, commandName: 'wordle', status: 'success', title: `Wordle · ${guess}`, lines: [`Result: ${feedback}`, `Secret word: ${secret}`] };
    }

    case 'hangman':
      return { id, timestamp, rawInput: trimmed, commandName: 'hangman', status: 'success', title: 'Hangman Round', lines: ['Mask: V _ L _ C _ T _', 'Hint: Name of this bot engine (8 letters)'] };

    case 'guessflag':
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: 'Flag Quiz', lines: ['Flag: 🇵🇭', 'Answer: Philippines'] };

    case 'guesscapital':
    case 'guesscountry':
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: 'Geography Quiz', lines: ['Question: What is the capital of Japan?', 'Answer: Tokyo'] };

    // LIVE WORKSPACE SYSTEM & GODMODE COMMANDS
    case 'commandsearch': {
      const q = argString.toLowerCase();
      const hits = ctx.commands.filter((c) => !q || c.name.includes(q) || c.category.toLowerCase().includes(q)).slice(0, 20);
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'commandsearch',
        status: 'success',
        title: `Search Results (${hits.length} shown)`,
        lines: hits.length ? hits.map((c) => `${prefix}${c.name} [${c.category}] — ${c.description}`) : ['No matching commands found.'],
      };
    }

    case 'commandinfo': {
      const q = (args[0] || 'help').toLowerCase();
      const found = ctx.commands.find((c) => c.name === q);
      return found
        ? { id, timestamp, rawInput: trimmed, commandName: 'commandinfo', status: 'success', title: `Command Info · ${prefix}${found.name}`, lines: [found.description], kvPairs: [{ label: 'Category', value: found.category }, { label: 'Role', value: found.permission }, { label: 'Cooldown', value: `${found.cooldownSec}s` }] }
        : { id, timestamp, rawInput: trimmed, commandName: 'commandinfo', status: 'error', title: 'Command Not Found', lines: [`No command named "${q}".`] };
    }

    case 'commandlist':
    case 'commandcategory': {
      const cat = args[0]?.toLowerCase();
      const list = cat ? ctx.commands.filter((c) => c.category.toLowerCase() === cat) : ctx.commands.slice(0, 30);
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: `${cat ? cat.toUpperCase() : 'Featured'} Commands (${list.length})`,
        lines: [list.map((c) => `${prefix}${c.name}`).join(', ')],
      };
    }

    case 'customtheme': {
      const nextTheme = args[0]?.toLowerCase() === 'light' ? 'light' : 'dark';
      ctx.updateSettings({ theme: nextTheme });
      return { id, timestamp, rawInput: trimmed, commandName: 'customtheme', status: 'success', title: `Theme Switched to ${nextTheme.toUpperCase()}`, lines: ['Updated workspace appearance immediately.'] };
    }

    case 'customname': {
      if (!argString) return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'error', title: 'Name Required', lines: [`Usage: ${prefix}${matched.name} <new_name>`] };
      ctx.updateSettings({ botName: argString });
      return { id, timestamp, rawInput: trimmed, commandName: matched.name, status: 'success', title: 'Bot Name Updated', lines: [`Display name updated to "${argString}".`] };
    }

    case 'maintenance': {
      const on = (args[0] || '').toLowerCase() === 'on';
      ctx.updateSettings({ maintenanceMode: on });
      return { id, timestamp, rawInput: trimmed, commandName: 'maintenance', status: 'success', title: `Maintenance Mode ${on ? 'Enabled' : 'Disabled'}`, lines: [on ? 'Member commands paused for non-Owners.' : 'All commands unlocked.'] };
    }

    case 'godmode': {
      const state = (args[0] || 'on').toLowerCase() !== 'off';
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: 'godmode',
        status: 'success',
        title: `GODMODE ${state ? 'ACTIVE' : 'STANDBY'}`,
        lines: [
          state
            ? `Owner override active across ${ctx.commands.length} Velocity commands — zero cooldown limits.`
            : 'Standard permission and cooldown checks restored.',
        ],
        kvPairs: [
          { label: 'Authority', value: 'Nadeus Cartel Owner' },
          { label: 'Commands', value: `${ctx.commands.length} unlocked` },
        ],
      };
    }

    default: {
      const target = argString || '@nadeus';
      return {
        id,
        timestamp,
        rawInput: trimmed,
        commandName: matched.name,
        status: 'success',
        title: `${matched.category} · ${prefix}${matched.name}`,
        lines: [
          matched.description,
          argString ? `Applied to: ${target}` : `Syntax: ${prefix}${matched.usage}`,
        ],
        kvPairs: [
          { label: 'Module', value: matched.category },
          { label: 'Permission', value: matched.permission },
          { label: 'Cooldown', value: `${matched.cooldownSec}s` },
        ],
      };
    }
  }
}
