/**
 * Type definitions for git operations
 */

export interface GitConfig {
  token: string;
  name?: string;
  email?: string;
}

export interface CloneProgress {
  phase: string;
  loaded: number;
  total: number;
}

export interface StatusFile {
  filepath: string;
  head: number;
  workdir: number;
  stage: number;
}

export interface CommitInfo {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
}

export interface FileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'unmodified';
  staged: boolean;
}
