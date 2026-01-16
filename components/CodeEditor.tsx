'use client';

import Editor from '@monaco-editor/react';
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
  fileName: _fileName, 
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

  return (
    <div className="h-full flex flex-col">
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
            fontSize: 13,
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
