export interface Feed {
  url: string;
  title: string;
  link: string;
  author: string;
  description: string;
  image: string;
  userId?: string; // Owner
}

export interface Folder {
  id: string;
  name: string;
  feedUrls: string[];
  isExpanded: boolean;
  userId?: string; // Owner
}

export interface Article {
  guid: string;
  title: string;
  pubDate: string;
  link: string;
  author: string;
  thumbnail: string;
  description: string;
  content: string;
  feedTitle: string; // Enriched field
  feedUrl: string;   // Enriched field
}

// --- NEW BOOKMARK TYPES ---

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  folderId?: string; // Optional folder link
  isUnread: boolean;
  notes: string;
  createdAt: string; // ISO String
  userId?: string; // Owner ID for Supabase RLS
}

export interface BookmarkFolder {
  id: string;
  name: string;
  userId?: string;
}

// --------------------------

export interface User {
  id: string;
  email: string;
  aud: string;
}

export interface FeedState {
  feeds: Feed[];
  articles: Article[];
  isLoading: boolean;
  error: string | null;
}

export type ViewMode = 'list' | 'card' | 'magazine' | 'expanded';
export type AppMode = 'reader' | 'bookmarks';

export enum FilterType {
  ALL = 'ALL',
  UNREAD = 'UNREAD',
  STARRED = 'STARRED',
  FEED = 'FEED',
  HISTORY = 'HISTORY',
  FOLDER = 'FOLDER',
  // Bookmark specific
  TAG = 'TAG',
  ON_THIS_DAY = 'ON_THIS_DAY'
}

export type Theme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type FontFamily = 'sans' | 'serif' | 'mono';

export interface SupabaseColumnMapping {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string;
  createdAt: string;
  notes: string;
  isUnread: string;
}

export interface SupabaseConfig {
  url: string;
  key: string;
  tableName: string;
  mapping?: SupabaseColumnMapping;
}

export interface AppSettings {
  theme: Theme;
  fontSize: FontSize;
  fontFamily: FontFamily;
  defaultViewMode: ViewMode;
  defaultAppMode: AppMode;
  appPassword?: string; 
  supabaseConfig?: SupabaseConfig;
}

export interface SyncData {
  feeds: Feed[];
  folders: Folder[];
  starredArticleIds: string[];
  readArticleIds: string[];
  // New Sync Fields
  bookmarks: Bookmark[];
  bookmarkFolders: BookmarkFolder[];
  lastUpdated: string;
}