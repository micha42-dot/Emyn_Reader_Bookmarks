import React, { useState } from 'react';
import { X, Save, Wand2, Loader2, Link as LinkIcon, FolderPlus } from 'lucide-react';
import { Bookmark, BookmarkFolder } from '../../types';

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (b: Bookmark) => void;
  folders: BookmarkFolder[];
  onCreateFolder: (name: string) => Promise<string> | string;
}

const AddBookmarkModal: React.FC<AddBookmarkModalProps> = ({ isOpen, onClose, onAdd, folders, onCreateFolder }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [folderId, setFolderId] = useState('');
  const [notes, setNotes] = useState('');
  const [isUnread, setIsUnread] = useState(false);
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAutoFill = async () => {
      if (!url) return;
      setIsLoading(true);
      try {
          // Using Microlink API free tier
          const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
          const data = await response.json();
          if (data.status === 'success') {
              setTitle(data.data.title || '');
              setDescription(data.data.description || '');
          }
      } catch (e) {
          console.error("Autofill failed", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalFolderId = folderId;
    
    // Create new folder if in creation mode
    if (isCreatingFolder && newFolderName.trim()) {
        finalFolderId = await onCreateFolder(newFolderName.trim());
    }

    const newBookmark: Bookmark = {
        id: Date.now().toString(),
        url,
        title: title || url,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        folderId: finalFolderId || undefined,
        isUnread,
        notes,
        createdAt: new Date().toISOString()
    };
    onAdd(newBookmark);
    // Reset
    setUrl(''); setTitle(''); setDescription(''); setTags(''); setFolderId(''); setNotes(''); setIsUnread(false);
    setIsCreatingFolder(false); setNewFolderName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4">
      <div className="bg-white dark:bg-slate-800 shadow-xl max-w-lg w-full border border-gray-300 dark:border-slate-600 rounded-sm">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center uppercase tracking-wide">
            <LinkIcon className="w-4 h-4 mr-2 text-blue-600" />
            Save Bookmark
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL</label>
                <input
                  type="url"
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-sm text-sm dark:bg-slate-900 dark:text-white"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={handleAutoFill} // Auto trigger on blur
                />
              </div>
              <div className="pt-5">
                   <button type="button" onClick={handleAutoFill} disabled={isLoading || !url} className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-sm border border-blue-200 dark:border-blue-800 hover:bg-blue-100">
                       {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                   </button>
              </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-sm text-sm dark:bg-slate-900 dark:text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-sm text-sm dark:bg-slate-900 dark:text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="tech, react, design"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-sm text-sm dark:bg-slate-900 dark:text-white"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Folder</label>
                <div className="flex space-x-1">
                    {isCreatingFolder ? (
                        <input 
                            autoFocus
                            type="text"
                            placeholder="New Folder Name"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-sm text-sm dark:bg-slate-900 dark:text-white"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                        />
                    ) : (
                        <select 
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-sm text-sm dark:bg-slate-900 dark:text-white"
                            value={folderId}
                            onChange={(e) => setFolderId(e.target.value)}
                        >
                            <option value="">(None)</option>
                            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    )}
                    <button 
                        type="button" 
                        onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                        className={`px-2 border rounded-sm ${isCreatingFolder ? 'bg-gray-200 text-gray-600' : 'bg-white text-gray-500 hover:text-blue-600'}`}
                        title={isCreatingFolder ? "Cancel new folder" : "Create new folder"}
                    >
                        {isCreatingFolder ? <X className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                    </button>
                </div>
             </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Private Notes</label>
            <textarea
              rows={3}
              placeholder="Why did you save this?"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-sm text-sm dark:bg-slate-900 dark:text-white font-mono bg-yellow-50 dark:bg-yellow-900/10"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center">
              <input 
                type="checkbox" 
                id="unread" 
                checked={isUnread} 
                onChange={e => setIsUnread(e.target.checked)} 
                className="mr-2"
              />
              <label htmlFor="unread" className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">Mark as To Read</label>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-sm text-sm font-medium border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!url}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm text-sm font-bold uppercase hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" /> Save Bookmark
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookmarkModal;
