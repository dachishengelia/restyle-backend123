# Plan for Adding GET /api/cv/user Endpoint

## Overview
Add a new GET endpoint at `/api/cv/user` that returns all CVs belonging to the authenticated user. The endpoint will be authenticated and return an array of CV objects.

## Current System Analysis
- **CV Model**: Each CV has a `userId` field referencing the User model.
- **Existing Controllers**:
  - `getMyCV`: Retrieves a single CV for the user (assumes one CV per user).
  - `getUserCVs`: Already exists, retrieves all CVs for the user (returns array).
  - Other functions for adding, updating, publishing CVs.
- **Existing Routes**:
  - GET `/api/cv/my-cv`: Returns the user's CV (singular).
  - Mounted at `/api/cv` in server.js.
- **Authentication**: Uses `isAuth` middleware, which sets `req.userId`.

## Proposed Changes

### 1. Controller Function
The `getUserCVs` function already exists in `controllers/cvController.js` and does exactly what's needed:
- Query: `CV.find({ userId: req.userId })`
- Return: Array of CVs, even if empty.
- Response format: `{ message: "User CVs retrieved successfully", cvs: [...] }`

### 2. Add New Route
In `routes/CV.js`:
- Add `router.get("/user", isAuth, getUserCVs);`
- Ensure it's placed logically in the file.

### 3. Considerations
- The current system prevents multiple CVs per user in `addCV`, but `checkoutCV` allows updating.
- This endpoint will return all CVs for the user, supporting potential future multiple CVs.
- If no CVs exist, return an empty array.

## Implementation Steps
1. Verify `getUserCVs` function in `controllers/cvController.js` (already exists).
2. Modify `routes/CV.js` to add the GET `/user` route using `getUserCVs` and `isAuth`.
3. Test the endpoint to ensure it works correctly.

## Potential Future Enhancements
- Allow users to have multiple CVs by removing restrictions in `addCV`.
- Add pagination if many CVs are expected.

## Questions for User
- Should users be allowed to have multiple CVs? (Currently restricted in addCV)
- Any specific response format or additional data to include?