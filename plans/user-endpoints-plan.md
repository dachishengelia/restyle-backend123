# Implementation Plan: User Bio & Splash Screen Endpoints

## Current State Analysis

### Files to Modify:
1. **`models/User.js`** - Add splashScreen field
2. **`routes/users.js`** - Add/modify endpoints

### Existing Patterns:
- [`PATCH /update-avatar`](routes/users.js:67) - Reference implementation for file upload
- [`isAuth`](middlewares/isAuth.middleware.js:5) middleware - Authentication pattern
- [`upload`](config/cloudinary.config.js:65) - Multer middleware for file uploads

---

## Implementation Steps

### Step 1: Update User Model
**File:** `models/User.js`

Add `splashScreen` field to store the splash screen image URL:
```javascript
splashScreen: { type: String, default: "" }
```

**Note:** The `bio` field already exists (line 10).

---

### Step 2: Update PATCH /users/update
**File:** `routes/users.js` (lines 18-62)

**Current behavior:** Handles `username`, `currentPassword`, and `newPassword` only.

**Required change:** Add `bio` field handling to allow users to update their bio:
- Extract `bio` from `req.body`
- Validate and update user's bio field
- Include `bio` in the response

---

### Step 3: Add PATCH /users/update-splash
**File:** `routes/users.js`

Create new endpoint following the pattern of [`update-avatar`](routes/users.js:67):

**Route:** `PATCH /users/update-splash`

**Implementation pattern:**
```javascript
router.patch("/update-splash", isAuth, upload.single("splashScreen"), async (req, res) => {
  // 1. Find user by req.userId
  // 2. Validate req.file exists
  // 3. Update user.splashScreen with req.file.path
  // 4. Save and return success response
});
```

**Request format:** FormData with `splashScreen` file field

---

## API Summary

| Endpoint | Method | Request Body | Auth Required |
|----------|--------|--------------|---------------|
| `/users/update` | PATCH | `{ bio: "string" }` | Yes |
| `/users/update-splash` | PATCH | FormData with `splashScreen` file | Yes |

---

## Response Format

### PATCH /users/update
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "...",
    "username": "...",
    "email": "...",
    "role": "...",
    "avatar": "...",
    "bio": "..."
  }
}
```

### PATCH /users/update-splash
```json
{
  "message": "Splash screen updated successfully",
  "user": {
    "id": "...",
    "username": "...",
    "email": "...",
    "role": "...",
    "avatar": "...",
    "bio": "...",
    "splashScreen": "..."
  }
}
```

---

## Mermaid: Request Flow

```mermaid
flowchart TD
    A[Client] -->|PATCH /users/update<br/>{ bio: string }| B[Express Router]
    A -->|PATCH /users/update-splash<br/>FormData: splashScreen| B
    
    B -->|isAuth middleware| C{Token Valid?}
    C -->|No| D[401 Unauthorized]
    C -->|Yes| E[Find User in DB]
    
    E -->|Update bio| F[User Model]
    E -->|Upload splashScreen file| G[Cloudinary]
    
    F -->|Save| H[MongoDB]
    G -->|Get URL| H
    
    H -->|Return Response| A
```
