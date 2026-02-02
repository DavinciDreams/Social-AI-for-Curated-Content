import React, { useState, useEffect, useCallback, memo } from 'react';
import { search, getSearchSuggestions } from '../utils/api';

interface SearchProps {
    onSearchResults?: (results: any[]) => void;
}

/**
 * Debounce hook for search input
 */
const useDebounce = <T,>(callback: (value: T) => void, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState<T | null>(null);
    const [debouncing, setDebouncing] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncing(false);
            if (debouncedValue !== null) {
                callback(debouncedValue);
            }
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [callback, delay]);

    const debouncedSetValue = useCallback((value: T) => {
        setDebouncing(true);
        setDebouncedValue(value);
    }, []);

    return { debouncedSetValue, isDebouncing: debouncing };
};

/**
 * Search component optimized with React.memo to prevent unnecessary re-renders
 */
export const Search: React.FC<SearchProps> = memo(({ onSearchResults }) => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<Array<{
        type: 'feed' | 'topic';
        title: string;
        count: number;
    }>>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [filters, setFilters] = useState<{
        sources?: string[];
        dateRange?: { start: string; end: string };
        minScore?: number;
        isSaved?: boolean;
    }>({});
    const [sort, setSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'score', order: 'desc' });
    const [page, setPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [searchCache, setSearchCache] = useState<Map<string, any>>(new Map());

    // Use debounced search input
    const { debouncedSetValue } = useDebounce((value: string) => {
        setQuery(value);
    }, 300);

    // Debounce function for autocomplete
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                try {
                    // Check cache first
                    const cacheKey = `autocomplete:${query}`;
                    if (searchCache.has(cacheKey)) {
                        setSuggestions(searchCache.get(cacheKey)!);
                        setShowSuggestions(true);
                        return;
                    }

                    const results = await getSearchSuggestions(query, 5);
                    const suggestions = results as Array<{ type: 'feed' | 'topic'; title: string; count: number; }>;
                    setSuggestions(suggestions);
                    setSearchCache(prev => new Map(prev).set(cacheKey, suggestions));
                    setShowSuggestions(true);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Handle search with caching
    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setIsSearching(true);

        try {
            // Check cache first
            const cacheKey = `search:${JSON.stringify({ query, filters, sort, page })}`;
            if (searchCache.has(cacheKey)) {
                const cached = searchCache.get(cacheKey)!;
                setSearchResults(cached.items);
                setTotalResults(cached.total);
                setPage(cached.page);

                if (onSearchResults) {
                    onSearchResults(cached.items);
                }

                setIsSearching(false);
                return;
            }

            const results = await search({
                query,
                filters,
                sort,
                page,
                limit: 20,
            });

            const searchResponse = results as { items: any[]; total: number; page: number };
            setSearchResults(searchResponse.items);
            setTotalResults(searchResponse.total);
            setPage(searchResponse.page);

            // Cache results
            setSearchCache(prev => new Map(prev).set(cacheKey, searchResponse));

            if (onSearchResults) {
                onSearchResults(searchResponse.items);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    }, [query, filters, sort, page, onSearchResults]);

    // Handle suggestion click
    const handleSuggestionClick = useCallback(async (suggestion: { type: 'feed' | 'topic'; title: string }) => {
        setQuery(suggestion.title);
        setShowSuggestions(false);

        if (suggestion.type === 'feed') {
            await handleSearch();
        } else {
            // For topics, add to filters
            setFilters(prev => ({ ...prev, sources: [suggestion.title] }));
            await handleSearch();
        }
    }, [handleSearch]);

    // Handle filter change
    const handleFilterChange = useCallback((key: string, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            if (value === '' || value === undefined) {
                delete (newFilters as any)[key];
            } else {
                (newFilters as any)[key] = value;
            }
            return newFilters;
        });
        setPage(1); // Reset to first page when filters change
        
        // Clear cache when filters change
        setSearchCache(new Map());
    }, []);

    // Handle sort change
    const handleSortChange = useCallback((field: string) => {
        setSort(prev => ({
            field,
            order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
        }));
        setPage(1);
        
        // Clear cache when sort changes
        setSearchCache(new Map());
    }, []);

    // Clear filters
    const clearFilters = useCallback(() => {
        setFilters({});
        setPage(1);
        setSearchCache(new Map());
    }, []);

    // Format date for display
    const formatDate = (dateString?: string): string => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            return `${Math.floor(diffDays / 7)} weeks ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Input with Autocomplete */}
            <div className="relative">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => debouncedSetValue(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch();
                                    setShowSuggestions(false);
                                }
                            }}
                            placeholder="Search feeds..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                        >
                            {isSearching ? (
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Autocomplete Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                            >
                                <span className="text-gray-900">{suggestion.title}</span>
                                <span className="text-xs text-gray-500">
                                    {suggestion.type === 'feed' ? 'Feed' : 'Topic'} • {suggestion.count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Source Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                        <select
                            value={filters.sources?.[0] || ''}
                            onChange={(e) => handleFilterChange('sources', e.target.value ? [e.target.value] : undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="">All Sources</option>
                            <option value="twitter">Twitter</option>
                            <option value="reddit">Reddit</option>
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={filters.dateRange?.start || ''}
                                onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            <input
                                type="date"
                                value={filters.dateRange?.end || ''}
                                onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    {/* Min Score Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Min AI Score</label>
                        <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={filters.minScore || ''}
                            onChange={(e) => handleFilterChange('minScore', e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="0.0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                </div>

                {/* Clear Filters Button */}
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Sort Options */}
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sort By</h3>
                <div className="flex gap-4">
                    {['score', 'pubDate', 'title'].map((field) => (
                        <button
                            key={field}
                            onClick={() => handleSortChange(field)}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                sort.field === field
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {field === 'score' ? 'AI Score' : field === 'pubDate' ? 'Date' : 'Title'}
                            {sort.field === field && (
                                <span className="ml-2">
                                    {sort.order === 'asc' ? '↑' : '↓'}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="bg-white rounded-lg shadow-md border border-gray-200">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Search Results ({totalResults})
                            </h3>
                            <div className="text-sm text-gray-600">
                                Page {page} of {Math.ceil(totalResults / 20)}
                            </div>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {searchResults.map((result) => (
                            <div key={result.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-900">{result.title}</h4>
                                    {result.aiScore && (
                                        <span className="text-sm text-blue-600">
                                            Score: {result.aiScore.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                    {result.content?.substring(0, 150)}...
                                </p>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span>{result.source}</span>
                                    <span>{formatDate(result.pubDate)}</span>
                                </div>
                                {result.link && (
                                    <a
                                        href={result.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Read more →
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                        >
                            Previous
                        </button>
                        <div className="text-sm text-gray-600">
                            Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, totalResults)} of {totalResults}
                        </div>
                        <button
                            onClick={() => setPage(p => Math.min(Math.ceil(totalResults / 20), p + 1))}
                            disabled={page >= Math.ceil(totalResults / 20)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* No Results */}
            {searchResults.length === 0 && query && !isSearching && (
                <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search or filters
                    </p>
                </div>
            )}
        </div>
    );
});

Search.displayName = 'Search';
