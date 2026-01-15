'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Eye, EyeOff, Download, Upload } from 'lucide-react';

interface EnvVariable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface EnvVariablesPanelProps {
  isDarkTheme?: boolean;
}

export default function EnvVariablesPanel({ isDarkTheme = true }: EnvVariablesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [variables, setVariables] = useState<EnvVariable[]>(() => {
    // Initialize state from localStorage
    const saved = localStorage.getItem('env-variables');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load env variables:', error);
        return [];
      }
    }
    return [];
  });
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Save env variables to localStorage
    if (variables.length > 0) {
      localStorage.setItem('env-variables', JSON.stringify(variables));
    }
  }, [variables]);

  const addVariable = () => {
    if (!newKey.trim()) {
      alert('Please enter a variable name');
      return;
    }

    const newVar: EnvVariable = {
      id: Date.now().toString(),
      key: newKey.trim(),
      value: newValue,
      isSecret: false,
    };

    setVariables([...variables, newVar]);
    setNewKey('');
    setNewValue('');
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id));
  };

  const toggleSecret = (id: string) => {
    setVariables(
      variables.map((v) =>
        v.id === id ? { ...v, isSecret: !v.isSecret } : v
      )
    );
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const updateVariable = (id: string, field: 'key' | 'value', value: string) => {
    setVariables(
      variables.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      )
    );
  };

  const exportToEnvFile = () => {
    const content = variables
      .map((v) => `${v.key}=${v.value}`)
      .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromEnvFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.env';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const lines = content.split('\n');
          const newVars: EnvVariable[] = lines
            .filter((line) => line.trim() && !line.startsWith('#'))
            .map((line) => {
              const [key, ...valueParts] = line.split('=');
              return {
                id: Date.now().toString() + Math.random(),
                key: key.trim(),
                value: valueParts.join('=').trim(),
                isSecret: false,
              };
            });
          setVariables([...variables, ...newVars]);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const copyToClipboard = () => {
    const content = variables
      .map((v) => `${v.key}=${v.value}`)
      .join('\n');
    navigator.clipboard.writeText(content);
    alert('Environment variables copied to clipboard!');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 ${
          isDarkTheme ? 'bg-vscode-hover hover:bg-opacity-80' : 'bg-gray-200 hover:bg-gray-300'
        } text-vscode-text rounded text-sm transition-colors`}
        title="Environment Variables"
      >
        <Settings className="w-4 h-4" />
        <span>ENV</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-h-[80vh] ${
              isDarkTheme ? 'bg-vscode-sidebar' : 'bg-white'
            } rounded-lg shadow-2xl z-50 flex flex-col`}
          >
            <div
              className={`h-12 px-4 flex items-center justify-between border-b ${
                isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
              }`}
            >
              <h2 className="text-vscode-text font-semibold">Environment Variables</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={importFromEnvFile}
                  className="p-1.5 text-vscode-text hover:text-blue-500"
                  title="Import from .env file"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  onClick={exportToEnvFile}
                  className="p-1.5 text-vscode-text hover:text-blue-500"
                  title="Export to .env file"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={copyToClipboard}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Copy All
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-vscode-text hover:text-blue-500"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className={`mb-4 p-4 rounded ${isDarkTheme ? 'bg-vscode-editor' : 'bg-gray-50'}`}>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addVariable()}
                    placeholder="Variable name (e.g., API_KEY)"
                    className={`flex-1 px-3 py-2 ${
                      isDarkTheme ? 'bg-vscode-sidebar text-vscode-text' : 'bg-white text-gray-900'
                    } border ${
                      isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
                    } rounded text-sm`}
                  />
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addVariable()}
                    placeholder="Value"
                    className={`flex-1 px-3 py-2 ${
                      isDarkTheme ? 'bg-vscode-sidebar text-vscode-text' : 'bg-white text-gray-900'
                    } border ${
                      isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
                    } rounded text-sm`}
                  />
                  <button
                    onClick={addVariable}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              {variables.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-vscode-text opacity-50 mx-auto mb-3" />
                  <p className="text-vscode-text opacity-70">No environment variables yet</p>
                  <p className="text-vscode-text opacity-50 text-sm mt-1">
                    Add variables to manage your application configuration
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {variables.map((variable) => (
                    <div
                      key={variable.id}
                      className={`p-3 rounded flex items-center gap-2 ${
                        isDarkTheme ? 'bg-vscode-editor' : 'bg-gray-50'
                      }`}
                    >
                      <input
                        type="text"
                        value={variable.key}
                        onChange={(e) => updateVariable(variable.id, 'key', e.target.value)}
                        className={`flex-1 px-2 py-1 ${
                          isDarkTheme ? 'bg-vscode-sidebar text-vscode-text' : 'bg-white text-gray-900'
                        } border ${
                          isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
                        } rounded text-sm font-mono`}
                      />
                      <span className="text-vscode-text">=</span>
                      <div className="flex-1 relative">
                        <input
                          type={variable.isSecret && !showSecrets.has(variable.id) ? 'password' : 'text'}
                          value={variable.value}
                          onChange={(e) => updateVariable(variable.id, 'value', e.target.value)}
                          className={`w-full px-2 py-1 ${
                            isDarkTheme ? 'bg-vscode-sidebar text-vscode-text' : 'bg-white text-gray-900'
                          } border ${
                            isDarkTheme ? 'border-vscode-border' : 'border-gray-300'
                          } rounded text-sm font-mono`}
                        />
                      </div>
                      <button
                        onClick={() => toggleSecret(variable.id)}
                        className={`p-1.5 rounded ${
                          variable.isSecret ? 'bg-yellow-600' : 'bg-gray-600'
                        } text-white text-xs`}
                        title={variable.isSecret ? 'Mark as public' : 'Mark as secret'}
                      >
                        {variable.isSecret ? '🔒' : '🔓'}
                      </button>
                      {variable.isSecret && (
                        <button
                          onClick={() => toggleShowSecret(variable.id)}
                          className="p-1.5 text-vscode-text hover:text-blue-500"
                          title={showSecrets.has(variable.id) ? 'Hide value' : 'Show value'}
                        >
                          {showSecrets.has(variable.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => removeVariable(variable.id)}
                        className="p-1.5 text-red-500 hover:text-red-600"
                        title="Remove variable"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={`text-xs text-vscode-text opacity-70 mt-4 p-3 rounded ${
                isDarkTheme ? 'bg-vscode-editor' : 'bg-gray-50'
              }`}>
                <p className="mb-2">💡 Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Variables are stored locally in your browser</li>
                  <li>Mark sensitive data as secret (🔒) to hide values</li>
                  <li>Export to .env file for use in your projects</li>
                  <li>Import existing .env files to quickly add variables</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
