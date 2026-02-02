import React, { useState, memo } from 'react';
import { saveItem, unsaveItem, checkIsSaved } from '../utils/api';

export interface FeedItem {
    id?: string;
    title?: string;
    source: string;
    content?: string;
    link?: string;
    pubDate?: string;
}

interface FeedCardProps {
    item: FeedItem;
    isAuthenticated?: boolean;
}

/**
 * FeedCard component optimized with React.memo to prevent unnecessary re-renders
 */
export const FeedCard: React.FC<FeedCardProps> = memo(({ item, isAuthenticated = false }) => {
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Check if item is saved on mount
    React.useEffect(() => {
        if (isAuthenticated && item.id) {
            checkIsSaved(item.id)
                .then((response: unknown) => {
                    const result = response as { isSaved?: boolean };
                    if (result.isSaved !== undefined) {
                        setIsSaved(result.isSaved);
                    }
                })
                .catch(() => {
                    // If check fails, assume not saved
                    setIsSaved(false);
                });
        }
    }, [isAuthenticated, item.id]);

    const handleSaveClick = async () => {
        if (!isAuthenticated || !item.id) {
            return;
        }

        setIsLoading(true);

        try {
            if (isSaved) {
                // Unsave item
                await unsaveItem(item.id);
                setIsSaved(false);
            } else {
                // Save item
                await saveItem(item.id);
                setIsSaved(true);
            }
        } catch (error) {
            console.error('Failed to save/unsave item:', error);
            // Revert state on error
            setIsSaved(!isSaved);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100 flex flex-col h-full">
            <div className="p-5 flex-1">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {item.source}
                    </span>
                    {item.pubDate && (
                        <span className="text-xs text-gray-400">
                            {new Date(item.pubDate).toLocaleDateString()}
                        </span>
                    )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700">
                        {item.title || 'Untitled'}
                    </a>
                </h3>
                <p className="text-gray-600 text-sm line-clamp-4">
                    {item.content}
                </p>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end">
                {isAuthenticated ? (
                    <button
                        onClick={handleSaveClick}
                        disabled={isLoading}
                        className={`text-sm font-medium flex items-center gap-1 transition-colors ${
                            isSaved
                                ? 'text-blue-600 hover:text-blue-800'
                                : 'text-gray-500 hover:text-gray-800'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : isSaved ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                                </svg>
                                Saved
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                Save
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
                        title="Sign in to save items"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Save
                    </button>
                )}
            </div>
        </div>
    );
});

FeedCard.displayName = 'FeedCard';

export default FeedCard;
