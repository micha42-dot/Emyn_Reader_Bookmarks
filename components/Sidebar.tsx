
import React, { useMemo, useState } from 'react';
import { Feed, FilterType, Folder } from '../types';
import { History, ChevronRight, ChevronDown, Home, Star, Folder as FolderIcon, FolderOpen, Rss, Trash2, Plus, Edit2, X, Check, Loader2, AlertTriangle } from 'lucide-react';

interface SidebarProps {
  feeds: Feed[];
  folders: Folder[];
  selectedFeedId: string | null;
  selectedFolderId?: string | null;
  filterType: FilterType;
  loadingFeedUrls?: Set<string>;
  onSelectFeed: (feedUrl: string | null) => void;
  onSelectFolder?: (folderId: string) => void;
  onSelectFilter: (filter: FilterType) => void;
  onToggleFolder: (folderId: string) => void;
  onAddFeed: () => void;
  className?: string;
  getUnreadCount: (feedUrl?: string) => number;
  readCount?: number; // Added readCount prop
  onMoveFeedToFolder: (feedUrl: string, folderId: string) => void;
  onCloseMobile?: () => void;
  // New props for management
  onDeleteFeed: (feedUrl: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  feeds,
  folders,
  selectedFeedId,
  selectedFolderId,
  filterType,
  loadingFeedUrls,
  onSelectFeed,
  onSelectFolder,
  onSelectFilter,
  onToggleFolder,
  onAddFeed,
  className = '',
  getUnreadCount,
  readCount = 0,
  onMoveFeedToFolder,
  onCloseMobile,
  onDeleteFeed,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder
}) => {
  const totalUnreadCount = getUnreadCount();
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  
  // State for Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'feed' | 'folder', id: string, name: string } | null>(null);
  
  const { orphanFeeds } = useMemo(() => {
    const feedsInFolders = new Set(folders.flatMap(f => f.feedUrls));
    return {
      orphanFeeds: feeds.filter(f => !feedsInFolders.has(f.url))
    };
  }, [feeds, folders]);

  const handleInteraction = (action: () => void) => {
      action();
      if (window.innerWidth < 768 && onCloseMobile) {
          onCloseMobile();
      }
  };

  const handleDragStart = (e: React.DragEvent, feedUrl: string) => {
    e.dataTransfer.setData('text/plain', feedUrl);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (dragOverFolderId !== folderId) {
      setDragOverFolderId(folderId);
    }
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const feedUrl = e.dataTransfer.getData('text/plain');
    if (feedUrl) {
      onMoveFeedToFolder(feedUrl, folderId);
    }
    setDragOverFolderId(null);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const startRenaming = (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
  };

  const handleRename = (e: React.FormEvent, folderId: string) => {
    e.preventDefault();
    if (editFolderName.trim()) {
      onRenameFolder(folderId, editFolderName.trim());
      setEditingFolderId(null);
    }
  };

  const promptDelete = (e: React.MouseEvent, type: 'feed' | 'folder', id: string, name: string) => {
      e.stopPropagation();
      setDeleteTarget({ type, id, name });
  };

  const confirmDelete = () => {
      if (!deleteTarget) return;
      if (deleteTarget.type === 'feed') {
          onDeleteFeed(deleteTarget.id);
      } else {
          onDeleteFolder(deleteTarget.id);
      }
      setDeleteTarget(null);
  };

  const SidebarItem = ({ 
    icon, 
    label, 
    count, 
    isActive, 
    onClick, 
    onDragStart,
    draggable,
    onDelete,
    showActions = false,
    isLoading = false
  }: any) => (
    <div 
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm select-none group rounded-none ${
            isActive 
            ? 'bg-[#d9d9d9] dark:bg-slate-700 text-black dark:text-white font-bold' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-[#e6e6e6] dark:hover:bg-slate-800'
        }`}
    >
        <div className="flex items-center overflow-hidden flex-1">
            {icon && <span className="mr-2 shrink-0">{icon}</span>}
            <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center ml-2">
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500 mr-2" />}
            {count > 0 && !showActions && (
                <span className="text-gray-400 text-xs">{count}</span>
            )}
            {onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(e); }}
                  className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    </div>
  );

  return (
    <>
    <div className={`flex flex-col h-full py-4 overflow-y-auto ${className}`}>
      
      {/* Home / Starred / History */}
      <div className="mb-4">
         <SidebarItem 
            icon={<Home className="w-4 h-4 text-gray-500" />}
            label="Home"
            count={totalUnreadCount}
            isActive={filterType === FilterType.ALL && !selectedFeedId && !selectedFolderId}
            onClick={() => handleInteraction(() => onSelectFilter(FilterType.ALL))}
         />
         <SidebarItem 
            icon={<Star className="w-4 h-4 text-yellow-500" />}
            label="Starred"
            count={0} 
            isActive={filterType === FilterType.STARRED}
            onClick={() => handleInteraction(() => onSelectFilter(FilterType.STARRED))}
         />
         <SidebarItem 
            icon={<History className="w-4 h-4 text-purple-500" />}
            label="Recently Read"
            count={readCount} 
            isActive={filterType === FilterType.HISTORY}
            onClick={() => handleInteraction(() => onSelectFilter(FilterType.HISTORY))}
         />
      </div>

      {/* FOLDERS SECTION */}
      <div className="mb-4">
        <div className="px-3 flex justify-between items-center mb-1 group">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Folders</span>
            <button 
              onClick={() => setIsCreatingFolder(!isCreatingFolder)} 
              className="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
        </div>

        {isCreatingFolder && (
          <form onSubmit={handleCreateFolder} className="px-3 mb-2 flex items-center space-x-1">
            <input 
              autoFocus
              type="text" 
              className="flex-1 text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-none outline-none focus:ring-1 focus:ring-blue-500" 
              placeholder="Folder name..." 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
            />
            <button type="submit" className="text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setIsCreatingFolder(false)} className="text-red-600 hover:text-red-700"><X className="w-3.5 h-3.5" /></button>
          </form>
        )}
        
        {folders.map(folder => {
            const folderFeeds = folder.feedUrls
            .map(url => feeds.find(f => f.url === url))
            .filter((f): f is Feed => !!f);
            
            const folderUnread = folderFeeds.reduce((acc, feed) => acc + getUnreadCount(feed.url), 0);
            const isDragOver = dragOverFolderId === folder.id;
            const isSelected = selectedFolderId === folder.id;
            const isEditing = editingFolderId === folder.id;

            return (
            <div 
              key={folder.id} 
              onDragOver={(e) => handleDragOver(e, folder.id)} 
              onDragLeave={() => setDragOverFolderId(null)} 
              onDrop={(e) => handleDrop(e, folder.id)} 
              className={`${isDragOver ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
            >
                {isEditing ? (
                  <form onSubmit={(e) => handleRename(e, folder.id)} className="px-3 py-1 flex items-center space-x-1">
                    <input 
                      autoFocus
                      type="text" 
                      className="flex-1 text-xs px-2 py-1 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-none outline-none" 
                      value={editFolderName}
                      onChange={e => setEditFolderName(e.target.value)}
                    />
                    <button type="submit" className="text-green-600"><Check className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => setEditingFolderId(null)} className="text-red-600"><X className="w-3.5 h-3.5" /></button>
                  </form>
                ) : (
                  <div 
                      className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm group rounded-none ${isSelected ? 'bg-[#d9d9d9] dark:bg-slate-700 font-bold' : 'hover:bg-[#e6e6e6] dark:hover:bg-slate-800'}`}
                  >
                      <div className="flex items-center overflow-hidden flex-1" onClick={() => handleInteraction(() => onSelectFolder && onSelectFolder(folder.id))}>
                          <span className="mr-2 text-yellow-600 dark:text-yellow-500 shrink-0" onClick={(e) => { e.stopPropagation(); onToggleFolder(folder.id); }}>
                              {folder.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </span>
                          <span className="mr-2 text-yellow-600 dark:text-yellow-500 shrink-0">
                               {folder.isExpanded ? <FolderOpen className="w-4 h-4" /> : <FolderIcon className="w-4 h-4" />}
                          </span>
                          <span className={`truncate text-gray-700 dark:text-gray-300 ${isSelected ? 'text-black dark:text-white' : ''}`}>{folder.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {folderUnread > 0 && editingFolderId !== folder.id && <span className="text-gray-400 text-xs">{folderUnread}</span>}
                        <button 
                          onClick={(e) => startRenaming(e, folder)}
                          className="p-1 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => promptDelete(e, 'folder', folder.id, folder.name)}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                  </div>
                )}

                {folder.isExpanded && (
                <div className="ml-0">
                    {folderFeeds.map(feed => (
                        <SidebarItem
                            key={feed.url}
                            draggable
                            onDragStart={(e: any) => handleDragStart(e, feed.url)}
                            label={feed.title}
                            count={getUnreadCount(feed.url)}
                            isActive={selectedFeedId === feed.url}
                            isLoading={loadingFeedUrls?.has(feed.url)}
                            onClick={() => handleInteraction(() => onSelectFeed(feed.url))}
                            icon={<Rss className="w-3.5 h-3.5 text-orange-500 ml-3" />}
                            onDelete={(e: React.MouseEvent) => promptDelete(e, 'feed', feed.url, feed.title)}
                        />
                    ))}
                </div>
                )}
            </div>
            );
        })}
      </div>

      {/* SUBSCRIPTIONS (ORPHAN FEEDS) */}
      {orphanFeeds.length > 0 && (
          <div>
              <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Subscriptions</div>
             {orphanFeeds.map((feed) => (
                  <SidebarItem
                    key={feed.url}
                    draggable
                    onDragStart={(e: any) => handleDragStart(e, feed.url)}
                    label={feed.title}
                    count={getUnreadCount(feed.url)}
                    isActive={selectedFeedId === feed.url}
                    isLoading={loadingFeedUrls?.has(feed.url)}
                    onClick={() => handleInteraction(() => onSelectFeed(feed.url))}
                    icon={<Rss className="w-3.5 h-3.5 text-orange-500" />}
                    onDelete={(e: React.MouseEvent) => promptDelete(e, 'feed', feed.url, feed.title)}
                />
            ))}
          </div>
      )}

      {/* Add Feed Button at bottom */}
      <div className="mt-auto px-3 pt-4">
          <button 
            onClick={onAddFeed}
            className="w-full flex items-center justify-center space-x-2 py-2 border-2 border-dashed border-gray-300 dark:border-slate-700 text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-all text-xs font-bold uppercase tracking-widest rounded-none"
          >
              <Plus className="w-4 h-4" />
              <span>Add Source</span>
          </button>
      </div>
    </div>

    {/* Custom Delete Confirmation Modal */}
    {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-slate-800 shadow-xl max-w-sm w-full border border-gray-300 dark:border-slate-600 rounded-sm">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-red-50 dark:bg-red-900/10">
                    <h2 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Confirm Deletion
                    </h2>
                    <button onClick={() => setDeleteTarget(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                        Are you sure you want to remove <span className="font-bold">{deleteTarget.name}</span>?
                        {deleteTarget.type === 'folder' && (
                            <span className="block mt-2 text-xs text-gray-500">Feeds inside this folder will be moved to Subscriptions.</span>
                        )}
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

export default Sidebar;
