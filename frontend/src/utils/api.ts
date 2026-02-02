import axios from 'axios';

// Use environment variable for API URL with fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Get token from localStorage
const getToken = (): string | null => {
    return localStorage.getItem('auth_token');
};

// Get refresh token from localStorage
const getRefreshToken = (): string | null => {
    return localStorage.getItem('refresh_token');
};

// Get CSRF token from localStorage
const getCSRFToken = (): string | null => {
    return localStorage.getItem('csrf_token');
};

// Save token to localStorage
const saveToken = (token: string): void => {
    localStorage.setItem('auth_token', token);
};

// Save refresh token to localStorage
const saveRefreshToken = (token: string): void => {
    localStorage.setItem('refresh_token', token);
};

// Save CSRF token to localStorage
const saveCSRFToken = (token: string): void => {
    localStorage.setItem('csrf_token', token);
};

// Remove tokens from localStorage
const removeTokens = (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('csrf_token');
};

// Create axios instance with base URL
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}> = [];

// Process the queue
const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Refresh access token
const refreshAccessToken = async (): Promise<string> => {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Save new tokens
        saveToken(accessToken);
        if (newRefreshToken) {
            saveRefreshToken(newRefreshToken);
        }

        return accessToken;
    } catch (error) {
        // Refresh failed, remove all tokens
        removeTokens();
        window.dispatchEvent(new CustomEvent('auth-expired'));
        throw error;
    }
};

// Request interceptor to add JWT token and CSRF token
apiClient.interceptors.request.use(
    (config) => {
        const token = getToken();
        const csrfToken = getCSRFToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token for non-GET requests
        if (csrfToken && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
            config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 errors and token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is not 401 or request has already been retried
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // If refreshing is already in progress, queue the request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                })
                .catch((err) => {
                    return Promise.reject(err);
                });
        }

        // Start refreshing
        isRefreshing = true;
        originalRequest._retry = true;

        try {
            const newToken = await refreshAccessToken();
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

// ============================================================================
// REQUEST DEDUPLICATION AND CACHING
// ============================================================================

// In-memory cache for API responses
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const pendingRequests = new Map<string, Promise<any>>();

// Default cache TTL in milliseconds (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Generate cache key from URL and params
 */
const generateCacheKey = (url: string, params?: any, data?: any): string => {
    const paramsStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    return `${url}:${paramsStr}:${dataStr}`;
};

/**
 * Check if cached data is still valid
 */
const isCacheValid = (cacheEntry: { timestamp: number; ttl: number }): boolean => {
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
};

/**
 * Get cached response if available and valid
 */
const getCachedResponse = (key: string): any | null => {
    const cached = responseCache.get(key);
    if (cached && isCacheValid(cached)) {
        return cached.data;
    }
    // Remove expired cache entry
    if (cached) {
        responseCache.delete(key);
    }
    return null;
};

/**
 * Set cached response with TTL
 */
const setCachedResponse = (key: string, data: any, ttl: number = DEFAULT_CACHE_TTL): void => {
    responseCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
    });
};

/**
 * Clear cache entries matching a pattern
 */
const clearCachePattern = (pattern: RegExp): void => {
    for (const key of responseCache.keys()) {
        if (pattern.test(key)) {
            responseCache.delete(key);
        }
    }
};

/**
 * Clear all cache
 */
const clearAllCache = (): void => {
    responseCache.clear();
};

/**
 * Make API request with deduplication and caching
 */
const makeRequest = async <T,>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    config?: {
        params?: any;
        data?: any;
        cache?: boolean;
        cacheTTL?: number;
        maxRetries?: number;
        retryDelay?: number;
    }
): Promise<T> => {
    const {
        params,
        data,
        cache = false,
        cacheTTL = DEFAULT_CACHE_TTL,
        maxRetries = 3,
        retryDelay = 1000,
    } = config || {};

    const cacheKey = generateCacheKey(url, params, data);

    // For GET requests, check cache first
    if (method === 'GET' && cache) {
        const cached = getCachedResponse(cacheKey);
        if (cached !== null) {
            return cached as T;
        }
    }

    // Check for pending request (deduplication)
    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey) as Promise<T>;
    }

    // Create the request with retry logic
    const makeRequestWithRetry = async (retryCount = 0): Promise<T> => {
        try {
            const response = await apiClient.request<T>({
                method,
                url,
                params,
                data,
            });

            // Cache successful GET responses
            if (method === 'GET' && cache) {
                setCachedResponse(cacheKey, response.data, cacheTTL);
            }

            // Remove from pending requests
            pendingRequests.delete(cacheKey);

            return response.data;
        } catch (error: any) {
            // Retry on network errors or 5xx errors
            const shouldRetry =
                retryCount < maxRetries &&
                (!error.response || (error.response.status >= 500 && error.response.status < 600));

            if (shouldRetry) {
                // Exponential backoff
                const delay = retryDelay * Math.pow(2, retryCount);
                await new Promise(resolve => setTimeout(resolve, delay));
                return makeRequestWithRetry(retryCount + 1);
            }

            // Remove from pending requests on error
            pendingRequests.delete(cacheKey);
            throw error;
        }
    };

    const requestPromise = makeRequestWithRetry();
    pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
};

// ============================================================================
// FEED API FUNCTIONS
// ============================================================================

export const fetchFeeds = async () => {
    return makeRequest('GET', '/feeds', { cache: true });
};

export const fetchConfig = async () => {
    return makeRequest('GET', '/config', { cache: true });
};

export const updateConfig = async (config: any) => {
    clearCachePattern(/^\/config/);
    return makeRequest('POST', '/config', { data: config });
};

// ============================================================================
// AUTH API FUNCTIONS
// ============================================================================

export const twitterAuth = async (oauthData: { oauthId: string; email?: string; name?: string; username?: string }) => {
    return makeRequest('POST', '/auth/twitter', { data: oauthData });
};

export const redditAuth = async (oauthData: { oauthId: string; email?: string; name?: string; username?: string }) => {
    return makeRequest('POST', '/auth/reddit', { data: oauthData });
};

export const googleAuth = async (oauthData: { oauthId: string; email?: string; name?: string; username?: string }) => {
    return makeRequest('POST', '/auth/google', { data: oauthData });
};

export const getCurrentUser = async () => {
    return makeRequest('GET', '/auth/me', { cache: true, cacheTTL: 60000 }); // 1 minute cache
};

export const logout = async () => {
    clearAllCache();
    try {
        await apiClient.post('/auth/logout');
    } finally {
        removeTokens();
    }
};

// ============================================================================
// SAVED ITEMS API FUNCTIONS
// ============================================================================

export const saveItem = async (feedItemId: string) => {
    clearCachePattern(/^\/saved/);
    return makeRequest('POST', '/saved', { data: { feedItemId } });
};

export const unsaveItem = async (id: string) => {
    clearCachePattern(/^\/saved/);
    return makeRequest('DELETE', `/saved/${id}`);
};

export const getSavedItems = async (page: number = 1, limit: number = 20) => {
    return makeRequest('GET', '/saved', {
        params: { page, limit },
        cache: true,
        cacheTTL: 30000, // 30 seconds cache
    });
};

export const checkIsSaved = async (feedItemId: string) => {
    return makeRequest('GET', `/saved/check/${feedItemId}`, { cache: true, cacheTTL: 60000 });
};

// ============================================================================
// GRAPH API FUNCTIONS
// ============================================================================

export const getGraphData = async (filters?: { entityTypes?: string[]; sources?: string[]; dateRange?: { start: string; end: string }; limit?: number }) => {
    return makeRequest('GET', '/graph', {
        params: filters,
        cache: true,
        cacheTTL: 600000, // 10 minutes cache
    });
};

export const getEntityFeeds = async (entityName: string) => {
    return makeRequest('GET', `/graph/entities/${encodeURIComponent(entityName)}/feeds`, {
        cache: true,
        cacheTTL: 300000, // 5 minutes cache
    });
};

export const getFeedEntities = async (feedId: string) => {
    return makeRequest('GET', `/graph/feeds/${feedId}/entities`, {
        cache: true,
        cacheTTL: 300000, // 5 minutes cache
    });
};

export const getRelatedEntities = async (entityName: string, limit?: number) => {
    return makeRequest('GET', `/graph/entities/${encodeURIComponent(entityName)}/related`, {
        params: { limit },
        cache: true,
        cacheTTL: 300000, // 5 minutes cache
    });
};

export const getTrendingEntities = async (limit?: number) => {
    return makeRequest('GET', '/graph/trending', {
        params: { limit },
        cache: true,
        cacheTTL: 600000, // 10 minutes cache
    });
};

export const getGraphStats = async () => {
    return makeRequest('GET', '/graph/stats', {
        cache: true,
        cacheTTL: 120000, // 2 minutes cache
    });
};

export const searchGraphEntities = async (query: string, limit?: number) => {
    return makeRequest('GET', '/graph/search', {
        params: { query, limit },
        cache: true,
        cacheTTL: 60000, // 1 minute cache
    });
};

export const saveFeedGraph = async (feedId: string) => {
    clearCachePattern(/^\/graph/);
    return makeRequest('POST', '/graph/feeds/save', { data: { feedId } });
};

export const unsaveFeedGraph = async (feedId: string) => {
    clearCachePattern(/^\/graph/);
    return makeRequest('DELETE', `/graph/feeds/${feedId}/save`);
};

// ============================================================================
// SEARCH API FUNCTIONS
// ============================================================================

export const search = async (options: {
    query: string;
    filters?: {
        sources?: string[];
        dateRange?: { start: string; end: string };
        minScore?: number;
        isSaved?: boolean;
    };
    sort?: { field: string; order: 'asc' | 'desc' };
    page?: number;
    limit?: number;
}) => {
    const { query, filters, sort, page = 1, limit = 20 } = options;

    return makeRequest('GET', '/search', {
        params: {
            query,
            sources: filters?.sources?.join(','),
            startDate: filters?.dateRange?.start,
            endDate: filters?.dateRange?.end,
            minScore: filters?.minScore,
            isSaved: filters?.isSaved,
            sortField: sort?.field,
            sortOrder: sort?.order,
            page,
            limit,
        },
        cache: true,
        cacheTTL: 60000, // 1 minute cache
    });
};

export const autocomplete = async (query: string, limit: number = 5) => {
    return makeRequest('GET', '/search/autocomplete', {
        params: { query, limit },
        cache: true,
        cacheTTL: 300000, // 5 minutes cache
    });
};

export const getSearchSuggestions = async (query: string, limit: number = 5) => {
    return makeRequest('GET', '/search/suggestions', {
        params: { query, limit },
        cache: true,
        cacheTTL: 300000, // 5 minutes cache
    });
};

// ============================================================================
// RECOMMENDATION API FUNCTIONS
// ============================================================================

export const getRecommendations = async (userId: string, limit: number = 10) => {
    return makeRequest('GET', '/recommendations', {
        params: { userId, limit },
        cache: true,
        cacheTTL: 300000, // 5 minutes cache
    });
};

export const getTrending = async (limit: number = 10) => {
    return makeRequest('GET', '/recommendations/trending', {
        params: { limit },
        cache: true,
        cacheTTL: 600000, // 10 minutes cache
    });
};

export const getFeedRecommendations = async (feedId: string, limit: number = 5) => {
    return makeRequest('GET', `/recommendations/feeds/${feedId}`, {
        params: { limit },
        cache: true,
        cacheTTL: 300000, // 5 minutes cache
    });
};

// ============================================================================
// EXPORT HELPERS
// ============================================================================

export { getToken, getRefreshToken, getCSRFToken, saveToken, saveRefreshToken, saveCSRFToken, removeTokens };

// Export cache helpers for external use
export {
    clearAllCache,
    clearCachePattern,
    setCachedResponse,
    getCachedResponse,
};

export default apiClient;
