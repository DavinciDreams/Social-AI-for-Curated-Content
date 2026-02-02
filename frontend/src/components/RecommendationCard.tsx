import React from 'react';

export interface RecommendationCardProps {
    id: string;
    title: string;
    content?: string;
    link?: string;
    source: string;
    score: number;
    reason: string;
    method: 'content-based' | 'collaborative' | 'hybrid';
    aiScore?: number;
    pubDate?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
    id,
    title,
    content,
    link,
    source,
    score,
    reason,
    method,
    aiScore,
    pubDate
}) => {
    const getScoreColor = (score: number): string => {
        if (score >= 0.8) {
            return 'bg-green-100 border-green-500 text-green-800';
        } else if (score >= 0.6) {
            return 'bg-blue-100 border-blue-500 text-blue-800';
        } else if (score >= 0.4) {
            return 'bg-yellow-100 border-yellow-500 text-yellow-800';
        } else {
            return 'bg-gray-100 border-gray-300 text-gray-600';
        }
    };

    const getMethodBadge = (method: string): string => {
        switch (method) {
            case 'content-based':
                return 'bg-purple-100 text-purple-800';
            case 'collaborative':
                return 'bg-orange-100 text-orange-800';
            case 'hybrid':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const formatDate = (dateString?: string): string => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
            {/* Header with score and method */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 space-x-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score)}`}>
                        {(score * 100).toFixed(0)}%
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMethodBadge(method)}`}>
                        {method}
                    </span>
                </div>
                <span className="text-xs text-gray-500">
                    {formatDate(pubDate)}
                </span>
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {title}
            </h3>

            {content && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {content}
                </p>
            )}

            {/* Reason for recommendation */}
            <div className="bg-gray-50 rounded-md p-3 mb-3">
                <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-gray-700">
                        <span className="font-medium">Why recommended:</span> {reason}
                    </p>
                </div>
            </div>

            {/* Footer with source and AI score */}
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    {source}
                </span>
                {aiScore !== undefined && (
                    <span>
                        AI Score: {aiScore.toFixed(2)}
                    </span>
                )}
            </div>

            {/* Link button */}
            {link && (
                <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    Read More
                </a>
            )}
        </div>
    );
};
