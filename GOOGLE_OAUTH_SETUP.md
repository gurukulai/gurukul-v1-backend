# Google OAuth 2.0 Setup Guide

## Environment Variables Required

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
JWT_SECRET=your_jwt_secret_key
```

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google OAuth2 API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (for development)
   - `https://yourdomain.com/auth/google/callback` (for production)

## Frontend Implementation

### Option 1: Authorization Code Flow (Recommended)

```javascript
// 1. Redirect user to Google OAuth URL
const googleAuthUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${GOOGLE_CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=openid email profile&` +
  `access_type=offline&` +
  `prompt=consent`;

window.location.href = googleAuthUrl;

// 2. Handle the callback (in your callback route)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
  // Send authorization code to your backend
  const response = await fetch('/api/auth/google/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const authData = await response.json();
  // Store JWT token and user data
  localStorage.setItem('token', authData.token);
  localStorage.setItem('user', JSON.stringify(authData.user));
}
```

### Option 2: Access Token Flow

```javascript
// If you already have an access token from Google
const response = await fetch('/api/auth/google/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ access_token: googleAccessToken }),
});

const authData = await response.json();
// Store JWT token and user data
localStorage.setItem('token', authData.token);
localStorage.setItem('user', JSON.stringify(authData.user));
```

## Backend Endpoints

### POST /auth/google/code

Exchange authorization code for tokens and authenticate user.

**Request Body:**

```json
{
  "code": "authorization_code_from_google"
}
```

**Response:**

```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "picture": "https://...",
    "googleId": "google_user_id"
  },
  "token": "jwt_token"
}
```

### POST /auth/google/token

Authenticate user with Google access token.

**Request Body:**

```json
{
  "access_token": "google_access_token"
}
```

**Response:** Same as above.

## Security Features

1. **Token Verification**: Backend verifies Google ID tokens cryptographically
2. **User Creation**: Automatically creates or updates user records
3. **JWT Generation**: Issues secure JWT tokens for session management
4. **Error Handling**: Proper error responses for invalid tokens/codes

## Database Schema

The User model includes these Google-specific fields:

- `googleId`: Unique Google user ID
- `email`: User's email address
- `picture`: Profile picture URL
- `authProvider`: Set to 'google' for Google users
