'use client';

import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { useState, useCallback } from 'react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileTreeProps {
  files: FileNode[];
  onFileClick: (path: string) => void;
}

function TreeNode({ node, onFileClick, level = 0 }: { node: FileNode; onFileClick: (path: string) => void; level?: number }) {
  const [isOpen, setIsOpen] = useState(level === 0);

  const handleClick = useCallback(() => {
    if (node.type === 'folder') {
      setIsOpen(prev => !prev);
    } else if (node.type === 'file') {
      onFileClick(node.path);
    }
  }, [node, onFileClick]);

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-vscode-hover text-[12px] ${
          level === 0 ? '' : 'ml-' + (level * 4)
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <>
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-vscode-text flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-vscode-text flex-shrink-0" />
            )}
            <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
          </>
        ) : (
          <>
            <span className="w-4"></span>
            <File className="w-4 h-4 text-vscode-text flex-shrink-0" />
          </>
        )}
        <span className="text-vscode-text truncate">{node.name}</span>
      </div>
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode key={index} node={child} onFileClick={onFileClick} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ files, onFileClick }: FileTreeProps) {
  return (
    <div className="py-2">
      {files.map((file, index) => (
        <TreeNode key={index} node={file} onFileClick={onFileClick} />
      ))}
    </div>
  );
}
