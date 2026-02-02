import React, { useState } from 'react';

interface AuthProps {
    onAuthSuccess: (token: string, user: any) => void;
    onCancel?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, onCancel }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [provider, setProvider] = useState<'twitter' | 'reddit' | 'google' | null>(null);

    const handleOAuthLogin = async (oauthProvider: 'twitter' | 'reddit' | 'google') => {
        setIsLoading(true);
        setError(null);
        setProvider(oauthProvider);

        try {
            // In production, this would redirect to the OAuth provider's authorization URL
            // For now, we'll simulate the OAuth flow with a placeholder implementation
            
            // Simulate OAuth redirect
            const authUrl = getOAuthUrl(oauthProvider);
            
            // Open OAuth provider in a popup window
            const popup = window.open(
                authUrl,
                'oauth-popup',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            );
            
            if (!popup) {
                throw new Error('Failed to open OAuth popup. Please allow popups for this site.');
            }
            
            // Listen for OAuth callback
            const messageHandler = (event: MessageEvent) => {
                // Verify the message comes from our expected origin
                if (event.origin !== window.location.origin) {
                    return;
                }
                
                if (event.data.type === 'oauth-success') {
                    popup.close();
                    window.removeEventListener('message', messageHandler);
                    
                    const { token, user } = event.data;
                    onAuthSuccess(token, user);
                    setIsLoading(false);
                } else if (event.data.type === 'oauth-error') {
                    popup.close();
                    window.removeEventListener('message', messageHandler);
                    setError(event.data.error || 'Authentication failed');
                    setIsLoading(false);
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Check if popup was closed by user
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    setIsLoading(false);
                }
            }, 1000);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Authentication failed');
            setIsLoading(false);
        }
    };

    const getOAuthUrl = (provider: string): string => {
        // In production, these would be actual OAuth provider URLs
        // For now, return a placeholder that would be handled by the backend
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        return `${baseUrl}/api/auth/${provider}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <p className="text-gray-600 mb-6">
                    Sign in to save your favorite content and personalize your feed.
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => handleOAuthLogin('twitter')}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading && provider === 'twitter' ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        )}
                        Continue with Twitter
                    </button>

                    <button
                        onClick={() => handleOAuthLogin('reddit')}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading && provider === 'reddit' ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534-.583-.28-1.02-.9-1.02-1.621 0-.968.786-1.754 1.754-1.754.468 0 .898.196 1.207.491 1.207-.9 2.9-1.488 4.744-1.488l.8-3.747-2.597.547a1.25 1.25 0 0 1-2.498-.056c0-.688.562-1.249 1.25-1.249zm-5.01 5.01c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25-1.25-.56-1.25-1.25.56-1.25 1.25-1.25zm10.02 0c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25-1.25-.56-1.25-1.25.56-1.25 1.25-1.25zm-5.01 3.763c1.694 0 3.17.628 4.025 1.613.266.31.23.774-.08 1.04-.31.267-.775.23-1.041-.08-.487-.569-1.525-.905-2.904-.905-1.38 0-2.417.336-2.904.905-.266.31-.73.347-1.041.08-.31-.267-.346-.73-.08-1.04.855-.985 2.331-1.613 4.025-1.613z"/>
                            </svg>
                        )}
                        Continue with Reddit
                    </button>

                    <button
                        onClick={() => handleOAuthLogin('google')}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading && provider === 'google' ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                        )}
                        Continue with Google
                    </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
};
