# Rumsan Coder - VS Code Clone

A VS Code-like application with GitHub authentication and repository browsing capabilities.

## Features

- 🔐 **GitHub Authentication** - Secure login using GitHub OAuth
- 📂 **Repository Browser** - Load any GitHub repository by URL
- 🌲 **File Tree** - Collapsible tree structure displaying all repository files
- 📝 **Code Editor** - Monaco Editor with syntax highlighting for 30+ languages
- 🎨 **VS Code Theme** - Authentic VS Code dark theme

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure GitHub OAuth

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: Rumsan Coder
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3000/api/auth/callback/github
4. Click "Register application"
5. Copy the Client ID and generate a new Client Secret

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=http://localhost:3000
```

Generate a random secret for `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Login** - Click "Sign in with GitHub" to authenticate
2. **Open Repository** - Click the "Open Repository" button in the top bar
3. **Enter URL** - Paste a GitHub repository URL (e.g., https://github.com/facebook/react)
4. **Browse Files** - Click on files in the tree to view them in the editor

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **NextAuth.js** - Authentication
- **Monaco Editor** - Code editor (same as VS Code)
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Supported Languages

JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Scala, HTML, CSS, SCSS, Sass, JSON, XML, YAML, Markdown, SQL, Shell, and more.

## License

MIT

