# Browser-based Git Implementation

This implementation uses **isomorphic-git** and **LightningFS** to provide a full Git workflow in the browser.

## Features Implemented

### ✅ Core Git Operations
- **Clone**: Clone a GitHub repository into IndexedDB
- **Branch Management**: Create, list, and checkout branches
- **File Operations**: Read, write, and list files in the virtual filesystem
- **Staging**: Stage and unstage files
- **Commit**: Create commits locally in the browser
- **Push**: Push commits to GitHub using the user's access token
- **Pull**: Pull changes from remote repository
- **Status**: View changed files and their status

### ✅ Browser Storage
- All Git data stored in **IndexedDB** via LightningFS
- Persistent across browser sessions
- No server-side storage required

### ✅ CORS Handling
- Git proxy API route (`/api/git-proxy`) handles CORS issues
- Transparently forwards Git HTTP requests to GitHub
- Preserves authentication headers

## Architecture

```
┌─────────────────┐
│   GitPanel UI   │
│   (React)       │
└────────┬────────┘
         │
┌────────▼────────┐
│   lib/git.ts    │  ← Git operations wrapper
│  (isomorphic-   │
│     git)        │
└────────┬────────┘
         │
    ┌────┴─────┬──────────────┐
    │          │              │
┌───▼────┐ ┌──▼─────┐  ┌────▼──────┐
│ IndexDB│ │ Git    │  │ API Proxy │
│(Files) │ │ Proxy  │  │ /api/git- │
│        │ │ (CORS) │  │ proxy     │
└────────┘ └────┬───┘  └─────┬─────┘
                │            │
                └────┬───────┘
                     │
              ┌──────▼──────┐
              │   GitHub    │
              │   Remote    │
              └─────────────┘
```

## Usage

### 1. Clone a Repository

When you first open a repo, click the **"Clone Repository"** button. This will:
- Clone the repo into IndexedDB at `/workspace`
- Fetch all branches
- Set up Git config with your GitHub username/email

```typescript
await cloneRepo(
  'https://github.com/owner/repo',
  { token: 'ghp_...', name: 'Your Name', email: 'you@example.com' },
  (progress) => console.log(progress)
);
```

### 2. Make Changes

Edit files in the Monaco editor. Changes are automatically detected and shown in the Git panel.

### 3. Stage & Commit

1. Open the Git panel (bottom-right button)
2. Select files to stage (checkbox)
3. Enter a commit message
4. Click **"Commit"**

```typescript
// Stage files
await stageFile('path/to/file.ts');

// Commit
await commit('Your commit message', gitConfig);
```

### 4. Push to GitHub

Click the **"Push"** button to push your commits to GitHub.

```typescript
await push(gitConfig, currentBranch);
```

### 5. Branch Management

- **Switch branch**: Use the dropdown selector
- **Create branch**: Click "+ New Branch", enter name, press Create
- **Checkout**: Automatically checks out when creating

```typescript
// Create and checkout
await createBranch('feature/new-feature');
await checkoutBranch('feature/new-feature');
```

### 6. Pull Changes

Click the **"Pull"** button to sync with remote:

```typescript
await pull(gitConfig);
```

## Files Structure

### Core Implementation

```
lib/
├── fs.ts          # LightningFS wrapper (IndexedDB)
└── git.ts         # Git operations (isomorphic-git)

app/api/
└── git-proxy/
    └── route.ts   # CORS proxy for git HTTP operations

components/
└── GitPanel.tsx   # Git UI with clone/branch/commit/push
```

### Key Functions (lib/git.ts)

| Function | Purpose |
|----------|---------|
| `cloneRepo()` | Clone a repository into browser |
| `getCurrentBranch()` | Get active branch name |
| `listBranches()` | List all branches |
| `createBranch()` | Create a new branch |
| `checkoutBranch()` | Switch to a branch |
| `getStatusMatrix()` | Get all changed files |
| `stageFile()` | Stage a file |
| `stageAll()` | Stage multiple files |
| `unstageFile()` | Unstage a file |
| `commit()` | Create a commit |
| `push()` | Push to remote |
| `pull()` | Pull from remote |
| `readFile()` | Read file from virtual FS |
| `writeFile()` | Write file to virtual FS |
| `listFiles()` | List directory contents |
| `getLog()` | Get commit history |
| `isRepoCloned()` | Check if repo exists |

## Git Proxy API

The proxy route at `/api/git-proxy` handles CORS by forwarding requests:

**Request format:**
```
GET/POST /api/git-proxy?url=https://github.com/owner/repo.git/info/refs?service=git-upload-pack
```

**Headers forwarded:**
- `Authorization`: GitHub token
- `Accept`: Content negotiation
- `User-Agent`: Client identification
- `Git-Protocol`: Git protocol version

## How It Works

### Clone Process

1. User clicks "Clone Repository"
2. `cloneRepo()` is called with GitHub URL and token
3. isomorphic-git uses the `/api/git-proxy` to fetch Git objects
4. Files and Git metadata are stored in IndexedDB
5. Repository is now available offline

### Edit & Commit Process

1. User edits file in Monaco
2. File changes are written to LightningFS virtual filesystem
3. `getStatusMatrix()` detects changes
4. User stages files and commits
5. Commit is stored locally in IndexedDB

### Push Process

1. User clicks "Push"
2. `push()` sends commits to GitHub via proxy
3. GitHub API authenticated with user's token
4. Remote branch is updated

## Authentication

The implementation uses the GitHub access token from `next-auth`:

```typescript
// In page.tsx
<GitPanel
  repoUrl="https://github.com/owner/repo"
  token={(session as any).accessToken}
  userName={(session as any).user?.name}
  userEmail={(session as any).user?.email}
/>
```

Make sure your NextAuth GitHub provider has the `repo` scope:

```typescript
// app/api/auth/[...nextauth]/route.ts
GithubProvider({
  authorization: {
    params: {
      scope: 'read:user user:email repo',
    },
  },
})
```

## Limitations & Notes

1. **Single Workspace**: Currently supports one repo at `/workspace`
2. **Browser Storage**: Limited by IndexedDB quota (usually several GB)
3. **Shallow Clone**: Uses `depth: 1` for faster cloning
4. **Binary Files**: Text files work best; binary files supported but may be slow
5. **Merge Conflicts**: Not fully handled in UI; requires manual resolution

## Troubleshooting

### "Failed to clone repository"
- Check GitHub token has `repo` scope
- Verify repository URL is correct
- Check browser console for detailed error

### "CORS error"
- Ensure `/api/git-proxy` route is working
- Check that `corsProxy: '/api/git-proxy'` is set in git operations

### "IndexedDB quota exceeded"
- Clear browser storage for the site
- Use `resetFS()` to wipe the filesystem

### "Failed to push"
- Verify you have write access to the repository
- Check that you're not behind remote (pull first)
- Ensure your token hasn't expired

## Example Workflow

```typescript
// 1. Clone (one time)
await cloneRepo(repoUrl, gitConfig);

// 2. Create feature branch
await createBranch('feature/awesome');
await checkoutBranch('feature/awesome');

// 3. Edit files (in Monaco editor)
await writeFile('src/app.ts', newContent);

// 4. Stage and commit
await stageFile('src/app.ts');
await commit('Add awesome feature', gitConfig);

// 5. Push to GitHub
await push(gitConfig);
```

## Future Enhancements

- [ ] Diff viewer
- [ ] Merge conflict resolution UI
- [ ] Commit history viewer
- [ ] Multiple workspaces
- [ ] Git stash support
- [ ] Rebase operations
- [ ] Tag management
- [ ] Remote management
