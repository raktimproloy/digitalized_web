# Topic Sharing API Documentation

This API provides a comprehensive sharing system for topics, allowing users to share topics with other users and manage their shared content.

## Base URL
```
http://localhost:3000/api/share
```

---

## Table of Contents

1. [Get All Users with Search](#1-get-all-users-with-search)
2. [Share Topic](#2-share-topic)
3. [Get My Shares](#3-get-my-shares)
4. [Get Shared With Me](#4-get-shared-with-me)
5. [Get Shared Topic Notes](#5-get-shared-topic-notes)
6. [Remove Share](#6-remove-share)
7. [Topic API Integration](#7-topic-api-integration)

---

## 1. Get All Users with Search

Retrieve all users with optional name/phone/email search functionality.

### Endpoint
```
GET /api/share/users
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search term for name, phoneNumber, or email (case-insensitive) |
| `name` | string | No | Alias for `search` |
| `q` | string | No | Alias for `search` |

### Request Example
```bash
# Get all users
GET /api/share/users

# Search users by name
GET /api/share/users?search=John

# Search users by phone
GET /api/share/users?search=1234567890
```

### Success Response (200)
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "phoneNumber": "1234567890",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "phoneNumber": "0987654321",
      "email": "jane@example.com",
      "createdAt": "2024-01-02T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z"
    }
  ]
}
```

### Error Response (500)
```json
{
  "success": false,
  "error": "Server error",
  "message": "Error message details"
}
```

---

## 2. Share Topic

Share a topic with another user. One topic can be shared with multiple users.

### Endpoint
```
POST /api/share/topic
```

### Request Body
```json
{
  "topicId": "topic123",
  "sharedWithUserId": "user456",
  "ownerId": "user789"
}
```

### Request Body Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | string | Yes | The ID of the topic to share |
| `sharedWithUserId` | string | Yes | The ID of the user to share with |
| `ownerId` | string | Yes | The ID of the user who owns/shared the topic |

### Request Example
```bash
POST /api/share/topic
Content-Type: application/json

{
  "topicId": "topic123",
  "sharedWithUserId": "user456",
  "ownerId": "user789"
}
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Topic shared successfully",
  "data": {
    "shareId": "507f1f77bcf86cd799439013",
    "ownerId": "user789",
    "sharedWithUser": {
      "id": "user456",
      "name": "Jane Smith",
      "phoneNumber": "0987654321",
      "email": "jane@example.com"
    },
    "topicId": "topic123",
    "chapterId": "chapter456",
    "bookId": "book789",
    "sharedAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Responses

#### 400 - Missing Required Fields
```json
{
  "success": false,
  "error": "Topic ID is required"
}
```

#### 400 - Cannot Share With Yourself
```json
{
  "success": false,
  "error": "Cannot share topic with yourself"
}
```

#### 404 - Topic Not Found
```json
{
  "success": false,
  "error": "Topic not found"
}
```

#### 404 - User Not Found
```json
{
  "success": false,
  "error": "Owner user not found"
}
```

---

## 3. Get My Shares

Get all topics that you have shared with other users, organized by book > chapter > topic with user list information.

### Endpoint
```
GET /api/share/my-shares
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Your user ID (the owner) |
| `user` | string | No | Alias for `userId` |
| `id` | string | No | Alias for `userId` |
| `ownerId` | string | No | Alias for `userId` |

### Request Example
```bash
GET /api/share/my-shares?userId=user789
```

### Success Response (200)
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "book789",
      "name": "JavaScript Fundamentals",
      "description": "Learn JavaScript basics",
      "chapters": [
        {
          "id": "chapter456",
          "name": "Variables and Data Types",
          "topics": [
            {
              "id": "topic123",
              "name": "Introduction to Variables",
              "content": "...",
              "sharedWithUsers": [
                {
                  "userId": "user456",
                  "name": "Jane Smith",
                  "phoneNumber": "0987654321",
                  "email": "jane@example.com",
                  "sharedAt": "2024-01-01T00:00:00.000Z",
                  "shareId": "507f1f77bcf86cd799439013"
                },
                {
                  "userId": "user111",
                  "name": "Bob Johnson",
                  "phoneNumber": "1111111111",
                  "email": "bob@example.com",
                  "sharedAt": "2024-01-02T00:00:00.000Z",
                  "shareId": "507f1f77bcf86cd799439014"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Success Response - No Shares (200)
```json
{
  "success": true,
  "count": 0,
  "data": [],
  "message": "No topics shared yet"
}
```

### Error Responses

#### 400 - Missing User ID
```json
{
  "success": false,
  "error": "User ID is required"
}
```

---

## 4. Get Shared With Me

Get all topics that have been shared with you, including full information about who shared them.

### Endpoint
```
GET /api/share/shared-with-me
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Your user ID (the recipient) |
| `user` | string | No | Alias for `userId` |
| `id` | string | No | Alias for `userId` |
| `sharedWithUserId` | string | No | Alias for `userId` |

### Request Example
```bash
GET /api/share/shared-with-me?userId=user456
```

### Success Response (200)
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "shareId": "507f1f77bcf86cd799439013",
      "topic": {
        "id": "topic123",
        "name": "Introduction to Variables",
        "content": "...",
        "chapterId": "chapter456",
        "bookId": "book789"
      },
      "chapter": {
        "id": "chapter456",
        "name": "Variables and Data Types",
        "bookId": "book789"
      },
      "book": {
        "id": "book789",
        "name": "JavaScript Fundamentals",
        "description": "Learn JavaScript basics"
      },
      "sharedBy": {
        "userId": "user789",
        "name": "John Doe",
        "phoneNumber": "1234567890",
        "email": "john@example.com"
      },
      "sharedAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Success Response - No Shares (200)
```json
{
  "success": true,
  "count": 0,
  "data": [],
  "message": "No topics shared with you yet"
}
```

### Error Responses

#### 400 - Missing User ID
```json
{
  "success": false,
  "error": "User ID is required"
}
```

---

## 5. Get Shared Topic Notes

View the notes of the person who shared a topic with you. This allows you to see exactly what notes the owner has on the shared topic.

### Endpoint
```
GET /api/share/shared-notes
```

### Alternative Endpoint
```
GET /api/share/shared-notes/:topicId/:userId
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | string | Yes | The topic ID that was shared with you |
| `userId` | string | Yes | Your user ID (the recipient) |
| `user` | string | No | Alias for `userId` |
| `id` | string | No | Alias for `userId` |

### Request Example
```bash
GET /api/share/shared-notes?topicId=69600e92db04d747ded84b08&userId=user456
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "shareId": "507f1f77bcf86cd799439013",
    "topic": {
      "id": "69600e92db04d747ded84b08",
      "name": "Introduction to Variables",
      "content": "...",
      "chapterId": "chapter456",
      "bookId": "book789"
    },
    "chapter": {
      "id": "chapter456",
      "name": "Variables and Data Types",
      "bookId": "book789"
    },
    "book": {
      "id": "book789",
      "name": "JavaScript Fundamentals",
      "description": "Learn JavaScript basics"
    },
    "sharedBy": {
      "userId": "user789",
      "name": "John Doe",
      "phoneNumber": "1234567890",
      "email": "john@example.com"
    },
    "notes": [
      {
        "id": "note123",
        "_id": "note123",
        "userId": "user789",
        "topicId": "69600e92db04d747ded84b08",
        "content": "This is a note about variables",
        "position": 100,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "notesCount": 1,
    "sharedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Responses

#### 400 - Missing Parameters
```json
{
  "success": false,
  "error": "Topic ID is required"
}
```

```json
{
  "success": false,
  "error": "User ID is required"
}
```

#### 404 - Share Not Found
```json
{
  "success": false,
  "error": "This topic has not been shared with you",
  "message": "No share record found for this topic and user"
}
```

#### 404 - Owner Not Found
```json
{
  "success": false,
  "error": "Owner user not found"
}
```

### Notes

- This API returns all notes that the owner has on the shared topic
- The notes are returned in the same format as the owner sees them
- If the topic was not shared with you, you will get a 404 error
- The response includes full context: topic, chapter, book, and owner information

---

## 6. Remove Share

Remove a share. Can be called by either the owner or the recipient.

### Endpoint (Method 1 - By Share ID)
```
DELETE /api/share/:shareId
```

### Endpoint (Method 2 - By Topic Details)
```
DELETE /api/share
```

### Query Parameters (Method 1)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shareId` | string | Yes | The share ID (in URL path) |
| `userId` | string | Yes | Your user ID for permission verification |

### Query Parameters (Method 2)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | string | Yes | The topic ID |
| `sharedWithUserId` | string | Yes | The user ID who received the share |
| `ownerId` | string | Yes | The user ID who created the share |
| `userId` | string | Yes | Your user ID for permission verification |

### Request Examples

#### Method 1 - By Share ID
```bash
DELETE /api/share/507f1f77bcf86cd799439013?userId=user789
```

#### Method 2 - By Topic Details
```bash
DELETE /api/share?topicId=topic123&sharedWithUserId=user456&ownerId=user789&userId=user789
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Share removed successfully",
  "data": {
    "shareId": "507f1f77bcf86cd799439013",
    "topicId": "topic123",
    "ownerId": "user789",
    "sharedWithUserId": "user456"
  }
}
```

### Error Responses

#### 400 - Missing Parameters
```json
{
  "success": false,
  "error": "Either shareId or (topicId, sharedWithUserId, ownerId) is required"
}
```

#### 403 - Permission Denied
```json
{
  "success": false,
  "error": "You do not have permission to remove this share"
}
```

#### 404 - Share Not Found
```json
{
  "success": false,
  "error": "Share not found"
}
```

---

## 7. Topic API Integration

When fetching a topic with notes, the API now includes sharing information.

### Endpoint
```
GET /api/topics/:id?userId=xxx
```

### Enhanced Response
The topic API response now includes a `sharedInfo` object when `userId` is provided:

```json
{
  "success": true,
  "data": [
    {
      "id": "topic123",
      "name": "Introduction to Variables",
      "content": "...",
      "chapter": { ... },
      "book": { ... }
    }
  ],
  "userNotes": [ ... ],
  "userId": "user789",
  "topicId": "topic123",
  "sharedInfo": {
    "sharedWith": [
      {
        "userId": "user456",
        "name": "Jane Smith",
        "phoneNumber": "0987654321",
        "email": "jane@example.com",
        "sharedAt": "2024-01-01T00:00:00.000Z",
        "shareId": "507f1f77bcf86cd799439013"
      }
    ],
    "sharedBy": [
      {
        "userId": "user111",
        "name": "Bob Johnson",
        "phoneNumber": "1111111111",
        "email": "bob@example.com",
        "sharedAt": "2024-01-02T00:00:00.000Z",
        "shareId": "507f1f77bcf86cd799439014"
      }
    ]
  }
}
```

### sharedInfo Fields

- **sharedWith**: Array of users you have shared this topic with (who can see your notes)
- **sharedBy**: Array of users who have shared this topic with you

---

## Notes

1. **One Topic, Multiple Shares**: A single topic can be shared with multiple users. Each share is tracked separately.

2. **Permission Model**: 
   - Only the owner or recipient can remove a share
   - Users cannot share topics with themselves

3. **User ID Formats**: The API accepts user IDs in multiple formats:
   - MongoDB ObjectId
   - Custom ID field
   - Phone number (if used as identifier)

4. **Search Functionality**: The user search API searches across:
   - Name (case-insensitive)
   - Phone number (case-insensitive)
   - Email (case-insensitive)

5. **Data Structure**: The sharing system maintains relationships between:
   - Books → Chapters → Topics
   - Owner → Topic → Shared With Users

---

## Example Workflow

1. **Search for users to share with:**
   ```bash
   GET /api/share/users?search=John
   ```

2. **Share a topic:**
   ```bash
   POST /api/share/topic
   {
     "topicId": "topic123",
     "sharedWithUserId": "user456",
     "ownerId": "user789"
   }
   ```

3. **View what you've shared:**
   ```bash
   GET /api/share/my-shares?userId=user789
   ```

4. **View what was shared with you:**
   ```bash
   GET /api/share/shared-with-me?userId=user456
   ```

5. **View topic with sharing info:**
   ```bash
   GET /api/topics/topic123?userId=user789
   ```

6. **View shared topic notes (see owner's notes):**
   ```bash
   GET /api/share/shared-notes?topicId=topic123&userId=user456
   ```

7. **Remove a share:**
   ```bash
   DELETE /api/share/507f1f77bcf86cd799439013?userId=user789
   ```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing/invalid parameters)
- `403`: Forbidden (permission denied)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

---

## Support

For issues or questions, please refer to the main API documentation or contact the development team.

