'use client';

import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-vscode-bg flex items-center justify-center">
      <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg mb-4 border border-vscode-border">
            <img
              src="/app-logo.png"
              alt="Rumsan Coder"
              className="w-10 h-10 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-vscode-text mb-2">Rumsan Coder</h1>
          <p className="text-vscode-text">Sign in to continue</p>
        </div>

        <button
          onClick={() => signIn('github', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 bg-[#24292e] hover:bg-[#2f363d] text-vscode-text font-semibold py-3 px-4 rounded-md transition-colors duration-200"
        >
          <Github className="w-5 h-5" />
          Sign in with GitHub
        </button>

        <p className="text-xs text-vscode-text text-center mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
