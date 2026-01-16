'use client';

import { DiffEditor } from '@monaco-editor/react';

interface DiffViewerProps {
  original: string;
  modified: string;
  language: string;
  isDarkTheme?: boolean;
}

export default function DiffViewer({
  original,
  modified,
  language,
  isDarkTheme = true,
}: DiffViewerProps) {
  return (
    <div className="h-full">
      <DiffEditor
        height="100%"
        language={language}
        theme={isDarkTheme ? 'vs-dark' : 'vs'}
        original={original}
        modified={modified}
        options={{
          readOnly: true,
          renderSideBySide: false,
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
