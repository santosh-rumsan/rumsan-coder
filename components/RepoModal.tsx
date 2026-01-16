'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

interface RepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  token?: string;
}

interface RepoSummary {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  updated_at: string;
}

const parseGitHubRepoUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.startsWith('github.com/') ? `https://${trimmed}` : trimmed;

  try {
    const url = new URL(normalized);
    if (!['github.com', 'www.github.com'].includes(url.hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');
    if (!owner || !repo) return null;
    return `https://github.com/${owner}/${repo}`;
  } catch {
    return null;
  }
};

export default function RepoModal({ isOpen, onClose, onSubmit, token }: RepoModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setRepoSearch('');
    if (!token) {
      setRepos([]);
      return;
    }

    const controller = new AbortController();
    const loadRepos = async () => {
      setIsLoadingRepos(true);
      try {
        const response = await fetch(
          'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
            },
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error('Failed to load repositories');
        }
        const data = await response.json();
        setRepos(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Could not load repositories.');
        setRepos([]);
      } finally {
        setIsLoadingRepos(false);
      }
    };

    loadRepos();
    return () => controller.abort();
  }, [isOpen, token]);

  const filteredRepos = useMemo(() => {
    if (!repoSearch.trim()) return repos;
    const query = repoSearch.trim().toLowerCase();
    return repos.filter((repo) => repo.full_name.toLowerCase().includes(query));
  }, [repos, repoSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = parseGitHubRepoUrl(url);
    if (!normalizedUrl) {
      setError('Enter a valid GitHub repository URL.');
      return;
    }
    onSubmit(normalizedUrl);
    setUrl('');
    onClose();
  };

  const handleRepoSelect = (repoUrl: string) => {
    setError(null);
    onSubmit(repoUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-vscode-text">Load GitHub Repository</h2>
          <button
            onClick={onClose}
            className="text-vscode-text hover:text-blue-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-vscode-text text-sm mb-2">
              Repository URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://github.com/username/repository"
              className="w-full bg-vscode-bg border border-vscode-border rounded px-3 py-2 text-vscode-text focus:outline-none focus:border-blue-500"
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-300 mt-2">{error}</p>
            )}
          </div>
          <div className="border border-vscode-border rounded-lg p-3 bg-vscode-bg/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide text-vscode-text opacity-70">Your repositories</span>
              {isLoadingRepos && (
                <span className="text-xs text-vscode-text opacity-70">Loading...</span>
              )}
            </div>
            <input
              type="text"
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              placeholder="Search repositories"
              className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-vscode-text text-sm focus:outline-none focus:border-blue-500 mb-3"
            />
            <div className="max-h-56 overflow-y-auto space-y-2">
              {!token ? (
                <p className="text-xs text-vscode-text opacity-70">Sign in to load repositories.</p>
              ) : filteredRepos.length === 0 && !isLoadingRepos ? (
                <p className="text-xs text-vscode-text opacity-70">No repositories found.</p>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => handleRepoSelect(repo.html_url)}
                    className="w-full text-left px-3 py-2 rounded border border-transparent hover:border-blue-500 hover:bg-vscode-hover text-vscode-text text-sm transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{repo.full_name}</span>
                      {repo.private && (
                        <span className="text-[10px] uppercase tracking-wide text-yellow-300">Private</span>
                      )}
                    </div>
                    <div className="text-xs opacity-70">Updated {new Date(repo.updated_at).toLocaleDateString()}</div>
                  </button>
                ))
              )}
            </div>
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
