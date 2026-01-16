'use client';

import { useState, useEffect } from 'react';
import { GitBranch, Check, Plus } from 'lucide-react';
import { useAlert } from '@/components/AlertProvider';

interface BranchSelectorProps {
  repoInfo: { owner: string; repo: string };
  currentBranch: string;
  onBranchChange: (branch: string) => void;
  token: string;
  isDarkTheme?: boolean;
}

export default function BranchSelector({ 
  repoInfo, 
  currentBranch, 
  onBranchChange, 
  token, 
  isDarkTheme = true 
}: BranchSelectorProps) {
  const { notify } = useAlert();
  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoInfo]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/branches`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setBranches(data.map((b: { name: string }) => b.name));
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (branch: string) => {
    onBranchChange(branch);
    setIsOpen(false);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    setIsCreating(true);
    try {
      // Get the SHA of the current branch
      const refResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs/heads/${currentBranch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const refData = await refResponse.json();
      
      if (!refData.object?.sha) {
        notify({ type: 'error', message: 'Failed to get current branch reference.' });
        return;
      }

      // Create new branch
      const createResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: `refs/heads/${newBranchName}`,
            sha: refData.object.sha,
          }),
        }
      );

      if (createResponse.ok) {
        await loadBranches();
        handleBranchChange(newBranchName);
        setNewBranchName('');
        setShowCreateBranch(false);
      } else {
        const error = await createResponse.json();
        notify({ type: 'error', message: `Failed to create branch: ${error.message}` });
      }
    } catch (error) {
      notify({ type: 'error', message: 'Error creating branch.' });
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`status-bar-button flex items-center gap-2 px-3 py-1.5 border border-transparent ${
          isDarkTheme
            ? 'hover:bg-vscode-hover hover:border-vscode-border'
            : 'hover:bg-gray-300 hover:border-gray-300'
        } text-vscode-text rounded text-xs transition-colors`}
      >
        <GitBranch className="w-4 h-4" />
        <span>{currentBranch}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setShowCreateBranch(false);
            }}
          />
          <div
            className={`absolute bottom-full mb-1 left-0 border ${
              isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
            } rounded shadow-lg z-20 min-w-[200px] max-h-[400px] overflow-y-auto`}
            style={{
              backgroundColor: isDarkTheme ? 'var(--vscode-editor)' : '#ffffff',
            }}
          >
            {loading ? (
              <div className="px-4 py-2 text-vscode-text text-xs">Loading...</div>
            ) : (
              <>
                <div className="py-1">
                  {branches.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => handleBranchChange(branch)}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between ${
                        isDarkTheme ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100'
                      } text-vscode-text`}
                    >
                      <span>{branch}</span>
                      {branch === currentBranch && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
                
                <div className={`border-t ${isDarkTheme ? 'border-vscode-border' : 'border-gray-300'} py-1`}>
                  <button
                    onClick={() => setShowCreateBranch(true)}
                    className={`w-full px-4 py-2 text-left text-xs flex items-center gap-2 ${
                      isDarkTheme ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100'
                    } text-vscode-text`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create new branch</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
      {showCreateBranch && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => {
              if (isCreating) return;
              setShowCreateBranch(false);
              setNewBranchName('');
            }}
          />
          <div
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] ${
              isDarkTheme ? 'bg-vscode-sidebar' : 'bg-white'
            } border ${
              isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
            } rounded shadow-xl z-40 p-4`}
          >
            <div className="text-vscode-text text-xs font-semibold uppercase tracking-wide mb-3">
              Create Branch
            </div>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateBranch()}
              placeholder="Branch name"
              disabled={isCreating}
              className={`w-full px-3 py-2 text-xs ${
                isDarkTheme ? 'bg-vscode-editor text-vscode-text' : 'bg-white text-gray-900'
              } border ${
                isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
              } rounded`}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreateBranch}
                disabled={isCreating}
                className="flex-1 px-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded"
              >
                {isCreating ? 'Creating branch...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateBranch(false);
                  setNewBranchName('');
                }}
                disabled={isCreating}
                className={`flex-1 px-2 py-2 ${
                  isDarkTheme ? 'bg-vscode-hover' : 'bg-gray-200'
                } text-vscode-text text-xs rounded`}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
