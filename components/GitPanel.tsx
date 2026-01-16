'use client';

import { useState, useEffect, useRef } from 'react';
import { GitCommit, FileText, GitBranch, Download, Upload, RefreshCw, Plus, Minus, RotateCcw } from 'lucide-react';
import { useAlert } from '@/components/AlertProvider';
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
  variant?: 'floating' | 'panel';
  isActive?: boolean;
  onOpenDiff?: (path: string, status: ChangedFile['status']) => void;
  onCloneStatus?: (status: { state: 'idle' | 'cloning'; progress?: git.CloneProgress | null }) => void;
  autoClone?: boolean;
  currentBranch?: string;
  onBranchChange?: (branch: string) => void;
  refreshKey?: number;
  onChangesCount?: (count: number) => void;
}

export default function GitPanel({ 
  repoUrl,
  token, 
  userName = 'User',
  userEmail = 'user@example.com',
  isDarkTheme = true,
  variant = 'floating',
  isActive = false,
  onOpenDiff,
  onCloneStatus,
  autoClone = true,
  currentBranch: currentBranchProp,
  onBranchChange,
  refreshKey,
  onChangesCount,
}: GitPanelProps) {
  const { notify } = useAlert();
  const isPanel = variant === 'panel';
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
  const [isRepoCloned, setIsRepoCloned] = useState(false);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [createBranchName, setCreateBranchName] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [aheadCount, setAheadCount] = useState(0);
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
    setCurrentBranch('main');
    onChangesCount?.(0);
  }, [repoUrl, token]);

  useEffect(() => {
    if (currentBranchProp && currentBranchProp !== currentBranch) {
      setCurrentBranch(currentBranchProp);
    }
  }, [currentBranchProp, currentBranch]);

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

        if (autoClone && !autoCloneTriggered.current) {
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

  useEffect(() => {
    if (variant !== 'panel') return;
    if (typeof window === 'undefined') return;
    if (!isRepoCloned) return;
    loadGitStatus();
  }, [variant, isRepoCloned]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isRepoCloned) return;
    loadGitStatus();
  }, [refreshKey, isRepoCloned]);

  const loadGitStatus = async () => {
    try {
      const [branch, statusMatrix] = await Promise.all([
        git.getCurrentBranch(),
        git.getStatusMatrix(),
      ]);

      setCurrentBranch(branch);
      if (onBranchChange) {
        onBranchChange(branch);
      }
      const ahead = await git.getAheadCount(branch);
      setAheadCount(ahead);

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
      onChangesCount?.(changedFiles.length);
      
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
    onCloneStatus?.({ state: 'cloning', progress: null });
    
    try {
      await git.cloneRepo(repoUrl, gitConfig, (progress) => {
        setCloneProgress(progress);
        onCloneStatus?.({ state: 'cloning', progress });
      });
      
      setIsRepoCloned(true);
      await loadGitStatus();
      notify({ type: 'success', message: 'Repository cloned successfully.' });
    } catch (error) {
      console.error('Clone error:', error);
      notify({
        type: 'error',
        message: `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setCloning(false);
      setCloneProgress(null);
      onCloneStatus?.({ state: 'idle', progress: null });
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
      notify({
        type: 'error',
        message: `Failed to stage/unstage file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const stageAll = async () => {
    try {
      const filePaths = changes.map((c) => c.path);
      await git.stageAll(filePaths);
      await loadGitStatus();
    } catch (error) {
      console.error('Stage all error:', error);
      notify({
        type: 'error',
        message: `Failed to stage all files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
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
      notify({
        type: 'error',
        message: `Failed to unstage all files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || stagedFiles.size === 0) {
      notify({ type: 'warning', message: 'Enter a commit message and stage at least one file.' });
      return;
    }

    setCommitting(true);
    try {
      const sha = await git.commit(commitMessage, gitConfig);
      console.log('Committed:', sha);
      
      notify({ type: 'success', message: 'Committed successfully.' });
      setCommitMessage('');
      await loadGitStatus();
    } catch (error) {
      console.error('Commit error:', error);
      notify({
        type: 'error',
        message: `Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setCommitting(false);
    }
  };

  const handlePush = async () => {
    setPushing(true);
    try {
      await git.push(gitConfig, currentBranch);
      notify({ type: 'success', message: 'Pushed successfully.' });
      await loadGitStatus();
    } catch (error) {
      console.error('Push error:', error);
      notify({
        type: 'error',
        message: `Failed to push: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    try {
      await git.pull(gitConfig);
      await loadGitStatus();
      notify({ type: 'success', message: 'Pulled successfully.' });
    } catch (error) {
      console.error('Pull error:', error);
      notify({
        type: 'error',
        message: `Failed to pull: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setPulling(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!createBranchName.trim()) return;
    setIsCreatingBranch(true);
    try {
      await git.createBranch(createBranchName);
      await git.checkoutBranch(createBranchName);
      await loadGitStatus();
      setShowCreateBranch(false);
      setCreateBranchName('');
      if (onBranchChange) {
        onBranchChange(createBranchName);
      }
    } catch (error) {
      console.error('Create branch error:', error);
      notify({
        type: 'error',
        message: `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const discardChange = async (filePath: string, status: ChangedFile['status']) => {
    try {
      await git.discardChanges(filePath, status);
      await loadGitStatus();
    } catch (error) {
      console.error('Discard error:', error);
      notify({
        type: 'error',
        message: `Failed to discard changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const stagedChanges = changes.filter((change) => change.staged);
  const unstagedChanges = changes.filter((change) => !change.staged);

  const panelShell = (
    <div
      className={`${isDarkTheme ? 'bg-vscode-sidebar' : 'bg-white'} ${
        isPanel ? 'h-full' : 'fixed right-0 top-0 bottom-0 w-96 shadow-2xl z-50'
      } flex flex-col`}
    >
      {!isPanel && (
        <div
          className={`h-10 px-3 flex items-center justify-between border-b ${
            isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
          }`}
        >
          <h2 className="text-vscode-text text-xs font-semibold tracking-wide uppercase">Source Control</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-vscode-text hover:text-blue-500"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!isRepoCloned ? (
          <div className="space-y-3 text-vscode-text text-sm p-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md shadow">
              <Download className="w-4 h-4" />
              <span>{cloning ? 'Cloning repository...' : 'Preparing repository...'}</span>
            </div>
            {cloneProgress && (
              <div className="text-xs bg-black bg-opacity-70 px-3 py-2 rounded text-white">
                {cloneProgress.phase}: {cloneProgress.loaded} / {cloneProgress.total}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="px-3 py-2 border-thin-b">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-vscode-text">
                  <GitBranch className="w-4 h-4" />
                  <span>{currentBranch}</span>
                </div>
                <button
                  onClick={() => setShowCreateBranch(true)}
                  className="p-1 rounded hover:bg-vscode-hover text-vscode-text"
                  title="Create branch"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePull}
                  disabled={pulling}
                  className="p-1 rounded hover:bg-vscode-hover text-vscode-text disabled:opacity-50"
                  title={pulling ? 'Pulling...' : 'Pull'}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePush}
                  disabled={pushing}
                  className={`p-1 rounded hover:bg-vscode-hover text-vscode-text disabled:opacity-50 ${
                    aheadCount > 0 ? 'ring-1 ring-blue-500 text-blue-300' : ''
                  }`}
                  title={
                    pushing
                      ? 'Pushing...'
                      : aheadCount > 0
                        ? `Push (${aheadCount} ahead)`
                        : 'Push'
                  }
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  onClick={loadGitStatus}
                  className="p-1 rounded hover:bg-vscode-hover text-vscode-text"
                  title="Refresh status"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-3 py-2 border-thin-b">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Message (Ctrl+Enter to commit)"
                className={`w-full px-2 py-1 text-xs ${
                  isDarkTheme ? 'bg-vscode-editor text-vscode-text' : 'bg-gray-50 text-gray-900'
                } border ${
                  isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
                } rounded resize-none`}
                rows={3}
              />
              <button
                onClick={handleCommit}
                disabled={committing || stagedFiles.size === 0 || !commitMessage.trim()}
                className="mt-2 w-full flex items-center justify-center gap-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs transition-colors"
              >
                <GitCommit className="w-4 h-4" />
                {committing ? 'Committing...' : `Commit (${stagedFiles.size})`}
              </button>
            </div>

            <div className="py-2">
              <div className="px-3 py-1 flex items-center justify-end">
                <button
                  onClick={unstageAll}
                  className="text-[11px] text-blue-400 hover:text-blue-300"
                >
                  Unstage All
                </button>
              </div>
              {stagedChanges.length === 0 ? (
                <div className="px-3 py-2 text-xs text-vscode-text opacity-60">
                  No staged changes
                </div>
              ) : (
                <div className="space-y-0.5">
                  {stagedChanges.map((change) => (
                    <div
                      key={change.path}
                      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${
                        isDarkTheme ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => onOpenDiff?.(change.path, change.status)}
                    >
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-vscode-text text-xs flex-1 truncate">
                        {change.path}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleStage(change.path);
                        }}
                        className="p-1 rounded hover:bg-vscode-hover text-vscode-text"
                        title="Unstage"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          discardChange(change.path, change.status);
                        }}
                        className="p-1 rounded hover:bg-vscode-hover text-vscode-text"
                        title="Discard changes"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <span className={`text-[11px] font-semibold ${
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
              )}
            </div>

            <div className="py-2 border-thin-t">
              <div className="px-3 py-1 flex items-center justify-end">
                <button
                  onClick={stageAll}
                  className="text-[11px] text-blue-400 hover:text-blue-300"
                >
                  Stage All
                </button>
              </div>
              {unstagedChanges.length === 0 ? (
                <div className="px-3 py-2 text-xs text-vscode-text opacity-60">
                  Working tree clean
                </div>
              ) : (
                <div className="space-y-0.5">
                  {unstagedChanges.map((change) => (
                    <div
                      key={change.path}
                      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${
                        isDarkTheme ? 'hover:bg-vscode-hover' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => onOpenDiff?.(change.path, change.status)}
                    >
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-vscode-text text-xs flex-1 truncate">
                        {change.path}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleStage(change.path);
                        }}
                        className="p-1 rounded hover:bg-vscode-hover text-vscode-text"
                        title="Stage"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          discardChange(change.path, change.status);
                        }}
                        className="p-1 rounded hover:bg-vscode-hover text-vscode-text"
                        title="Discard changes"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <span className={`text-[11px] font-semibold ${
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
              )}
            </div>
          </>
        )}
      </div>
      {showCreateBranch && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              if (isCreatingBranch) return;
              setShowCreateBranch(false);
              setCreateBranchName('');
            }}
          />
          <div
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] ${
              isDarkTheme ? 'bg-vscode-sidebar' : 'bg-white'
            } border ${
              isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
            } rounded shadow-xl z-50 p-4`}
          >
            <div className="text-vscode-text text-xs font-semibold uppercase tracking-wide mb-3">
              Create Branch
            </div>
            <input
              type="text"
              value={createBranchName}
              onChange={(e) => setCreateBranchName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateBranch()}
              placeholder="Branch name"
              disabled={isCreatingBranch}
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
                disabled={isCreatingBranch}
                className="flex-1 px-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded"
              >
                {isCreatingBranch ? 'Creating branch...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateBranch(false);
                  setCreateBranchName('');
                }}
                disabled={isCreatingBranch}
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

  if (isPanel) {
    return panelShell;
  }

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
          {panelShell}
        </>
      )}
    </>
  );
}
