// Simple script to test if the Gemini API key is working
const https = require('https');
const fs = require('fs');

// Get the API key from environment, directly, or from .env file
let apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  try {
    require('dotenv').config();
    apiKey = process.env.GEMINI_API_KEY;
  } catch (error) {
    console.error('Error loading .env file:', error);
  }
}

if (!apiKey) {
  console.error('❌ No API key found! Please set GEMINI_API_KEY in .env file');
  process.exit(1);
}

// Log the ASCII values of each character to check for hidden/special characters
console.log('API Key Character Analysis:');
for (let i = 0; i < apiKey.length; i++) {
  const char = apiKey[i];
  const code = char.charCodeAt(0);
  if (code < 32 || code > 127) {
    console.warn(`⚠️ Non-standard character at position ${i}: ASCII ${code}`);
  }
}

console.log('Testing Gemini API key:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));

// Create request payload
const data = JSON.stringify({
  contents: [
    {
      role: 'user',
      parts: [{ text: 'Hello, this is a quick test. Please respond with a short greeting.' }]
    }
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 256,
  }
});

// Setup request options
const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1/models/gemini-pro:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('Sending request to:', options.hostname + options.path);

// Make the request
const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      // Try to parse JSON response
      const parsedData = JSON.parse(responseData);
      console.log('Response parsed successfully');
      
      if (parsedData.candidates && parsedData.candidates.length > 0) {
        const message = parsedData.candidates[0].content.parts[0].text;
        console.log('API TEST SUCCESS. Response:', message);
      } else if (parsedData.error) {
        console.error('API ERROR:', parsedData.error.message || parsedData.error);
      } else {
        console.log('Full response:', JSON.stringify(parsedData, null, 2));
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error);
});

// Send the request
req.write(data);
req.end();