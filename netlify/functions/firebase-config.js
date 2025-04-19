// Firebase configuration endpoint for the NFC Attendance System
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

// Load environment variables
require('dotenv').config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Firebase configuration endpoint - provides non-sensitive config to client
app.get('/', (req, res) => {
  try {
    // Get Firebase configuration from environment variables
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    };
    
    // Validate that we have the required configuration
    if (!firebaseConfig.apiKey) {
      console.error('Firebase API key is missing');
      // Always return JSON, even for errors
      res.status(500).json({ error: 'Firebase configuration is incomplete' });
      return;
    }
    
    // Set proper content type header to ensure JSON parsing works correctly
    res.setHeader('Content-Type', 'application/json');
    res.json(firebaseConfig);
  } catch (error) {
    console.error('Error serving Firebase config:', error);
    // Always return JSON, even for errors
    res.status(500).json({ error: 'Failed to generate Firebase configuration' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Firebase config error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export the serverless function
module.exports.handler = serverless(app);