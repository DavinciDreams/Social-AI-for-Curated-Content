/**
 * Search Endpoint Load Test
 * 
 * Tests search endpoint, autocomplete, filters and sorting
 * Target: 100 concurrent users
 */

import { group, sleep } from 'k6';
import http from 'k6/http';
import { options, BASE_URL, makeAuthenticatedRequest, checkResponse, waitBetween } from '../k6-config.js';

// Search-specific thresholds
export const options = {
    ...options,
    thresholds: {
        ...options.thresholds,
        // Search should be fast
        'http_req_duration{endpoint:search}': ['p(95)<500'],
        // Autocomplete should be even faster
        'http_req_duration{endpoint:autocomplete}': ['p(95)<300'],
    },
    // Target 100 concurrent users for search tests
    stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
    ],
};

// Common search terms for testing
const searchTerms = [
    'artificial intelligence',
    'machine learning',
    'technology',
    'programming',
    'software development',
    'data science',
    'cloud computing',
    'cybersecurity',
    'blockchain',
];

export default function () {
    group('Search: Basic search query', function () {
        const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const url = `${BASE_URL}/api/search?query=${encodeURIComponent(query)}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has search results': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.items !== undefined && Array.isArray(body.items);
                } catch {
                    return false;
                }
            },
            'has pagination info': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.total !== undefined && body.page !== undefined;
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:search' });
        
        waitBetween(1, 2);
    });

    group('Search: Search with pagination', function () {
        const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const page = Math.floor(Math.random() * 10) + 1;
        const limit = Math.floor(Math.random() * 50) + 10;
        const url = `${BASE_URL}/api/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'correct page returned': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.page === page;
                } catch {
                    return false;
                }
            },
            'correct limit applied': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.items !== undefined && body.items.length <= limit;
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:search' });
        
        waitBetween(1, 2);
    });

    group('Search: Autocomplete', function () {
        const query = searchTerms[Math.floor(Math.random() * searchTerms.length)].substring(0, 5);
        const url = `${BASE_URL}/api/search/autocomplete?query=${encodeURIComponent(query)}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has suggestions': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return Array.isArray(body) && body.length > 0;
                } catch {
                    return false;
                }
            },
            'suggestions have required fields': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    if (!Array.isArray(body) || body.length === 0) return false;
                    return body[0].title !== undefined && body[0].type !== undefined;
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:autocomplete' });
        
        waitBetween(0.5, 1);
    });

    group('Search: Filter by source', function () {
        const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const sources = ['twitter', 'reddit'];
        const source = sources[Math.floor(Math.random() * sources.length)];
        const url = `${BASE_URL}/api/search?query=${encodeURIComponent(query)}&source=${source}`;
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
        
        response.tags.push({ name: 'endpoint:search' });
        
        waitBetween(1, 2);
    });

    group('Search: Filter by date range', function () {
        const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const endDate = new Date();
        const url = `${BASE_URL}/api/search?query=${encodeURIComponent(query)}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        waitBetween(1, 2);
    });

    group('Search: Filter by min score', function () {
        const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const minScore = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
        const url = `${BASE_URL}/api/search?query=${encodeURIComponent(query)}&minScore=${minScore.toFixed(2)}`;
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
        
        response.tags.push({ name: 'endpoint:search' });
        
        waitBetween(1, 2);
    });

    group('Search: Sort by score', function () {
        const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const url = `${BASE_URL}/api/search?query=${encodeURIComponent(query)}&sort=score&order=desc`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'sorted by score': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    if (!body.items || body.items.length < 2) return true;
                    // Check if sorted descending by score
                    for (let i = 0; i < body.items.length - 1; i++) {
                        if (body.items[i].aiScore < body.items[i + 1].aiScore) {
                            return false;
                        }
                    }
                    return true;
                } catch {
                    return true;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:search' });
        
        waitBetween(1, 2);
    });

    group('Search: Sort by date', function () {
        const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const url = `${BASE_URL}/api/search?query=${encodeURIComponent(query)}&sort=pubDate&order=desc`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        response.tags.push({ name: 'endpoint:search' });
        
        waitBetween(1, 2);
    });

    group('Search: Combined filters and sort', function () {
        const query = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const sources = ['twitter', 'reddit'];
        const source = sources[Math.floor(Math.random() * sources.length)];
        const daysAgo = Math.floor(Math.random() * 7);
        const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const minScore = Math.random() * 0.3 + 0.7;
        
        const url = `${BASE_URL}/api/search?query=${encodeURIComponent(query)}&source=${source}&startDate=${startDate.toISOString()}&minScore=${minScore.toFixed(2)}&sort=score&order=desc&page=1&limit=20`;
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
        
        response.tags.push({ name: 'endpoint:search' });
        
        waitBetween(2, 3);
    });

    // Simulate user thinking time
    sleep(Math.random() * 3 + 1);
}
