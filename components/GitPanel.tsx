'use client';

import { useState, useEffect, useRef } from 'react';
import { GitCommit, FileText, GitBranch, Download, Upload, RefreshCw } from 'lucide-react';
import * as git from '@/lib/git';

interface ChangedFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'unmodified';
  staged: boolean;
}

interface GitPanelProps {
  repoUrl: string;
  token: string;
  userName?: string;
  userEmail?: string;
  isDarkTheme?: boolean;
}

export default function GitPanel({ 
  repoUrl,
  token, 
  userName = 'User',
  userEmail = 'user@example.com',
  isDarkTheme = true,
}: GitPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneProgress, setCloneProgress] = useState<git.CloneProgress | null>(null);
  const [changes, setChanges] = useState<ChangedFile[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [branches, setBranches] = useState<string[]>([]);
  const [isRepoCloned, setIsRepoCloned] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showBranchInput, setShowBranchInput] = useState(false);
  const autoCloneTriggered = useRef(false);

  const gitConfig: git.GitConfig = {
    token,
    name: userName,
    email: userEmail,
  };

  // Check if repo is cloned and load status
  useEffect(() => {
    autoCloneTriggered.current = false;
    setIsRepoCloned(false);
    setChanges([]);
    setBranches([]);
    setCurrentBranch('main');
  }, [repoUrl, token]);

  useEffect(() => {
    const checkRepo = async () => {
      if (!repoUrl) return;
      try {
        const cloned = await git.isRepoCloned();
        setIsRepoCloned(cloned);
        
        if (cloned) {
          await loadGitStatus();
          return;
        }

        if (!autoCloneTriggered.current) {
          autoCloneTriggered.current = true;
          await handleClone();
        }
      } catch (error) {
        console.error('Error checking repo:', error);
      }
    };

    if (typeof window !== 'undefined') {
      checkRepo();
    }
  }, [repoUrl, token]);

  const loadGitStatus = async () => {
    try {
      const [branch, branchList, statusMatrix] = await Promise.all([
        git.getCurrentBranch(),
        git.listBranches(),
        git.getStatusMatrix(),
      ]);

      setCurrentBranch(branch);
      setBranches(branchList);

      // Convert status matrix to ChangedFile format
      const changedFiles: ChangedFile[] = statusMatrix.map((file) => {
        let status: 'modified' | 'added' | 'deleted' | 'unmodified' = 'unmodified';
        
        if (file.head === 0 && file.workdir === 2) {
          status = 'added';
        } else if (file.head === 1 && file.workdir === 0) {
          status = 'deleted';
        } else if (file.head === 1 && file.workdir === 2) {
          status = 'modified';
        }

        return {
          path: file.filepath,
          status,
          staged: file.stage === 2,
        };
      });

      setChanges(changedFiles);
      
      // Update staged files set
      const staged = new Set(
        changedFiles.filter((f) => f.staged).map((f) => f.path)
      );
      setStagedFiles(staged);
    } catch (error) {
      console.error('Error loading git status:', error);
    }
  };

  const handleClone = async () => {
    setCloning(true);
    setCloneProgress(null);
    
    try {
      await git.cloneRepo(repoUrl, gitConfig, (progress) => {
        setCloneProgress(progress);
      });
      
      setIsRepoCloned(true);
      await loadGitStatus();
      alert('Repository cloned successfully!');
    } catch (error) {
      console.error('Clone error:', error);
      alert(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCloning(false);
      setCloneProgress(null);
    }
  };

  const handleCheckout = async (branchName: string) => {
    try {
      await git.checkoutBranch(branchName);
      await loadGitStatus();
      alert(`Switched to branch: ${branchName}`);
    } catch (error) {
      console.error('Checkout error:', error);
      alert(`Failed to checkout branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      alert('Please enter a branch name');
      return;
    }

    try {
      await git.createBranch(newBranchName);
      await git.checkoutBranch(newBranchName);
      await loadGitStatus();
      setNewBranchName('');
      setShowBranchInput(false);
      alert(`Created and switched to branch: ${newBranchName}`);
    } catch (error) {
      console.error('Create branch error:', error);
      alert(`Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleStage = async (filePath: string) => {
    try {
      if (stagedFiles.has(filePath)) {
        await git.unstageFile(filePath);
      } else {
        await git.stageFile(filePath);
      }
      await loadGitStatus();
    } catch (error) {
      console.error('Stage/unstage error:', error);
      alert(`Failed to stage/unstage file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stageAll = async () => {
    try {
      const filePaths = changes.map((c) => c.path);
      await git.stageAll(filePaths);
      await loadGitStatus();
    } catch (error) {
      console.error('Stage all error:', error);
      alert(`Failed to stage all files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const unstageAll = async () => {
    try {
      for (const filePath of stagedFiles) {
        await git.unstageFile(filePath);
      }
      await loadGitStatus();
    } catch (error) {
      console.error('Unstage all error:', error);
      alert(`Failed to unstage all files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || stagedFiles.size === 0) {
      alert('Please enter a commit message and stage at least one file');
      return;
    }

    setCommitting(true);
    try {
      const sha = await git.commit(commitMessage, gitConfig);
      console.log('Committed:', sha);
      
      alert('Committed successfully!');
      setCommitMessage('');
      await loadGitStatus();
    } catch (error) {
      console.error('Commit error:', error);
      alert(`Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCommitting(false);
    }
  };

  const handlePush = async () => {
    setPushing(true);
    try {
      await git.push(gitConfig, currentBranch);
      alert('Pushed successfully!');
    } catch (error) {
      console.error('Push error:', error);
      alert(`Failed to push: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    try {
      await git.pull(gitConfig);
      await loadGitStatus();
      alert('Pulled successfully!');
    } catch (error) {
      console.error('Pull error:', error);
      alert(`Failed to pull: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPulling(false);
    }
  };

  if (!isRepoCloned) {
    return (
      <div className="fixed right-4 bottom-4 z-30">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
          <Download className="w-5 h-5" />
          <span>{cloning ? 'Cloning repository...' : 'Preparing repository...'}</span>
        </div>
        {cloneProgress && (
          <div className="mt-2 text-sm text-white bg-black bg-opacity-70 px-3 py-2 rounded">
            {cloneProgress.phase}: {cloneProgress.loaded} / {cloneProgress.total}
          </div>
        )}
      </div>
    );
  }

  if (changes.length === 0 && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 bottom-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors z-30"
        title="View Git Panel"
      >
        <GitCommit className="w-5 h-5" />
        <span className="font-semibold">Git</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-4 bottom-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors z-30`}
        title="View Changes"
      >
        <GitCommit className="w-5 h-5" />
        <span className="font-semibold">{changes.length}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`fixed right-0 top-0 bottom-0 w-96 ${
              isDarkTheme ? 'bg-vscode-sidebar' : 'bg-white'
            } shadow-2xl z-50 flex flex-col`}
          >
            <div
              className={`h-12 px-4 flex items-center justify-between border-b ${
                isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
              }`}
            >
              <h2 className="text-vscode-text font-semibold">Source Control</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-vscode-text hover:text-blue-500"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Branch selector and actions */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-vscode-text" />
                  <select
                    value={currentBranch}
                    onChange={(e) => handleCheckout(e.target.value)}
                    className={`flex-1 px-2 py-1 ${
                      isDarkTheme ? 'bg-vscode-editor text-vscode-text' : 'bg-gray-50 text-gray-900'
                    } border ${
                      isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
                    } rounded text-sm`}
                  >
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>
                
                {showBranchInput ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="New branch name"
                      className={`flex-1 px-2 py-1 ${
                        isDarkTheme ? 'bg-vscode-editor text-vscode-text' : 'bg-gray-50 text-gray-900'
                      } border ${
                        isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
                      } rounded text-sm`}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                    />
                    <button
                      onClick={handleCreateBranch}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowBranchInput(false);
                        setNewBranchName('');
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBranchInput(true)}
                    className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    + New Branch
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handlePull}
                    disabled={pulling}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
                  >
                    <Download className="w-3 h-3" />
                    {pulling ? 'Pulling...' : 'Pull'}
                  </button>
                  <button
                    onClick={handlePush}
                    disabled={pushing}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm"
                  >
                    <Upload className="w-3 h-3" />
                    {pushing ? 'Pushing...' : 'Push'}
                  </button>
                  <button
                    onClick={loadGitStatus}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                    title="Refresh"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message"
                  className={`w-full px-3 py-2 ${
                    isDarkTheme ? 'bg-vscode-editor text-vscode-text' : 'bg-gray-50 text-gray-900'
                  } border ${
                    isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
                  } rounded text-sm resize-none`}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleCommit}
                  disabled={committing || stagedFiles.size === 0 || !commitMessage.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                >
                  <GitCommit className="w-4 h-4" />
                  {committing ? 'Committing...' : `Commit (${stagedFiles.size})`}
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-vscode-text text-sm font-semibold">
                    Changes ({changes.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={stageAll}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      Stage All
                    </button>
                    <button
                      onClick={unstageAll}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      Unstage All
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {changes.map((change) => (
                    <div
                      key={change.path}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                        isDarkTheme ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => toggleStage(change.path)}
                    >
                      <input
                        type="checkbox"
                        checked={change.staged}
                        onChange={() => toggleStage(change.path)}
                        className="cursor-pointer"
                      />
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="text-vscode-text text-sm flex-1 truncate">
                        {change.path}
                      </span>
                      <span className={`text-xs font-semibold ${
                        change.status === 'added' ? 'text-green-500' :
                        change.status === 'deleted' ? 'text-red-500' :
                        'text-yellow-500'
                      }`}>
                        {change.status === 'added' ? 'A' :
                         change.status === 'deleted' ? 'D' : 'M'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`text-xs text-vscode-text opacity-70 mt-4 p-3 rounded ${
                isDarkTheme ? 'bg-vscode-editor' : 'bg-gray-50'
              }`}>
                <p className="mb-2">💡 Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Files are stored in IndexedDB (browser)</li>
                  <li>Select files to stage them for commit</li>
                  <li>Commit locally, then push to GitHub</li>
                  <li>Use Pull to sync from remote</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
