# User API Documentation

This API provides endpoints for managing user data with MongoDB. Phone number is used as the unique identifier.

## Base URL
```
http://localhost:3000/api/users
```

## Endpoints

### 1. Create User (POST)
Create a new user. If a user with the same phone number already exists, the request will be rejected.

**Endpoint:** `POST /api/users`

**Request Body:**
```json
{
  "phoneNumber": "1234567890",
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "_id": "...",
    "phoneNumber": "1234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (409) - User already exists:**
```json
{
  "success": false,
  "error": "User with this phone number already exists",
  "user": { ... }
}
```

**Error Response (400) - Missing phone number:**
```json
{
  "success": false,
  "error": "Phone number is required"
}
```

---

### 2. Get All Users (GET)
Retrieve all users from the database.

**Endpoint:** `GET /api/users`

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "...",
      "phoneNumber": "1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 3. Get User by Phone Number (GET)
Retrieve a specific user by their phone number.

**Endpoint:** `GET /api/users/:phoneNumber`

**Alternative:** `GET /api/users?phoneNumber=1234567890`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "phoneNumber": "1234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (404) - User not found:**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 4. Update User (PUT/PATCH)
Update an existing user by phone number.

**Endpoint:** `PUT /api/users/:phoneNumber` or `PATCH /api/users/:phoneNumber`

**Alternative:** `PUT /api/users?phoneNumber=1234567890`

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Note:** You cannot update a phone number to one that already exists.

**Success Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "_id": "...",
    "phoneNumber": "1234567890",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Response (404) - User not found:**
```json
{
  "success": false,
  "error": "User not found"
}
```

**Error Response (409) - Phone number already exists:**
```json
{
  "success": false,
  "error": "Phone number already exists"
}
```

---

## Example Usage

### Using cURL

**Create User:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "1234567890",
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

**Get User:**
```bash
curl http://localhost:3000/api/users/1234567890
```

**Update User:**
```bash
curl -X PUT http://localhost:3000/api/users/1234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com"
  }'
```

### Using JavaScript (Fetch)

**Create User:**
```javascript
fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phoneNumber: '1234567890',
    name: 'John Doe',
    email: 'john@example.com'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Get User:**
```javascript
fetch('http://localhost:3000/api/users/1234567890')
  .then(res => res.json())
  .then(data => console.log(data));
```

**Update User:**
```javascript
fetch('http://localhost:3000/api/users/1234567890', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Jane Doe',
    email: 'jane@example.com'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## Environment Variables

Create a `.env` file in the root directory:

```
MONGODB_URI=mongodb://localhost:27017/digitisedbookweb
PORT=3000
```

For MongoDB Atlas (cloud):
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/digitisedbookweb
```

---

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up MongoDB:
   - Install MongoDB locally, or
   - Use MongoDB Atlas (cloud)

3. Create `.env` file with your MongoDB connection string

4. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

