// Test script for debugging the Gemini API connection
const https = require('https');

// Hard-coded API key for testing (displayed with a ✓ or ✗ symbol to indicate validity)
const apiKey = process.env.GEMINI_API_KEY; 

console.log('\n=== Gemini API Test ===');
console.log(`API Key: ${apiKey.substr(0, 6)}...${apiKey.substr(-4)}`);

// Basic validation
if (apiKey.length < 30) {
  console.log('❌ API key seems too short (expected ~39 chars)');
} else {
  console.log('✅ API key length looks good');
}

// Create a minimal test request
const data = JSON.stringify({
  contents: [{
    parts: [{
      text: "Hello, I'm testing if you're working. Please respond with a short greeting."
    }]
  }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1/models/gemini-pro:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('\nSending test request to Gemini API...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
  
  let responseBody = '';
  
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(responseBody);
        if (response.candidates && response.candidates.length > 0) {
          console.log('\n✅ API TEST SUCCESSFUL!');
          console.log('Response:', response.candidates[0].content.parts[0].text.substring(0, 100) + '...\n');
        } else {
          console.log('\n⚠️ API returned 200 but had no candidates\n');
          console.log(JSON.stringify(response, null, 2));
        }
      } catch (e) {
        console.log('\n❌ Error parsing response:', e.message);
        console.log('Raw response:', responseBody);
      }
    } else {
      console.log('\n❌ API TEST FAILED');
      try {
        const errorResponse = JSON.parse(responseBody);
        console.log('Error details:', JSON.stringify(errorResponse.error || errorResponse, null, 2));
      } catch (e) {
        console.log('Raw error response:', responseBody);
      }
    }
  });
});

req.on('error', (e) => {
  console.log(`\n❌ REQUEST FAILED: ${e.message}`);
});

// Send the request
req.write(data);
req.end();

console.log('Test request sent, waiting for response...');
