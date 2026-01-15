'use client';

import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-vscode-bg flex items-center justify-center">
      <div className="bg-vscode-sidebar border border-vscode-border rounded-lg p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg mb-4">
            <svg
              className="w-10 h-10 text-vscode-text"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
            </svg>
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
