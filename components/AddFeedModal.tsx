import React, { useState } from 'react';
import { X, Plus, Rss } from 'lucide-react';

interface AddFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string) => Promise<void>;
}

const AddFeedModal: React.FC<AddFeedModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await onAdd(url.trim());
      setUrl('');
      onClose();
    } catch (err) {
      setError('Failed to add feed. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4">
      <div className="bg-white dark:bg-slate-800 shadow-xl max-w-md w-full border border-gray-300 dark:border-slate-600 rounded-sm">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center uppercase tracking-wide">
            <Rss className="w-4 h-4 mr-2 text-blue-600" />
            Add New Feed
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="feed-url" className="block text-xs font-bold text-slate-500 uppercase mb-1">
              RSS Feed URL
            </label>
            <input
              id="feed-url"
              type="url"
              placeholder="https://example.com/rss"
              className="w-full px-3 py-2 border border-slate-300 rounded-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
            {error && <p className="mt-2 text-xs text-red-500 font-bold">{error}</p>}
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-sm text-sm font-medium border border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !url}
              className={`flex items-center px-4 py-2 bg-[#84cc16] text-white rounded-sm text-sm font-bold uppercase hover:bg-[#65a30d] border-b-2 border-[#65a30d] active:border-b-0 active:translate-y-[2px] transition-all ${
                isLoading || !url ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Loading...' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFeedModal;