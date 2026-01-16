'use client';

import Editor from '@monaco-editor/react';

interface EnvVariablesPanelProps {
  isDarkTheme?: boolean;
  content: string;
  onChange: (value: string) => void;
}

export default function EnvVariablesPanel({
  isDarkTheme = true,
  content,
  onChange,
}: EnvVariablesPanelProps) {
  return (
    <div className={`h-full ${isDarkTheme ? 'bg-vscode-editor' : 'bg-white'} flex flex-col`}>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="ini"
          theme={isDarkTheme ? 'vs-dark' : 'vs'}
          value={content}
          onChange={(value) => onChange(value ?? '')}
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
