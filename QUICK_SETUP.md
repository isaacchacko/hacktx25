# Quick Firebase Setup Guide

## Current Status ✅
- **Firebase Error Fixed**: The app now runs without Firebase configuration
- **Demo Mode**: App works with demo Firebase config
- **PDF Viewer Available**: You can use the PDF viewer at `/pdf-demo`

## To Enable Real Firebase Authentication:

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Follow the setup wizard

### 2. Enable Authentication
1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. Enable **Google** sign-in (optional)

### 3. Get Configuration Values
1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click **Web app** icon (`</>`)
4. Register your app with a name like "PDF Presentation App"
5. Copy the configuration values

### 4. Update Environment Variables
Edit `/root/hacktx25/frontend/.env.local` and replace the demo values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_actual_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_actual_app_id
```

### 5. Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd /root/hacktx25/frontend
npm run dev
```

## What You'll Get:
- ✅ **Persistent Authentication**: Users stay logged in across page refreshes
- ✅ **Socket Integration**: Socket server recognizes authenticated users
- ✅ **Multiple Sign-in Methods**: Email/password and Google
- ✅ **User Sessions**: Same user recognized across different sessions

## Current Features (Without Firebase):
- ✅ **PDF Viewer**: Full functionality at `http://localhost:3000/pdf-demo`
- ✅ **Fit Modes**: Width, height, page, auto fit
- ✅ **Navigation**: Arrow keys, page input, keyboard shortcuts
- ✅ **Responsive Design**: Works on all screen sizes

## Test the App:
1. **Without Firebase**: Visit `http://localhost:3000/pdf-demo`
2. **With Firebase**: Visit `http://localhost:3000` (after setup)
