# API Documentation

This document describes all available API endpoints for the Social AI for Curated Content application.

## Base URL

```
Development: http://localhost:3001/api
Staging: https://staging.socialai.com/api
Production: https://api.socialai.com/api
```

## Authentication

All API endpoints (except authentication endpoints) require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Get Token

**Endpoint**: `POST /auth/token`

**Description**: Exchange OAuth code for JWT token

**Request Body**:
```json
{
  "provider": "twitter|reddit",
  "code": "oauth_code_from_provider"
}
```

**Response**:
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "oauthProvider": "twitter",
    "oauthId": "provider_user_id"
  }
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid request
- `401`: Invalid OAuth code

### Refresh Token

**Endpoint**: `POST /auth/refresh`

**Description**: Refresh an expired JWT token

**Request Body**:
```json
{
  "token": "expired_jwt_token"
}
```

**Response**:
```json
{
  "token": "new_jwt_token_string"
}
```

**Status Codes**:
- `200`: Success
- `401`: Invalid token

### Validate Token

**Endpoint**: `POST /auth/validate`

**Description**: Validate if a JWT token is still valid

**Request Body**:
```json
{
  "token": "jwt_token_string"
}
```

**Response**:
```json
{
  "valid": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

**Status Codes**:
- `200`: Token is valid
- `401`: Token is invalid or expired

### Logout

**Endpoint**: `POST /auth/logout`

**Description**: Invalidate a JWT token

**Request Body**:
```json
{
  "token": "jwt_token_string"
}
```

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

**Status Codes**:
- `200`: Success
- `401`: Invalid token

## Feed Endpoints

### Get All Feeds

**Endpoint**: `GET /feeds`

**Description**: Get all aggregated and filtered feed items

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `page` | number | No | Page number for pagination | `1` |
| `limit` | number | No | Number of items per page | `20` |
| `source` | string | No | Filter by source (`twitter`, `reddit`) | - |
| `startDate` | string | No | Filter by start date (ISO 8601) | - |
| `endDate` | string | No | Filter by end date (ISO 8601) | - |
| `minScore` | number | No | Minimum AI score (0.0-1.0) | - |

**Example Request**:
```
GET /feeds?page=1&limit=20&source=twitter&minScore=0.7
```

**Response**:
```json
{
  "items": [
    {
      "id": "feed_item_id",
      "title": "Content Title",
      "source": "twitter|reddit",
      "content": "Content summary or text",
      "link": "https://example.com/content",
      "pubDate": "2024-01-10T12:00:00Z",
      "aiScore": 0.85,
      "keywords": ["ai", "technology"],
      "entities": ["AI", "Machine Learning"]
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `500`: Server error

### Get Feeds by Source

**Endpoint**: `GET /feeds/source/:source`

**Description**: Get feeds from a specific source

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | string | Source name (`twitter`, `reddit`) |

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `20` |

**Example Request**:
```
GET /feeds/source/twitter?page=1&limit=20
```

**Response**: Same as `GET /feeds`

### Get Feeds by Date Range

**Endpoint**: `GET /feeds/date-range`

**Description**: Get feeds within a date range

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|-----------|-------------|
| `startDate` | string | Yes | Start date (ISO 8601) |
| `endDate` | string | Yes | End date (ISO 8601) |
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `20` |

**Example Request**:
```
GET /feeds/date-range?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
```

**Response**: Same as `GET /feeds`

### Get Feeds by Min Score

**Endpoint**: `GET /feeds/min-score/:score`

**Description**: Get feeds with minimum AI score

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `score` | number | Minimum score (0.0-1.0) |

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `20` |

**Example Request**:
```
GET /feeds/min-score/0.7?page=1&limit=20
```

**Response**: Same as `GET /feeds`

## Search Endpoints

### Search

**Endpoint**: `GET /search`

**Description**: Full-text search across all feeds with filters and sorting

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `query` | string | Yes | Search query string | - |
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `20` |
| `source` | string | No | Filter by source | - |
| `startDate` | string | No | Filter by start date | - |
| `endDate` | string | No | Filter by end date | - |
| `minScore` | number | No | Minimum AI score | - |
| `sort` | string | No | Sort field (`score`, `pubDate`, `title`) | `score` |
| `order` | string | No | Sort order (`asc`, `desc`) | `desc` |

**Example Request**:
```
GET /search?query=artificial+intelligence&sort=score&order=desc&page=1&limit=20
```

**Response**:
```json
{
  "items": [
    {
      "id": "search_result_id",
      "title": "Content Title",
      "source": "twitter|reddit",
      "content": "Content summary",
      "link": "https://example.com/content",
      "pubDate": "2024-01-10T12:00:00Z",
      "aiScore": 0.92,
      "highlight": "Matched <em>artificial intelligence</em> in content"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `500`: Search error

### Autocomplete

**Endpoint**: `GET /search/autocomplete`

**Description**: Get search suggestions as user types

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `query` | string | Yes | Partial search query | - |
| `limit` | number | No | Max suggestions to return | `5` |

**Example Request**:
```
GET /search/autocomplete?query=art&limit=5
```

**Response**:
```json
[
  {
    "type": "feed|topic",
    "title": "Artificial Intelligence",
    "count": 125
  },
  {
    "type": "topic",
    "title": "Art",
    "count": 89
  }
]
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters

### Get Search Suggestions

**Endpoint**: `GET /search/suggestions`

**Description**: Get popular search suggestions

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `limit` | number | No | Max suggestions to return | `10` |

**Example Request**:
```
GET /search/suggestions?limit=10
```

**Response**:
```json
[
  {
    "type": "topic",
    "title": "Artificial Intelligence",
    "count": 1500
  },
  {
    "type": "feed",
    "title": "Latest AI News",
    "count": 250
  }
]
```

**Status Codes**:
- `200`: Success

## Graph Endpoints

### Get Graph Data

**Endpoint**: `GET /graph`

**Description**: Get knowledge graph data with nodes and links

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `100` |
| `type` | string | No | Filter by entity type | - |

**Example Request**:
```
GET /graph?page=1&limit=100&type=person
```

**Response**:
```json
{
  "nodes": [
    {
      "id": "node_id",
      "name": "Entity Name",
      "type": "person|topic|organization|event",
      "score": 0.85,
      "connections": 12
    }
  ],
  "links": [
    {
      "source": "node_id_1",
      "target": "node_id_2",
      "type": "related|mentions|contains",
      "weight": 0.75
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 100,
  "totalPages": 5
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `500`: Graph error

### Get Graph Statistics

**Endpoint**: `GET /graph/stats`

**Description**: Get statistics about the knowledge graph

**Response**:
```json
{
  "nodeCount": 1250,
  "linkCount": 3400,
  "entityTypeDistribution": {
    "person": 350,
    "topic": 600,
    "organization": 200,
    "event": 100
  },
  "averageConnections": 5.4
}
```

**Status Codes**:
- `200`: Success
- `500`: Statistics error

### Search Graph Entities

**Endpoint**: `GET /graph/search`

**Description**: Search for entities in the knowledge graph

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `q` | string | Yes | Search query | - |
| `type` | string | No | Filter by entity type | - |
| `limit` | number | No | Max results to return | `20` |

**Example Request**:
```
GET /graph/search?q=AI&type=topic&limit=20
```

**Response**:
```json
{
  "results": [
    {
      "id": "entity_id",
      "name": "Artificial Intelligence",
      "type": "topic",
      "score": 0.92,
      "connections": 45
    }
  ]
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `500`: Search error

### Get Entity Details

**Endpoint**: `GET /graph/entity/:type/:id`

**Description**: Get detailed information about a specific entity

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Entity type (`person`, `topic`, `organization`, `event`) |
| `id` | string | Entity ID |

**Example Request**:
```
GET /graph/entity/topic/ai_technology
```

**Response**:
```json
{
  "id": "entity_id",
  "name": "AI Technology",
  "type": "topic",
  "score": 0.88,
  "description": "Description of the entity",
  "connections": [
    {
      "id": "related_entity_id",
      "name": "Related Entity",
      "type": "topic",
      "relationship": "related_to"
    }
  ]
}
```

**Status Codes**:
- `200`: Success
- `404`: Entity not found
- `500`: Server error

### Get Related Entities

**Endpoint**: `GET /graph/entity/:type/:id/related`

**Description**: Get entities related to a specific entity

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Entity type |
| `id` | string | Entity ID |

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `limit` | number | No | Max related entities | `10` |

**Example Request**:
```
GET /graph/entity/topic/ai_technology/related?limit=10
```

**Response**:
```json
{
  "related": [
    {
      "id": "related_entity_id",
      "name": "Related Entity",
      "type": "topic",
      "score": 0.75,
      "relationship": "related_to"
    }
  ]
}
```

**Status Codes**:
- `200`: Success
- `404`: Entity not found
- `500`: Server error

## Recommendation Endpoints

### Get Recommendations

**Endpoint**: `GET /recommendations`

**Description**: Get personalized content recommendations

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `20` |
| `type` | string | No | Recommendation type (`personalized`, `trending`, `related`) | `personalized` |

**Example Request**:
```
GET /recommendations?page=1&limit=20&type=personalized
```

**Response**:
```json
{
  "items": [
    {
      "id": "recommendation_id",
      "title": "Recommended Content",
      "source": "twitter|reddit",
      "content": "Content summary",
      "link": "https://example.com/content",
      "pubDate": "2024-01-10T12:00:00Z",
      "aiScore": 0.89,
      "reason": "Based on your interest in AI topics",
      "confidence": 0.85
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid parameters
- `500`: Recommendation error

## Saved Items Endpoints

### Get Saved Items

**Endpoint**: `GET /saved`

**Description**: Get all items saved by the authenticated user

**Headers**: `Authorization: Bearer <token>` (Required)

**Query Parameters**:
| Parameter | Type | Required | Description | Default |
|-----------|------|-----------|-------------|---------|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `20` |

**Example Request**:
```
GET /saved?page=1&limit=20
```

**Response**:
```json
{
  "items": [
    {
      "id": "saved_item_id",
      "feedItemId": "original_feed_id",
      "title": "Content Title",
      "source": "twitter|reddit",
      "content": "Content summary",
      "link": "https://example.com/content",
      "pubDate": "2024-01-10T12:00:00Z",
      "aiScore": 0.85,
      "savedAt": "2024-01-10T14:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized (invalid or missing token)
- `500`: Server error

### Save Item

**Endpoint**: `POST /saved`

**Description**: Save a feed item to user's collection

**Headers**: `Authorization: Bearer <token>` (Required)

**Request Body**:
```json
{
  "feedItemId": "feed_item_id"
}
```

**Response**:
```json
{
  "id": "saved_item_id",
  "feedItemId": "feed_item_id",
  "savedAt": "2024-01-10T14:30:00Z"
}
```

**Status Codes**:
- `201`: Successfully saved
- `400`: Invalid request
- `401`: Unauthorized
- `404`: Feed item not found
- `409`: Already saved
- `500`: Server error

### Unsave Item

**Endpoint**: `DELETE /saved/:id`

**Description**: Remove an item from user's saved collection

**Headers**: `Authorization: Bearer <token>` (Required)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Saved item ID |

**Example Request**:
```
DELETE /saved/saved_item_id
```

**Response**:
```json
{
  "message": "Item removed successfully"
}
```

**Status Codes**:
- `200`: Successfully unsaved
- `401`: Unauthorized
- `404`: Saved item not found
- `500`: Server error

### Check if Item is Saved

**Endpoint**: `GET /saved/check/:feedItemId`

**Description**: Check if a feed item is saved by the authenticated user

**Headers**: `Authorization: Bearer <token>` (Required)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `feedItemId` | string | Feed item ID to check |

**Example Request**:
```
GET /saved/check/feed_item_id
```

**Response**:
```json
{
  "isSaved": true
}
```

**Status Codes**:
- `200**: Success
- `401`: Unauthorized
- `500`: Server error

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|-------|-------------|--------------|
| `INVALID_REQUEST` | Request parameters are invalid | 400 |
| `UNAUTHORIZED` | Authentication required or invalid | 401 |
| `FORBIDDEN` | Access to resource is forbidden | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource already exists | 409 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|--------------|-------|---------|
| Authentication | 10 requests/minute | 1 minute |
| Search | 30 requests/minute | 1 minute |
| Feed | 60 requests/minute | 1 minute |
| Graph | 30 requests/minute | 1 minute |
| Saved Items | 20 requests/minute | 1 minute |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704123456
```

## Pagination

Most list endpoints support pagination using these parameters:

- `page`: Page number (1-indexed)
- `limit`: Number of items per page
- `total`: Total number of items
- `totalPages`: Total number of pages

**Example**:
```
GET /feeds?page=2&limit=20

Response:
{
  "items": [...],
  "total": 150,
  "page": 2,
  "limit": 20,
  "totalPages": 8
}
```

## Caching

Responses from GET endpoints may include caching headers:

```
X-Cache: HIT|MISS
X-Cache-TTL: 300
```

- `HIT`: Response was served from cache
- `MISS`: Response was not cached
- `TTL`: Cache time-to-live in seconds

## WebSocket Events (Optional)

For real-time updates, the application supports WebSocket connections:

**Connect**: `ws://localhost:3001/ws`

**Events**:
- `feed:update`: New feed items available
- `feed:delete`: Feed items removed
- `graph:update`: Graph data updated
- `recommendation:new`: New recommendations available

## Versioning

The API is versioned using URL paths:

- Current version: `v1`
- Example: `GET /v1/feeds`

Include the `Accept-Version` header to request a specific version:

```
Accept-Version: v1
```

---

For more information, see the [Deployment Guide](./DEPLOYMENT.md) or [Architecture Documentation](./ARCHITECTURE.md).
