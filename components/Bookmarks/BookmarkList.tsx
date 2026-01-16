
import React, { useState } from 'react';
import { Bookmark, BookmarkFolder } from '../../types';
import { format } from 'date-fns';
import { StickyNote, AlertTriangle, X, Folder } from 'lucide-react';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  onBookmarkClick: (bookmark: Bookmark) => void;
  onToggleUnread: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectTag: (tag: string) => void;
}

const BookmarkList: React.FC<BookmarkListProps> = ({ bookmarks, folders, onBookmarkClick, onToggleUnread, onDelete, onSelectTag }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getHostname = (url: string) => {
      try {
          return new URL(url).hostname.replace('www.', '');
      } catch {
          return '';
      }
  };

  const confirmDelete = () => {
      if (deleteId) {
          onDelete(deleteId);
          setDeleteId(null);
      }
  };

  if (bookmarks.length === 0) {
      return <div className="p-8 text-center text-gray-400 text-sm">No bookmarks found.</div>;
  }

  return (
    <>
    <div className="max-w-4xl mx-auto space-y-4">
      {bookmarks.map(item => {
        const folderName = folders.find(f => f.id === item.folderId)?.name;
        
        return (
        <div 
            key={item.id} 
            className={`group bg-white dark:bg-slate-800 p-5 border rounded-sm shadow-sm hover:shadow-md transition-shadow ${item.isUnread ? 'border-l-4 border-l-blue-500' : 'border-gray-200 dark:border-slate-700'}`}
        >
            <div className="mb-2">
                 <h3 className="text-xl font-bold leading-tight inline">
                     <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline visited:text-purple-800 dark:visited:text-purple-400">
                         {item.title || item.url}
                     </a>
                 </h3>
                 <span className="text-xs text-gray-500 ml-2 uppercase tracking-wide">
                     {getHostname(item.url)}
                 </span>
            </div>
            
            {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 leading-relaxed">
                    {item.description}
                </p>
            )}

            <div className="flex flex-wrap items-center justify-between mt-3 pt-1 gap-y-2 min-h-[24px]">
                
                {/* Left: Tags */}
                <div className="flex flex-wrap items-center gap-2">
                    {item.tags.length > 0 ? item.tags.map(tag => (
                        <button 
                            key={tag} 
                            onClick={(e) => { e.stopPropagation(); onSelectTag(tag); }}
                            className="text-[11px] bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-sm border border-gray-200 dark:border-slate-600 transition-colors"
                        >
                            {tag}
                        </button>
                    )) : (
                         <span className="text-[11px] text-gray-300 italic">No tags</span>
                    )}
                </div>

                {/* Right: Meta & Actions */}
                <div className="flex items-center text-[10px] sm:text-[11px] font-medium">
                     
                     {folderName && (
                        <span className="flex items-center text-yellow-600 dark:text-yellow-500 mr-3">
                            <Folder className="w-3 h-3 mr-1" />
                            {folderName}
                        </span>
                     )}

                     <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">on {format(new Date(item.createdAt), 'd. MMM yyyy')}</span>

                     {item.notes && (
                        <span className="ml-3 flex items-center text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-sm border border-amber-200 dark:border-amber-800/30" title="Has private notes">
                            <StickyNote className="w-3 h-3 mr-1" /> has notes
                        </span>
                     )}

                     {/* Actions - Visible on Hover */}
                     <div className="flex items-center space-x-2 sm:space-x-3 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 dark:text-slate-500">
                        
                        <button 
                            onClick={() => onToggleUnread(item.id)}
                            className="hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-wide hover:underline transition-colors"
                        >
                            {item.isUnread ? 'Mark Read' : 'Save Later'}
                        </button>

                        <span>|</span>

                        <button 
                            onClick={() => onBookmarkClick(item)}
                            className="hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-wide hover:underline transition-colors"
                        >
                            Permalink
                        </button>

                        <span>|</span>

                        <button 
                            onClick={() => onBookmarkClick(item)}
                            className="hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-wide hover:underline transition-colors"
                        >
                            Add to Folder
                        </button>

                        <span>|</span>

                        <button 
                            onClick={() => setDeleteId(item.id)}
                            className="hover:text-red-600 dark:hover:text-red-400 uppercase tracking-wide hover:underline transition-colors"
                        >
                            Delete
                        </button>
                     </div>
                </div>
            </div>
        </div>
        );
      })}
    </div>

    {/* Custom Delete Confirmation Modal */}
    {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-slate-800 shadow-xl max-w-sm w-full border border-gray-300 dark:border-slate-600 rounded-sm">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-red-50 dark:bg-red-900/10">
                    <h2 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Delete Bookmark?
                    </h2>
                    <button onClick={() => setDeleteId(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                        This action cannot be undone. Are you sure?
                    </p>
                    <div className="flex justify-end space-x-2">
                        <button 
                            onClick={() => setDeleteId(null)}
                            className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-sm text-xs font-bold uppercase hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-sm text-xs font-bold uppercase hover:bg-red-700 border border-red-700"
                        >
                            Yes, Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default BookmarkList;
