/**
 * K6 Load Testing Configuration
 * 
 * This file contains base configuration for all load tests
 * including thresholds, stages, and common options.
 */

import { check, sleep } from 'k6';
import http from 'k6/http';

// Base URL for application
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Common options for all tests
export const options = {
    // Define thresholds for performance targets
    thresholds: {
        // API response time should be under 1s for 95% of requests
        http_req_duration: ['p(95)<1000'],
        // Error rate should be under 1%
        http_req_failed: ['rate<0.01'],
        // Requests per second should be maintained
        http_reqs: ['rate>10'],
    },
    // Define stages for ramping up load
    stages: [
        { duration: '30s', target: 10 },   // Ramp up to 10 users
        { duration: '1m', target: 50 },    // Ramp up to 50 users
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '2m', target: 100 },   // Stay at 100 users
        { duration: '1m', target: 50 },    // Ramp down to 50 users
        { duration: '30s', target: 0 },    // Ramp down to 0 users
    ],
    // Summary trends
    summaryTrendStats: ['http_req_duration', 'http_req_failed', 'vus'],
    // Summary time units
    summaryTimeUnit: 'ms',
};

// Helper function to make authenticated requests
export function makeAuthenticatedRequest(url, method = 'GET', body = null) {
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        return http[method.toLowerCase()](url, JSON.stringify(body), params);
    }
    return http[method.toLowerCase()](url, params);
}

// Helper function to check response status
export function checkResponse(response, expectedStatus = 200) {
    check(response, {
        'status is ' + expectedStatus: (r) => r.status === expectedStatus,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'response time < 1s': (r) => r.timings.duration < 1000,
    });
}

// Helper function to wait between requests
export function waitBetween(min = 1, max = 3) {
    sleep(Math.random() * (max - min) + min);
}

// Export for use in scenarios
export { BASE_URL };
