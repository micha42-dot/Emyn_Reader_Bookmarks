
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Article, ViewMode, AppSettings } from '../types';
import { Star, Circle, Clock, Share2, BookmarkPlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ArticleListProps {
  articles: Article[];
  viewMode: ViewMode;
  readArticleIds: Set<string>;
  starredArticleIds: Set<string>;
  settings: AppSettings;
  onArticleClick: (article: Article) => void;
  onToggleRead: (id: string, e: React.MouseEvent) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onMarkAsRead?: (id: string) => void;
  focusedArticleIndex?: number | null; 
  onSaveAsBookmark?: (article: Article) => void;
}

const ITEMS_PER_PAGE = 20;

const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  viewMode,
  readArticleIds,
  starredArticleIds,
  settings,
  onArticleClick,
  onToggleRead,
  onToggleStar,
  onMarkAsRead,
  focusedArticleIndex,
  onSaveAsBookmark
}) => {
  const articleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const loaderRef = useRef<HTMLDivElement>(null);
  
  // State for Infinite Scroll
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Reset visible count when the source list changes (filter change)
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [articles]);

  const visibleArticles = useMemo(() => {
      return articles.slice(0, visibleCount);
  }, [articles, visibleCount]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, articles.length));
        }
    }, {
        root: null,
        rootMargin: '400px', // Preload before reaching bottom
        threshold: 0
    });

    if (loaderRef.current) {
        observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [articles.length]);


  useEffect(() => {
    if (focusedArticleIndex !== undefined && focusedArticleIndex !== null && articles[focusedArticleIndex]) {
        const article = articles[focusedArticleIndex];
        // Ensure the focused article is visible (expand list if needed)
        if (focusedArticleIndex >= visibleCount) {
            setVisibleCount(focusedArticleIndex + ITEMS_PER_PAGE);
        }
        
        // Slight timeout to allow render
        setTimeout(() => {
            const el = articleRefs.current.get(article.guid);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 50);
    }
  }, [focusedArticleIndex, articles]);

  // Mark as Read Observer
  useEffect(() => {
    if (!onMarkAsRead) return;
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 100) {
          const id = entry.target.getAttribute('data-id');
          if (id) {
            onMarkAsRead(id);
          }
        }
      });
    };
    
    const observer = new IntersectionObserver(observerCallback, { 
        root: null, 
        rootMargin: '-88px 0px 0px 0px', 
        threshold: 0 
    });
    
    articleRefs.current.forEach((element) => {
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [visibleArticles, onMarkAsRead]); // Depend on visibleArticles, not all articles

  const fontClass = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }[settings.fontFamily];
  const textSizeClass = { small: 'text-xs', medium: 'text-sm', large: 'text-base', xlarge: 'text-lg' }[settings.fontSize];

  const cleanAndFormatContent = (content: string, title: string) => {
      if (!content) return '';
      let html = content;
      if (!content.match(/<(p|div|br|ul|ol|h[1-6]|table)/i)) {
          html = content.replace(/\n/g, '<br /><br />');
      }
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const titleClean = title.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const elements = Array.from(doc.body.children);
        for (let i = 0; i < Math.min(elements.length, 3); i++) {
            const el = elements[i];
            const elText = el.textContent?.toLowerCase().replace(/[^\w\s]/g, '').trim() || '';
            if (elText.length > 5) {
                if (elText === titleClean || titleClean.includes(elText) || elText.includes(titleClean)) {
                    el.remove();
                    break; 
                }
            }
        }
        return doc.body.innerHTML;
      } catch (e) {
        return html;
      }
  };

  const handleEmailShare = (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    const subject = encodeURIComponent(article.title);
    const body = encodeURIComponent(`${article.title}\n\n${article.link}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleBookmarkClick = (e: React.MouseEvent, article: Article) => {
      e.stopPropagation();
      if(onSaveAsBookmark) onSaveAsBookmark(article);
  };

  const isThumbnailRedundant = (thumbnail: string, content: string) => {
      if (!thumbnail || !content) return false;
      const cleanThumb = thumbnail.split('?')[0].replace(/^https?:\/\//, '').replace(/&amp;/g, '&');
      const cleanContent = content.replace(/&amp;/g, '&');
      if (cleanContent.includes(cleanThumb)) return true;
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const images = doc.querySelectorAll('img');
        const thumbFilename = cleanThumb.split('/').pop()?.split('.')[0]; 
        if (!thumbFilename || thumbFilename.length < 4) return false;
        for (const img of images) {
            const src = img.getAttribute('src');
            if (src && src.includes(thumbFilename)) return true;
        }
      } catch (e) {
          return false;
      }
      return false;
  };

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>No items found.</p>
      </div>
    );
  }

  const renderCardView = () => (
      <div className="space-y-4 max-w-3xl mx-auto">
          {visibleArticles.map((article, index) => {
              const dateStr = article.pubDate ? format(new Date(article.pubDate), 'EEEE, MMMM d, yyyy, p') : '';
              const isRead = readArticleIds.has(article.guid);
              const isStarred = starredArticleIds.has(article.guid);
              const isFocused = focusedArticleIndex === index;
              
              return (
                  <div 
                    key={article.guid} 
                    data-id={article.guid}
                    ref={(el) => {
                      if (el) articleRefs.current.set(article.guid, el);
                      else articleRefs.current.delete(article.guid);
                    }}
                    className={`bg-white dark:bg-slate-800 border-x border-b border-t border-gray-200 dark:border-slate-700 shadow-card rounded-none ${isFocused ? 'ring-2 ring-blue-500 z-10' : ''}`}
                  >
                       <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-none">
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-[#d35400] dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1 rounded-none text-[10px] uppercase tracking-wider">RSS</span>
                                <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{article.feedTitle}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button onClick={(e) => onToggleStar(article.guid, e)} className={`p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-none ${isStarred ? 'text-yellow-500' : 'text-gray-400'}`}>
                                    <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                                </button>
                                <button onClick={(e) => handleBookmarkClick(e, article)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-none text-gray-400 hover:text-blue-500" title="Save to Bookmarks">
                                    <BookmarkPlus className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => onToggleRead(article.guid, e)} className={`p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-none ${isRead ? 'text-green-600' : 'text-gray-400'}`}>
                                    <Circle className={`w-4 h-4 ${isRead ? 'fill-current' : ''}`} />
                                </button>
                                 <button onClick={(e) => handleEmailShare(e, article)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-none text-gray-400">
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                       </div>

                       <div className="p-6">
                            <h2 className="text-2xl font-bold text-[#2c3e50] dark:text-gray-100 mb-2 leading-tight">
                                <a href={article.link} target="_blank" rel="noreferrer" className="hover:text-blue-600">{article.title}</a>
                            </h2>
                            
                            <div className="flex items-center text-xs text-gray-400 mb-6 space-x-2">
                                <Clock className="w-3 h-3" />
                                <span>{dateStr}</span>
                            </div>

                            <div className={`prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 ${fontClass} ${textSizeClass} article-content rounded-none`}>
                                 {article.thumbnail && !isThumbnailRedundant(article.thumbnail, article.content) && (
                                     <img src={article.thumbnail} alt="" className="mb-4 max-h-[400px] w-auto object-cover border border-gray-200 dark:border-slate-700 rounded-none" />
                                 )}
                                <div dangerouslySetInnerHTML={{ __html: cleanAndFormatContent(article.content || article.description, article.title) }} />
                            </div>
                       </div>
                  </div>
              )
          })}
      </div>
  );

  const renderListView = () => (
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-700 rounded-none">
        {visibleArticles.map((article, index) => {
            const isRead = readArticleIds.has(article.guid);
            const isStarred = starredArticleIds.has(article.guid);
            const isFocused = focusedArticleIndex === index;
            const dateStr = article.pubDate ? format(new Date(article.pubDate), 'MMM d') : '';
            
            return (
                <div
                    key={article.guid}
                    data-id={article.guid}
                    ref={(el) => {
                        if (el) articleRefs.current.set(article.guid, el);
                        else articleRefs.current.delete(article.guid);
                    }}
                    onClick={() => onArticleClick(article)}
                    className={`flex items-center px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-slate-800 transition-colors group rounded-none ${
                        isRead ? 'bg-white dark:bg-slate-900 text-gray-500' : 'bg-[#fcfcfc] dark:bg-slate-900 text-black dark:text-gray-100 font-semibold'
                    } ${isFocused ? 'bg-blue-50 dark:bg-slate-800 ring-1 ring-inset ring-blue-500' : ''}`}
                >
                     <div className="shrink-0 w-6">
                            <button
                            onClick={(e) => onToggleStar(article.guid, e)}
                            className={`shrink-0 rounded-none ${isStarred ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                            <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                        </button>
                    </div>

                    <div className="shrink-0 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                            onClick={(e) => handleBookmarkClick(e, article)}
                            className="shrink-0 text-gray-300 hover:text-blue-500 rounded-none"
                            title="Save to Bookmarks"
                        >
                            <BookmarkPlus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="w-32 shrink-0 text-xs text-gray-500 truncate pr-4">
                        {article.feedTitle}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex items-center">
                        <span className={`truncate text-sm mr-2 ${isRead ? 'font-normal' : 'font-bold text-[#2c3e50] dark:text-white'}`}>
                            {article.title}
                        </span>
                        <span className="text-gray-400 text-sm font-normal truncate hidden sm:inline">
                             - {article.description.replace(/<[^>]+>/g, '').substring(0, 100)}
                        </span>
                    </div>

                    <div className="w-16 shrink-0 text-xs text-gray-400 text-right">
                        {dateStr}
                    </div>
                </div>
            );
        })}
    </div>
  );

  return (
    <>
        {(viewMode === 'expanded' || viewMode === 'card') ? renderCardView() : renderListView()}
        
        {/* Infinite Scroll Sentinel / Loader */}
        {visibleCount < articles.length && (
            <div ref={loaderRef} className="py-8 flex justify-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        )}
        
        {/* End of list indicator */}
        {visibleCount >= articles.length && articles.length > 0 && (
             <div className="py-8 text-center text-xs text-gray-400 uppercase tracking-widest font-bold">
                 End of content
             </div>
        )}
    </>
  );
};

export default ArticleList;
