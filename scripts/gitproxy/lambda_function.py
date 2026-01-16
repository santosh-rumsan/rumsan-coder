#!/usr/bin/env python3
"""
Git proxy Lambda function to handle CORS issues with git HTTP operations
This proxies requests from isomorphic-git to GitHub via AWS Lambda + API Gateway

API Gateway passes requests in the 'event' parameter with the following structure:
- httpMethod: GET, POST, OPTIONS, etc.
- path: The request path
- headers: Request headers
- body: Request body (for POST requests)
- queryStringParameters: Query parameters
"""

import json
import logging
import base64
from urllib.parse import urlencode
import requests

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    """
    AWS Lambda handler for git proxy requests.
    
    Args:
        event: API Gateway event containing request details
        context: Lambda context object
    
    Returns:
        dict: API Gateway response format
    """
    try:
        logger.info(f'[git-proxy] Incoming event: {json.dumps(event)[:500]}...')
        
        # Detect if this is a Lambda Function URL (has requestContext.http)
        is_lambda_url = 'requestContext' in event and 'http' in event.get('requestContext', {})
        
        # Extract HTTP method (support both API Gateway and Lambda Function URLs)
        method = (event.get('httpMethod') or 
                 event.get('requestContext', {}).get('http', {}).get('method', 'GET')).upper()
        
        # Extract path (support both API Gateway and Lambda Function URLs)
        path = event.get('path') or event.get('rawPath', '')
        prefix = '/api/git-proxy'
        
        if path.startswith(prefix):
            target_path = path[len(prefix):]
        else:
            target_path = path
        
        # Remove ALL leading slashes to handle malformed URLs with double slashes
        target_path = target_path.lstrip('/')
        
        # Construct target URL with HTTPS protocol
        target_url = f'https://{target_path}'
        
        # Add query string if present
        query_params = event.get('queryStringParameters')
        if query_params:
            target_url += '?' + urlencode(query_params)
        
        # Extract headers
        headers = event.get('headers', {})
        
        # Skip certain headers that shouldn't be proxied
        skip_headers = {'host', 'connection', 'content-length'}
        proxied_headers = {k: v for k, v in headers.items() 
                          if k.lower() not in skip_headers}
        
        # Check authorization header
        auth_header = headers.get('Authorization')
        if not auth_header:
            logger.warning(f'[git-proxy] ⚠️  No Authorization header in {method} request to {target_url}')
        else:
            logger.info(f'[git-proxy] ✓ {method} Authorization header present: {auth_header[:20]}...')
        
        logger.info(f'[git-proxy] {method} {target_url}')
        
        # Extract request body
        body = None
        if method in ['POST', 'PUT', 'PATCH']:
            body_str = event.get('body')
            if body_str:
                # Body might be base64 encoded
                is_base64 = event.get('isBase64Encoded', False)
                if is_base64:
                    body = base64.b64decode(body_str)
                else:
                    body = body_str.encode('utf-8') if isinstance(body_str, str) else body_str
        
        # Make the proxied request
        if method == 'GET':
            response = requests.get(target_url, headers=proxied_headers, timeout=30)
        elif method == 'POST':
            response = requests.post(target_url, headers=proxied_headers, data=body, timeout=30)
        elif method == 'PUT':
            response = requests.put(target_url, headers=proxied_headers, data=body, timeout=30)
        elif method == 'DELETE':
            response = requests.delete(target_url, headers=proxied_headers, timeout=30)
        elif method == 'OPTIONS':
            # Handle CORS preflight - only set headers if not Lambda Function URL
            response = {'statusCode': 200, 'body': ''}
            if not is_lambda_url:
                response['headers'] = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
                    'Access-Control-Max-Age': '86400',
                }
            return response
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': f'Method {method} not allowed'})
            }
        
        logger.info(f'[git-proxy] {method} Response status: {response.status_code}')
        
        # Log response details
        response_body = response.content
        body_preview = response_body[:100].decode('utf-8', errors='replace')
        logger.info(f'[git-proxy] {method} Response body (first 100 chars): {repr(body_preview)}')
        logger.info(f'[git-proxy] {method} Response body size: {len(response_body)}')
        
        # Check if response is binary
        content_type = response.headers.get('Content-Type', 'application/octet-stream')
        is_binary = 'application/octet-stream' in content_type or 'application/x-git' in content_type
        
        # Prepare response
        response_headers = {'Content-Type': content_type}
        
        # Only add CORS headers if not Lambda Function URL (infrastructure handles it)
        if not is_lambda_url:
            response_headers.update({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            })
        
        # For binary content or non-text, use base64 encoding
        if is_binary or not content_type.startswith('text'):
            response_body_encoded = base64.b64encode(response_body).decode('utf-8')
            is_base64_encoded = True
        else:
            response_body_encoded = response_body.decode('utf-8', errors='replace')
            is_base64_encoded = False
        
        return {
            'statusCode': response.status_code,
            'headers': response_headers,
            'body': response_body_encoded,
            'isBase64Encoded': is_base64_encoded
        }
    
    except requests.exceptions.Timeout:
        logger.error('[git-proxy] Request timeout')
        response = {
            'statusCode': 504,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Gateway timeout'})
        }
        if not is_lambda_url:
            response['headers'].update({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            })
        return response
    
    except requests.exceptions.RequestException as error:
        logger.error(f'[git-proxy] Git proxy request error: {error}')
        response = {
            'statusCode': 502,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Failed to proxy request', 'details': str(error)})
        }
        if not is_lambda_url:
            response['headers'].update({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            })
        return response
    
    except Exception as error:
        logger.error(f'[git-proxy] Git proxy error: {error}', exc_info=True)
        response = {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error', 'details': str(error)})
        }
        if not is_lambda_url:
            response['headers'].update({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            })
        return response
