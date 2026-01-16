/**
 * React hook for git operations
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import * as git from './git';

export interface UseGitOptions {
  repoUrl: string;
  token: string;
  userName?: string;
  userEmail?: string;
}

export interface UseGitReturn {
  // State
  isRepoCloned: boolean;
  currentBranch: string;
  branches: string[];
  changes: git.StatusFile[];
  isLoading: boolean;
  error: string | null;
  
  // Operations
  clone: () => Promise<void>;
  checkout: (branch: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  stage: (filepath: string) => Promise<void>;
  unstage: (filepath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  commit: (message: string) => Promise<string>;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  refresh: () => Promise<void>;
  readFile: (filepath: string) => Promise<string>;
  writeFile: (filepath: string, content: string) => Promise<void>;
}

export function useGit({
  repoUrl,
  token,
  userName = 'User',
  userEmail = 'user@example.com',
}: UseGitOptions): UseGitReturn {
  const [isRepoCloned, setIsRepoCloned] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>([]);
  const [changes, setChanges] = useState<git.StatusFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gitConfig: git.GitConfig = {
    token,
    name: userName,
    email: userEmail,
  };

  const refresh = useCallback(async () => {
    try {
      const cloned = await git.isRepoCloned();
      setIsRepoCloned(cloned);

      if (cloned) {
        const [branch, branchList, statusMatrix] = await Promise.all([
          git.getCurrentBranch(),
          git.listBranches(),
          git.getStatusMatrix(),
        ]);

        setCurrentBranch(branch);
        setBranches(branchList);
        setChanges(statusMatrix);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      refresh();
    }
  }, [refresh]);

  const clone = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await git.cloneRepo(repoUrl, gitConfig);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [repoUrl, gitConfig, refresh]);

  const checkout = useCallback(async (branch: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await git.checkoutBranch(branch);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to checkout');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  const createBranch = useCallback(async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await git.createBranch(name);
      await git.checkoutBranch(name);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  const stage = useCallback(async (filepath: string) => {
    setError(null);
    try {
      await git.stageFile(filepath);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stage');
      throw err;
    }
  }, [refresh]);

  const unstage = useCallback(async (filepath: string) => {
    setError(null);
    try {
      await git.unstageFile(filepath);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unstage');
      throw err;
    }
  }, [refresh]);

  const stageAll = useCallback(async () => {
    setError(null);
    try {
      const filepaths = changes.map((c) => c.filepath);
      await git.stageAll(filepaths);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stage all');
      throw err;
    }
  }, [changes, refresh]);

  const unstageAll = useCallback(async () => {
    setError(null);
    try {
      for (const change of changes) {
        if (change.stage === 2) {
          await git.unstageFile(change.filepath);
        }
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unstage all');
      throw err;
    }
  }, [changes, refresh]);

  const commit = useCallback(async (message: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const sha = await git.commit(message, gitConfig);
      await refresh();
      return sha;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [gitConfig, refresh]);

  const push = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await git.push(gitConfig, currentBranch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [gitConfig, currentBranch]);

  const pull = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await git.pull(gitConfig);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pull');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [gitConfig, refresh]);

  const readFile = useCallback(async (filepath: string): Promise<string> => {
    setError(null);
    try {
      return await git.readFile(filepath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      throw err;
    }
  }, []);

  const writeFile = useCallback(async (filepath: string, content: string) => {
    setError(null);
    try {
      await git.writeFile(filepath, content);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to write file');
      throw err;
    }
  }, [refresh]);

  return {
    // State
    isRepoCloned,
    currentBranch,
    branches,
    changes,
    isLoading,
    error,
    
    // Operations
    clone,
    checkout,
    createBranch,
    stage,
    unstage,
    stageAll,
    unstageAll,
    commit,
    push,
    pull,
    refresh,
    readFile,
    writeFile,
  };
}
