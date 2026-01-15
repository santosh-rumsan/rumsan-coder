'use client';

import Editor from '@monaco-editor/react';
import { Save } from 'lucide-react';
import { useState } from 'react';

interface CodeEditorProps {
  content: string;
  language: string;
  fileName: string;
  isDarkTheme?: boolean;
  onContentChange?: (newContent: string) => void;
  hasUnsavedChanges?: boolean;
}

export default function CodeEditor({ 
  content, 
  language, 
  fileName, 
  isDarkTheme = true,
  onContentChange,
  hasUnsavedChanges = false
}: CodeEditorProps) {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && onContentChange) {
      onContentChange(value);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`h-12 ${isDarkTheme ? 'bg-vscode-sidebar' : 'bg-gray-100'} ${isDarkTheme ? 'border-vscode-border' : 'border-gray-300'} border-b px-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`${isDarkTheme ? 'text-vscode-text' : 'text-gray-900'} text-sm`}>{fileName}</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 bg-blue-500 rounded-full" title="Unsaved changes"></span>
          )}
        </div>
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-xs text-vscode-text opacity-70">
            <Save className="w-3 h-3" />
            <span>Unsaved changes</span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme={isDarkTheme ? 'vs-dark' : 'vs'}
          value={content}
          onChange={handleEditorChange}
          options={{
            readOnly: false,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
    </div>
  );
}
