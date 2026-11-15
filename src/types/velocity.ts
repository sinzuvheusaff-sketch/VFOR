export type CommandCategory =
  | 'Core'
  | 'AI'
  | 'Banners'
  | 'Video'
  | 'Music'
  | 'Anime'
  | 'Games'
  | 'Social'
  | 'Moderation'
  | 'Economy'
  | 'Utility'
  | 'Developer'
  | 'Security'
  | 'Information'
  | 'Media'
  | 'Fun'
  | 'Automation';

export type PermissionLevel = 'Everyone' | 'Moderator' | 'Admin' | 'Owner';

export type NavSection =
  | 'overview'
  | 'commands'
  | 'runner'
  | 'c3c'
  | 'owners'
  | 'automations'
  | 'channels'
  | 'logs'
  | 'settings';

export interface BotAdminEntry {
  id: string;
  uid: string;
  label: string;
  role: 'Owner' | 'Admin';
  addedAt: string;
}

export interface C3CSession {
  appStateJson: string;
  detectedUid: string | null;
  cookieCount: number;
  hasXsCookie: boolean;
  connected: boolean;
  updatedAt: string | null;
}

export type DashboardWidgetId =
  | 'kpi-summary'
  | 'weekly-volume'
  | 'top-commands'
  | 'quick-terminal'
  | 'recent-feed'
  | 'category-breakdown'
  | 'economy-vault'
  | 'channel-pulse';

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  enabled: boolean;
  span: 'half' | 'full';
}

export interface WidgetDefinition {
  id: DashboardWidgetId;
  title: string;
  description: string;
  defaultSpan: 'half' | 'full';
  allowResize: boolean;
}

export interface VelocityCommand {
  id: string;
  name: string;
  aliases: string[];
  category: CommandCategory;
  description: string;
  usage: string;
  examples: string[];
  permission: PermissionLevel;
  cooldownSec: number;
  enabled: boolean;
  executions: number;
  lastUsed: string;
  isCustom?: boolean;
  responseTemplate?: string;
}

export interface CommandExecutionLog {
  id: string;
  commandName: string;
  rawInput: string;
  category: CommandCategory;
  actor: string;
  channel: string;
  durationMs: number;
  outcome: 'Completed' | 'Blocked' | 'Error';
  timestamp: string;
  outputSummary: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  triggerType: 'Keyword' | 'Schedule' | 'JoinEvent';
  pattern: string;
  matchMode: 'Exact' | 'Contains' | 'StartsWith';
  response: string;
  channelScope: string;
  enabled: boolean;
  hits: number;
}

export interface ChannelConfig {
  id: string;
  name: string;
  platform: 'Discord' | 'Messenger' | 'Telegram';
  memberCount: number;
  moderationLevel: 'Standard' | 'Strict' | 'Relaxed';
  active: boolean;
  commandsToday: number;
}

export interface EconomyState {
  wallet: number;
  bank: number;
  streak: number;
  lastDailyTimestamp: number;
  inventory: string[];
}

export interface BotSettings {
  botName: string;
  builderCredit: string;
  prefix: string;
  defaultCooldownSec: number;
  maintenanceMode: boolean;
  auditLogging: boolean;
  theme: 'dark' | 'light';
  pfpUrl: string;
}

export interface PollOption {
  label: string;
  votes: number;
}

export interface BannerCardData {
  title: string;
  subtitle: string;
  accent: string;
  showAvatar?: boolean;
  avatarUrl?: string;
}

export interface TweetCardData {
  displayName: string;
  handle: string;
  text: string;
  avatarUrl?: string;
  timestamp: string;
  replies: number;
  reposts: number;
  likes: number;
}

export interface VideoDownloadData {
  sourceUrl: string;
  platform: string;
  videoId: string;
  title: string;
  duration: string;
  thumbnailUrl?: string;
  formats: { label: string; size: string; codec: string }[];
}

export interface TicTacToeData {
  board: ('' | 'X' | 'O')[];
  status: 'playing' | 'win' | 'lose' | 'draw';
}

export interface ConsoleEntry {
  id: string;
  timestamp: string;
  rawInput: string;
  commandName: string;
  status: 'success' | 'error' | 'warning';
  title: string;
  lines: string[];
  qrMatrix?: boolean[][];
  pollData?: {
    question: string;
    options: PollOption[];
  };
  bannerData?: BannerCardData;
  tweetData?: TweetCardData;
  videoData?: VideoDownloadData;
  tictactoeData?: TicTacToeData;
  kvPairs?: { label: string; value: string }[];
}
