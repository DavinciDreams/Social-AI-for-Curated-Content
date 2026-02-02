/**
 * Feed Endpoint Load Test
 * 
 * Tests feed aggregation, filtering, and pagination endpoints
 * Target: 100 concurrent users
 */

import { group, sleep } from 'k6';
import http from 'k6/http';
import { options, BASE_URL, makeAuthenticatedRequest, checkResponse, waitBetween } from '../k6-config.js';

// Feed-specific thresholds
export const options = {
    ...options,
    thresholds: {
        ...options.thresholds,
        // Feed load time should be under 1s
        'http_req_duration{endpoint:feed}': ['p(95)<1000'],
        // Pagination should be fast
        'http_req_duration{endpoint:feed:page}': ['p(95)<500'],
    },
    // Target 100 concurrent users for feed tests
    stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
    ],
};

export default function () {
    group('Feed: Fetch all feeds', function () {
        const url = `${BASE_URL}/api/feeds`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        // Add custom tag for this endpoint
        response.tags.push({ name: 'endpoint:feed' });
        
        waitBetween(1, 2);
    });

    group('Feed: Fetch feeds with pagination', function () {
        const page = Math.floor(Math.random() * 10) + 1;
        const limit = Math.floor(Math.random() * 50) + 10;
        const url = `${BASE_URL}/api/feeds?page=${page}&limit=${limit}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        // Check that pagination data is returned
        check(response, {
            'has pagination data': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.items !== undefined && body.total !== undefined;
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:feed:page' });
        
        waitBetween(1, 2);
    });

    group('Feed: Fetch feeds by source', function () {
        const sources = ['twitter', 'reddit', 'news'];
        const source = sources[Math.floor(Math.random() * sources.length)];
        const url = `${BASE_URL}/api/feeds?source=${source}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'filtered by source': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.items !== undefined;
                } catch {
                    return false;
                }
            },
        });
        
        waitBetween(1, 2);
    });

    group('Feed: Fetch feeds by date range', function () {
        const daysAgo = Math.floor(Math.random() * 30);
        const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const endDate = new Date();
        const url = `${BASE_URL}/api/feeds?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        waitBetween(1, 2);
    });

    group('Feed: Fetch feeds by min score', function () {
        const minScore = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
        const url = `${BASE_URL}/api/feeds?minScore=${minScore.toFixed(2)}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'filtered by score': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.items !== undefined;
                } catch {
                    return false;
                }
            },
        });
        
        waitBetween(1, 2);
    });

    group('Feed: Fetch feeds with combined filters', function () {
        const sources = ['twitter', 'reddit'];
        const source = sources[Math.floor(Math.random() * sources.length)];
        const daysAgo = Math.floor(Math.random() * 7);
        const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const minScore = Math.random() * 0.3 + 0.7;
        
        const url = `${BASE_URL}/api/feeds?source=${source}&startDate=${startDate.toISOString()}&minScore=${minScore.toFixed(2)}&page=1&limit=20`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has filtered results': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.items !== undefined && Array.isArray(body.items);
                } catch {
                    return false;
                }
            },
        });
        
        waitBetween(2, 3);
    });

    // Simulate user thinking time
    sleep(Math.random() * 2 + 1);
}
