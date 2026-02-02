import React, { useState } from 'react';

interface SidebarProps {
    currentView: 'feed' | 'graph' | 'saved' | 'settings' | 'search' | 'recommended';
    onViewChange: (view: 'feed' | 'graph' | 'saved' | 'settings' | 'search' | 'recommended') => void;
    isAuthenticated?: boolean;
    onLoginClick?: () => void;
    onLogout?: () => void;
    onSearchClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    currentView,
    onViewChange,
    isAuthenticated = false,
    onLoginClick,
    onLogout,
    onSearchClick,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    
    const menuItems = [
        { id: 'feed', label: 'My Feed', icon: '📰' },
        { id: 'graph', label: 'Knowledge Graph', icon: '🕸️' },
        { id: 'recommended', label: 'Recommended', icon: '⭐' },
        { id: 'saved', label: 'Saved Items', icon: '🔖' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ] as const;
    
    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 flex flex-col">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && searchQuery.trim()) {
                                onSearchClick?.();
                                setSearchQuery('');
                            }
                        }}
                        placeholder="Search..."
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={() => {
                            if (searchQuery.trim()) {
                                onSearchClick?.();
                                setSearchQuery('');
                            }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m-2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto p-4">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id as any)}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                            currentView === item.id
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>
            
            {/* User Section */}
            <div className="mt-auto p-4 border-t border-gray-200">
                {isAuthenticated ? (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                            <span className="text-sm">✓</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="text-sm text-red-600 hover:text-red-800 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onLoginClick}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </aside>
    );
};
