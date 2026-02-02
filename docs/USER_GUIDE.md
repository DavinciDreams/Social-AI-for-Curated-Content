# User Guide

Welcome to Social AI for Curated Content! This guide will help you get started with all the features of the application.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Discovery Feed](#discovery-feed)
- [Knowledge Graph](#knowledge-graph)
- [Search](#search)
- [Recommendations](#recommendations)
- [Saved Items](#saved-items)
- [Settings](#settings)
- [Tips and Best Practices](#tips-and-best-practices)
- [FAQ](#faq)

## Getting Started

### First Steps

1. **Sign In**: Click the "Sign In" button in the top right corner to authenticate with your social media accounts (Twitter, Reddit)
2. **Explore Feeds**: Browse the Discovery Feed to see curated content from your connected accounts
3. **Search**: Use the search bar to find specific topics, keywords, or content
4. **Save Items**: Click the "Save" button on any item to add it to your personal collection
5. **Explore Graph**: Visit the Knowledge Graph to see connections between topics and content

### Navigation

- **Sidebar**: Use the sidebar on the left to navigate between different sections
- **Main Views**:
  - **Discovery Feed**: Your main content feed
  - **Knowledge Graph**: Visual representation of content connections
  - **Recommended**: AI-powered content recommendations
  - **Saved Items**: Your personal collection of saved content
  - **Settings**: Configure your preferences

## Authentication

### Supported Providers

The application supports OAuth authentication with:

- **Twitter**: Connect your Twitter account to see tweets in your feed
- **Reddit**: Connect your Reddit account to see posts from subreddits

### How to Sign In

1. Click the "Sign In" button in the top right corner
2. Select your preferred social media provider (Twitter or Reddit)
3. You'll be redirected to the provider's authorization page
4. Authorize the application to access your account
5. You'll be redirected back to the application, now signed in

### Session Management

- Your session is maintained using secure JWT tokens
- Sessions automatically refresh when needed
- Click "Sign Out" to end your session and clear local data

## Discovery Feed

### Overview

The Discovery Feed displays curated content from your connected social media accounts, filtered and ranked by AI to show the most valuable content first.

### Feed Features

#### Content Cards

Each content card displays:

- **Source Badge**: Shows which platform the content came from (Twitter, Reddit)
- **Publication Date**: When the content was originally posted
- **Title**: Clickable link to the original content
- **Content Preview**: Brief summary of the content
- **AI Score**: The content's relevance score (0.0 to 1.0)
- **Save Button**: Save content to your collection (requires authentication)

#### Feed Controls

- **Refresh**: Content updates automatically, but you can manually refresh
- **Filters**: Filter by source, date range, or minimum AI score
- **Sort**: Sort by AI score, date, or title

### Using Filters

1. Click the "Filters" button above the feed
2. **Source Filter**: Select "Twitter" or "Reddit" to see content from specific platforms
3. **Date Range Filter**: Set start and end dates to see content from a specific time period
4. **Min AI Score Filter**: Set a minimum score (0.0-1.0) to see only high-quality content
5. Click "Clear Filters" to remove all filters

### Sorting Options

1. Click "Sort By" above the feed
2. **AI Score**: Sort by relevance (highest first)
3. **Date**: Sort by publication date (newest first)
4. **Title**: Sort alphabetically

## Knowledge Graph

### Overview

The Knowledge Graph provides a visual representation of connections between topics, people, organizations, and content in your feed.

### Graph Features

#### Visualization

- **Nodes**: Represent entities (people, topics, organizations, events)
- **Links**: Show relationships between entities
- **Interactive**: Zoom, pan, and click to explore

#### Entity Types

- **Person**: Individual users or authors
- **Topic**: Subjects and hashtags
- **Organization**: Companies, groups, or institutions
- **Event**: Significant occurrences or milestones

### Using the Graph

1. **Navigate**: Click and drag to pan around the graph
2. **Zoom**: Use mouse wheel to zoom in/out
3. **Filter**: Filter by entity type to focus on specific categories
4. **Click Node**: Click any node to see its details and connections
5. **Search**: Use the search box to find specific entities

### Graph Controls

- **Entity Type Filter**: Show only specific types of entities
- **Load More**: Load additional nodes and connections for large graphs
- **Reset View**: Return to the initial view

## Search

### Overview

The Search feature allows you to find specific content across all your feeds using full-text search with filters and sorting.

### Search Features

#### Autocomplete

As you type in the search box, suggestions appear:

- **Feed Suggestions**: Popular feed items matching your query
- **Topic Suggestions**: Related topics matching your query
- **Count**: Shows how many items match each suggestion

#### Search Results

Results display with:

- **Title**: Content title (clickable link)
- **Source**: Platform where content was posted
- **AI Score**: Relevance score
- **Content Preview**: Brief summary
- **Publication Date**: When content was posted

### Search Filters

1. **Source**: Filter by Twitter or Reddit
2. **Date Range**: Set start and end dates
3. **Min AI Score**: Set minimum relevance score

### Search Sorting

1. **AI Score**: Sort by relevance
2. **Date**: Sort by publication date
3. **Title**: Sort alphabetically

### Pagination

- Navigate through results using "Previous" and "Next" buttons
- Results show 20 items per page
- Page indicator shows current position

## Recommendations

### Overview

The Recommendations feature uses AI to suggest content based on your interests, reading history, and saved items.

### Recommendation Types

- **Personalized**: Content tailored to your preferences
- **Trending**: Popular content across all users
- **Related**: Content similar to what you've saved

### Using Recommendations

1. Browse the "Recommended" section in the sidebar
2. Click on any recommendation to view full content
3. Save interesting items to your collection
4. Your interactions help improve future recommendations

## Saved Items

### Overview

Your Saved Items collection allows you to bookmark content for later reference.

### Saving Content

1. Click the "Save" button on any feed item or search result
2. The button changes to "Saved" when successfully saved
3. Click again to unsave (remove from collection)

### Managing Saved Items

1. Navigate to "Saved Items" in the sidebar
2. View all your saved content in one place
3. Click "Read more" to visit original content
4. Unsave items you no longer need

### Saved Item Features

- **Persistent**: Saved items are stored securely and persist across sessions
- **Organized**: View all saved items in a single feed
- **Quick Access**: Easy access to content you want to reference

## Settings

### Overview

The Settings page allows you to configure your application preferences.

### Settings Options

#### Account Settings

- **Profile**: View and edit your profile information
- **Connected Accounts**: Manage linked social media accounts
- **Sign Out**: End your session and clear local data

#### Feed Preferences

- **Default Sort**: Choose default sorting for your feed
- **Items Per Page**: Set how many items to display
- **Auto-Refresh**: Enable/disable automatic feed updates

#### Notification Settings

- **Email Notifications**: Configure email alerts for new content
- **Push Notifications**: Enable browser notifications
- **Digest Frequency**: Choose how often to receive summaries

#### Privacy Settings

- **Data Sharing**: Control how your data is shared
- **Analytics**: Opt in/out of usage analytics
- **Delete Account**: Permanently delete your account and data

## Tips and Best Practices

### Finding Quality Content

1. **Use AI Score**: Content with higher scores (0.7+) is typically more valuable
2. **Check Sources**: Cross-reference information from multiple sources
3. **Verify Dates**: Check publication dates to ensure content is current
4. **Read Summaries**: Preview content before clicking through to original link

### Efficient Searching

1. **Use Specific Terms**: More specific queries return better results
2. **Combine Filters**: Use multiple filters together for precise results
3. **Try Different Sorts**: Change sorting to find different perspectives
4. **Use Autocomplete**: Leverage suggestions to discover related topics

### Managing Your Collection

1. **Regularly Review**: Periodically review and unsave outdated content
2. **Organize by Topic**: Use search to find related saved items
3. **Export**: Consider exporting important items for offline reference
4. **Share**: Share valuable discoveries with colleagues or friends

### Privacy and Security

1. **Sign Out**: Always sign out when using shared devices
2. **Review Connected Accounts**: Periodically review which accounts are linked
3. **Use Strong Passwords**: If creating accounts, use unique, strong passwords
4. **Enable 2FA**: Enable two-factor authentication where available

## FAQ

### General Questions

**Q: How does the AI scoring work?**  
A: The AI analyzes content for relevance, quality, and engagement. Scores range from 0.0 to 1.0, with higher scores indicating more valuable content.

**Q: How often is the feed updated?**  
A: The feed updates automatically every few minutes. You can also manually refresh by reloading the page.

**Q: Can I connect multiple accounts?**  
A: Yes! You can connect both Twitter and Reddit accounts to see content from both platforms in one feed.

**Q: Is my data private?**  
A: Your data is encrypted and stored securely. We never share your data without your explicit consent. Review our privacy policy for details.

**Q: How do I report an issue?**  
A: Use the "Report" button on any content card to report inappropriate or incorrect content.

### Technical Questions

**Q: What browsers are supported?**  
A: The application supports all modern browsers including Chrome, Firefox, Safari, and Edge.

**Q: Is there a mobile app?**  
A: Currently, the application is web-based and responsive, working well on mobile browsers. A native mobile app is planned for future releases.

**Q: How do I clear my cache?**  
A: Clear your browser cache or use the "Clear Cache" option in Settings if available.

**Q: What happens if I disconnect an account?**  
A: Disconnecting an account removes it from your feed but keeps your saved items. Content from that account will no longer appear.

**Q: Can I export my saved items?**  
A: Export functionality is planned for a future release. Currently, you can manually save important items.

**Q: How are recommendations generated?**  
A: Recommendations are generated using machine learning based on your reading history, saved items, and interactions with content.

### Performance Questions

**Q: Why is the feed slow to load?**  
A: Initial loads may take longer due to AI processing. Subsequent loads use caching for faster performance.

**Q: How can I improve performance?**  
A: Ensure you have a stable internet connection, use a modern browser, and keep your browser cache cleared.

**Q: What should I do if I see errors?**  
A: Try refreshing the page, clearing your browser cache, or signing out and back in. If issues persist, contact support.

## Getting Help

If you have questions or need assistance:

1. **Documentation**: Check other documentation files for more details
2. **API Docs**: See [API Documentation](./API.md) for integration information
3. **GitHub Issues**: Report bugs or feature requests at our GitHub repository
4. **Contact Us**: Reach out through our support channels

---

Happy exploring! 🚀
