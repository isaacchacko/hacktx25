# Firebase Authentication Setup

This project now uses Firebase Authentication to provide persistent user sessions across page refreshes and navigation.

## Setup Instructions

### 1. Firebase Project Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password and Google sign-in

### 2. Frontend Environment Variables

Create a `.env.local` file in the `frontend` directory with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Get these values from Firebase Console > Project Settings > General > Your apps

### 3. Backend Environment Variables

Create a `.env` file in the `backend` directory with:

```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
```

Get these values from Firebase Console > Project Settings > Service Accounts > Generate new private key

### 4. How It Works

- **Frontend**: Uses Firebase Auth with local persistence
- **Backend**: Verifies Firebase ID tokens using Firebase Admin SDK
- **Socket Server**: Authenticates users with Firebase tokens instead of random cookies
- **Persistence**: User sessions persist across page refreshes and navigation

### 5. Features

✅ **Persistent Authentication**: Users stay logged in across page refreshes  
✅ **Firebase Integration**: Uses Firebase Auth for user management  
✅ **Socket Authentication**: Socket server authenticates with Firebase tokens  
✅ **Multiple Sign-in Methods**: Email/password and Google sign-in  
✅ **Session Management**: User sessions tracked on the backend  

### 6. Testing

1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm run dev`
3. Visit `http://localhost:3000`
4. Sign in with Firebase Auth
5. Navigate between pages - authentication persists!
6. Refresh the page - still authenticated!

The socket server will now recognize the same user across different sessions and page refreshes.
