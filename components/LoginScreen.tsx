
import React, { useState } from 'react';
import { Asterisk, AlertCircle, Loader2, Copy, Database, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { getSupabase } from '../services/supabaseService';
import { SupabaseConfig } from '../types';

interface LoginScreenProps {
  onLoginSupabase: (session: any, config: SupabaseConfig) => void;
  savedSupabaseConfig?: SupabaseConfig;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSupabase, savedSupabaseConfig }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showSetup, setShowSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const generateSchemaSql = () => {
      const bTable = savedSupabaseConfig?.tableName || 'bookmarks';
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

  const handleCopySql = () => {
    navigator.clipboard.writeText(generateSchemaSql());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const config = savedSupabaseConfig;
      if (!config || !config.url || !config.key) {
          setError("Configuration error: Credentials missing.");
          return;
      }
      setIsLoading(true);
      try {
          const supabase = getSupabase(config.url, config.key);
          let result;
          if (authMode === 'signup') result = await supabase.auth.signUp({ email, password });
          else result = await supabase.auth.signInWithPassword({ email, password });
          if (result.error) throw result.error;
          if (result.data.session) onLoginSupabase(result.data.session, config);
          else if (authMode === 'signup' && result.data.user) {
             setError('Account created! Please check your email.');
             setAuthMode('signin');
          }
      } catch (err: any) {
          setError(err.message || 'Authentication failed');
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-aol-header flex flex-col items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="w-full max-w-[400px] my-8">
        
        {/* Brand Logo - Simple & Direct */}
        <div className="text-center mb-10 flex flex-col items-center">
           <div className="flex items-center space-x-2 mb-2">
             <Asterisk className="w-12 h-12 text-white" strokeWidth={3} />
             <div className="w-8 h-8 bg-yellow-400 rounded-none"></div>
           </div>
           <h1 className="text-5xl font-black text-white mb-1 tracking-tighter uppercase">Emyn</h1>
           <p className="text-blue-300 text-xs font-black uppercase tracking-[0.4em]">Reader</p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden rounded-none">
            <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="flex items-start text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-3 border border-red-100 dark:border-red-900/30 rounded-none">
                            <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 outline-none text-sm focus:border-blue-500 dark:text-white transition-all rounded-none"
                            placeholder="mail@example.com"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 outline-none text-sm focus:border-blue-500 dark:text-white transition-all rounded-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="w-full flex items-center justify-center py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-lg disabled:opacity-70 transform active:scale-[0.98] rounded-none"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'signin' ? 'LOG IN' : 'CREATE ACCOUNT')}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
                    <button 
                        type="button" 
                        onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setError(null); }}
                        className="text-[10px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-bold uppercase tracking-widest transition-colors"
                    >
                        {authMode === 'signin' ? "Need an account? Sign Up" : "Back to Log In"}
                    </button>
                </div>
            </div>

            {/* Admin/Setup Area */}
            <div className="bg-slate-50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 p-4">
                <button 
                    onClick={() => setShowSetup(!showSetup)}
                    className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-2"
                >
                    <div className="flex items-center">
                        <Database className="w-3 h-3 mr-2" />
                        Initial Cloud Setup
                    </div>
                    {showSetup ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                
                {showSetup && (
                    <div className="mt-4 px-2 pb-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        
                        {/* Configuration Notice */}
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-3 rounded-none">
                             <div className="flex items-center text-[10px] font-black text-yellow-700 dark:text-yellow-500 uppercase tracking-widest mb-2">
                                 <Terminal className="w-3 h-3 mr-2" /> Self-Hosting Config
                             </div>
                             <p className="text-[10px] text-yellow-800 dark:text-yellow-400 leading-relaxed mb-2">
                                 Bei Verwendung des öffentlichen Repositories müssen in <span className="font-bold font-mono">App.tsx</span> diese Platzhalter ersetzt werden:
                             </p>
                             <ul className="space-y-1">
                                 <li className="flex justify-between items-center bg-white dark:bg-slate-900 px-2 py-1 border border-yellow-100 dark:border-yellow-900/30 text-[9px] font-mono text-slate-500">
                                     <span className="font-bold">URL</span>
                                     <span className="select-all">https://placeholder.supabase.co</span>
                                 </li>
                                 <li className="flex justify-between items-center bg-white dark:bg-slate-900 px-2 py-1 border border-yellow-100 dark:border-yellow-900/30 text-[9px] font-mono text-slate-500">
                                     <span className="font-bold">KEY</span>
                                     <span className="select-all">anon-public-placeholderapi</span>
                                 </li>
                             </ul>
                        </div>

                        {/* SQL Script Section */}
                        <div>
                            <p className="text-[10px] text-slate-500 leading-relaxed mb-2 px-1">
                                Copy and execute this script in your Supabase SQL Editor to prepare your database.
                            </p>
                            <button 
                                onClick={handleCopySql}
                                className={`w-full flex flex-col items-center justify-center py-3 border-2 border-dashed transition-all rounded-none ${copiedSql ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-600 hover:border-blue-400 hover:text-blue-600'}`}
                            >
                                <div className="flex items-center text-xs font-bold">
                                    <Copy className="w-3.5 h-3.5 mr-2" />
                                    {copiedSql ? 'SQL Script Copied!' : 'Copy SQL Script'}
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        <p className="text-center mt-12 text-[10px] text-blue-400/50 font-bold uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} Emyn Reader
        </p>

      </div>
    </div>
  );
};

export default LoginScreen;
