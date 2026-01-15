import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url, token, branch = 'main' } = await request.json();
    
    // Parse GitHub URL to extract owner and repo
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
    }

    const [, owner, repo] = match;
    const repoName = repo.replace('.git', '');

    // Fetch repository tree with specified branch
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      // Try 'main' branch if specified branch doesn't exist
      const mainResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/trees/main?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!mainResponse.ok) {
        // Try 'master' branch as last resort
        const masterResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/git/trees/master?recursive=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (!masterResponse.ok) {
          return NextResponse.json({ error: 'Failed to fetch repository' }, { status: 400 });
        }

        const data = await masterResponse.json();
        return NextResponse.json({ tree: data.tree, owner, repo: repoName, branch: 'master' });
      }

      const data = await mainResponse.json();
      return NextResponse.json({ tree: data.tree, owner, repo: repoName, branch: 'main' });
    }

    const data = await response.json();
    return NextResponse.json({ tree: data.tree, owner, repo: repoName, branch });
  } catch (error) {
    console.error('Error fetching repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
