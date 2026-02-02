/**
 * Graph Endpoint Load Test
 * 
 * Tests graph data, statistics, and entity search endpoints
 * Target: 50 concurrent users
 */

import { group, sleep } from 'k6';
import http from 'k6/http';
import { options, BASE_URL, makeAuthenticatedRequest, checkResponse, waitBetween } from '../k6-config.js';

// Graph-specific thresholds
export const options = {
    ...options,
    thresholds: {
        ...options.thresholds,
        // Graph data should load fast
        'http_req_duration{endpoint:graph}': ['p(95)<500'],
        // Graph statistics should be fast
        'http_req_duration{endpoint:graph:stats}': ['p(95)<300'],
        // Entity search should be fast
        'http_req_duration{endpoint:graph:search}': ['p(95)<500'],
    },
    // Target 50 concurrent users for graph tests
    stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 25 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 25 },
        { duration: '30s', target: 0 },
    ],
};

// Common entity types for testing
const entityTypes = ['person', 'topic', 'organization', 'event'];

export default function () {
    group('Graph: Fetch graph data', function () {
        const url = `${BASE_URL}/api/graph`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has nodes': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.nodes !== undefined && Array.isArray(body.nodes);
                } catch {
                    return false;
                }
            },
            'has links': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.links !== undefined && Array.isArray(body.links);
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:graph' });
        
        waitBetween(1, 2);
    });

    group('Graph: Fetch graph with pagination', function () {
        const page = Math.floor(Math.random() * 10) + 1;
        const limit = Math.floor(Math.random() * 50) + 10;
        const url = `${BASE_URL}/api/graph?page=${page}&limit=${limit}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has pagination data': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.nodes !== undefined && body.total !== undefined;
                } catch {
                    return false;
                }
            },
            'correct page returned': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.page === page;
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:graph' });
        
        waitBetween(1, 2);
    });

    group('Graph: Fetch graph with entity type filter', function () {
        const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
        const url = `${BASE_URL}/api/graph?type=${entityType}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'filtered by type': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.nodes !== undefined;
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:graph' });
        
        waitBetween(1, 2);
    });

    group('Graph: Fetch graph statistics', function () {
        const url = `${BASE_URL}/api/graph/stats`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has node count': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.nodeCount !== undefined && typeof body.nodeCount === 'number';
                } catch {
                    return false;
                }
            },
            'has link count': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.linkCount !== undefined && typeof body.linkCount === 'number';
                } catch {
                    return false;
                }
            },
            'has entity type distribution': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.entityTypeDistribution !== undefined && typeof body.entityTypeDistribution === 'object';
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:graph:stats' });
        
        waitBetween(1, 2);
    });

    group('Graph: Search for entity', function () {
        const searchTerms = ['AI', 'technology', 'data', 'cloud'];
        const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const url = `${BASE_URL}/api/graph/search?q=${encodeURIComponent(term)}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has search results': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.results !== undefined && Array.isArray(body.results);
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:graph:search' });
        
        waitBetween(1, 2);
    });

    group('Graph: Get entity details', function () {
        const entityTypes = ['person', 'topic'];
        const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
        const entityId = `entity_${Math.floor(Math.random() * 100)}`;
        const url = `${BASE_URL}/api/graph/entity/${entityType}/${entityId}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has entity data': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.id !== undefined && body.name !== undefined && body.type !== undefined;
                } catch {
                    return false;
                }
            },
            'has connections': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.connections !== undefined && Array.isArray(body.connections);
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:graph' });
        
        waitBetween(1, 2);
    });

    group('Graph: Fetch related entities', function () {
        const entityId = `entity_${Math.floor(Math.random() * 100)}`;
        const url = `${BASE_URL}/api/graph/entity/${entityId}/related`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has related entities': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.related !== undefined && Array.isArray(body.related);
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:graph' });
        
        waitBetween(1, 2);
    });

    group('Graph: Fetch graph with combined filters', function () {
        const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
        const page = Math.floor(Math.random() * 5) + 1;
        const limit = Math.floor(Math.random() * 50) + 10;
        const url = `${BASE_URL}/api/graph?type=${entityType}&page=${page}&limit=${limit}`;
        const response = http.get(url);
        
        checkResponse(response, 200);
        
        check(response, {
            'has filtered results': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.nodes !== undefined && Array.isArray(body.nodes);
                } catch {
                    return false;
                }
            },
        });
        
        response.tags.push({ name: 'endpoint:graph' });
        
        waitBetween(2, 3);
    });

    // Simulate user thinking time
    sleep(Math.random() * 3 + 1);
}
