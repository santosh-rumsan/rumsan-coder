'use client';

import { useState } from 'react';
import { GitCommit, FileText } from 'lucide-react';

interface ChangedFile {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  staged: boolean;
}

interface GitPanelProps {
  repoInfo: { owner: string; repo: string };
  branch: string;
  token: string;
  isDarkTheme?: boolean;
  changedFiles: Map<string, { content: string; originalContent: string }>;
}

export default function GitPanel({ 
  repoInfo, 
  branch, 
  token, 
  isDarkTheme = true,
  changedFiles 
}: GitPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);

  const changes: ChangedFile[] = Array.from(changedFiles.entries()).map(([path]) => ({
    path,
    status: 'modified' as const,
    staged: stagedFiles.has(path),
  }));

  const toggleStage = (filePath: string) => {
    setStagedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const stageAll = () => {
    setStagedFiles(new Set(changes.map((c) => c.path)));
  };

  const unstageAll = () => {
    setStagedFiles(new Set());
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || stagedFiles.size === 0) {
      alert('Please enter a commit message and stage at least one file');
      return;
    }

    setCommitting(true);
    try {
      // Get the latest commit SHA
      const refResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs/heads/${branch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const refData = await refResponse.json();
      const latestCommitSha = refData.object.sha;

      // Get the tree of the latest commit
      const commitResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/commits/${latestCommitSha}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const commitData = await commitResponse.json();
      const baseTreeSha = commitData.tree.sha;

      // Create blobs for changed files
      const blobs = await Promise.all(
        Array.from(stagedFiles).map(async (filePath) => {
          const fileData = changedFiles.get(filePath);
          if (!fileData) return null;

          const blobResponse = await fetch(
            `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/blobs`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: fileData.content,
                encoding: 'utf-8',
              }),
            }
          );
          const blobData = await blobResponse.json();
          return {
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha,
          };
        })
      );

      const validBlobs = blobs.filter((b) => b !== null);

      // Create a new tree
      const treeResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: validBlobs,
          }),
        }
      );
      const treeData = await treeResponse.json();

      // Create a new commit
      const newCommitResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/commits`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: commitMessage,
            tree: treeData.sha,
            parents: [latestCommitSha],
          }),
        }
      );
      const newCommitData = await newCommitResponse.json();

      // Update the branch reference
      const updateRefResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs/heads/${branch}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sha: newCommitData.sha,
          }),
        }
      );

      if (updateRefResponse.ok) {
        alert('Committed successfully!');
        setCommitMessage('');
        setStagedFiles(new Set());
        
        // Clear committed files from changedFiles
        stagedFiles.forEach((path) => {
          changedFiles.delete(path);
        });
      } else {
        const error = await updateRefResponse.json();
        alert(`Failed to commit: ${error.message}`);
      }
    } catch (error) {
      alert('Error committing changes');
      console.error(error);
    } finally {
      setCommitting(false);
    }
  };

  if (changes.length === 0) {
    return null;
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
                      <span className="text-xs text-yellow-500 font-semibold">M</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`text-xs text-vscode-text opacity-70 mt-4 p-3 rounded ${
                isDarkTheme ? 'bg-vscode-editor' : 'bg-gray-50'
              }`}>
                <p className="mb-2">💡 Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Select files to stage them for commit</li>
                  <li>Commits are pushed directly to GitHub</li>
                  <li>Make sure you&apos;re on the correct branch</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
