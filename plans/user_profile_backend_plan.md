# User Profile Backend Implementation Plan

## Required API Endpoints

1. **GET /api/users/:userId/profile** - Returns user profile data (username, avatar, bio, role, creation date, product count, CV count)

2. **GET /api/users/:userId/products** - Returns paginated and sorted user products with query parameters:
   - `page` (default: 1)
   - `limit` (default: 12)
   - `sort` (newest, oldest, most-liked)

3. **GET /api/users/:userId/favorites** - Returns user's favorite products

4. **GET /api/users/:userId/comments** - Returns user's recent comments with query parameters:
   - `limit` (default: 3)

5. **GET /api/users/:userId/cvs** - Returns user's CVs

## Key Implementation Details

- **Sorting Logic**: Handles newest (by createdAt), oldest (by createdAt), most-liked (by likesCount)
- **Pagination**: Returns products array, total count, and pagination metadata
- **Security**: Public endpoints, no authentication required for viewing
- **Error Handling**: Proper 404/400/500 responses
- **Database Integration**: Uses existing User/Product models plus Favorites model

## Response Formats

### GET /api/users/:userId/profile
```json
{
  "_id": "user_id",
  "username": "johndoe",
  "avatar": "https://example.com/avatar.jpg",
  "bio": "Fashion enthusiast",
  "role": "user",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "productCount": 25,
  "cvCount": 3
}
```

### GET /api/users/:userId/products?page=1&limit=12&sort=newest
```json
{
  "products": [
    {
      "_id": "product_id",
      "name": "Vintage Jacket",
      "images": ["image1.jpg"],
      "price": 89.99,
      "seller": {
        "_id": "seller_id",
        "username": "johndoe",
        "avatar": "avatar.jpg"
      },
      "likesCount": 15,
      "createdAt": "2023-12-01T00:00:00.000Z"
    }
  ],
  "totalPages": 3,
  "currentPage": 1,
  "total": 25
}
```

### GET /api/users/:userId/favorites
```json
[
  {
    "_id": "product_id",
    "name": "Retro Sneakers",
    "images": ["image1.jpg"],
    "price": 120.00,
    "seller": {
      "_id": "seller_id",
      "username": "janedoe",
      "avatar": "avatar.jpg"
    }
  }
]
```

### GET /api/users/:userId/comments?limit=3
```json
[
  {
    "_id": "comment_id",
    "userId": "user_id",
    "text": "Great product!",
    "createdAt": "2023-12-01T00:00:00.000Z",
    "productName": "Vintage Jacket"
  }
]
```

### GET /api/users/:userId/cvs
```json
[
  {
    "_id": "cv_id",
    "userId": "user_id",
    "title": "Software Engineer",
    "description": "Experienced developer...",
    "skills": ["JavaScript", "React"],
    "experience": "5 years",
    "createdAt": "2023-12-01T00:00:00.000Z"
  }
]
```

## Implementation Status

All endpoints are implemented in `routes/users.js` and mounted at `/api/users` in `server.js`. The backend is ready to support the user profile page with products, favorites, comments, and CVs tabs.