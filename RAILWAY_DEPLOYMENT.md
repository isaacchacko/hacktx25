# Railway Deployment Guide

This guide covers deploying the unified Next.js + Express + Socket.IO application to Railway.

## Architecture

The application uses a single service architecture:
- **Frontend**: Next.js 15 with React 19
- **Backend**: Express + Socket.IO server (unified in `frontend/server.js`)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **AI Services**: Gemini (server-side) + AssemblyAI (client-side streaming)

## Railway Configuration

### Service Settings
- **Service Root**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Branch**: `deploy` (or `main`)

### Environment Variables

#### Client-side (NEXT_PUBLIC_*)
These are exposed to the browser and safe for web apps:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAEqgcG_B6L8FEMw2z4lhfFp5As5GH9VXc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=hacktx25-6176d.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=hacktx25-6176d
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=hacktx25-6176d.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=525828775817
NEXT_PUBLIC_FIREBASE_APP_ID=1:525828775817:web:5c0624a9ee97b20f4dcb58
NEXT_PUBLIC_ASSEMBLY_API_KEY=your_assemblyai_key_here
```

#### Server-side only
These are kept private and never exposed to the browser:

```
GEMINI_API_KEY=your_gemini_key_here
FIREBASE_PROJECT_ID=hacktx25-6176d
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key_with_\n_newlines
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FRONTEND_URL=https://your-app.up.railway.app
```

## Deployment Steps

1. **Push to GitHub**:
   ```bash
   git push origin deploy
   ```

2. **Connect Railway to GitHub**:
   - Go to Railway dashboard
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `isaacchacko/hacktx25`
   - Choose `deploy` branch

3. **Configure Service**:
   - Set service root to `frontend`
   - Add all environment variables listed above
   - Deploy

4. **Post-Deploy Setup**:
   - Copy the Railway URL (e.g., `https://your-app.up.railway.app`)
   - Update `FRONTEND_URL` environment variable with this URL
   - Redeploy

## API Keys Setup

### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add as `GEMINI_API_KEY` (server-side only)

### AssemblyAI API Key
1. Go to [AssemblyAI Dashboard](https://www.assemblyai.com/dashboard)
2. Copy your API key
3. Add as `NEXT_PUBLIC_ASSEMBLY_API_KEY` (client-side for WebSocket streaming)

### Firebase Admin SDK (Optional)
If you need Firebase Admin functionality:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Extract values from JSON and set environment variables

## Security Features

- **Gemini API**: Server-side only, never exposed to browser
- **AssemblyAI API**: Client-side for real-time streaming (required by their architecture)
- **Firebase Config**: Client-side (standard for web apps)
- **CORS**: Restricted to Railway domain after deployment
- **No API Key Logging**: All sensitive logging removed

## Testing Checklist

After deployment, verify:
- [ ] App loads at Railway URL
- [ ] Socket.IO connections work (green "Connected" status)
- [ ] PDF upload/viewing works via proxy
- [ ] AI insights generation works (Gemini API)
- [ ] Real-time transcription works (AssemblyAI)
- [ ] Room creation/joining works
- [ ] Questions/voting system works

## Troubleshooting

### Build Errors
- Check Node.js version (requires >=18.18)
- Verify all dependencies are in `package.json`
- Check for TypeScript/ESLint errors (currently disabled for deployment)

### Runtime Errors
- Verify all environment variables are set
- Check Railway logs for specific error messages
- Ensure Firebase project is properly configured

### CORS Issues
- Verify `FRONTEND_URL` is set correctly
- Check that CORS origins match your Railway domain
- Test with browser dev tools network tab

## File Structure

```
frontend/
├── server.js                 # Unified Express + Socket.IO server
├── package.json              # Dependencies and scripts
├── next.config.ts           # Next.js configuration
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── gemini/       # Server-side Gemini API
    │   │   └── assemblyai/   # Server-side AssemblyAI API
    │   └── lib/
    │       └── firebase.js   # Firebase client config
    └── utils/
        └── geminiApi.ts      # Client-side Gemini calls (now server-side)
```

## Environment Variable Reference

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_FIREBASE_*` | Client | Firebase web app configuration |
| `NEXT_PUBLIC_ASSEMBLY_API_KEY` | Client | AssemblyAI API key for streaming |
| `GEMINI_API_KEY` | Server | Gemini API key (server-side only) |
| `FIREBASE_PROJECT_ID` | Server | Firebase project ID for Admin SDK |
| `FIREBASE_PRIVATE_KEY_*` | Server | Firebase Admin SDK credentials |
| `FRONTEND_URL` | Server | Railway app URL for CORS |
| `PORT` | Server | Port (set automatically by Railway) |

## Support

For issues with deployment:
1. Check Railway logs in the dashboard
2. Verify all environment variables are set
3. Test locally with `npm run dev`
4. Check Firebase console for authentication issues
