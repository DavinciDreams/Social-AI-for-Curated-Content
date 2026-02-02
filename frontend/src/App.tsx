import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFeeds, getSavedItems, getToken, removeTokens } from './utils/api';
import { FeedCard, FeedItem } from './components/FeedCard';
import { Sidebar } from './components/Sidebar';
import { GraphView } from './components/GraphView';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { Search } from './components/Search';
import { initErrorTracking, trackPageView } from './utils/logger';

interface User {
    id: string;
    email: string;
    name: string;
    oauthProvider: string;
    oauthId: string;
}

function App() {
    const [currentView, setCurrentView] = useState<'feed' | 'graph' | 'saved' | 'settings' | 'search' | 'recommended'>('feed');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [showAuth, setShowAuth] = useState(false);

    // Check authentication status on mount
    useEffect(() => {
        const token = getToken();
        if (token) {
            setIsAuthenticated(true);
            // In production, you would validate the token and fetch user info
            // For now, we'll just set a placeholder user
            setUser({
                id: '1',
                email: 'user@example.com',
                name: 'Authenticated User',
                oauthProvider: 'twitter',
                oauthId: '123456789',
            });
        }
        
        // Initialize error tracking
        initErrorTracking();
        
        // Track page view
        trackPageView('App');
    }, []);

    // Handle auth expiration
    useEffect(() => {
        const handleAuthExpired = () => {
            setIsAuthenticated(false);
            setUser(null);
        };

        window.addEventListener('auth-expired', handleAuthExpired);
        return () => window.removeEventListener('auth-expired', handleAuthExpired);
    }, []);

    const handleAuthSuccess = (_token: string, userData: User) => {
        setIsAuthenticated(true);
        setUser(userData);
        setShowAuth(false);
    };

    const handleLogout = () => {
        removeTokens();
        setIsAuthenticated(false);
        setUser(null);
        setCurrentView('feed');
    };

    const { data: feedsData, isLoading: feedsLoading, error: feedsError } = useQuery({
        queryKey: ['feeds'],
        queryFn: fetchFeeds,
        enabled: currentView === 'feed',
    });

    const { data: savedData, isLoading: savedLoading, error: savedError } = useQuery({
        queryKey: ['saved'],
        queryFn: () => getSavedItems(1, 20),
        enabled: currentView === 'saved' && isAuthenticated,
    });

    // Handle API response format - API returns data directly (arrays)
    const feeds = Array.isArray(feedsData) ? feedsData : [];
    const savedItems = Array.isArray(savedData) ? savedData : [];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <Sidebar
                currentView={currentView}
                onViewChange={setCurrentView}
                isAuthenticated={isAuthenticated}
                onLoginClick={() => setShowAuth(true)}
                onLogout={handleLogout}
                onSearchClick={() => setCurrentView('search')}
            />

            <div className="flex-1 md:ml-64 p-8">
                <header className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                            {currentView === 'feed' && 'Discovery Feed'}
                            {currentView === 'graph' && 'Knowledge Graph'}
                            {currentView === 'saved' && 'Saved Collection'}
                            {currentView === 'recommended' && 'Recommended'}
                            {currentView === 'settings' && 'Settings'}
                        </h1>
                        <p className="text-gray-500 mt-2 text-lg">
                            {currentView === 'feed' && 'Curated social feed for filtered, high-value content.'}
                            {currentView === 'graph' && 'Explore connections between topics and content.'}
                            {currentView === 'saved' && isAuthenticated && 'Your personal library of high-signal information.'}
                            {currentView === 'saved' && !isAuthenticated && 'Sign in to save and view your collection.'}
                            {currentView === 'recommended' && 'Personalized recommendations based on your interests.'}
                            {currentView === 'settings' && 'Manage your application preferences.'}
                        </p>
                    </div>
                    {isAuthenticated && user && (
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    )}
                </header>

                <main>
                    {currentView === 'graph' && <GraphView />}
                    {currentView === 'settings' && <Settings />}
                    {currentView === 'search' && <Search />}

                    {currentView === 'saved' && (
                        <>
                            {!isAuthenticated ? (
                                <div className="bg-white p-10 rounded-lg shadow-sm text-center">
                                    <p className="text-gray-500 mb-4">Sign in to view your saved items.</p>
                                    <button
                                        onClick={() => setShowAuth(true)}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Sign In
                                    </button>
                                </div>
                            ) : savedLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                </div>
                            ) : savedError ? (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                                    <p className="text-red-700">Error loading saved items.</p>
                                </div>
                            ) : savedItems.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {savedItems.map((item: FeedItem, index: number) => (
                                        <FeedCard key={index} item={item} isAuthenticated={isAuthenticated} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white p-10 rounded-lg shadow-sm text-center">
                                    <p className="text-gray-500">No saved items yet. Start exploring to feed!</p>
                                </div>
                            )}
                        </>
                    )}

                    {currentView === 'recommended' && isAuthenticated && (
                        <div className="bg-white p-10 rounded-lg shadow-sm text-center">
                            <p className="text-gray-500">Recommendations feature coming soon!</p>
                        </div>
                    )}

                    {currentView === 'feed' && (
                        <>
                            {feedsLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                </div>
                            ) : feedsError ? (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                                    <p className="text-red-700">Error loading feeds. Is backend running?</p>
                                </div>
                            ) : feeds.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {feeds.map((item: FeedItem, index: number) => (
                                        <FeedCard key={index} item={item} isAuthenticated={isAuthenticated} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white p-10 rounded-lg shadow-sm text-center">
                                    <p className="text-gray-500">No feeds available yet. Connect your social accounts to start discovering content!</p>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {showAuth && <Auth onAuthSuccess={handleAuthSuccess} onCancel={() => setShowAuth(false)} />}
        </div>
    );
}

export default App;
