/**
 * Git operations using isomorphic-git in the browser
 */
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { getFS } from './fs';

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

const WORK_DIR = '/workspace';

/**
 * Create a custom HTTP client for authenticated requests
 */
function createAuthenticatedHttp(token: string) {
  // Create base64 encoded auth for GitHub's x-access-token format
  const credentials = btoa(`x-access-token:${token}`);
  const authHeader = `Basic ${credentials}`;
  
  // Create a wrapper that intercepts the request method
  const authenticatedHttp = {
    // Copy all properties from the original http module
    ...http,
    
    // Override only the request method
    request: async (options: any) => {
      console.log('[git.http] Request:', options.url || options.path);
      const newOptions = {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: authHeader,
        },
      };
      
      // Call the original http.request method
      const response = await http.request(newOptions);

      console.log('[git.http] Response statusCode:', response?.statusCode);
      console.log('[git.http] Response content-type:', response?.headers?.['content-type']);
      
      return response;
    }
  };
  
  return authenticatedHttp;
}

/**
 * Clone a repository into the browser filesystem
 */
export async function cloneRepo(
  url: string,
  config: GitConfig,
  onProgress?: (progress: CloneProgress) => void
): Promise<void> {
  const fs = getFS();
  const authenticatedHttp = createAuthenticatedHttp(config.token);
  
  // Ensure workspace directory exists
  try {
    await fs.promises.mkdir(WORK_DIR);
  } catch {
    // Directory might already exist
  }

  try {
    await git.clone({
      fs,
      http: authenticatedHttp as any,
      dir: WORK_DIR,
      url,
      corsProxy: '/api/git-proxy',
      singleBranch: false,
      depth: 1,
      onProgress: onProgress
        ? (progress) => {
            console.log('[git.cloneRepo] Progress:', progress);
            onProgress({
              phase: progress.phase,
              loaded: progress.loaded || 0,
              total: progress.total || 0,
            });
          }
        : undefined,
    });
  } catch (error) {
    console.error('[git.cloneRepo] Clone failed:', error);
    if (error instanceof Error) {
      console.error('[git.cloneRepo] Error stack:', error.stack);
    }
    throw error;
  }

  // Set user config
  if (config.name) {
    await git.setConfig({
      fs,
      dir: WORK_DIR,
      path: 'user.name',
      value: config.name,
    });
  }

  if (config.email) {
    await git.setConfig({
      fs,
      dir: WORK_DIR,
      path: 'user.email',
      value: config.email,
    });
  }
}

/**
 * Get current branch
 */
export async function getCurrentBranch(): Promise<string> {
  const fs = getFS();
  return await git.currentBranch({
    fs,
    dir: WORK_DIR,
    fullname: false,
  }) || 'main';
}

/**
 * List all branches
 */
export async function listBranches(): Promise<string[]> {
  const fs = getFS();
  return await git.listBranches({
    fs,
    dir: WORK_DIR,
  });
}

/**
 * Create a new branch
 */
export async function createBranch(branchName: string): Promise<void> {
  const fs = getFS();
  await git.branch({
    fs,
    dir: WORK_DIR,
    ref: branchName,
  });
}

/**
 * Checkout a branch
 */
export async function checkoutBranch(branchName: string): Promise<void> {
  const fs = getFS();
  await git.checkout({
    fs,
    dir: WORK_DIR,
    ref: branchName,
  });
}

/**
 * Get file status
 */
export async function getStatus(filepath: string): Promise<string> {
  const fs = getFS();
  return await git.status({
    fs,
    dir: WORK_DIR,
    filepath,
  });
}

/**
 * Get all changed files (status matrix)
 */
export async function getStatusMatrix(): Promise<StatusFile[]> {
  const fs = getFS();
  const matrix = await git.statusMatrix({
    fs,
    dir: WORK_DIR,
  });

  return matrix
    .filter(([, head, workdir, stage]) => head !== workdir || workdir !== stage)
    .map(([filepath, head, workdir, stage]) => ({
      filepath,
      head,
      workdir,
      stage,
    }));
}

/**
 * Stage a file
 */
export async function stageFile(filepath: string): Promise<void> {
  const fs = getFS();
  await git.add({
    fs,
    dir: WORK_DIR,
    filepath,
  });
}

/**
 * Stage all files
 */
export async function stageAll(filepaths: string[]): Promise<void> {
  const fs = getFS();
  for (const filepath of filepaths) {
    await git.add({
      fs,
      dir: WORK_DIR,
      filepath,
    });
  }
}

/**
 * Unstage a file
 */
export async function unstageFile(filepath: string): Promise<void> {
  const fs = getFS();
  await git.resetIndex({
    fs,
    dir: WORK_DIR,
    filepath,
  });
}

/**
 * Commit staged changes
 */
export async function commit(message: string, config: GitConfig): Promise<string> {
  const fs = getFS();
  const sha = await git.commit({
    fs,
    dir: WORK_DIR,
    message,
    author: {
      name: config.name || 'User',
      email: config.email || 'user@example.com',
    },
  });
  return sha;
}

/**
 * Push to remote
 */
export async function push(config: GitConfig, branch?: string): Promise<void> {
  const fs = getFS();
  const currentBranch = branch || await getCurrentBranch();
  const authenticatedHttp = createAuthenticatedHttp(config.token);
  
  await git.push({
    fs,
    http: authenticatedHttp as any,
    dir: WORK_DIR,
    remote: 'origin',
    ref: currentBranch,
    corsProxy: '/api/git-proxy',
  });
}

/**
 * Pull from remote
 */
export async function pull(config: GitConfig): Promise<void> {
  const fs = getFS();
  const authenticatedHttp = createAuthenticatedHttp(config.token);
  
  await git.pull({
    fs,
    http: authenticatedHttp as any,
    dir: WORK_DIR,
    corsProxy: '/api/git-proxy',
    singleBranch: true,
    author: {
      name: config.name || 'User',
      email: config.email || 'user@example.com',
    },
  });
}

/**
 * Get ahead count vs remote branch.
 */
export async function getAheadCount(branch?: string): Promise<number> {
  const fs = getFS();
  const ref = branch || await getCurrentBranch();
  const localCommits = await git.log({
    fs,
    dir: WORK_DIR,
    ref,
    depth: 200,
  });

  let remoteCommits: Array<{ oid: string }> = [];
  try {
    const remoteRef = `refs/remotes/origin/${ref}`;
    await git.resolveRef({ fs, dir: WORK_DIR, ref: remoteRef });
    remoteCommits = await git.log({
      fs,
      dir: WORK_DIR,
      ref: remoteRef,
      depth: 200,
    });
  } catch {
    return localCommits.length;
  }

  const remoteSet = new Set(remoteCommits.map((commit) => commit.oid));
  return localCommits.filter((commit) => !remoteSet.has(commit.oid)).length;
}

/**
 * Read a file from the filesystem
 */
export async function readFile(filepath: string): Promise<string> {
  const fs = getFS();
  const data = await fs.promises.readFile(`${WORK_DIR}/${filepath}`, { encoding: 'utf8' });
  return data as string;
}

/**
 * Read a file from HEAD (last commit).
 */
export async function readFileAtHead(filepath: string): Promise<string> {
  const fs = getFS();
  const oid = await git.resolveRef({ fs, dir: WORK_DIR, ref: 'HEAD' });
  const { blob } = await git.readBlob({
    fs,
    dir: WORK_DIR,
    oid,
    filepath,
  });
  return new TextDecoder('utf-8').decode(blob);
}

/**
 * Discard changes for a single file.
 */
export async function discardChanges(
  filepath: string,
  status: 'modified' | 'added' | 'deleted' | 'unmodified'
): Promise<void> {
  const fs = getFS();
  if (status === 'unmodified') return;

  if (status === 'added') {
    try {
      await fs.promises.unlink(`${WORK_DIR}/${filepath}`);
    } catch {
      // Ignore missing file
    }
    await git.resetIndex({ fs, dir: WORK_DIR, filepath });
    return;
  }

  await git.resetIndex({ fs, dir: WORK_DIR, filepath });
  await git.checkout({
    fs,
    dir: WORK_DIR,
    ref: 'HEAD',
    filepaths: [filepath],
  });
}

/**
 * Write a file to the filesystem
 */
export async function writeFile(filepath: string, content: string): Promise<void> {
  const fs = getFS();
  const fullPath = `${WORK_DIR}/${filepath}`;
  
  // Ensure directory exists - create parent directories manually
  const pathParts = filepath.split('/');
  let currentPath = WORK_DIR;
  
  for (let i = 0; i < pathParts.length - 1; i++) {
    currentPath += '/' + pathParts[i];
    try {
      await fs.promises.mkdir(currentPath);
    } catch {
      // Directory might already exist
    }
  }
  
  await fs.promises.writeFile(fullPath, content, 'utf8');
}

/**
 * List files in a directory
 */
export async function listFiles(dirPath: string = ''): Promise<string[]> {
  const fs = getFS();
  const fullPath = dirPath ? `${WORK_DIR}/${dirPath}` : WORK_DIR;
  
  try {
    const entries = await fs.promises.readdir(fullPath);
    return entries.filter((entry) => entry !== '.git');
  } catch {
    return [];
  }
}

/**
 * Get commit log
 */
export async function getLog(depth: number = 10): Promise<
  Array<{
    oid: string;
    message: string;
    author: { name: string; email: string; timestamp: number };
  }>
> {
  const fs = getFS();
  const commits = await git.log({
    fs,
    dir: WORK_DIR,
    depth,
  });

  return commits.map((commit) => ({
    oid: commit.oid,
    message: commit.commit.message,
    author: {
      name: commit.commit.author.name,
      email: commit.commit.author.email,
      timestamp: commit.commit.author.timestamp,
    },
  }));
}

/**
 * Check if repo is cloned
 */
export async function isRepoCloned(): Promise<boolean> {
  const fs = getFS();
  try {
    const entries = await fs.promises.readdir(WORK_DIR);
    return entries.includes('.git');
  } catch {
    return false;
  }
}

async function removePath(path: string): Promise<void> {
  const fs = getFS();
  try {
    const stat = await fs.promises.lstat(path);
    if (stat.isDirectory()) {
      const entries = await fs.promises.readdir(path);
      for (const entry of entries) {
        await removePath(`${path}/${entry}`);
      }
      await fs.promises.rmdir(path);
    } else {
      await fs.promises.unlink(path);
    }
  } catch (error: any) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
}

/**
 * Clear the workspace directory and all git data from LightningFS.
 */
export async function clearWorkspace(): Promise<void> {
  await removePath(WORK_DIR);
  const fs = getFS();
  try {
    await fs.promises.mkdir(WORK_DIR);
  } catch {
    // Directory might already exist
  }
}

export { WORK_DIR };
