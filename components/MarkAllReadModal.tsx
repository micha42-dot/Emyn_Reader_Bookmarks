
import React from 'react';
import { X, CheckCheck, AlertCircle } from 'lucide-react';

interface MarkAllReadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
}

const MarkAllReadModal: React.FC<MarkAllReadModalProps> = ({ isOpen, onClose, onConfirm, count }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 shadow-xl max-w-sm w-full border border-gray-300 dark:border-slate-600 rounded-sm" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center uppercase tracking-wide">
            <CheckCheck className="w-4 h-4 mr-2 text-blue-600" />
            Mark all as read
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-start space-x-3 mb-4">
             <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-full">
                 <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
             </div>
             <div>
                 <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    Are you sure?
                 </p>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    This will mark <span className="font-bold text-slate-900 dark:text-white">{count}</span> visible articles as read. This action cannot be easily undone.
                 </p>
             </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300 rounded-sm text-xs font-bold uppercase border border-gray-300 dark:border-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-sm text-xs font-bold uppercase hover:bg-blue-700 border border-blue-700"
            >
              Yes, Mark All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkAllReadModal;
