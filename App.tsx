
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Menu, RefreshCw, Plus, List, Settings, Search, Home, Star, ChevronDown, Check, Eye, CreditCard, FileText, Wrench, Bookmark as BookmarkIcon, Asterisk, User, Loader2, Rss } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ArticleList from './components/ArticleList';
import ArticleDetail from './components/ArticleDetail';
import AddFeedModal from './components/AddFeedModal';
import SettingsModal from './components/SettingsModal';
import LoginScreen from './components/LoginScreen';
import BookmarkSidebar from './components/Bookmarks/BookmarkSidebar';
import BookmarkList from './components/Bookmarks/BookmarkList';
import AddBookmarkModal from './components/Bookmarks/AddBookmarkModal';
import BookmarkDetail from './components/Bookmarks/BookmarkDetail';

import { fetchFeed, normalizeUrl } from './services/feedService';
import { Article, Feed, FilterType, ViewMode, Folder as FolderType, AppSettings, Bookmark, BookmarkFolder, SupabaseConfig, AppMode } from './types';
import { INITIAL_FEEDS, INITIAL_FOLDERS } from './constants';
import { getSupabase } from './services/supabaseService';

const App: React.FC = () => {
  const loadFromStorage = <T,>(key: string, def: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : def;
    } catch { return def; }
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaults: AppSettings = {
        theme: 'light',
        fontSize: 'medium',
        fontFamily: 'sans',
        defaultViewMode: 'card',
        defaultAppMode: 'reader',
        supabaseConfig: {
            url: 'https://placeholder.supabase.co',
            key: 'anon-public-placeholderapi',
            tableName: 'bookmarks'
        }
    };
    const saved = loadFromStorage<AppSettings | null>('appSettings', null);
    if (saved) {
        return { ...defaults, ...saved, supabaseConfig: saved.supabaseConfig || defaults.supabaseConfig };
    }
    return defaults;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [session, setSession] = useState<any>(null);

  const [feeds, setFeeds] = useState<Feed[]>(() => loadFromStorage('feeds', []));
  const [folders, setFolders] = useState<FolderType[]>(() => loadFromStorage('folders', INITIAL_FOLDERS));
  // Store interaction scores for feeds (url -> score)
  const [feedScores, setFeedScores] = useState<Record<string, number>>(() => loadFromStorage('feedScores', {}));

  const [articles, setArticles] = useState<Article[]>([]); 
  const [readArticleIds, setReadArticleIds] = useState<Set<string>>(() => new Set(loadFromStorage<string[]>('readIds', [])));
  const [starredArticleIds, setStarredArticleIds] = useState<Set<string>>(() => new Set(loadFromStorage<string[]>('starredIds', [])));
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadFromStorage('bookmarks', []));
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>(() => loadFromStorage('bookmarkFolders', []));

  const [appMode, setAppMode] = useState<AppMode>(settings.defaultAppMode || 'reader');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFeedUrls, setLoadingFeedUrls] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); 
  const [selectedTag, setSelectedTag] = useState<string | null>(null); 
  const [filterType, setFilterType] = useState<FilterType>(FilterType.ALL);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultViewMode);

  // Debounce helper for storage
  const useDebouncedEffect = (effect: () => void, deps: any[], delay: number) => {
      useEffect(() => {
          const handler = setTimeout(() => effect(), delay);
          return () => clearTimeout(handler);
      }, [...deps, delay]);
  };

  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Optimized Storage Writes
  useDebouncedEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings], 500);
  useDebouncedEffect(() => { localStorage.setItem('feeds', JSON.stringify(feeds)); }, [feeds], 500);
  useDebouncedEffect(() => { localStorage.setItem('folders', JSON.stringify(folders)); }, [folders], 500);
  useDebouncedEffect(() => { localStorage.setItem('feedScores', JSON.stringify(feedScores)); }, [feedScores], 500);
  useDebouncedEffect(() => { localStorage.setItem('readIds', JSON.stringify(Array.from(readArticleIds))); }, [readArticleIds], 1000); // 1s delay for read IDs is fine
  useDebouncedEffect(() => { localStorage.setItem('starredIds', JSON.stringify(Array.from(starredArticleIds))); }, [starredArticleIds], 500);
  useDebouncedEffect(() => { localStorage.setItem('bookmarks', JSON.stringify(bookmarks)); }, [bookmarks], 500);
  useDebouncedEffect(() => { localStorage.setItem('bookmarkFolders', JSON.stringify(bookmarkFolders)); }, [bookmarkFolders], 500);

  useEffect(() => {
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.theme]);

  useEffect(() => {
      if (mainScrollRef.current) {
          mainScrollRef.current.scrollTop = 0;
      }
  }, [selectedFeedId, selectedFolderId, filterType, appMode]);

  const fetchCloudData = async (sb: any, tableName: string) => {
    const [{ data: rFeeds }, { data: rFolders }, { data: rBookmarks }, { data: rStates }, { data: rBookmarkFolders }] = await Promise.all([
      sb.from('feeds').select('*'),
      sb.from('folders').select('*'),
      sb.from(tableName).select('*').order('created_at', { ascending: false }),
      sb.from('article_states').select('*'),
      sb.from('bookmark_folders').select('*')
    ]);
    if (rFeeds) setFeeds(rFeeds.map((f: any) => ({ url: f.url, title: f.title, link: f.link, author: '', description: '', image: f.image, userId: f.user_id })));
    if (rFolders) setFolders(rFolders.map((f: any) => ({ id: f.id, name: f.name, feedUrls: f.feed_urls || [], isExpanded: f.is_expanded, userId: f.user_id })));
    if (rBookmarks) setBookmarks(rBookmarks.map((b: any) => ({ id: b.id, url: b.url, title: b.title, description: b.description, tags: b.tags || [], folderId: b.folder_id, isUnread: b.is_unread, notes: b.notes, createdAt: b.created_at, userId: b.user_id })));
    if (rBookmarkFolders) setBookmarkFolders(rBookmarkFolders.map((f: any) => ({ id: f.id, name: f.name, userId: f.user_id })));
    
    if (rStates) {
      const rSet = new Set<string>(); const sSet = new Set<string>();
      rStates.forEach((s: any) => { if (s.is_read) rSet.add(s.article_guid); if (s.is_starred) sSet.add(s.article_guid); });
      setReadArticleIds(rSet); setStarredArticleIds(sSet);
    }
  };

  const handlePushData = async () => {
      if (!session || !settings.supabaseConfig) return;
      const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
      const tableName = settings.supabaseConfig.tableName;
      try {
        await Promise.all(feeds.map(f => sb.from('feeds').upsert({ user_id: session.user.id, url: f.url, title: f.title, link: f.link, image: f.image }, { onConflict: 'user_id,url' })));
        await Promise.all(folders.map(f => sb.from('folders').upsert({ id: f.id, user_id: session.user.id, name: f.name, feed_urls: f.feedUrls, is_expanded: f.isExpanded }, { onConflict: 'id' })));
        await Promise.all(bookmarks.map(b => sb.from(tableName).upsert({ id: b.id, user_id: session.user.id, url: b.url, title: b.title, description: b.description, tags: b.tags, folder_id: b.folderId || null, is_unread: b.isUnread, notes: b.notes, created_at: b.createdAt }, { onConflict: 'id' })));
        await Promise.all(bookmarkFolders.map(f => sb.from('bookmark_folders').upsert({ id: f.id, user_id: session.user.id, name: f.name }, { onConflict: 'id' })));
        alert("Push complete.");
      } catch (e) { alert("Push failed. See console."); console.error(e); }
  };

  const handlePullData = async () => {
      if (!session || !settings.supabaseConfig) return;
      const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
      const tableName = settings.supabaseConfig.tableName;
      try {
        await fetchCloudData(sb, tableName);
        alert("Pull complete.");
      } catch (e) { alert("Pull failed."); console.error(e); }
  };

  const handleImportOpml = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const outlines = Array.from(xml.querySelectorAll('outline[xmlUrl]'));
      
      let successCount = 0;
      // Import in chunks to avoid locking UI
      const chunkSize = 5;
      for (let i = 0; i < outlines.length; i += chunkSize) {
          const chunk = outlines.slice(i, i + chunkSize);
          await Promise.all(chunk.map(async (outline) => {
              const url = outline.getAttribute('xmlUrl');
              if (url) {
                  try {
                      await handleAddFeed(url);
                      successCount++;
                  } catch (e) { console.error(e); }
              }
          }));
      }
      alert(`Import finished. Successfully added ${successCount} feeds.`);
    } catch (e) {
      alert("Failed to parse OPML file.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportData = (format: 'csv' | 'xml' | 'sql') => {
      let content = "";
      let filename = `gondor_bookmarks.${format}`;
      let mimeType = "text/plain";
      if (format === 'csv') {
          content = "Title,URL,Tags,Notes,IsUnread\n" + bookmarks.map(b => `"${b.title}","${b.url}","${b.tags.join(',')}","${b.notes || ''}",${b.isUnread}`).join("\n");
          mimeType = "text/csv";
      } else if (format === 'xml') {
          content = `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>Gondor Bookmarks</title></head><body>` + bookmarks.map(b => `<outline text="${b.title}" xmlUrl="${b.url}" htmlUrl="${b.url}" />`).join("") + `</body></opml>`;
          mimeType = "text/xml";
      } else if (format === 'sql') {
          content = bookmarks.map(b => `INSERT INTO bookmarks (id, url, title, tags, is_unread) VALUES ('${b.id}', '${b.url}', '${b.title}', '{${b.tags.join(',')}}', ${b.isUnread});`).join("\n");
      }
      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
  };

  const handleAddFeed = async (inputUrl: string) => {
    setIsLoading(true);
    const url = normalizeUrl(inputUrl);
    setLoadingFeedUrls(prev => new Set(prev).add(url));
    try {
      const { feed, articles: newArticles } = await fetchFeed(url, true);
      setFeeds(prev => {
          const filtered = prev.filter(f => f.url !== url);
          return [...filtered, feed];
      });
      setArticles(prev => [...newArticles, ...prev].sort((a,b) => (b.pubDate || '').localeCompare(a.pubDate || '')));
      if (session && settings.supabaseConfig) {
        const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
        await sb.from('feeds').upsert({ user_id: session.user.id, url: feed.url, title: feed.title, link: feed.link, image: feed.image }, { onConflict: 'user_id,url' });
      }
    } catch (e) { throw e; } finally { 
        setIsLoading(false); 
        setLoadingFeedUrls(prev => { const n = new Set(prev); n.delete(url); return n; });
    }
  };

  const handleDeleteFeed = async (url: string) => {
    setFeeds(prev => prev.filter(f => f.url !== url));
    setFolders(prev => prev.map(f => ({ ...f, feedUrls: f.feedUrls.filter(u => u !== url) })));
    setArticles(prev => prev.filter(a => a.feedUrl !== url));
    // Also remove score
    setFeedScores(prev => { const next = {...prev}; delete next[url]; return next; });
    if (session && settings.supabaseConfig) {
      const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
      await sb.from('feeds').delete().eq('url', url).eq('user_id', session.user.id);
    }
  };

  const handleCreateFolder = async (name: string) => {
    const newFolder: FolderType = { id: Date.now().toString(), name, feedUrls: [], isExpanded: true };
    setFolders(prev => [...prev, newFolder]);
    if (session && settings.supabaseConfig) {
      const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
      await sb.from('folders').insert({ id: newFolder.id, name: newFolder.name, feed_urls: [], is_expanded: true, user_id: session.user.id });
    }
  };

  const handleDeleteFolder = async (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    if (session && settings.supabaseConfig) {
      const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
      await sb.from('folders').delete().eq('id', id).eq('user_id', session.user.id);
    }
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    if (session && settings.supabaseConfig) {
      const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
      await sb.from('folders').update({ name: newName }).eq('id', id).eq('user_id', session.user.id);
    }
  };

  const handleMoveFeedToFolder = async (feedUrl: string, folderId: string) => {
    setFolders(prev => prev.map(f => {
      const nextUrls = f.feedUrls.filter(u => u !== feedUrl);
      if (f.id === folderId) nextUrls.push(feedUrl);
      return { ...f, feedUrls: Array.from(new Set(nextUrls)) };
    }));
    if (session && settings.supabaseConfig) {
      const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
      for (const folder of folders) {
          await sb.from('folders').upsert({ id: folder.id, user_id: session.user.id, name: folder.name, feed_urls: folder.feedUrls, is_expanded: folder.isExpanded }, { onConflict: 'id' });
      }
    }
  };

  const handleCreateBookmark = async (b: Bookmark) => {
    setBookmarks(prev => [b, ...prev]);
    if (session && settings.supabaseConfig) {
      const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
      await sb.from(settings.supabaseConfig.tableName).upsert({ id: b.id, user_id: session.user.id, url: b.url, title: b.title, description: b.description, tags: b.tags, folder_id: b.folderId || null, is_unread: b.isUnread, notes: b.notes, created_at: b.createdAt }, { onConflict: 'id' });
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    if (session && settings.supabaseConfig) {
      const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
      await sb.from(settings.supabaseConfig.tableName).delete().eq('id', id).eq('user_id', session.user.id);
    }
  };

  const handleCreateBookmarkFolder = async (name: string): Promise<string> => {
      const id = Date.now().toString();
      setBookmarkFolders(prev => [...prev, { id, name }]);
      if (session && settings.supabaseConfig) {
          const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
          await sb.from('bookmark_folders').upsert({ id, user_id: session.user.id, name }, { onConflict: 'id' });
      }
      return id;
  };

  const handleDeleteBookmarkFolder = async (id: string) => {
      setBookmarkFolders(prev => prev.filter(f => f.id !== id));
      setBookmarks(prev => prev.map(b => b.folderId === id ? { ...b, folderId: undefined } : b));
      if (session && settings.supabaseConfig) {
          const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
          await sb.from('bookmark_folders').delete().eq('id', id).eq('user_id', session.user.id);
      }
  };

  const handleLoginSupabase = async (newSession: any, config: SupabaseConfig) => {
      setSession(newSession);
      setIsAuthenticated(true);
      setSettings(prev => ({ ...prev, supabaseConfig: config }));
      setIsLoading(true);
      try { const sb = getSupabase(config.url, config.key); await fetchCloudData(sb, config.tableName); } 
      catch (e) { console.error("Login sync failed", e); } finally { setIsLoading(false); }
  };

  // Optimized Batch Refresh with Smart Sorting
  const refreshAllFeeds = async () => {
    if (feeds.length === 0) return;
    setIsLoading(true);
    
    // Sort feeds by interaction score (Descending) so favorites load first
    const sortedFeeds = [...feeds].sort((a, b) => {
        const scoreA = feedScores[a.url] || 0;
        const scoreB = feedScores[b.url] || 0;
        return scoreB - scoreA;
    });

    // Process in chunks of 3
    const chunkSize = 3;
    const allFetchedArticles: Article[] = [];
    const processedFeeds = new Set<string>();

    for (let i = 0; i < sortedFeeds.length; i += chunkSize) {
        const chunk = sortedFeeds.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (f) => {
            setLoadingFeedUrls(prev => new Set(prev).add(f.url));
            try {
                const { articles: fetched } = await fetchFeed(f.url, true);
                fetched.forEach(a => allFetchedArticles.push(a));
                processedFeeds.add(f.url);
            } catch (e) {
                console.warn(`Failed to fetch ${f.url}`, e);
            } finally {
                setLoadingFeedUrls(prev => { const n = new Set(prev); n.delete(f.url); return n; });
            }
        }));
    }

    setArticles(prev => {
        const remaining = prev.filter(a => !processedFeeds.has(a.feedUrl));
        return [...remaining, ...allFetchedArticles].sort((a,b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
    });

    setIsLoading(false);
  };

  useEffect(() => {
    const checkSession = async () => {
        if (settings.supabaseConfig) {
             const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
             const { data: { session: existing } } = await sb.auth.getSession();
             if (existing) await handleLoginSupabase(existing, settings.supabaseConfig);
        }
        setIsAuthChecking(false);
    };
    checkSession();
  }, []);

  // UseEffect for initial load (uses cache if available)
  useEffect(() => { 
      if (feeds.length > 0 && isAuthenticated) {
         const loadInitial = async () => {
            setIsLoading(true);
            
            // Smart Sort for Initial Load too
            const sortedFeeds = [...feeds].sort((a, b) => {
                const scoreA = feedScores[a.url] || 0;
                const scoreB = feedScores[b.url] || 0;
                return scoreB - scoreA;
            });

            const chunkSize = 4;
            const allFetched: Article[] = [];
            
            for (let i = 0; i < sortedFeeds.length; i += chunkSize) {
                 const chunk = sortedFeeds.slice(i, i + chunkSize);
                 await Promise.all(chunk.map(async (f) => {
                    setLoadingFeedUrls(prev => new Set(prev).add(f.url));
                    try { 
                        const { articles: fetched } = await fetchFeed(f.url, false); 
                        fetched.forEach(a => allFetched.push(a));
                    } catch (e) { console.warn(`Auto-fetch failed for ${f.url}`, e); }
                    finally {
                        setLoadingFeedUrls(prev => { const next = new Set(prev); next.delete(f.url); return next; });
                    }
                 }));
            }
            setArticles(prev => {
                const map = new Map();
                prev.forEach(a => map.set(a.guid, a));
                allFetched.forEach(a => map.set(a.guid, a));
                return Array.from(map.values()).sort((a,b) => (b.pubDate || '').localeCompare(a.pubDate || ''));
            });
            setIsLoading(false);
         };
         loadInitial();
      }
  }, [feeds.length, isAuthenticated]); // Note: We don't depend on feedScores here to avoid infinite re-sorts loop

  const handleUpdateSettings = (s: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...s }));
    if (s.defaultAppMode) setAppMode(s.defaultAppMode);
    if (s.defaultViewMode) setViewMode(s.defaultViewMode);
  };

  const filteredArticles = useMemo(() => {
    if (appMode !== 'reader') return [];
    let r = articles;
    
    // Filtering logic
    if (filterType === FilterType.FEED && selectedFeedId) {
        r = r.filter(a => a.feedUrl === selectedFeedId);
    } else if (filterType === FilterType.FOLDER && selectedFolderId) { 
        const f = folders.find(f => f.id === selectedFolderId); 
        if (f) { const set = new Set(f.feedUrls); r = r.filter(a => set.has(a.feedUrl)); } 
    } else if (filterType === FilterType.STARRED) {
        r = r.filter(a => starredArticleIds.has(a.guid));
    } else if (filterType === FilterType.UNREAD) {
        r = r.filter(a => !readArticleIds.has(a.guid));
    }
    
    if (searchQuery) { 
        const q = searchQuery.toLowerCase(); 
        r = r.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)); 
    }
    
    return r;
  }, [articles, filterType, selectedFeedId, selectedFolderId, folders, starredArticleIds, readArticleIds, searchQuery, appMode]);

  const filteredBookmarks = useMemo(() => {
    if (appMode !== 'bookmarks') return [];
    let r = bookmarks;
    if (filterType === FilterType.UNREAD) r = r.filter(b => b.isUnread);
    else if (filterType === FilterType.TAG && selectedTag) r = r.filter(b => b.tags.includes(selectedTag));
    else if (filterType === FilterType.FOLDER && selectedFolderId) r = r.filter(b => b.folderId === selectedFolderId);
    if (searchQuery) { const q = searchQuery.toLowerCase(); r = r.filter(b => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)); }
    return r.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookmarks, filterType, selectedTag, selectedFolderId, searchQuery, appMode]);

  const handleMarkAsRead = useCallback((id: string) => {
     if (!readArticleIds.has(id)) {
        setReadArticleIds(prev => new Set(prev).add(id));
        
        // --- Smart Scoring Logic ---
        // Find the article to get its feed URL
        const article = articles.find(a => a.guid === id);
        if (article) {
             setFeedScores(prev => ({
                 ...prev,
                 [article.feedUrl]: (prev[article.feedUrl] || 0) + 1
             }));
        }
        // ---------------------------

        if (session && settings.supabaseConfig) {
             const sb = getSupabase(settings.supabaseConfig.url, settings.supabaseConfig.key);
             sb.from('article_states').upsert({
                 user_id: session.user.id,
                 article_guid: id,
                 is_read: true,
                 is_starred: starredArticleIds.has(id)
             }, { onConflict: 'user_id,article_guid' }).then(() => {});
        }
     }
  }, [readArticleIds, session, settings.supabaseConfig, starredArticleIds, articles]);

  const handleArticleClick = (article: Article) => {
      setSelectedArticle(article);
      // Clicking an article counts as interaction too
      setFeedScores(prev => ({
         ...prev,
         [article.feedUrl]: (prev[article.feedUrl] || 0) + 1
      }));
  };

  if (isAuthChecking) return <div className="flex h-screen items-center justify-center bg-[#f0f2f5] dark:bg-slate-950 font-sans"><div className="animate-pulse"><Asterisk className="w-8 h-8 text-yellow-400" /></div></div>;
  if (!isAuthenticated) return <LoginScreen onLoginSupabase={handleLoginSupabase} savedSupabaseConfig={settings.supabaseConfig} />;

  return (
    <div className={`flex flex-col h-screen bg-[#e8e8e8] dark:bg-slate-950 text-aol-text dark:text-slate-100 ${settings.fontFamily === 'sans' ? 'font-sans' : settings.fontFamily === 'serif' ? 'font-serif' : 'font-mono'}`}>
      <div className="sticky top-0 z-40 h-12 flex items-center justify-between px-4 bg-aol-header text-white shadow-md rounded-none">
        <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-1 text-gray-300"><Menu className="w-5 h-5" /></button>
            <div className="flex items-center space-x-2 mr-6 cursor-pointer" onClick={() => setAppMode('reader')}>
                <Asterisk className="w-4 h-4 text-white" />
                <div className="w-3 h-3 bg-yellow-400 rounded-none"></div>
                <span className="text-xl font-black uppercase tracking-tighter">Gondor</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
                <button 
                  onClick={() => setAppMode('reader')} 
                  className={`flex items-center space-x-2 py-1 px-3 border border-transparent transition-all rounded-none ${appMode === 'reader' ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white font-medium'}`}
                >
                    <Rss className="w-3.5 h-3.5" strokeWidth={appMode === 'reader' ? 2.5 : 2} />
                    <span className="text-sm tracking-tight">Reader</span>
                </button>
                <button 
                  onClick={() => setAppMode('bookmarks')} 
                  className={`flex items-center space-x-2 py-1 px-3 border border-transparent transition-all rounded-none ${appMode === 'bookmarks' ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white font-medium'}`}
                >
                    <BookmarkIcon className="w-3.5 h-3.5" strokeWidth={appMode === 'bookmarks' ? 2.5 : 2} />
                    <span className="text-sm tracking-tight">Bookmarks</span>
                </button>
            </div>
        </div>

        <div className="flex-1 max-w-lg mx-4 relative">
          <input type="text" className="w-full h-8 px-3 pl-9 bg-aol-search border-none rounded-none text-sm text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
        </div>

        <div className="flex items-center space-x-3 text-gray-400">
             {session && <div className="text-sm font-medium tracking-tight text-blue-300 hidden sm:block">{session.user.email}</div>}
             <button onClick={() => setIsSettingsOpen(true)} className="hover:text-white"><Wrench className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="sticky top-12 z-30 h-10 bg-aol-toolbar dark:bg-slate-900 border-b border-gray-300 dark:border-slate-800 flex items-center px-2 justify-between rounded-none">
         <div className="flex items-center space-x-2">
            <button onClick={refreshAllFeeds} disabled={isLoading} className={`p-1.5 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-none disabled:opacity-50`}><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setIsAddModalOpen(true)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-none"><Plus className="w-4 h-4" /></button>
            <div className="h-6 w-px bg-gray-300 dark:bg-slate-700 mx-1"></div>
            <div className="flex items-center pl-2"><span className="font-black text-[10px] uppercase tracking-widest mr-2">{filterType}</span></div>
         </div>
         <div className="flex items-center space-x-0">
             <div className="flex items-center bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-none p-0.5">
                <button onClick={() => setViewMode('list')} className={`p-1 rounded-none ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><List className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('card')} className={`p-1 rounded-none ${viewMode === 'card' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><CreditCard className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('expanded')} className={`p-1 rounded-none ${viewMode === 'expanded' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}><FileText className="w-4 h-4" /></button>
             </div>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div className={`md:block transition-all duration-300 bg-aol-sidebar dark:bg-slate-900 z-20 ${isSidebarOpen ? 'w-56' : 'w-0 overflow-hidden'} max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:shadow-2xl rounded-none`}>
          {appMode === 'reader' ? (
            <Sidebar 
              feeds={feeds} 
              folders={folders} 
              selectedFeedId={selectedFeedId} 
              selectedFolderId={selectedFolderId} 
              filterType={filterType}
              loadingFeedUrls={loadingFeedUrls}
              onSelectFeed={u => {setSelectedFeedId(u); setFilterType(u ? FilterType.FEED : FilterType.ALL); setSelectedFolderId(null);}} 
              onSelectFolder={id => {setSelectedFolderId(id); setFilterType(FilterType.FOLDER); setSelectedFeedId(null);}} 
              onSelectFilter={t => { setFilterType(t); setSelectedFeedId(null); setSelectedFolderId(null); }} 
              onToggleFolder={id => setFolders(p => p.map(f => f.id === id ? {...f, isExpanded: !f.isExpanded} : f))} 
              onAddFeed={() => setIsAddModalOpen(true)} 
              getUnreadCount={u => u ? articles.filter(a => a.feedUrl === u && !readArticleIds.has(a.guid)).length : articles.filter(a => !readArticleIds.has(a.guid)).length} 
              onMoveFeedToFolder={handleMoveFeedToFolder} 
              onCloseMobile={() => setIsSidebarOpen(false)}
              onDeleteFeed={handleDeleteFeed}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onRenameFolder={handleRenameFolder}
            />
          ) : (
            <BookmarkSidebar bookmarks={bookmarks} folders={bookmarkFolders} selectedTag={selectedTag} selectedFolderId={selectedFolderId} filterType={filterType} onSelectTag={t => {setSelectedTag(t); setFilterType(FilterType.TAG);}} onSelectFolder={id => {setSelectedFolderId(id); setFilterType(FilterType.FOLDER);}} onSelectFilter={setFilterType} onCreateFolder={handleCreateBookmarkFolder} onDeleteFolder={handleDeleteBookmarkFolder} />
          )}
        </div>
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto bg-[#e8e8e8] dark:bg-slate-950 p-2 md:p-4 rounded-none">
            {isLoading && articles.length === 0 && <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}
            {appMode === 'reader' ? (
                <ArticleList 
                  key={`${filterType}-${selectedFeedId}-${selectedFolderId}`}
                  articles={filteredArticles} 
                  viewMode={viewMode} 
                  readArticleIds={readArticleIds} 
                  starredArticleIds={starredArticleIds} 
                  settings={settings} 
                  onArticleClick={handleArticleClick} 
                  onMarkAsRead={handleMarkAsRead}
                  onToggleRead={async (id, e) => { e.stopPropagation(); const nr = !readArticleIds.has(id); setReadArticleIds(p => { const n = new Set(p); if(n.has(id)) n.delete(id); else n.add(id); return n; }); }} 
                  onToggleStar={async (id, e) => { e.stopPropagation(); const ns = !starredArticleIds.has(id); setStarredArticleIds(p => { const n = new Set(p); if(n.has(id)) n.delete(id); else n.add(id); return n; }); }} 
                  onSaveAsBookmark={a => handleCreateBookmark({ id: Date.now().toString(), url: a.link, title: a.title, description: a.description, tags: ['rss'], isUnread: true, notes: `Saved from ${a.feedTitle}`, createdAt: new Date().toISOString() })} />
            ) : (
                selectedBookmark ? <BookmarkDetail bookmark={selectedBookmark} folders={bookmarkFolders} onClose={() => setSelectedBookmark(null)} onUpdate={async u => { setBookmarks(p => p.map(b => b.id === u.id ? u : b)); setSelectedBookmark(u); }} /> :
                <BookmarkList bookmarks={filteredBookmarks} folders={bookmarkFolders} onBookmarkClick={setSelectedBookmark} onToggleUnread={id => setBookmarks(p => p.map(b => b.id === id ? {...b, isUnread: !b.isUnread} : b))} onDelete={handleDeleteBookmark} onSelectTag={t => { setSelectedTag(t); setFilterType(FilterType.TAG); }} />
            )}
        </main>
      </div>

      {appMode === 'reader' && selectedArticle && <ArticleDetail article={selectedArticle} onClose={() => setSelectedArticle(null)} isStarred={starredArticleIds.has(selectedArticle.guid)} onToggleStar={() => {}} settings={settings} isRead={readArticleIds.has(selectedArticle.guid)} onToggleRead={() => {}} onSaveAsBookmark={() => {}} />}
      {isAddModalOpen && (appMode === 'reader' ? <AddFeedModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddFeed} /> : <AddBookmarkModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleCreateBookmark} folders={bookmarkFolders} onCreateFolder={handleCreateBookmarkFolder} />)}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={handleUpdateSettings} onExportOpml={() => handleExportData('xml')} onImportOpml={handleImportOpml} isImporting={isImporting} session={session} onLogout={() => setIsAuthenticated(false)} onForceSync={refreshAllFeeds} onExportData={handleExportData} onPushData={handlePushData} onPullData={handlePullData} />
    </div>
  );
};

export default App;
