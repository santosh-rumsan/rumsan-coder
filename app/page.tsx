'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { FolderGit2, LogOut, Github, File, Moon, Sun } from 'lucide-react';
import FileTree from '@/components/FileTree';
import CodeEditor from '@/components/CodeEditor';
import RepoModal from '@/components/RepoModal';
import BranchSelector from '@/components/BranchSelector';
import GitPanel from '@/components/GitPanel';
import EnvVariablesPanel from '@/components/EnvVariablesPanel';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<{
    content: string;
    language: string;
    name: string;
  } | null>(null);
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [changedFiles, setChangedFiles] = useState<Map<string, { content: string; originalContent: string }>>(new Map());
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 256px (w-64)
  const [isResizing, setIsResizing] = useState(false);
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
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
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

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkTheme]);

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

  const handleLoadRepo = async (url: string) => {
    try {
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          token: (session as any).accessToken,
          branch: currentBranch,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const tree = buildFileTree(data.tree);
        setFiles(tree);
        setRepoInfo({ owner: data.owner, repo: data.repo });
        setCurrentBranch(data.branch || 'main');
        setSelectedFile(null);
        setChangedFiles(new Map());
      } else {
        alert('Failed to load repository: ' + data.error);
      }
    } catch (error) {
      console.error('Error loading repository:', error);
      alert('Error loading repository');
    }
  };

  const handleBranchChange = async (newBranch: string) => {
    if (!repoInfo) return;
    
    setCurrentBranch(newBranch);
    setChangedFiles(new Map());
    setSelectedFile(null);
    
    // Reload repository with new branch
    const url = `https://github.com/${repoInfo.owner}/${repoInfo.repo}`;
    await handleLoadRepo(url);
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
        setSelectedFile({
          content: data.content,
          language: getLanguageFromExtension(path),
          name: path,
        });
      } else {
        alert('Failed to load file');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Error loading file');
    }
  };

  const handleContentChange = (newContent: string) => {
    if (!selectedFile) return;

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
  };

  const hasUnsavedChanges = selectedFile ? changedFiles.has(selectedFile.name) : false;

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
          {repoInfo && (
            <div className="flex items-center gap-3 ml-4">
              <div className="text-vscode-text text-sm">
                {repoInfo.owner}/{repoInfo.repo}
              </div>
              <BranchSelector
                repoInfo={repoInfo}
                currentBranch={currentBranch}
                onBranchChange={handleBranchChange}
                token={(session as any).accessToken}
                isDarkTheme={isDarkTheme}
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <EnvVariablesPanel isDarkTheme={isDarkTheme} />
          
          {repoInfo && (
            <button
              onClick={() => {
                setRepoInfo(null);
                setFiles([]);
                setSelectedFile(null);
                setChangedFiles(new Map());
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-vscode-text rounded text-sm transition-colors"
            >
              Close Repository
            </button>
          )}
          
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
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-vscode-text hover:text-blue-500 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {repoInfo && (
          <div 
            ref={sidebarRef}
            className="bg-vscode-sidebar border-thin-r overflow-y-auto relative"
            style={{ width: `${sidebarWidth}px` }}
          >
            <div className="h-12 px-4 flex items-center border-thin-b">
              <h2 className="text-vscode-text text-sm font-semibold uppercase">Explorer</h2>
            </div>
            {files.length > 0 ? (
              <FileTree files={files} onFileClick={handleFileClick} />
            ) : (
              <div className="p-4 text-vscode-text text-sm text-center">
                Loading files...
              </div>
            )}
            {/* Resize Handle */}
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
              onMouseDown={startResizing}
            />
          </div>
        )}

        {/* Editor Panel */}
        <div className="flex-1 bg-vscode-editor">
          {selectedFile ? (
            <CodeEditor
              content={selectedFile.content}
              language={selectedFile.language}
              fileName={selectedFile.name}
              isDarkTheme={isDarkTheme}
              onContentChange={handleContentChange}
              hasUnsavedChanges={hasUnsavedChanges}
            />
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
      </div>

      {/* Modal */}
      <RepoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleLoadRepo}
      />

      {/* Git Panel */}
      {repoInfo && (
        <GitPanel
          repoInfo={repoInfo}
          branch={currentBranch}
          token={(session as any).accessToken}
          isDarkTheme={isDarkTheme}
          changedFiles={changedFiles}
        />
      )}
    </div>
  );
}
