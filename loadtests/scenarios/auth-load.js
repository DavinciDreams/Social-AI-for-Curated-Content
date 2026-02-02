/**
 * Authentication Load Test
 * 
 * Tests OAuth authentication flow, token refresh, and logout
 * Target: 50 concurrent users
 */

import { group, sleep } from 'k6';
import http from 'k6/http';
import { options, BASE_URL, makeAuthenticatedRequest, checkResponse, waitBetween } from '../k6-config.js';

// Auth-specific thresholds
export const options = {
    ...options,
    thresholds: {
        ...options.thresholds,
        // Auth should be fast
        'http_req_duration{endpoint:auth}': ['p(95)<1000'],
        // Token refresh should be even faster
        'http_req_duration{endpoint:auth:refresh}': ['p(95)<500'],
    },
    // Target 50 concurrent users for auth tests
    stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 25 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 25 },
        { duration: '30s', target: 0 },
    ],
};

// Store tokens for virtual users
const tokens = new Map();

export default function () {
    const userId = __VU; // Virtual user ID

    // Simulate OAuth authentication flow
    group('Auth: OAuth login', function () {
        const oauthProviders = ['twitter', 'reddit'];
        const provider = oauthProviders[Math.floor(Math.random() * oauthProviders.length)];
        
        // Simulate OAuth redirect
        const authUrl = `${BASE_URL}/api/auth/${provider}/login`;
        const authResponse = http.get(authUrl);
        
        check(authResponse, {
            'OAuth redirect initiated': (r) => r.status === 200 || r.status === 302,
        });
        
        // Simulate OAuth callback with mock token
        const mockToken = `mock_token_${userId}_${Date.now()}`;
        tokens.set(userId, mockToken);
        
        waitBetween(1, 3);
    });

    // Simulate token validation
    group('Auth: Validate token', function () {
        const token = tokens.get(userId);
        if (!token) return;
        
        const url = `${BASE_URL}/api/auth/validate`;
        const response = makeAuthenticatedRequest(url, 'POST', { token });
        
        checkResponse(response, 200);
        
        check(response, {
            'token is valid': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.valid === true;
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:auth' });
        
        waitBetween(1, 2);
    });

    // Simulate token refresh
    group('Auth: Refresh token', function () {
        const token = tokens.get(userId);
        if (!token) return;
        
        const url = `${BASE_URL}/api/auth/refresh`;
        const response = makeAuthenticatedRequest(url, 'POST', { token });
        
        checkResponse(response, 200);
        
        check(response, {
            'new token returned': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.token !== undefined && body.token !== token;
                } catch {
                    return false;
                }
            },
        });
        
        // Update stored token
        try {
            const body = JSON.parse(response.body);
            if (body.token) {
                tokens.set(userId, body.token);
            }
        } catch {}
        
        response.tags.push({ name: 'endpoint:auth:refresh' });
        
        waitBetween(1, 2);
    });

    // Simulate logout
    if (Math.random() < 0.1) { // 10% chance to logout
        group('Auth: Logout', function () {
            const token = tokens.get(userId);
            if (!token) return;
            
            const url = `${BASE_URL}/api/auth/logout`;
            const response = makeAuthenticatedRequest(url, 'POST', { token });
            
            checkResponse(response, 200);
            
            // Remove token from storage
            tokens.delete(userId);
            
            response.tags.push({ name: 'endpoint:auth' });
            
            waitBetween(1, 2);
        });
    }

    // Simulate user session duration
    sleep(Math.random() * 5 + 2);
}
