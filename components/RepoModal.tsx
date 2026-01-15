'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface RepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

export default function RepoModal({ isOpen, onClose, onSubmit }: RepoModalProps) {
  const [url, setUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url);
      setUrl('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-vscode-text">Load GitHub Repository</h2>
          <button
            onClick={onClose}
            className="text-vscode-text hover:text-blue-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-vscode-text text-sm mb-2">
              Repository URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="w-full bg-vscode-bg border border-vscode-border rounded px-3 py-2 text-vscode-text focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-vscode-text hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Load Repository
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
