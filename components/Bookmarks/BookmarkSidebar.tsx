
import React, { useState, useMemo } from 'react';
import { Bookmark, BookmarkFolder, FilterType } from '../../types';
import { Folder, Calendar, Plus, Inbox, AlertTriangle, X, Clock, Trash2 } from 'lucide-react';

interface BookmarkSidebarProps {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  selectedTag: string | null;
  selectedFolderId: string | null;
  filterType: FilterType;
  onSelectTag: (tag: string) => void;
  onSelectFolder: (id: string) => void;
  onSelectFilter: (type: FilterType) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
}

const BookmarkSidebar: React.FC<BookmarkSidebarProps> = ({
  bookmarks,
  folders,
  selectedTag,
  selectedFolderId,
  filterType,
  onSelectTag,
  onSelectFolder,
  onSelectFilter,
  onCreateFolder,
  onDeleteFolder
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  
  // State for Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);

  // Calculate folder counts efficiently
  const folderCounts = useMemo(() => {
    return bookmarks.reduce((acc, b) => {
        if (b.folderId) {
            acc[b.folderId] = (acc[b.folderId] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);
  }, [bookmarks]);

  // Tag Cloud Logic
  const tagCounts = bookmarks.reduce((acc, b) => {
    b.tags.forEach(tag => { acc[tag] = (acc[tag] || 0) + 1; });
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = (Object.entries(tagCounts) as [string, number][]).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...(Object.values(tagCounts) as number[]), 1);

  const getTagSizeClass = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return 'text-sm font-bold';
    if (ratio > 0.5) return 'text-xs font-semibold';
    return 'text-[10px]';
  };

  const handleCreateFolder = (e: React.FormEvent) => {
      e.preventDefault();
      if(newFolderName.trim()) {
          onCreateFolder(newFolderName.trim());
          setNewFolderName('');
          setShowFolderInput(false);
      }
  };

  const confirmDelete = () => {
      if (deleteTarget) {
          onDeleteFolder(deleteTarget.id);
          setDeleteTarget(null);
      }
  };

  return (
    <>
    <div className="flex flex-col h-full py-4 overflow-y-auto">
      
      {/* Special Filters */}
      <div className="mb-6">
        <div 
            onClick={() => onSelectFilter(FilterType.ALL)}
            className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm ${filterType === FilterType.ALL && !selectedTag && !selectedFolderId ? 'bg-[#d9d9d9] dark:bg-slate-700 font-bold' : 'hover:bg-[#e6e6e6] dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
        >
            <div className="flex items-center">
                <Inbox className="w-4 h-4 mr-2" /> All Bookmarks
            </div>
            <span className="text-gray-400 text-xs">{bookmarks.length}</span>
        </div>
        <div 
            onClick={() => onSelectFilter(FilterType.UNREAD)}
            className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm ${filterType === FilterType.UNREAD ? 'bg-[#d9d9d9] dark:bg-slate-700 font-bold' : 'hover:bg-[#e6e6e6] dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
        >
            <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" /> To Read
            </div>
            <span className="text-gray-400 text-xs">{bookmarks.filter(b => b.isUnread).length}</span>
        </div>
        <div 
            onClick={() => onSelectFilter(FilterType.ON_THIS_DAY)}
            className={`flex items-center px-3 py-1.5 cursor-pointer text-sm ${filterType === FilterType.ON_THIS_DAY ? 'bg-[#d9d9d9] dark:bg-slate-700 font-bold' : 'hover:bg-[#e6e6e6] dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
        >
            <Calendar className="w-4 h-4 mr-2" /> On This Day
        </div>
      </div>

      {/* Folders */}
      <div className="mb-6">
         <div className="px-3 flex justify-between items-center mb-1">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Folders</span>
             <button onClick={() => setShowFolderInput(!showFolderInput)} className="text-gray-400 hover:text-blue-500"><Plus className="w-3 h-3" /></button>
         </div>
         
         {showFolderInput && (
             <form onSubmit={handleCreateFolder} className="px-3 mb-2">
                 <input 
                    autoFocus
                    type="text" 
                    className="w-full text-xs px-2 py-1 border rounded-sm" 
                    placeholder="New Folder..." 
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onBlur={() => !newFolderName && setShowFolderInput(false)}
                 />
             </form>
         )}

         {folders.map(folder => {
            const count = folderCounts[folder.id] || 0;
            return (
                <div 
                    key={folder.id}
                    className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm group ${selectedFolderId === folder.id ? 'bg-[#d9d9d9] dark:bg-slate-700 font-bold' : 'hover:bg-[#e6e6e6] dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
                    onClick={() => onSelectFolder(folder.id)}
                >
                    <div className="flex items-center overflow-hidden flex-1">
                        <Folder className="w-4 h-4 mr-2 text-yellow-600" />
                        <span className="truncate">{folder.name}</span>
                    </div>
                    
                    <div className="flex items-center ml-2">
                        {count > 0 && (
                            <span className="text-gray-400 text-xs mr-2">{count}</span>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: folder.id, name: folder.name }); }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            );
         })}
      </div>

      {/* Tag Cloud */}
      <div className="px-3">
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Popular Tags</span>
        <div className="flex flex-wrap gap-1">
            {sortedTags.slice(0, 30).map(([tag, count]) => (
                <span 
                    key={tag}
                    onClick={() => onSelectTag(tag)}
                    className={`cursor-pointer px-1.5 py-0.5 rounded-sm hover:bg-blue-100 dark:hover:bg-blue-900 ${getTagSizeClass(count)} ${selectedTag === tag ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-blue-600 dark:text-blue-400'}`}
                >
                    {tag}
                </span>
            ))}
        </div>
      </div>
    </div>

    {/* Custom Delete Confirmation Modal */}
    {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-slate-800 shadow-xl max-w-sm w-full border border-gray-300 dark:border-slate-600 rounded-sm">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-red-50 dark:bg-red-900/10">
                    <h2 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Delete Folder?
                    </h2>
                    <button onClick={() => setDeleteTarget(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                        Are you sure you want to remove <span className="font-bold">{deleteTarget.name}</span>?
                        <span className="block mt-2 text-xs text-gray-500">Bookmarks in this folder will not be deleted, just unfiled.</span>
                    </p>
                    <div className="flex justify-end space-x-2">
                        <button 
                            onClick={() => setDeleteTarget(null)}
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

export default BookmarkSidebar;
