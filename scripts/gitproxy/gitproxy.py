#!/usr/bin/env python3
"""
Git proxy server to handle CORS issues with git HTTP operations.
This proxies requests from isomorphic-git to GitHub.

isomorphic-git appends the target URL path to the corsProxy URL
So: corsProxy='/api/git-proxy' + '/github.com/owner/repo.git/info/refs?service=git-upload-pack'
Results in: /api/git-proxy/github.com/owner/repo.git/info/refs?service=git-upload-pack
"""

import os
import sys
import logging
from urllib.parse import urlencode
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class GitProxyHandler(BaseHTTPRequestHandler):
    """HTTP request handler for git proxy operations."""

    def log_message(self, format, *args):
        """Override to use the configured logger."""
        logger.info(format % args)

    def do_GET(self):
        """Handle GET requests."""
        self._handle_request('GET')

    def do_POST(self):
        """Handle POST requests."""
        self._handle_request('POST')

    def do_OPTIONS(self):
        """Handle OPTIONS (CORS preflight) requests."""
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def _handle_request(self, method):
        """Handle GET or POST request."""
        try:
            # Split path and query string
            path_part = self.path.split('?')[0]
            query_string = self.path.split('?', 1)[1] if '?' in self.path else None
            
            # Extract the path (remove the /api/git-proxy prefix)
            prefix = '/api/git-proxy/'
            
            if path_part.startswith(prefix):
                target_path = path_part[len(prefix):]
            else:
                # Fallback: try without prefix
                target_path = path_part.lstrip('/')
            
            # Construct the full URL with HTTPS protocol
            target_url = f'https://{target_path}'
            
            # Add query string if present (only once)
            if query_string:
                target_url += '?' + query_string
            
            # Copy headers from the original request
            headers = {}
            for header, value in self.headers.items():
                # Skip host header as requests library will set it
                if header.lower() not in ['host', 'connection']:
                    headers[header] = value
            
            # Check authorization header
            auth_header = self.headers.get('Authorization')
            if not auth_header:
                logger.warning(f'[git-proxy] ⚠️  No Authorization header in {method} request to {target_url}')
            else:
                logger.info(f'[git-proxy] ✓ {method} Authorization header present: {auth_header[:20]}...')
            
            logger.info(f'[git-proxy] {method} {target_url}')
            
            # Get request body if present
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            
            # Make the proxied request
            if method == 'GET':
                response = requests.get(target_url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(target_url, headers=headers, data=body, timeout=30)
            
            logger.info(f'[git-proxy] {method} Response status: {response.status_code}')
            
            # Log response details
            response_body = response.content
            body_preview = response_body[:100].decode('utf-8', errors='replace')
            logger.info(f'[git-proxy] {method} Response body (first 100 chars): {repr(body_preview)}')
            logger.info(f'[git-proxy] {method} Response body size: {len(response_body)}')
            hex_preview = ' '.join(f'{b:02x}' for b in response_body[:20])
            logger.info(f'[git-proxy] {method} Response body hex (first 20 bytes): {hex_preview}')
            
            # Send response
            self.send_response(response.status_code)
            
            # Set response headers
            self._set_cors_headers()
            
            # Copy content type from original response
            content_type = response.headers.get('Content-Type', 'application/octet-stream')
            self.send_header('Content-Type', content_type)
            
            # Set Content-Length
            content_length = response.headers.get('Content-Length')
            if content_length:
                self.send_header('Content-Length', content_length)
            else:
                self.send_header('Content-Length', str(len(response_body)))
            
            self.end_headers()
            
            # Send response body
            self.wfile.write(response_body)
        
        except requests.exceptions.RequestException as error:
            logger.error(f'Git proxy request error: {error}')
            self._send_error_response(500, str(error))
        except Exception as error:
            logger.error(f'Git proxy error: {error}')
            self._send_error_response(500, str(error))

    def _set_cors_headers(self):
        """Set CORS headers on the response."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')

    def _send_error_response(self, status_code, error_message):
        """Send an error response."""
        self.send_response(status_code)
        self._set_cors_headers()
        self.send_header('Content-Type', 'application/json')
        
        import json
        response_body = json.dumps({
            'error': 'Failed to proxy request',
            'details': error_message
        }).encode('utf-8')
        
        self.send_header('Content-Length', str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)


def run_server(host='0.0.0.0', port=3001):
    """Run the git proxy server."""
    server_address = (host, port)
    httpd = HTTPServer(server_address, GitProxyHandler)
    
    logger.info(f'[git-proxy] Starting server on {host}:{port}')
    logger.info(f'[git-proxy] Accepting requests at http://{host}:{port}/api/git-proxy/<path>')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info('[git-proxy] Shutting down server...')
        httpd.shutdown()
        sys.exit(0)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    run_server(port=port)
