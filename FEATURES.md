# Rumsan Coder - Feature Documentation

## 🚀 New Features Added

### 1. Resizable Explorer Sidebar
- **Drag and Resize**: The file explorer sidebar can now be resized by dragging the right edge
- **Min/Max Width**: Constrained between 200px and 600px for optimal usability
- **Smooth Interaction**: Real-time resizing with visual feedback

**How to use:**
1. Hover over the right edge of the explorer sidebar
2. Click and drag left or right to adjust the width
3. Release to set the new width

### 2. Git Branch Management
- **Branch Selector**: View and switch between branches using the dropdown in the top bar
- **Create New Branch**: Create new branches directly from the UI
- **Branch Indicator**: Current branch is always visible and marked with a checkmark

**How to use:**
1. Click on the branch selector button (shows current branch name with git icon)
2. Select from existing branches or click "Create new branch"
3. Enter branch name and click "Create" to make a new branch
4. The repository will reload with the selected branch

### 3. Editable Code Editor
- **Live Editing**: All files are now editable in the Monaco editor
- **Change Tracking**: Modified files are tracked and indicated with a blue dot
- **Unsaved Changes Indicator**: Clear visual feedback for files with unsaved changes
- **Enhanced Editor Features**:
  - Word wrap enabled
  - Format on paste
  - Format on type
  - Syntax highlighting for multiple languages

**How to use:**
1. Open any file from the explorer
2. Start editing - changes are tracked automatically
3. The blue dot indicator shows unsaved changes
4. Use the Git Panel to commit your changes

### 4. Git Change Tracking & Commit/Push
- **Change Tracking**: All file modifications are tracked in real-time
- **Staging Area**: Select which files to include in your commit
- **Commit Messages**: Write meaningful commit messages
- **Direct GitHub Integration**: Commits are pushed directly to GitHub
- **Visual Change Counter**: Floating button shows number of changed files

**How to use:**
1. Make changes to files in the editor
2. Click the floating Git button (bottom right) to open the Source Control panel
3. Check the files you want to stage for commit
4. Write a commit message
5. Click "Commit" to push changes directly to GitHub
6. Changes are immediately reflected in the remote repository

**Features:**
- ✅ Stage/Unstage individual files or all files
- ✅ View all changed files with modification indicators
- ✅ Commits include proper git tree creation
- ✅ Automatic branch reference updates
- ✅ Error handling and user feedback

### 5. Environment Variables Panel
- **Variable Management**: Add, edit, and delete environment variables
- **Secret Protection**: Mark variables as secret to hide sensitive values
- **Import/Export**: Import from or export to .env files
- **Local Storage**: Variables are saved in browser localStorage
- **Copy Functionality**: Quick copy all variables to clipboard

**How to use:**
1. Click the "ENV" button in the top bar
2. Add new variables using the input fields
3. Click the lock icon to mark variables as secret
4. Use the eye icon to show/hide secret values
5. Export to .env file or import existing .env files
6. Variables persist across sessions in your browser

**Features:**
- ✅ Add/Remove variables
- ✅ Edit variable names and values
- ✅ Secret value protection
- ✅ Import from .env files
- ✅ Export to .env files
- ✅ Copy all to clipboard
- ✅ Persistent storage

## 🎨 UI Improvements

### Visual Enhancements
- Dark/Light theme support throughout all new components
- Consistent styling with VS Code theme
- Smooth transitions and hover effects
- Responsive layouts
- Clear visual feedback for all interactions

### User Experience
- Intuitive drag-and-drop resizing
- Keyboard shortcuts support (Enter to submit)
- Loading states for async operations
- Error handling with user-friendly messages
- Tooltips and help text

## 🔧 Technical Implementation

### Component Architecture
```
components/
├── BranchSelector.tsx    # Git branch management
├── CodeEditor.tsx        # Enhanced Monaco editor
├── EnvVariablesPanel.tsx # Environment variable manager
├── FileTree.tsx          # File explorer
└── GitPanel.tsx          # Source control panel
```

### State Management
- React hooks for local state
- Map data structure for tracking file changes
- Ref-based resize handling
- Session-based authentication

### API Integration
- GitHub API for repository operations
- Branch-aware file fetching
- Git tree and commit creation
- Blob creation for file contents

## 📋 Usage Tips

### Best Practices
1. **Branch Management**: Always check your current branch before making changes
2. **Committing**: Write clear, descriptive commit messages
3. **Environment Variables**: Mark sensitive data as secret
4. **File Changes**: Review all changed files before committing

### Keyboard Shortcuts
- `Enter` in branch name input: Create new branch
- `Enter` in commit message: Submit commit
- `Enter` in env variable inputs: Add new variable

### Troubleshooting
- **Branch not switching**: Make sure you have no uncommitted changes
- **Commit failed**: Check your GitHub permissions and branch access
- **File not loading**: Verify the branch contains the file
- **Resize not working**: Ensure sidebar width is between 200-600px

## 🔐 Security Notes

### Environment Variables
- Variables are stored in browser localStorage
- Secret variables are visually protected but still accessible in developer tools
- For production use, consider server-side environment variable management
- Never commit .env files with sensitive data to repositories

### Git Operations
- All commits require GitHub authentication
- Token is session-based and temporary
- Direct API access to GitHub - no server-side storage
- Review all changes before committing

## 🚦 Getting Started

1. **Login**: Sign in with your GitHub account
2. **Load Repository**: Click "Open a Repository" and enter a GitHub URL
3. **Select Branch**: Choose your working branch from the branch selector
4. **Edit Files**: Click any file in the explorer to open and edit
5. **Manage Changes**: Use the Git Panel to track and commit changes
6. **Configure Environment**: Set up environment variables as needed

## 🎯 Future Enhancements

Potential features for future development:
- Pull request creation from UI
- Merge conflict resolution
- Multi-file commit diff view
- Branch comparison
- File search and replace
- Code snippets library
- Terminal integration
- Collaborative editing

## 📞 Support

For issues or questions:
- Check the in-app tips and hints
- Review this documentation
- Examine browser console for error details
- Verify GitHub API rate limits

---

**Version**: 1.0.0
**Last Updated**: January 2026
