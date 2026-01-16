export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url, token, branch } = await request.json();
    
    // Parse GitHub URL to extract owner and repo
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
    }

    const [, owner, repo] = match;
    const repoName = repo.replace('.git', '');

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    };

    const fetchTree = async (ref: string) => {
      return fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/trees/${ref}?recursive=1`,
        { headers }
      );
    };

    const fetchDefaultBranch = async (): Promise<string | null> => {
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}`,
        { headers }
      );
      if (!repoResponse.ok) return null;
      const repoData = await repoResponse.json();
      return repoData?.default_branch || null;
    };

    const attempted = new Set<string>();
    let response: Response | null = null;
    let resolvedBranch: string | null = null;

    const tryBranch = async (ref: string | null) => {
      if (!ref || attempted.has(ref)) return false;
      attempted.add(ref);
      response = await fetchTree(ref);
      if (response.ok) {
        resolvedBranch = ref;
        return true;
      }
      return false;
    };

    await tryBranch(branch);

    if (!resolvedBranch) {
      const defaultBranch = await fetchDefaultBranch();
      await tryBranch(defaultBranch);
    }

    if (!resolvedBranch) {
      await tryBranch('main');
    }

    if (!resolvedBranch) {
      await tryBranch('master');
    }

    if (!resolvedBranch || !response) {
      return NextResponse.json({ error: 'Failed to fetch repository' }, { status: 400 });
    }

    const data = await (response as Response).json();
    return NextResponse.json({ tree: data.tree, owner, repo: repoName, branch: resolvedBranch });
  } catch (error) {
    console.error('Error fetching repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
