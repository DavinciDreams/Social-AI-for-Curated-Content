import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFeeds } from './utils/api';
import { FeedCard, FeedItem } from './components/FeedCard';
import { Sidebar } from './components/Sidebar';
import { GraphView } from './components/GraphView';
import { Settings } from './components/Settings';

function App() {
    const [currentView, setCurrentView] = useState<'feed' | 'graph' | 'saved' | 'settings'>('feed');
    const { data, isLoading, error } = useQuery({
        queryKey: ['feeds'],
        queryFn: fetchFeeds,
        enabled: currentView === 'feed'
    });

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <Sidebar currentView={currentView} onViewChange={setCurrentView} />

            <div className="flex-1 md:ml-64 p-8">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                        {currentView === 'feed' && 'Discovery Feed'}
                        {currentView === 'graph' && 'Knowledge Graph'}
                        {currentView === 'saved' && 'Saved Collection'}
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        {currentView === 'feed' && 'Curated social feed for filtered, high-value content.'}
                        {currentView === 'graph' && 'Explore connections between topics and content.'}
                        {currentView === 'saved' && 'Your personal library of high-signal information.'}
                        {currentView === 'settings' && 'Manage your application preferences.'}
                    </p>
                </header>

                <main>
                    {currentView === 'graph' && <GraphView />}
                    {currentView === 'settings' && <Settings />}

                    {currentView === 'saved' && (
                        <div className="bg-white p-10 rounded-lg shadow-sm text-center">
                            <p className="text-gray-500">No saved items yet. Start exploring the feed!</p>
                        </div>
                    )}

                    {currentView === 'feed' && (
                        <>
                            {isLoading && (
                                <div className="flex justify-center items-center h-64">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                                    <p className="text-red-700">Error loading feeds. Is the backend running?</p>
                                </div>
                            )}

                            {data && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {data.items?.map((item: FeedItem, index: number) => (
                                        <FeedCard key={index} item={item} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;
