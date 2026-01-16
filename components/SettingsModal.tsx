
import React, { useRef, useState } from 'react';
import { X, LayoutList, Download, Upload, Loader2, Copy, LogOut, RefreshCw, Database, User, CreditCard, FileText, Bookmark, Rss, Sun, Moon, Type, CloudDownload, CloudUpload, Table, FileCode, DatabaseZap } from 'lucide-react';
import { AppSettings, Bookmark as BookmarkType } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onExportOpml: () => void;
  onImportOpml: (file: File) => Promise<void>;
  isImporting: boolean;
  onExportData?: (format: 'csv' | 'xml' | 'sql') => void;
  onPushData?: () => Promise<void>;
  onPullData?: () => Promise<void>;
  session?: any;
  onLogout?: () => void;
  onForceSync?: () => Promise<void>;
}

type SettingsTab = 'reader' | 'account' | 'exports';

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, settings, onUpdateSettings, onExportOpml, onImportOpml, isImporting, session, onLogout, onForceSync, onExportData, onPushData, onPullData
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('reader');
  const [copiedSql, setCopiedSql] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  if (!isOpen) return null;

  const generateSchemaSql = () => {
      const bTable = settings.supabaseConfig?.tableName || 'bookmarks';
      return `-- Emyn Reader Cloud Schema (v2 - Migration Safe)
-- Run this in your Supabase SQL Editor!

-- 1. Create Tables if they don't exist
create table if not exists public.feeds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  url text not null,
  title text,
  link text,
  image text,
  unique(user_id, url)
);

create table if not exists public.folders (
  id text primary key,
  user_id uuid references auth.users not null,
  name text,
  feed_urls text[],
  is_expanded boolean default true
);

create table if not exists public.bookmark_folders (
  id text primary key,
  user_id uuid references auth.users not null,
  name text
);

create table if not exists public.article_states (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  article_guid text not null,
  is_read boolean default false,
  is_starred boolean default false,
  unique(user_id, article_guid)
);

create table if not exists public.${bTable} (
  id text primary key,
  user_id uuid references auth.users not null,
  url text,
  title text,
  description text,
  tags text[],
  folder_id text,
  is_unread boolean default true,
  notes text
);

-- 2. Migrations: Add missing columns to existing tables if needed
do $$
begin
  -- Add folder_id to bookmarks if missing
  if not exists (select 1 from information_schema.columns where table_name = '${bTable}' and column_name = 'folder_id') then
    alter table public.${bTable} add column folder_id text;
  end if;
end $$;

-- 3. Security Policies (RLS)
alter table public.feeds enable row level security;
alter table public.folders enable row level security;
alter table public.bookmark_folders enable row level security;
alter table public.article_states enable row level security;
alter table public.${bTable} enable row level security;

-- Drop existing policies to avoid conflicts on re-run
drop policy if exists "Manage own feeds" on public.feeds;
drop policy if exists "Manage own folders" on public.folders;
drop policy if exists "Manage own bookmark folders" on public.bookmark_folders;
drop policy if exists "Manage own states" on public.article_states;
drop policy if exists "Manage own bookmarks" on public.${bTable};

-- Re-create policies
create policy "Manage own feeds" on public.feeds for all using (auth.uid() = user_id);
create policy "Manage own folders" on public.folders for all using (auth.uid() = user_id);
create policy "Manage own bookmark folders" on public.bookmark_folders for all using (auth.uid() = user_id);
create policy "Manage own states" on public.article_states for all using (auth.uid() = user_id);
create policy "Manage own bookmarks" on public.${bTable} for all using (auth.uid() = user_id);

-- 4. Permissions
grant all on all tables in schema public to anon, authenticated, service_role;`;
  };

  const TabButton = ({ id, label }: { id: SettingsTab, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)} 
      className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all rounded-none ${activeTab === id ? 'border-blue-600 text-blue-800 dark:text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
    >
      {label}
    </button>
  );

  const SectionLabel = ({ children }: any) => (
    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">{children}</label>
  );

  const ControlButton = ({ active, onClick, children, icon: Icon }: any) => (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center py-2.5 px-3 border rounded-none text-[11px] font-bold transition-all ${active ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300 shadow-sm' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50'}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 mr-2" />}
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans">
      <div className="bg-white dark:bg-slate-900 shadow-2xl max-w-[440px] w-full border border-gray-200 dark:border-slate-800 flex flex-col max-h-[95vh] rounded-none">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center rounded-none">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 rounded-none">
          <TabButton id="reader" label="Reader" />
          <TabButton id="account" label="Account" />
          <TabButton id="exports" label="Exports" />
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto">
          
          {activeTab === 'reader' && (
            <div className="space-y-7 animate-in fade-in duration-200">
                <div>
                    <SectionLabel>Start Page</SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                        <ControlButton active={settings.defaultAppMode === 'reader'} onClick={() => onUpdateSettings({ defaultAppMode: 'reader' })} icon={Rss}>Reader</ControlButton>
                        <ControlButton active={settings.defaultAppMode === 'bookmarks'} onClick={() => onUpdateSettings({ defaultAppMode: 'bookmarks' })} icon={Bookmark}>Bookmarks</ControlButton>
                    </div>
                </div>

                <div>
                    <SectionLabel>Theme</SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                        <ControlButton active={settings.theme === 'light'} onClick={() => onUpdateSettings({ theme: 'light' })} icon={Sun}>Light</ControlButton>
                        <ControlButton active={settings.theme === 'dark'} onClick={() => onUpdateSettings({ theme: 'dark' })} icon={Moon}>Dark</ControlButton>
                    </div>
                </div>

                <div>
                    <SectionLabel>Default View</SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                        <ControlButton active={settings.defaultViewMode === 'card'} onClick={() => onUpdateSettings({ defaultViewMode: 'card' })} icon={LayoutList}>Card List</ControlButton>
                        <ControlButton active={settings.defaultViewMode === 'expanded'} onClick={() => onUpdateSettings({ defaultViewMode: 'expanded' })} icon={FileText}>Expanded</ControlButton>
                    </div>
                </div>

                <div>
                    <SectionLabel>Font Family</SectionLabel>
                    <div className="grid grid-cols-3 gap-3">
                        <ControlButton active={settings.fontFamily === 'sans'} onClick={() => onUpdateSettings({ fontFamily: 'sans' })}>Sans</ControlButton>
                        <ControlButton active={settings.fontFamily === 'serif'} onClick={() => onUpdateSettings({ fontFamily: 'serif' })}>Georgia</ControlButton>
                        <ControlButton active={settings.fontFamily === 'mono'} onClick={() => onUpdateSettings({ fontFamily: 'mono' })}>Mono</ControlButton>
                    </div>
                </div>

                <div>
                    <SectionLabel>Font Size</SectionLabel>
                    <div className="grid grid-cols-4 gap-3">
                        {['small', 'medium', 'large', 'xlarge'].map(sz => (
                            <ControlButton key={sz} active={settings.fontSize === sz} onClick={() => onUpdateSettings({ fontSize: sz as any })}>{sz === 'xlarge' ? 'XL' : sz.charAt(0).toUpperCase() + sz.slice(1)}</ControlButton>
                        ))}
                    </div>
                </div>

                <div className="pt-2">
                    <SectionLabel>Manual Import/Export (OPML)</SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                        <ControlButton onClick={onExportOpml} icon={Download}>Export</ControlButton>
                        <ControlButton onClick={() => fileInputRef.current?.click()} icon={Upload}>
                            {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Import'}
                        </ControlButton>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".opml,.xml" onChange={(e) => { const f = e.target.files?.[0]; if(f) onImportOpml(f); }} />
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                    <SectionLabel><div className="flex items-center"><User className="w-3 h-3 mr-2" /> User Session</div></SectionLabel>
                    {session ? (
                        <div className="bg-green-50 dark:bg-green-900/10 p-5 border border-green-100 dark:border-green-900/30 rounded-none">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-200 flex items-center justify-center font-bold text-sm rounded-none">
                                        {session.user.email?.[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{session.user.email}</div>
                                        <div className="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-tighter flex items-center">
                                            <RefreshCw className="w-2.5 h-2.5 mr-1" /> Connected to Cloud
                                        </div>
                                    </div>
                                </div>
                                <button onClick={onForceSync} className="p-2 text-blue-600 hover:bg-white/50 rounded-none transition-colors"><RefreshCw className="w-4 h-4" /></button>
                            </div>
                            <button onClick={onLogout} className="w-full py-2.5 bg-white dark:bg-slate-800 border border-green-200 dark:border-slate-700 text-[11px] font-bold text-green-800 dark:text-green-300 hover:bg-green-50 transition-colors flex items-center justify-center rounded-none">
                                <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
                            </button>
                        </div>
                    ) : (
                        <div className="p-10 text-center border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 rounded-none">
                            Not logged in. Use the Login screen to connect.
                        </div>
                    )}
                </div>

                <div>
                    <SectionLabel><div className="flex items-center"><DatabaseZap className="w-3 h-3 mr-2" /> System Admin</div></SectionLabel>
                    <div className="bg-blue-50 dark:bg-blue-900/5 p-4 border border-blue-100 dark:border-blue-900/20 rounded-none">
                        <p className="text-[10px] text-blue-800 dark:text-blue-300 mb-4 font-medium leading-relaxed">If this is a new installation, copy and execute the schema in your Supabase SQL Editor.</p>
                        <button 
                            onClick={() => { navigator.clipboard.writeText(generateSchemaSql()); setCopiedSql(true); setTimeout(() => setCopiedSql(false), 2000); }} 
                            className="w-full py-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center rounded-none"
                        >
                            <Copy className="w-3.5 h-3.5 mr-2" /> {copiedSql ? 'SQL Copied!' : 'Copy Setup SQL'}
                        </button>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'exports' && (
            <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                    <SectionLabel>Export Bookmarks</SectionLabel>
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => onExportData?.('csv')} className="flex flex-col items-center justify-center py-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group rounded-none">
                            <Table className="w-6 h-6 text-green-600 mb-2 transition-transform group-hover:scale-110" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CSV</span>
                        </button>
                        <button onClick={() => onExportData?.('xml')} className="flex flex-col items-center justify-center py-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group rounded-none">
                            <FileCode className="w-6 h-6 text-orange-600 mb-2 transition-transform group-hover:scale-110" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">XML</span>
                        </button>
                        <button onClick={() => onExportData?.('sql')} className="flex flex-col items-center justify-center py-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group rounded-none">
                            <Database className="w-6 h-6 text-blue-600 mb-2 transition-transform group-hover:scale-110" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SQL</span>
                        </button>
                    </div>
                </div>

                <div>
                    <SectionLabel>Cloud Sync Actions</SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            disabled={isActionLoading}
                            onClick={async () => { setIsActionLoading(true); await onPullData?.(); setIsActionLoading(false); }}
                            className="flex flex-col items-center justify-center py-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group disabled:opacity-50 rounded-none"
                        >
                            <CloudDownload className="w-6 h-6 text-green-600 mb-2 transition-transform group-hover:scale-110" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pull (Import)</span>
                        </button>
                        <button 
                            disabled={isActionLoading}
                            onClick={async () => { if(confirm("This will overwrite cloud data with local data. Proceed?")) { setIsActionLoading(true); await onPushData?.(); setIsActionLoading(false); } }}
                            className="flex flex-col items-center justify-center py-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group disabled:opacity-50 rounded-none"
                        >
                            <CloudUpload className="w-6 h-6 text-orange-600 mb-2 transition-transform group-hover:scale-110" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Push (Export)</span>
                        </button>
                    </div>
                </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 text-center rounded-none">
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Emyn Reader System v1.5.0</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
