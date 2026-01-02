import React from 'react';

interface SidebarProps {
    currentView: 'feed' | 'graph' | 'saved' | 'settings';
    onViewChange: (view: 'feed' | 'graph' | 'saved' | 'settings') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
    const menuItems = [
        { id: 'feed', label: 'My Feed', icon: '📰' },
        { id: 'graph', label: 'Knowledge Graph', icon: '🕸️' },
        { id: 'saved', label: 'Saved Items', icon: '🔖' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ] as const;

    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 hidden md:block">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span>🧠</span> Filter
                </h2>
            </div>
            <nav className="mt-4">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`w - full text - left px - 6 py - 3 flex items - center gap - 3 transition - colors ${currentView === item.id
                                ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                                : 'text-gray-600 hover:bg-gray-50'
                            } `}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="absolute bottom-0 w-full p-6 border-t border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500"></div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">User</p>
                        <p className="text-xs text-green-500">● Online</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
