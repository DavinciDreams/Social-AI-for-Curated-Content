
import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3000/api';

interface FeedConfig {
    id: string;
    name: string;
    url: string;
    type: string;
}

interface AppConfig {
    feeds: FeedConfig[];
    filterPrompts: {
        system: string;
    };
    social?: {
        twitter?: string;
        reddit?: string;
    };
}

export const Settings: React.FC = () => {
    const queryClient = useQueryClient();
    const [config, setConfig] = useState<AppConfig | null>(null);

    const { isLoading } = useQuery({
        queryKey: ['config'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/config`);
            // Ensure social object exists
            const data = res.data;
            if (!data.social) data.social = { twitter: '', reddit: '' };
            setConfig(data);
            return data;
        }
    });

    const mutation = useMutation({
        mutationFn: async (newConfig: AppConfig) => {
            await axios.post(`${API_URL}/config`, newConfig);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            alert('Settings saved successfully!');
        }
    });

    const handleSocialChange = (key: 'twitter' | 'reddit', value: string) => {
        if (!config) return;
        setConfig({
            ...config,
            social: { ...config.social, [key]: value }
        });
    };

    const handleSaveSocial = () => {
        if (config) mutation.mutate(config);
    };

    const handleFeedChange = (index: number, field: keyof FeedConfig, value: string) => {
        if (!config) return;
        const newFeeds = [...config.feeds];
        newFeeds[index] = { ...newFeeds[index], [field]: value };
        setConfig({ ...config, feeds: newFeeds });
    };

    const handlePromptChange = (value: string) => {
        if (!config) return;
        setConfig({ ...config, filterPrompts: { ...config.filterPrompts, system: value } });
    };

    const addFeed = () => {
        if (!config) return;
        setConfig({
            ...config,
            feeds: [...config.feeds, { id: Date.now().toString(), name: 'New Feed', url: '', type: 'rss' }]
        });
    };

    const removeFeed = (index: number) => {
        if (!config) return;
        const newFeeds = config.feeds.filter((_, i) => i !== index);
        setConfig({ ...config, feeds: newFeeds });
    };

    const saveSettings = () => {
        if (config) mutation.mutate(config);
    };

    if (isLoading || !config) return <div>Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Configuration</h2>

            {/* Social Accounts Section */}
            <div className="mb-10 bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h3 className="text-xl font-semibold mb-4 text-blue-800">Social Accounts (Quick Connect)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded border border-gray-200">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">🐦</span>
                            <span className="font-medium">Twitter / X</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Paste Bearer Token"
                            className="w-full p-2 border rounded text-sm mb-2"
                            value={config.social?.twitter || ''}
                            onChange={(e) => handleSocialChange('twitter', e.target.value)}
                        />
                        <button
                            onClick={handleSaveSocial}
                            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 text-sm"
                        >
                            Connect Account (Save)
                        </button>
                    </div>

                    <div className="bg-white p-4 rounded border border-gray-200">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">🤖</span>
                            <span className="font-medium">Reddit</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Client ID / Secret"
                            className="w-full p-2 border rounded text-sm mb-2"
                            value={config.social?.reddit || ''}
                            onChange={(e) => handleSocialChange('reddit', e.target.value)}
                        />
                        <button
                            onClick={handleSaveSocial}
                            className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 text-sm"
                        >
                            Connect Account (Save)
                        </button>
                    </div>
                </div>
            </div>

            {/* Feeds Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">RSS Feeds</h3>
                <div className="space-y-4">
                    {config.feeds.map((feed, index) => (
                        <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded border border-gray-200">
                            <div className="flex-1 space-y-2">
                                <input
                                    type="text"
                                    value={feed.name}
                                    onChange={(e) => handleFeedChange(index, 'name', e.target.value)}
                                    className="w-full p-2 border rounded"
                                    placeholder="Feed Name"
                                />
                                <input
                                    type="text"
                                    value={feed.url}
                                    onChange={(e) => handleFeedChange(index, 'url', e.target.value)}
                                    className="w-full p-2 border rounded text-sm text-gray-600"
                                    placeholder="Feed URL"
                                />
                            </div>
                            <button
                                onClick={() => removeFeed(index)}
                                className="text-red-500 hover:text-red-700 px-3 py-2"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addFeed}
                        className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:border-blue-500 hover:text-blue-500 font-medium transition-colors"
                    >
                        + Add New Feed source
                    </button>
                </div>
            </div>

            {/* AI Prompt Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">AI Filter Instructions</h3>
                <p className="text-sm text-gray-500 mb-2">Define what the AI should consider "Brain Rot".</p>
                <textarea
                    value={config.filterPrompts.system}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    className="w-full h-32 p-3 border rounded font-mono text-sm"
                />
            </div>

            <div className="flex justify-end pt-6 border-t">
                <button
                    onClick={saveSettings}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 shadow-sm"
                >
                    Save Configuration
                </button>
            </div>
        </div>
    );
};
