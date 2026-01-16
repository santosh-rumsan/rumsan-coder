'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { FolderGit2, LogOut, Github, File, Moon, Sun, X, ListTree, GitCommit, Settings } from 'lucide-react';
import FileTree from '@/components/FileTree';
import CodeEditor from '@/components/CodeEditor';
import DiffViewer from '@/components/DiffViewer';
import RepoModal from '@/components/RepoModal';
import BranchSelector from '@/components/BranchSelector';
import GitPanel from '@/components/GitPanel';
import EnvVariablesPanel from '@/components/EnvVariablesPanel';
import * as git from '@/lib/git';
import { useAlert } from '@/components/AlertProvider';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface OpenFile {
  name: string;
  content: string;
  language: string;
  kind?: 'file' | 'env' | 'diff';
  originalContent?: string;
  sourcePath?: string;
  isDirty?: boolean;
}

const buildFileTree = (items: any[]): FileNode[] => {
  interface FolderMap {
    [key: string]: FileNode;
  }

  const root: FolderMap = {};

  // First pass: create all nodes
  items.forEach((item) => {
    const parts = item.path.split('/').filter((p: string) => p);
    let currentPath = '';

    parts.forEach((part: string, index: number) => {
      if (index === 0) {
        currentPath = part;
      } else {
        currentPath += '/' + part;
      }

      if (index === parts.length - 1) {
        // File node
        if (item.type === 'blob') {
          if (!root[currentPath]) {
            root[currentPath] = {
              name: part,
              path: item.path,
              type: 'file',
            };
          }
        }
      } else {
        // Folder node
        if (!root[currentPath]) {
          root[currentPath] = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: [],
          };
        }
      }
    });
  });

  // Second pass: build hierarchy
  const topLevel: FileNode[] = [];
  const processed = new Set<string>();

  Object.entries(root).forEach(([path, node]) => {
    if (processed.has(path)) return;
    processed.add(path);

    const parts = path.split('/');
    if (parts.length === 1) {
      topLevel.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = root[parentPath];
      if (parent && parent.children) {
        parent.children.push(node);
        processed.add(path);
      }
    }
  });

  // Sort each level
  const sortNodes = (nodes: FileNode[]) => {
    nodes.forEach((node) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'folder' ? -1 : 1;
        });
        sortNodes(node.children);
      }
    });
    nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  };

  sortNodes(topLevel);
  return topLevel;
};

export default function Home() {
  const { notify } = useAlert();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [logoutPrompt, setLogoutPrompt] = useState('Continue to sign out?');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<{
    content: string;
    language: string;
    name: string;
    kind?: 'file' | 'env' | 'diff';
    originalContent?: string;
    sourcePath?: string;
    isDirty?: boolean;
  } | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [changedFiles, setChangedFiles] = useState<Map<string, { content: string; originalContent: string }>>(new Map());
  const [gitRefreshKey, setGitRefreshKey] = useState(0);
  const [gitChangesCount, setGitChangesCount] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<'explorer' | 'git'>('explorer');
  const [isResizing, setIsResizing] = useState(false);
  const [isRepoLoading, setIsRepoLoading] = useState(false);
  const [cloneStatus, setCloneStatus] = useState<{ state: 'idle' | 'cloning'; progress?: git.CloneProgress | null }>({
    state: 'idle',
    progress: null,
  });
  const hasLoadedStoredRepo = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle sidebar resizing
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = mouseMoveEvent.clientX - sidebarRef.current.getBoundingClientRect().left;
        if (newWidth >= 200 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResizing);
      };
    }
  }, [isResizing, resize, stopResizing]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const resetRepoState = useCallback(() => {
    setRepoInfo(null);
    setFiles([]);
    setSelectedFile(null);
    setOpenFiles([]);
    setChangedFiles(new Map());
    setCurrentBranch('main');
    setActiveSidebarPanel('explorer');
    hasLoadedStoredRepo.current = false;
  }, []);

  const clearCachedRepo = useCallback(async () => {
    resetRepoState();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('last-repo');
      localStorage.removeItem('env-variables-text');
    }
    try {
      await git.clearWorkspace();
    } catch (error) {
      console.error('Failed to clear workspace:', error);
    }
  }, [resetRepoState]);

  useEffect(() => {
    if (status !== 'unauthenticated') return;
    void clearCachedRepo();
  }, [status, clearCachedRepo]);

  const refreshRepoCloned = useCallback(async () => {
    try {
      const cloned = await git.isRepoCloned();
      return cloned;
    } catch (error) {
      console.error('Error checking repo status:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    refreshRepoCloned();
  }, [refreshRepoCloned]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!repoInfo) return;
    const url = `https://github.com/${repoInfo.owner}/${repoInfo.repo}`;
    localStorage.setItem('last-repo', JSON.stringify({ url, branch: currentBranch }));
  }, [repoInfo, currentBranch]);

  const handleLoadRepo = useCallback(async (url: string, branchOverride?: string) => {
    try {
      setIsRepoLoading(true);
      const branchToLoad = branchOverride || (repoInfo ? currentBranch : undefined);
      const payload: { url: string; token: string; branch?: string } = {
        url,
        token: (session as any).accessToken,
      };
      if (branchToLoad) {
        payload.branch = branchToLoad;
      }
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        const tree = buildFileTree(data.tree);
        const resolvedBranch = data.branch || branchToLoad || 'main';
        setFiles(tree);
        setRepoInfo({ owner: data.owner, repo: data.repo });
        setCurrentBranch(resolvedBranch);
        setSelectedFile(null);
        setOpenFiles([]);
        setChangedFiles(new Map());
        const token = (session as any).accessToken;
        const name = (session as any).user?.name || 'User';
        const email = (session as any).user?.email || 'user@example.com';
        try {
          const cloned = await git.isRepoCloned();
          if (!cloned) {
            setCloneStatus({ state: 'cloning', progress: null });
            await git.cloneRepo(url, { token, name, email }, (progress) => {
              setCloneStatus({ state: 'cloning', progress });
            });
          }
          if (resolvedBranch) {
            await git.checkoutBranch(resolvedBranch);
          }
        } catch (cloneError) {
          console.error('Error cloning repository:', cloneError);
          notify({ type: 'error', message: 'Failed to clone repository.' });
        } finally {
          setCloneStatus({ state: 'idle', progress: null });
        }
      } else {
        notify({ type: 'error', message: `Failed to load repository: ${data.error}` });
      }
    } catch (error) {
      console.error('Error loading repository:', error);
      notify({ type: 'error', message: 'Error loading repository.' });
    } finally {
      setIsRepoLoading(false);
    }
  }, [currentBranch, session, notify, repoInfo]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status !== 'authenticated' || !session || repoInfo || hasLoadedStoredRepo.current) return;

    const savedRepo = localStorage.getItem('last-repo');
    if (!savedRepo) return;

    try {
      const parsed = JSON.parse(savedRepo);
      if (parsed?.url) {
        hasLoadedStoredRepo.current = true;
        handleLoadRepo(parsed.url, parsed.branch);
      }
    } catch (error) {
      console.error('Failed to restore last repo:', error);
    }
  }, [status, session, repoInfo, handleLoadRepo]);

  const handleBranchChange = async (newBranch: string) => {
    if (!repoInfo) return;
    
    setCurrentBranch(newBranch);
    setChangedFiles(new Map());
    setSelectedFile(null);
    setOpenFiles([]);
    try {
      const cloned = await refreshRepoCloned();
      if (cloned) {
        await git.checkoutBranch(newBranch);
      }
    } catch (error) {
      console.error('Failed to checkout branch:', error);
    }
    
    // Reload repository with new branch
    const url = `https://github.com/${repoInfo.owner}/${repoInfo.repo}`;
    await handleLoadRepo(url, newBranch);
  };

  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      txt: 'plaintext',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const handleFileClick = async (path: string) => {
    if (!repoInfo) return;

    try {
      const existing = openFiles.find((file) => file.name === path);
      if (existing) {
        const pendingContent = changedFiles.get(path)?.content ?? existing.content;
        setSelectedFile({
          content: pendingContent,
          language: existing.language,
          name: path,
        });
        return;
      }

      const cloned = await refreshRepoCloned();
      if (cloned) {
        try {
          const content = await git.readFile(path);
          const language = getLanguageFromExtension(path);
          setOpenFiles((prev) => {
            if (prev.some((file) => file.name === path)) return prev;
            return [...prev, { name: path, content, language }];
          });
          const pendingContent = changedFiles.get(path)?.content ?? content;
          setSelectedFile({
            content: pendingContent,
            language,
            name: path,
          });
          return;
        } catch (error) {
          console.warn('Falling back to GitHub API for file content:', error);
        }
      }

      const response = await fetch('/api/github/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          path,
          token: (session as any).accessToken,
          branch: currentBranch,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const language = getLanguageFromExtension(path);
        setOpenFiles((prev) => {
          if (prev.some((file) => file.name === path)) return prev;
          return [...prev, { name: path, content: data.content, language }];
        });
        const pendingContent = changedFiles.get(path)?.content ?? data.content;
        setSelectedFile({
          content: pendingContent,
          language,
          name: path,
        });
      } else {
        notify({ type: 'error', message: 'Failed to load file.' });
      }
    } catch (error) {
      console.error('Error loading file:', error);
      notify({ type: 'error', message: 'Error loading file.' });
    }
  };

  const handleContentChange = (newContent: string) => {
    if (!selectedFile) return;
    if (selectedFile.kind === 'env' || selectedFile.kind === 'diff') return;

    const originalContent = changedFiles.get(selectedFile.name)?.originalContent || selectedFile.content;
    
    if (newContent !== originalContent) {
      setChangedFiles(new Map(changedFiles.set(selectedFile.name, {
        content: newContent,
        originalContent: originalContent
      })));
    } else {
      const newChangedFiles = new Map(changedFiles);
      newChangedFiles.delete(selectedFile.name);
      setChangedFiles(newChangedFiles);
    }

    setSelectedFile({
      ...selectedFile,
      content: newContent
    });

    setOpenFiles((prev) =>
      prev.map((file) =>
        file.name === selectedFile.name ? { ...file, content: newContent } : file
      )
    );
  };

  const handleSaveFile = useCallback(async () => {
    if (!selectedFile) return;
    if (selectedFile.kind === 'env' || selectedFile.kind === 'diff') return;
    const cloned = await refreshRepoCloned();
    if (!cloned) {
      notify({ type: 'warning', message: 'Clone the repository to save changes.' });
      return;
    }

    const updatedContent = changedFiles.get(selectedFile.name)?.content ?? selectedFile.content;
    try {
      await git.writeFile(selectedFile.name, updatedContent);
      setChangedFiles((prev) => {
        const next = new Map(prev);
        next.delete(selectedFile.name);
        return next;
      });
      setSelectedFile((prev) => (prev ? { ...prev, content: updatedContent } : prev));
      setOpenFiles((prev) =>
        prev.map((file) =>
          file.name === selectedFile.name ? { ...file, content: updatedContent } : file
        )
      );
      setGitRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error saving file:', error);
      notify({ type: 'error', message: 'Failed to save file.' });
    }
  }, [selectedFile, changedFiles, refreshRepoCloned, notify]);

  const handleSelectTab = useCallback((path: string) => {
    const file = openFiles.find((entry) => entry.name === path);
    if (!file) return;
    if (file.kind === 'env') {
      setSelectedFile({
        name: file.name,
        language: file.language,
        content: file.content,
        kind: 'env',
        originalContent: file.originalContent,
        isDirty: file.isDirty,
      });
      return;
    }
    if (file.kind === 'diff') {
      setSelectedFile({
        name: file.name,
        language: file.language,
        content: file.content,
        originalContent: file.originalContent,
        kind: 'diff',
        sourcePath: file.sourcePath,
      });
      return;
    }
    const pendingContent = changedFiles.get(path)?.content ?? file.content;
    setSelectedFile({
      name: file.name,
      language: file.language,
      content: pendingContent,
      kind: file.kind,
    });
  }, [openFiles, changedFiles]);

  const handleCloseTab = useCallback((path: string) => {
    const remaining = openFiles.filter((file) => file.name !== path);
    setOpenFiles(remaining);

    if (selectedFile?.name === path) {
      const nextFile = remaining[remaining.length - 1];
      if (nextFile) {
        if (nextFile.kind === 'env') {
          setSelectedFile({
            name: nextFile.name,
            language: nextFile.language,
            content: nextFile.content,
            kind: 'env',
            originalContent: nextFile.originalContent,
            isDirty: nextFile.isDirty,
          });
          return;
        }
        if (nextFile.kind === 'diff') {
          setSelectedFile({
            name: nextFile.name,
            language: nextFile.language,
            content: nextFile.content,
            originalContent: nextFile.originalContent,
            kind: 'diff',
            sourcePath: nextFile.sourcePath,
          });
          return;
        }
        const pendingContent = changedFiles.get(nextFile.name)?.content ?? nextFile.content;
        setSelectedFile({
          name: nextFile.name,
          language: nextFile.language,
          content: pendingContent,
          kind: nextFile.kind,
        });
      } else {
        setSelectedFile(null);
      }
    }
  }, [openFiles, selectedFile, changedFiles]);

  const openEnvPanel = useCallback(async () => {
    const envTabName = 'Environment Variables';
    const existing = openFiles.find((file) => file.name === envTabName);
    if (existing) {
      setSelectedFile({
        name: existing.name,
        content: existing.content,
        originalContent: existing.originalContent,
        language: existing.language,
        kind: 'env',
        isDirty: existing.isDirty,
      });
      return;
    }
    let content = '';
    let originalContent = '';
    try {
      const cloned = await refreshRepoCloned();
      if (cloned) {
        content = await git.readFile('.env');
        originalContent = content;
      }
    } catch {
      content = '';
      originalContent = '';
    }
    setOpenFiles((prev) => [
      ...prev,
      { name: envTabName, content, originalContent, language: 'plaintext', kind: 'env', isDirty: false },
    ]);
    setSelectedFile({
      name: envTabName,
      content,
      originalContent,
      language: 'plaintext',
      kind: 'env',
      isDirty: false,
    });
  }, [openFiles, refreshRepoCloned]);

  const handleEnvContentChange = useCallback((value: string) => {
    setOpenFiles((prev) =>
      prev.map((file) => {
        if (file.kind !== 'env') return file;
        const originalContent = file.originalContent ?? '';
        const isDirty = value !== originalContent;
        return { ...file, content: value, isDirty };
      })
    );
    setSelectedFile((prev) => {
      if (!prev || prev.kind !== 'env') return prev;
      const originalContent = prev.originalContent ?? '';
      return { ...prev, content: value, isDirty: value !== originalContent };
    });
  }, []);

  const handleSaveEnv = useCallback(async () => {
    if (!selectedFile || selectedFile.kind !== 'env') return;
    const cloned = await refreshRepoCloned();
    if (!cloned) {
      notify({ type: 'warning', message: 'Clone the repository to save changes.' });
      return;
    }
    try {
      await git.writeFile('.env', selectedFile.content);
      setOpenFiles((prev) =>
        prev.map((file) => {
          if (file.kind !== 'env') return file;
          return { ...file, originalContent: selectedFile.content, isDirty: false };
        })
      );
      setSelectedFile((prev) =>
        prev && prev.kind === 'env'
          ? { ...prev, originalContent: prev.content, isDirty: false }
          : prev
      );
      setGitRefreshKey((prev) => prev + 1);
      notify({ type: 'success', message: 'Environment variables saved.' });
    } catch (error) {
      console.error('Error saving env file:', error);
      notify({ type: 'error', message: 'Failed to save environment variables.' });
    }
  }, [notify, refreshRepoCloned, selectedFile]);

  const handleOpenDiff = useCallback(async (path: string, status: 'modified' | 'added' | 'deleted' | 'unmodified') => {
    const language = getLanguageFromExtension(path);
    const tabName = `${path} (diff)`;
    let originalContent = '';
    let modifiedContent = '';

    try {
      originalContent = await git.readFileAtHead(path);
    } catch {
      originalContent = '';
    }

    if (status !== 'deleted') {
      try {
        modifiedContent = await git.readFile(path);
      } catch {
        modifiedContent = '';
      }
    }

    setOpenFiles((prev) => {
      if (prev.some((file) => file.name === tabName)) {
        return prev.map((file) =>
          file.name === tabName
            ? { ...file, content: modifiedContent, originalContent, language }
            : file
        );
      }
      return [
        ...prev,
        {
          name: tabName,
          content: modifiedContent,
          originalContent,
          language,
          kind: 'diff',
          sourcePath: path,
        },
      ];
    });

    setSelectedFile({
      name: tabName,
      content: modifiedContent,
      originalContent,
      language,
      kind: 'diff',
      sourcePath: path,
    });
  }, []);

  const handleCloseRepo = useCallback(async () => {
    if (!repoInfo) return;

    let hasDirtyChanges = changedFiles.size > 0 || openFiles.some((file) => file.kind === 'env' && file.isDirty);
    const cloned = await refreshRepoCloned();

    if (cloned) {
      try {
        const statusMatrix = await git.getStatusMatrix();
        if (statusMatrix.length > 0) {
          hasDirtyChanges = true;
        }
      } catch (error) {
        console.error('Failed to check git status before closing:', error);
      }
    }

    if (hasDirtyChanges) {
      const shouldDiscard = window.confirm(
        'You have uncommitted changes. Do you want to discard them and close the repository?'
      );
      if (!shouldDiscard) return false;
    }

    await clearCachedRepo();
    return true;
  }, [repoInfo, changedFiles, openFiles, refreshRepoCloned, clearCachedRepo]);

  const hasUnsavedChanges = selectedFile ? changedFiles.has(selectedFile.name) : false;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (!isSaveCombo) return;
      if (selectedFile?.kind !== 'env') return;
      event.preventDefault();
      if (selectedFile.isDirty) {
        handleSaveEnv();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSaveEnv, selectedFile]);

  if (status === 'loading') {
    return (
      <div className="h-screen bg-vscode-bg flex items-center justify-center">
        <div className="text-vscode-text">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-vscode-bg">
      {/* Top Bar */}
      <div className="h-12 bg-vscode-sidebar border-thin-b px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
            </svg>
            <span className="text-vscode-text font-semibold">Rumsan Coder</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="p-2 text-vscode-text hover:text-blue-500 transition-colors"
            title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDarkTheme ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2 text-vscode-text">
            <Github className="w-4 h-4" />
            <span className="text-sm">{session.user?.name}</span>
          </div>
          
          <button
            onClick={async () => {
              if (repoInfo) {
                const closed = await handleCloseRepo();
                if (closed === false) return;
                setLogoutPrompt('Repo has been closed. Continue to sign out?');
              } else {
                setLogoutPrompt('Continue to sign out?');
              }
              setIsLogoutModalOpen(true);
            }}
            className="text-vscode-text hover:text-blue-500 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        {repoInfo && (
          <div 
            ref={sidebarRef}
            className="bg-vscode-sidebar border-thin-r relative flex flex-col"
            style={{ width: `${sidebarWidth}px` }}
          >
            <div className="h-12 px-4 flex items-center border-thin-b">
              <div className="flex items-center justify-between w-full">
                <h2 className="text-vscode-text text-xs font-semibold uppercase">
                  {activeSidebarPanel === 'explorer' ? 'Explorer' : 'Source Control'}
                </h2>
                {repoInfo && activeSidebarPanel === 'explorer' && (
                  <button
                    onClick={handleCloseRepo}
                    className="flex items-center gap-1 text-xs text-red-100 px-2 py-1 rounded bg-red-600/40 hover:bg-red-600/60 transition-colors"
                    title="Close repository"
                  >
                    <X className="w-3 h-3" />
                    <span>Close Repo</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeSidebarPanel === 'explorer' ? (
                files.length > 0 ? (
                  <FileTree files={files} onFileClick={handleFileClick} />
                ) : (
                  <div className="p-4 text-vscode-text text-sm text-center">
                    Loading files...
                  </div>
                )
              ) : (
                <GitPanel
                  repoUrl={`https://github.com/${repoInfo.owner}/${repoInfo.repo}`}
                  token={(session as any).accessToken}
                  userName={(session as any).user?.name}
                  userEmail={(session as any).user?.email}
                  isDarkTheme={isDarkTheme}
                  variant="panel"
                  isActive={activeSidebarPanel === 'git'}
                  onOpenDiff={handleOpenDiff}
                  onCloneStatus={setCloneStatus}
                  autoClone={false}
                  currentBranch={currentBranch}
                  onBranchChange={setCurrentBranch}
                  refreshKey={gitRefreshKey}
                  onChangesCount={setGitChangesCount}
                />
              )}
            </div>
            <div className="h-10 border-thin-t flex bg-vscode-sidebar">
              <button
                type="button"
                onClick={() => setActiveSidebarPanel('explorer')}
                className={`flex-1 flex items-center justify-center gap-2 text-xs uppercase tracking-wide border-r border-vscode-border ${
                  activeSidebarPanel === 'explorer'
                    ? 'bg-vscode-editor text-vscode-text border-t-2 border-t-blue-500'
                    : 'text-vscode-text opacity-70 hover:opacity-100 hover:bg-vscode-hover border-t-2 border-t-transparent'
                }`}
              >
                <ListTree className="w-4 h-4" />
                <span>Explorer</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSidebarPanel('git')}
                className={`flex-1 flex items-center justify-center gap-2 text-xs uppercase tracking-wide ${
                  activeSidebarPanel === 'git'
                    ? 'bg-vscode-editor text-vscode-text border-t-2 border-t-blue-500'
                    : 'text-vscode-text opacity-70 hover:opacity-100 hover:bg-vscode-hover border-t-2 border-t-transparent'
                }`}
              >
                <GitCommit className="w-4 h-4" />
                <span>Git</span>
                {gitChangesCount > 0 && (
                  <span className="ml-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5">
                    {gitChangesCount}
                  </span>
                )}
              </button>
            </div>
            {/* Resize Handle */}
            <div
              className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-10"
              onMouseDown={(event) => {
                event.preventDefault();
                startResizing();
              }}
            />
          </div>
        )}

        {/* Editor Panel */}
        <div className="flex-1 bg-vscode-editor flex flex-col">
          {openFiles.length > 0 && (
            <div className="flex items-center gap-0 overflow-x-auto border-thin-b bg-vscode-sidebar">
              {openFiles.map((file) => {
                const isActive = selectedFile?.name === file.name;
                const labelSource = file.kind === 'diff' ? file.sourcePath : file.name;
                const label = labelSource ? labelSource.split('/').pop() : file.name;
                return (
                  <div
                    key={file.name}
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-vscode-border ${
                      isActive
                        ? 'bg-vscode-editor text-vscode-text border-t-2 border-t-blue-500'
                        : 'bg-vscode-sidebar text-vscode-text opacity-70 hover:opacity-100 hover:bg-vscode-hover'
                    }`}
                    onClick={() => handleSelectTab(file.name)}
                  >
                    <span className="truncate max-w-[180px]">
                      {file.kind === 'diff' ? `${label} (diff)` : label}
                    </span>
                    {(changedFiles.has(file.name) || (file.kind === 'env' && file.isDirty)) && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" title="Unsaved changes"></span>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCloseTab(file.name);
                      }}
                      className="p-0.5 rounded hover:bg-vscode-hover"
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex-1 min-h-0">
            {selectedFile ? (
              selectedFile.kind === 'env' ? (
                <EnvVariablesPanel
                  isDarkTheme={isDarkTheme}
                  content={selectedFile.content}
                  onChange={handleEnvContentChange}
                />
              ) : selectedFile.kind === 'diff' ? (
                <DiffViewer
                  original={selectedFile.originalContent ?? ''}
                  modified={selectedFile.content}
                  language={selectedFile.language}
                  isDarkTheme={isDarkTheme}
                />
              ) : (
                <CodeEditor
                  content={selectedFile.content}
                  language={selectedFile.language}
                  fileName={selectedFile.name}
                  isDarkTheme={isDarkTheme}
                  onContentChange={handleContentChange}
                  onSave={handleSaveFile}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  {!repoInfo ? (
                    <>
                      <FolderGit2 className="w-16 h-16 text-vscode-text mx-auto mb-4 opacity-50" />
                      <p className="text-vscode-text text-lg mb-6">No repository loaded</p>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-vscode-text rounded transition-colors mx-auto"
                      >
                        <FolderGit2 className="w-5 h-5" />
                        Open a Repository
                      </button>
                    </>
                  ) : (
                    <>
                      <File className="w-16 h-16 text-vscode-text mx-auto mb-4 opacity-50" />
                      <p className="text-vscode-text text-lg">No file selected</p>
                      <p className="text-vscode-text text-sm mt-2">
                        Select a file from the explorer to view
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="h-9 border-thin-t status-bar flex items-center justify-between px-3 text-xs text-vscode-text">
            {repoInfo ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.open(`https://github.com/${repoInfo.owner}/${repoInfo.repo}`, '_blank', 'noopener,noreferrer')}
                  className={`status-bar-button flex items-center gap-2 px-3 py-1.5 border border-transparent ${
                    isDarkTheme
                      ? 'hover:bg-vscode-hover hover:border-vscode-border'
                      : 'hover:bg-gray-300 hover:border-gray-300'
                  } text-vscode-text rounded text-xs transition-colors`}
                  title="Open repository on GitHub"
                >
                  <Github className="w-4 h-4" />
                  <span className="opacity-90">{repoInfo.owner}/{repoInfo.repo}</span>
                </button>
                <BranchSelector
                  repoInfo={repoInfo}
                  currentBranch={currentBranch}
                  onBranchChange={handleBranchChange}
                  token={(session as any).accessToken}
                  isDarkTheme={isDarkTheme}
                />
              </div>
            ) : (
              <span className="opacity-70">No repository loaded</span>
            )}
            <button
              type="button"
              onClick={openEnvPanel}
              className={`status-bar-button flex items-center gap-2 px-3 py-1.5 border border-transparent ${
                isDarkTheme
                  ? 'hover:bg-vscode-hover hover:border-vscode-border'
                  : 'hover:bg-gray-300 hover:border-gray-300'
              } text-vscode-text rounded text-xs transition-colors`}
              title="Open Environment Variables"
            >
              <Settings className="w-4 h-4" />
              <span>ENV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <RepoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleLoadRepo}
        token={(session as any).accessToken}
      />
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-vscode-text text-base font-semibold mb-2">Sign out</div>
            <p className="text-vscode-text text-sm opacity-90 mb-4">{logoutPrompt}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-3 py-2 text-vscode-text hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsLogoutModalOpen(false);
                  await signOut({ callbackUrl: '/login' });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
      {(isRepoLoading || cloneStatus.state === 'cloning') && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-5 w-[360px] text-vscode-text text-sm shadow-xl">
            <div className="font-semibold mb-2">
              {cloneStatus.state === 'cloning' ? 'Cloning repository' : 'Loading repository'}
            </div>
            <div className="text-xs opacity-80">
              {cloneStatus.state === 'cloning'
                ? cloneStatus.progress
                  ? `${cloneStatus.progress.phase}: ${cloneStatus.progress.loaded} / ${cloneStatus.progress.total}`
                  : 'Preparing repository...'
                : 'Fetching repository tree and metadata...'}
            </div>
            <div className="mt-4 h-1.5 w-full bg-vscode-editor rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-blue-500 animate-pulse" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
