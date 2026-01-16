# Browser-based Git Implementation - Quick Start

## ✅ What Was Implemented

Your Next.js IDE now has **full in-browser Git functionality** using isomorphic-git and LightningFS:

### Core Features
- ✅ **Clone** GitHub repos into browser (IndexedDB)
- ✅ **Branch** management (create, checkout, list)
- ✅ **Stage** and unstage files
- ✅ **Commit** changes locally
- ✅ **Push** to GitHub using your OAuth token
- ✅ **Pull** from remote
- ✅ **CORS proxy** for git HTTP operations
- ✅ File operations (read, write, list)
- ✅ Status tracking and change detection

## 📁 Files Created/Modified

```
lib/
├── fs.ts              # LightningFS wrapper (IndexedDB)
├── git.ts             # Git operations (20+ functions)
├── git-types.ts       # TypeScript definitions
└── useGit.ts          # React hook (optional)

app/api/git-proxy/
└── route.ts           # CORS proxy (GET/POST/OPTIONS)

components/
└── GitPanel.tsx       # UI with clone/branch/commit/push

GIT_IMPLEMENTATION.md  # Full documentation
QUICK_START.md         # This file
```

## 🚀 How to Use

### 1. Start Dev Server
```bash
pnpm dev
```

### 2. Sign in with GitHub
- Make sure you have `GITHUB_ID` and `GITHUB_SECRET` in `.env.local`
- OAuth scope includes `repo` permission

### 3. Open a Repository
- Click "Open Repo" in the IDE
- Enter GitHub URL (e.g., `https://github.com/username/repo`)

### 4. Clone Repository
- Click **"Clone Repository"** button (bottom-right)
- Wait for cloning to complete (progress shown)
- Repository is now in your browser's IndexedDB

### 5. Make Changes
- Edit files in Monaco editor
- Changes are automatically detected
- Click the Git button (bottom-right) to open Git panel

### 6. Commit & Push
- Open Git Panel
- Check files to stage
- Enter commit message
- Click "Commit" → Creates local commit
- Click "Push" → Pushes to GitHub

### 7. Branch Management
- Use dropdown to switch branches
- Click "+ New Branch" to create new branch
- Automatically checks out the new branch

### 8. Pull Changes
- Click "Pull" button to sync from remote
- Merges changes into your local branch

## 🎯 Key Components

### GitPanel Component
- **Props:**
  - `repoUrl`: Full GitHub URL
  - `token`: GitHub OAuth token from next-auth
  - `userName`: GitHub username (optional)
  - `userEmail`: GitHub email (optional)
  - `isDarkTheme`: Theme toggle

### Git Utilities (lib/git.ts)
```typescript
import * as git from '@/lib/git';

// Clone
await git.cloneRepo(url, config, onProgress);

// Branches
const branch = await git.getCurrentBranch();
await git.createBranch('feature/new');
await git.checkoutBranch('feature/new');

// Files & Status
const status = await git.getStatusMatrix();
await git.stageFile('path/to/file.ts');

// Commit & Push
await git.commit('Message', config);
await git.push(config, branch);

// File Operations
await git.writeFile('src/app.ts', content);
const content = await git.readFile('src/app.ts');
```

## 🔧 Architecture

```
Browser UI (React)
       ↓
lib/git.ts (isomorphic-git)
       ↓
IndexedDB (LightningFS) ←→ API Proxy → GitHub
```

## ⚙️ Configuration

### NextAuth (already configured)
```typescript
// app/api/auth/[...nextauth]/route.ts
GithubProvider({
  authorization: {
    params: {
      scope: 'read:user user:email repo', // ✅ repo scope
    },
  },
})
```

### Git Config (automatic)
User's GitHub name and email are automatically used from the session.

## 🐛 Troubleshooting

### "Failed to clone"
- Check token has `repo` scope
- Verify repository URL
- Check browser console for details

### CORS errors
- Ensure `/api/git-proxy` route is working
- Check Network tab for proxy requests

### IndexedDB quota exceeded
- Clear site data in browser settings
- Or use `resetFS()` from `lib/fs.ts`

### Build errors
```bash
# Clear cache and rebuild
rm -rf .next
pnpm run build
```

## 📊 Browser Storage

All Git data is stored in **IndexedDB** under the name `fs`:
- Repository files
- Git objects (commits, trees, blobs)
- Refs (branches, tags)
- Configuration

Typical size: 5-50 MB per repo (depending on size)

## 🎨 UI Flow

1. **Before Clone:** Green "Clone Repository" button
2. **Cloning:** Progress indicator
3. **After Clone:** Git button showing Git panel
4. **With Changes:** Badge showing number of changed files

## 📝 Example Usage

```tsx
// In your page component
<GitPanel
  repoUrl={`https://github.com/${owner}/${repo}`}
  token={(session as any).accessToken}
  userName={(session as any).user?.name}
  userEmail={(session as any).user?.email}
  isDarkTheme={isDarkTheme}
/>
```

## 🔥 Features Comparison

| Feature | Old (GitHub API) | New (isomorphic-git) |
|---------|-----------------|---------------------|
| Clone | ❌ | ✅ Browser storage |
| Branches | ❌ API only | ✅ Full local control |
| Commit | ⚠️ Direct push | ✅ Local → Push |
| Offline | ❌ | ✅ Works offline |
| Speed | ⏱️ Network calls | ⚡ Instant |
| Storage | ❌ | ✅ IndexedDB |

## 🎯 Next Steps

1. Test cloning your repository
2. Make some edits
3. Create a branch
4. Commit and push changes
5. Check GitHub to see your commits!

## 📚 Documentation

- Full docs: [GIT_IMPLEMENTATION.md](./GIT_IMPLEMENTATION.md)
- API reference: Check `lib/git.ts` JSDoc comments
- React hook: See `lib/useGit.ts` for advanced usage

## 💡 Tips

- Repository stays in browser across sessions
- Refresh page won't lose your work
- Clone once, work offline
- Push whenever you're ready
- Pull to sync with remote

---

**Built with:**
- [isomorphic-git](https://isomorphic-git.org/) - Git for JavaScript
- [LightningFS](https://github.com/isomorphic-git/lightning-fs) - In-memory FS with IndexedDB
- [Next.js 16](https://nextjs.org/) + [React 19](https://react.dev/)

🚀 **Your browser is now a full Git client!**
