'use client';

import Editor from '@monaco-editor/react';
import { Save } from 'lucide-react';
import { useEffect } from 'react';

interface CodeEditorProps {
  content: string;
  language: string;
  fileName: string;
  isDarkTheme?: boolean;
  onContentChange?: (newContent: string) => void;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
}

export default function CodeEditor({ 
  content, 
  language, 
  fileName, 
  isDarkTheme = true,
  onContentChange,
  onSave,
  hasUnsavedChanges = false
}: CodeEditorProps) {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && onContentChange) {
      onContentChange(value);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (!isSaveCombo) return;
      event.preventDefault();
      if (onSave && hasUnsavedChanges) {
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, hasUnsavedChanges]);

  const canSave = Boolean(onSave) && hasUnsavedChanges;

  return (
    <div className="h-full flex flex-col">
      <div className={`h-12 ${isDarkTheme ? 'bg-vscode-sidebar' : 'bg-gray-100'} ${isDarkTheme ? 'border-vscode-border' : 'border-gray-300'} border-b px-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`${isDarkTheme ? 'text-vscode-text' : 'text-gray-900'} text-sm`}>{fileName}</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 bg-blue-500 rounded-full" title="Unsaved changes"></span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-xs text-vscode-text opacity-70">
              <Save className="w-3 h-3" />
              <span>Unsaved changes</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onSave?.()}
            disabled={!canSave}
            className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs transition-colors ${
              canSave
                ? 'bg-blue-600 hover:bg-blue-700 text-vscode-text'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            title={canSave ? 'Save file (Ctrl/Cmd+S)' : 'No changes to save'}
          >
            <Save className="w-3 h-3" />
            <span>Save</span>
          </button>
        </div>
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
