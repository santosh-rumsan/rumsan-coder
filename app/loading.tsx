'use client';

export default function Loading() {
  return (
    <div className="h-screen bg-vscode-bg flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-2 border-vscode-border border-t-blue-500 rounded-full animate-spin" />
      <div className="text-vscode-text text-sm">Loading...</div>
    </div>
  );
}
