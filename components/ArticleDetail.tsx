import React from 'react';
import { Article, AppSettings } from '../types';
import { X, ExternalLink, Calendar, Star, Mail, CheckCircle, Circle, BookmarkPlus } from 'lucide-react';
import { format } from 'date-fns';

interface ArticleDetailProps {
  article: Article;
  onClose: () => void;
  isStarred: boolean;
  onToggleStar: () => void;
  settings: AppSettings;
  isRead: boolean;
  onToggleRead: (e: React.MouseEvent) => void;
  onSaveAsBookmark?: () => void;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, onClose, isStarred, onToggleStar, settings, isRead, onToggleRead, onSaveAsBookmark }) => {
  
  const handleEmailShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const subject = encodeURIComponent(article.title);
    const body = encodeURIComponent(`${article.title}\n\n${article.link}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const fontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono'
  }[settings.fontFamily];

  const textSizeClass = {
    small: 'prose-sm',
    medium: 'prose-base',
    large: 'prose-xl',
    xlarge: 'prose-2xl'
  }[settings.fontSize];

  // Helper to ensure line breaks render correctly
  const formatContent = (content: string) => {
      if (!content) return '';
      // If the content looks like plain text (no paragraphs, divs, or breaks), 
      // replace newlines with <br /> to ensure readability.
      // Many RSS feeds just send text blobs with \n.
      if (!content.match(/<(p|div|br|ul|ol|h[1-6]|table)/i)) {
          return content.replace(/\n/g, '<br /><br />');
      }
      return content;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]" onClick={onClose}>
      <div 
        className="w-full max-w-3xl h-full bg-white dark:bg-slate-900 shadow-xl overflow-y-auto flex flex-col border-l border-gray-300 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
             <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-500 rounded-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate max-w-[200px]">
              {article.feedTitle}
            </span>
          </div>
          <div className="flex items-center space-x-2">
             <button 
                onClick={onToggleRead}
                className={`p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors ${
                  isRead ? 'text-green-600' : 'text-slate-400'
                }`}
                title={isRead ? "Keep unread" : "Mark as read"}
              >
                {isRead ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>
            {onSaveAsBookmark && (
                <button
                    onClick={onSaveAsBookmark}
                    className="p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
                    title="Save to Bookmarks"
                >
                    <BookmarkPlus className="w-5 h-5" />
                </button>
            )}
             <button 
                onClick={handleEmailShare}
                className="p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                title="Share via Email"
              >
                <Mail className="w-5 h-5" />
            </button>
             <button 
              onClick={onToggleStar}
              className={`p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors ${
                isStarred ? 'text-yellow-600' : 'text-slate-400'
              }`}
            >
              <Star className={`w-5 h-5 ${isStarred ? 'fill-current' : ''}`} />
            </button>
            <a 
              href={article.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              title="Open original"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2 leading-tight">
            {article.title}
          </h1>
          
          <div className="flex items-center space-x-4 text-xs text-slate-500 border-b border-gray-100 dark:border-slate-800 pb-6 mb-6">
            {article.author && (
              <span className="font-bold text-slate-700 dark:text-slate-300">
                by {article.author}
              </span>
            )}
            <span>
              {article.pubDate ? format(new Date(article.pubDate), 'dd. MMM yyyy, HH:mm') : ''}
            </span>
          </div>

          {/* Main Article Body */}
          <div className={`prose dark:prose-invert max-w-none prose-slate prose-a:text-blue-600 prose-headings:font-bold prose-headings:text-slate-800 prose-p:leading-relaxed prose-li:marker:text-slate-400 ${textSizeClass} ${fontClass}`}>
            <div dangerouslySetInnerHTML={{ __html: formatContent(article.content || article.description) }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;