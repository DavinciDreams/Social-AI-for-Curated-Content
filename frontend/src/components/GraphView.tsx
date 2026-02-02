import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import {
    GraphViewData,
    GraphViewNode,
    GraphViewLink,
    EntityType,
    FeedNode,
    EntityNode
} from '../types/graph';

export const GraphView: React.FC = memo(() => {
    const fgRef = useRef<ForceGraphMethods>();
    const containerRef = useRef<HTMLDivElement>(null);
    const [graphData, setGraphData] = useState<GraphViewData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphViewNode | null>(null);
    const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | 'ALL'>('ALL');
    const [relatedFeeds, setRelatedFeeds] = useState<FeedNode[]>([]);
    const [showRelatedPanel, setShowRelatedPanel] = useState(false);
    const [page, setPage] = useState(1);
    const [totalNodes, setTotalNodes] = useState(0);

    // Fetch graph data from backend API
    const fetchGraphData = useCallback(async (filters?: { entityTypes?: EntityType[] }, pageNum: number = 1) => {
        try {
            setLoading(true);
            setError(null);

            const queryParams = new URLSearchParams();
            if (filters?.entityTypes && filters.entityTypes.length > 0) {
                queryParams.append('entityTypes', filters.entityTypes.join(','));
            }

            const response = await fetch(`/api/graph?page=${pageNum}&limit=1000`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch graph data: ${response.statusText}`);
            }

            const result = await response.json();
            setTotalNodes(result.data.nodes.length);
            setGraphData(result.data);
        } catch (err) {
            console.error('Error fetching graph data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load graph data');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch feeds related to an entity
    const fetchEntityFeeds = useCallback(async (entityName: string) => {
        try {
            const response = await fetch(`/api/graph/entities/${encodeURIComponent(entityName)}/feeds`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch entity feeds: ${response.statusText}`);
            }

            const result = await response.json();
            setRelatedFeeds(result.data);
            setShowRelatedPanel(true);
        } catch (err) {
            console.error('Error fetching entity feeds:', err);
            setError(err instanceof Error ? err.message : 'Failed to load entity feeds');
        }
    }, []);

    // Handle node click
    const handleNodeClick = useCallback((node: GraphViewNode) => {
        setSelectedNode(node);
        fgRef.current?.centerAt(node.x, node.y, 1000);
        fgRef.current?.zoom(8, 2000);

        // If it's an entity node, fetch related feeds
        if (node.type !== 'Feed' && node.type !== 'User') {
            fetchEntityFeeds(node.name);
        }
    }, [fetchEntityFeeds]);

    // Handle filter change
    const handleFilterChange = (type: EntityType | 'ALL') => {
        setEntityTypeFilter(type);
        setPage(1);
        if (type === 'ALL') {
            fetchGraphData();
        } else {
            fetchGraphData({ entityTypes: [type] });
        }
    };

    // Handle pagination
    const handleLoadMore = useCallback(() => {
        const nextPage = page + 1;
        setPage(nextPage);
        
        if (entityTypeFilter === 'ALL') {
            fetchGraphData(undefined, nextPage);
        } else {
            fetchGraphData({ entityTypes: [entityTypeFilter] }, nextPage);
        }
    }, [fetchGraphData, entityTypeFilter, page]);

    // Fetch initial data
    useEffect(() => {
        fetchGraphData();
    }, [fetchGraphData]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && fgRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                fgRef.current?.screenSize([clientWidth, clientHeight]);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial sizing

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Entity type colors
    const getEntityColor = (type: string): string => {
        switch (type) {
            case 'Feed':
                return '#3b82f6'; // Blue
            case 'User':
                return '#10b981'; // Green
            case 'PERSON':
                return '#f59e0b'; // Amber
            case 'ORGANIZATION':
                return '#8b5cf6'; // Purple
            case 'LOCATION':
                return '#ef4444'; // Red
            case 'TECHNOLOGY':
                return '#06b6d4'; // Cyan
            case 'TOPIC':
                return '#ec4899'; // Pink
            case 'EVENT':
                return '#f97316'; // Orange
            case 'PRODUCT':
                return '#14b8a6'; // Teal
            default:
                return '#6b7280'; // Gray
        }
    };

    // Entity type filter options
    const entityTypes = [
        { value: 'ALL', label: 'All Types' },
        { value: EntityType.PERSON, label: 'People' },
        { value: EntityType.ORGANIZATION, label: 'Organizations' },
        { value: EntityType.LOCATION, label: 'Locations' },
        { value: EntityType.TECHNOLOGY, label: 'Technologies' },
        { value: EntityType.TOPIC, label: 'Topics' },
        { value: EntityType.EVENT, label: 'Events' },
        { value: EntityType.PRODUCT, label: 'Products' },
    ];

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 h-[600px] border border-gray-200">
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <span className="ml-4 text-gray-600">Loading graph...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 h-[600px] border border-gray-200">
                <div className="flex items-center justify-center h-full">
                    <div className="text-red-500">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 10a2 2 0 012-2v10a2 2 0 012 2zm0 14v2a2 2 0 012-2v10a2 2 0 012 2zm-6 8h14v2H6z" />
                        </svg>
                    </div>
                    <span className="ml-4 text-gray-600">{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-4 h-[600px]">
            {/* Main graph view */}
            <div ref={containerRef} className="flex-1 bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                {/* Filter bar */}
                <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-3 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Entity Type:
                    </label>
                    <select
                        value={entityTypeFilter}
                        onChange={(e) => handleFilterChange(e.target.value as EntityType | 'ALL')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        {entityTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Selected node info */}
                {selectedNode && (
                    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md p-4 border border-gray-200 max-w-xs">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{selectedNode.name}</h3>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">Type:</span>
                                <span className="ml-2 text-gray-600">{selectedNode.type}</span>
                            </div>
                            {selectedNode.properties && (
                                <>
                                    {selectedNode.properties.confidence && (
                                        <div>
                                            <span className="font-medium text-gray-700">Confidence:</span>
                                            <span className="ml-2 text-gray-600">
                                                {(selectedNode.properties.confidence * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    )}
                                    {selectedNode.properties.source && (
                                        <div>
                                            <span className="font-medium text-gray-700">Source:</span>
                                            <span className="ml-2 text-gray-600">{selectedNode.properties.source}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Pagination indicator */}
                {totalNodes > 1000 && (
                    <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md px-4 py-2 border border-gray-200">
                        <div className="text-sm text-gray-600">
                            Showing {Math.min(graphData.nodes.length, 1000)} of {totalNodes} nodes
                        </div>
                        {page * 1000 < totalNodes && (
                            <button
                                onClick={handleLoadMore}
                                className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors"
                            >
                                Load More
                            </button>
                        )}
                    </div>
                )}

                <ForceGraph2D
                    ref={fgRef}
                    graphData={graphData}
                    nodeLabel="name"
                    nodeColor={(node) => getEntityColor(node.type)}
                    linkColor={() => '#cbced1'}
                    backgroundColor="#f8fafc"
                    width={800}
                    height={600}
                    onNodeClick={handleNodeClick}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const size = (node.val || 3) * globalScale;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                        ctx.fillStyle = getEntityColor(node.type);
                        ctx.fill();
                    }}
                    linkWidth={(link) => (link.strength || 1) * 0.5}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleSpeed={0.005}
                />
            </div>

            {/* Related feeds panel */}
            {showRelatedPanel && (
                <div className="w-80 bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Related Feeds
                            </h2>
                            <button
                                onClick={() => setShowRelatedPanel(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {selectedNode && (
                            <p className="text-sm text-gray-600 mt-2">
                                Feeds mentioning <strong>{selectedNode.name}</strong>
                            </p>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {relatedFeeds.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No related feeds found</p>
                        ) : (
                            relatedFeeds.map((feed) => (
                                <div
                                    key={feed.properties.id}
                                    className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                                        {feed.properties.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                        {feed.properties.content?.substring(0, 150)}...
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{feed.properties.source}</span>
                                        {feed.properties.aiScore && (
                                            <span className="text-blue-600">
                                                Score: {feed.properties.aiScore.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                    {feed.properties.link && (
                                        <a
                                            href={feed.properties.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            Read more →
                                        </a>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

GraphView.displayName = 'GraphView';
