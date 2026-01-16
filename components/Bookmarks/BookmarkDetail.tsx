import React, { useState } from 'react';
import { Bookmark, BookmarkFolder } from '../../types';
import { ArrowLeft, ExternalLink, Save, Clock, Tag as TagIcon, Folder, Edit2, X, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface BookmarkDetailProps {
  bookmark: Bookmark;
  folders: BookmarkFolder[];
  onClose: () => void;
  onUpdate: (b: Bookmark) => void;
}

const BookmarkDetail: React.FC<BookmarkDetailProps> = ({ bookmark, folders, onClose, onUpdate }) => {
  // State for content
  const [title, setTitle] = useState(bookmark.title);
  const [description, setDescription] = useState(bookmark.description);
  const [folderId, setFolderId] = useState(bookmark.folderId || '');
  const [tags, setTags] = useState(bookmark.tags.join(', '));
  const [notes, setNotes] = useState(bookmark.notes);
  const [isUnread, setIsUnread] = useState(bookmark.isUnread);

  // Edit Modes
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Handlers
  const handleSaveDetails = () => {
      onUpdate({
          ...bookmark,
          title,
          description,
          folderId: folderId || undefined,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          isUnread
      });
      setIsEditingDetails(false);
  };

  const handleSaveNotes = () => {
      onUpdate({
          ...bookmark,
          notes
      });
      setIsEditingNotes(false);
  };

  const handleToggleUnread = () => {
      const newState = !isUnread;
      setIsUnread(newState);
      onUpdate({ ...bookmark, isUnread: newState });
  };

  const folderName = folders.find(f => f.id === bookmark.folderId)?.name;

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-slate-900 rounded-sm shadow-sm overflow-hidden border border-gray-200 dark:border-slate-800">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 shrink-0">
            <button onClick={onClose} className="flex items-center text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>
            <div className="flex items-center space-x-3">
                 <button 
                    onClick={handleToggleUnread} 
                    className={`text-xs font-bold px-3 py-1 rounded-sm border transition-colors ${isUnread ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-300'}`}
                 >
                     {isUnread ? 'To Read' : 'Read'}
                 </button>
            </div>
        </div>

        {/* Content Container - Split 2/3 (Details) and 1/3 (Notes) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* TOP SECTION: DETAILS (approx 2/3) */}
            <div className="flex-[2] overflow-y-auto p-8 bg-white dark:bg-slate-900">
                 
                 {/* Details Toolbar */}
                 <div className="flex justify-between items-start mb-6">
                     <div className="flex items-center text-xs text-gray-400">
                        <Clock className="w-3 h-3 mr-1.5" />
                        Saved on {format(new Date(bookmark.createdAt), 'MMM d, yyyy')}
                     </div>
                     {!isEditingDetails && (
                         <button 
                            onClick={() => setIsEditingDetails(true)} 
                            className="flex items-center px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-sm transition-colors"
                         >
                             <Edit2 className="w-3 h-3 mr-2" /> Edit Details
                         </button>
                     )}
                 </div>

                 {isEditingDetails ? (
                    // --- EDIT MODE DETAILS ---
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title</label>
                            <input 
                                className="w-full text-lg font-bold p-2 border border-gray-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link</label>
                             <div className="text-sm text-blue-500 mb-2 truncate">{bookmark.url}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                            <textarea 
                                rows={4}
                                className="w-full text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Folder</label>
                                <select 
                                    className="w-full text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                                    value={folderId}
                                    onChange={e => setFolderId(e.target.value)}
                                >
                                    <option value="">(None)</option>
                                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tags</label>
                                <input 
                                    className="w-full text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-sm bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    placeholder="Comma separated..."
                                />
                             </div>
                        </div>
                        <div className="flex space-x-2 pt-2">
                             <button onClick={handleSaveDetails} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-sm hover:bg-green-700 flex items-center">
                                 <Save className="w-3 h-3 mr-2" /> Save Details
                             </button>
                             <button onClick={() => setIsEditingDetails(false)} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-sm hover:bg-gray-300 flex items-center">
                                 <X className="w-3 h-3 mr-2" /> Cancel
                             </button>
                        </div>
                    </div>
                 ) : (
                    // --- READ MODE DETAILS ---
                    <div className="space-y-6">
                        <div>
                             <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 leading-tight">
                                {title}
                             </h1>
                             <a href={bookmark.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center break-all">
                                {bookmark.url} <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
                             </a>
                        </div>

                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-l-2 border-gray-200 dark:border-slate-700 pl-4">
                            {description || <span className="text-gray-400 italic">No description provided.</span>}
                        </div>

                        {/* Metadata Row: Folder & Tags under Description */}
                        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                             {/* Folder */}
                             <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                 <Folder className="w-4 h-4 mr-2 text-yellow-600 dark:text-yellow-500" />
                                 <span className="font-semibold mr-1">Folder:</span>
                                 {folderName ? (
                                     <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                                         {folderName}
                                     </span>
                                 ) : (
                                     <span className="text-gray-400 italic">None</span>
                                 )}
                             </div>

                             <div className="w-px h-4 bg-gray-300 dark:bg-slate-700"></div>

                             {/* Tags */}
                             <div className="flex items-center">
                                 <TagIcon className="w-4 h-4 mr-2 text-blue-500" />
                                 <span className="font-semibold text-sm text-gray-600 dark:text-gray-400 mr-2">Tags:</span>
                                 <div className="flex flex-wrap gap-1">
                                     {bookmark.tags.length > 0 ? bookmark.tags.map((t, i) => (
                                         <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-sm border border-blue-100 dark:border-blue-800">
                                             {t}
                                         </span>
                                     )) : <span className="text-sm text-gray-400 italic">None</span>}
                                 </div>
                             </div>
                        </div>
                    </div>
                 )}
            </div>

            {/* BOTTOM SECTION: NOTES (approx 1/3) */}
            <div className="flex-[1] min-h-[250px] bg-yellow-50 dark:bg-slate-950/50 border-t-4 border-gray-200 dark:border-slate-800 flex flex-col">
                 
                 {/* Notes Header */}
                 <div className="flex items-center justify-between px-6 py-3 border-b border-yellow-100 dark:border-slate-800/50 bg-yellow-100/50 dark:bg-slate-900">
                     <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center">
                         <FileText className="w-4 h-4 mr-2" /> Personal Notes
                     </h3>
                     {!isEditingNotes && (
                         <button 
                            onClick={() => setIsEditingNotes(true)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white dark:bg-slate-800 px-2 py-1 rounded-sm border border-blue-200 dark:border-slate-700 shadow-sm transition-colors"
                         >
                            Edit Notes
                         </button>
                     )}
                     {isEditingNotes && (
                         <div className="flex space-x-2">
                             <button onClick={handleSaveNotes} className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-sm hover:bg-green-200">Save</button>
                             <button onClick={() => setIsEditingNotes(false)} className="text-xs font-bold text-gray-600 bg-gray-200 px-2 py-1 rounded-sm hover:bg-gray-300">Cancel</button>
                         </div>
                     )}
                 </div>

                 {/* Notes Content */}
                 <div className="flex-1 p-6 overflow-y-auto">
                     {isEditingNotes ? (
                         <textarea 
                            className="w-full h-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 p-4 font-mono text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none resize-none rounded-sm"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Type your notes here..."
                            autoFocus
                         />
                     ) : (
                         <div className="prose prose-sm dark:prose-invert max-w-none font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                             {notes ? notes : <span className="text-gray-400 italic opacity-60">No notes added yet. Click "Edit Notes" to add some thoughts.</span>}
                         </div>
                     )}
                 </div>
            </div>

        </div>
    </div>
  );
};

export default BookmarkDetail;