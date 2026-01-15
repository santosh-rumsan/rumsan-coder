/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'vscode-bg': 'var(--vscode-bg)',
        'vscode-sidebar': 'var(--vscode-sidebar)',
        'vscode-editor': 'var(--vscode-editor)',
        'vscode-border': 'var(--vscode-border)',
        'vscode-hover': 'var(--vscode-hover)',
        'vscode-text': 'var(--vscode-text)',
      },
      backgroundColor: {
        'vscode-bg': 'var(--vscode-bg)',
        'vscode-sidebar': 'var(--vscode-sidebar)',
        'vscode-editor': 'var(--vscode-editor)',
        'vscode-hover': 'var(--vscode-hover)',
      },
      textColor: {
        'vscode-text': 'var(--vscode-text)',
      },
      borderColor: {
        'vscode-border': 'var(--vscode-border)',
      },
    },
  },
  plugins: [],
}

