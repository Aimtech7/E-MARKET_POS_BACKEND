require('dotenv').config();
const https = require('https');

const testOAuthDirect = async () => {
  console.log("=========================================================================");
  console.log("🔍 M-PESA OAUTH DIRECT DIAGNOSTIC TEST");
  console.log("=========================================================================");
  console.log("Environment   : " + process.env.MPESA_ENVIRONMENT);
  console.log("Consumer Key   : " + process.env.MPESA_CONSUMER_KEY);
  console.log("Consumer Secret: " + process.env.MPESA_CONSUMER_SECRET);
  console.log("Passkey        : " + process.env.MPESA_PASSKEY);
  console.log("Shortcode      : " + process.env.MPESA_SHORTCODE);
  console.log("=========================================================================\n");

  const baseUrl = process.env.MPESA_ENVIRONMENT === "production" 
    ? "https://api.safaricom.co.ke" 
    : "https://sandbox.safaricom.co.ke";

  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  
  console.log("▶ OAuth Request Details:");
  console.log(`  URL: ${baseUrl}/oauth/v1/generate?grant_type=client_credentials`);
  console.log(`  Authorization: Basic ${auth.substring(0, 20)}...`);
  console.log(`  Full Auth Length: ${auth.length} characters\n`);

  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    console.log("▶ Making HTTP Request...");
    const req = https.request(options, (res) => {
      console.log(`  ✓ Response Status: ${res.statusCode}`);
      console.log(`  ✓ Response Headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`  ✓ Response Body: ${data}`);
        
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`  ✓ Access Token: ${jsonData.access_token ? jsonData.access_token.substring(0, 50) + '...' : 'N/A'}`);
            console.log(`  ✓ Expires In: ${jsonData.expires_in} seconds`);
            resolve({ success: true, data: jsonData });
          } catch (e) {
            console.error(`  ✗ JSON Parse Error: ${e.message}`);
            resolve({ success: false, error: 'JSON Parse Error' });
          }
        } else {
          console.error(`  ✗ HTTP Error: ${res.statusCode}`);
          try {
            const jsonData = JSON.parse(data);
            console.error(`  ✗ Error Message: ${jsonData.errorMessage || 'No error message'}`);
            resolve({ success: false, error: jsonData.errorMessage || data });
          } catch (e) {
            resolve({ success: false, error: data });
          }
        }
      });
    });

    req.on('error', (error) => {
      console.error(`  ✗ Request Error: ${error.message}`);
      reject(error);
    });

    req.end();
  });
};

testOAuthDirect().then(result => {
  console.log("\n=========================================================================");
  console.log("📊 DIAGNOSTIC RESULT");
  console.log("=========================================================================");
  if (result.success) {
    console.log("✅ OAuth Token Generation: SUCCESS");
    console.log("✅ The credentials are valid");
  } else {
    console.log("❌ OAuth Token Generation: FAILED");
    console.log(`❌ Error: ${result.error}`);
    console.log("\n🔧 Possible Issues:");
    console.log("  1. Consumer Key/Secret are incorrect");
    console.log("  2. App is not properly configured on Safaricom portal");
    console.log("  3. Environment mismatch (sandbox vs production)");
    console.log("  4. App is not approved/active on Safaricom side");
    console.log("  5. IP whitelist restrictions on Safaricom portal");
  }
  console.log("=========================================================================\n");
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error("\n❌ Test Failed:", err.message);
  process.exit(1);
});
