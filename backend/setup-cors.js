const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

// Initialize Firebase Storage
const storage = new Storage({
  projectId: process.env.FIREBASE_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './firebase-service-account.json'
});

async function setupCORS() {
  try {
    const bucketName = 'hacktx25-6176d.firebasestorage.app';
    const bucket = storage.bucket(bucketName);
    
    // Read CORS configuration
    const corsConfig = JSON.parse(fs.readFileSync('./cors.json', 'utf8'));
    
    console.log('Setting up CORS for bucket:', bucketName);
    console.log('CORS configuration:', JSON.stringify(corsConfig, null, 2));
    
    // Set CORS configuration
    await bucket.setCorsConfiguration(corsConfig);
    
    console.log('✅ CORS configuration applied successfully!');
    console.log('The bucket now allows cross-origin requests from any origin.');
    
  } catch (error) {
    console.error('❌ Error setting up CORS:', error);
    
    if (error.code === 403) {
      console.log('\n🔧 To fix this, you need to:');
      console.log('1. Go to Google Cloud Console');
      console.log('2. Navigate to Cloud Storage > Browser');
      console.log('3. Select your bucket: hacktx25-6176d.firebasestorage.app');
      console.log('4. Go to the "Permissions" tab');
      console.log('5. Add a new member with role "Storage Admin"');
      console.log('6. Or use gsutil command: gsutil cors set cors.json gs://hacktx25-6176d.firebasestorage.app');
    }
  }
}

setupCORS();
