// export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Git proxy to handle CORS issues with git HTTP operations
 * This proxies requests from isomorphic-git to GitHub
 * 
 * isomorphic-git appends the target URL path to the corsProxy URL
 * So: corsProxy='/api/git-proxy' + '/github.com/owner/repo.git/info/refs?service=git-upload-pack'
 * Results in: /api/git-proxy/github.com/owner/repo.git/info/refs?service=git-upload-pack
 */
function getTargetUrl(request: NextRequest, params: { path?: string[] }): string {
  // Extract the remaining path from params
  const pathSegments = params.path || [];
  let targetPath = pathSegments.join('/');

  // Construct the full URL with HTTPS protocol
  const fullUrl = `https://${targetPath}`;
  
  // Add query string if present
  if (request.nextUrl.search) {
    return fullUrl + request.nextUrl.search;
  }

  return fullUrl;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  try {
    const resolvedParams = await params;
    const targetUrl = getTargetUrl(request, resolvedParams);
    
    const headers = new Headers();

    // Copy ALL headers from the original request
    for (const [key, value] of request.headers.entries()) {
      // Skip host header as fetch will set it
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    }

    // Ensure authorization is present
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.warn('[git-proxy] ⚠️  No Authorization header in request to', targetUrl);
    } else {
      console.log('[git-proxy] ✓ Authorization header present:', authHeader.substring(0, 20) + '...');
    }

    console.log('[git-proxy] GET', targetUrl);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    console.log('[git-proxy] Response status:', response.status);

    // Get the response body
    const body = await response.arrayBuffer();
    
    // Log the body content for debugging
    const bodyText = new TextDecoder().decode(body.slice(0, 100));
    console.log('[git-proxy] GET Response body (first 100 chars):', JSON.stringify(bodyText));
    console.log('[git-proxy] GET Response body size:', body.byteLength);
    console.log('[git-proxy] GET Response body hex (first 20 bytes):', Array.from(new Uint8Array(body).slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));

    // Build response headers
    const responseHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
    };

    // Set Content-Length from original response or calculate from body
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    } else {
      responseHeaders['Content-Length'] = body.byteLength.toString();
    }

    // Create response with CORS headers
    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Git proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  try {
    const resolvedParams = await params;
    const targetUrl = getTargetUrl(request, resolvedParams);
    
    const headers = new Headers();

    // Copy ALL headers from the original request
    for (const [key, value] of request.headers.entries()) {
      // Skip host header as fetch will set it
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    }

    // Ensure authorization is present
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.warn('[git-proxy] ⚠️  No Authorization header in POST request to', targetUrl);
    } else {
      console.log('[git-proxy] ✓ POST Authorization header present:', authHeader.substring(0, 20) + '...');
    }

    console.log('[git-proxy] POST', targetUrl);

    // Get request body
    const body = await request.arrayBuffer();

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
    });

    console.log('[git-proxy] POST Response status:', response.status);

    const responseBody = await response.arrayBuffer();

    // Build response headers
    const responseHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
    };

    // Set Content-Length from original response or calculate from body
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    } else {
      responseHeaders['Content-Length'] = responseBody.byteLength.toString();
    }

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Git proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
