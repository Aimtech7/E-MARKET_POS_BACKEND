require('dotenv').config();
const https = require('https');

const testCredentialVariation = async (consumerKey, consumerSecret, envName) => {
  const baseUrl = envName === "production" 
    ? "https://api.safaricom.co.ke" 
    : "https://sandbox.safaricom.co.ke";

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  
  return new Promise((resolve) => {
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

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data, env: envName });
      });
    });

    req.on('error', (error) => {
      resolve({ statusCode: 0, error: error.message, env: envName });
    });

    req.end();
  });
};

const runTests = async () => {
  console.log("=========================================================================");
  console.log("🔍 M-PESA CREDENTIAL VARIATION TEST");
  console.log("=========================================================================\n");

  const originalKey = process.env.MPESA_CONSUMER_KEY;
  const originalSecret = process.env.MPESA_CONSUMER_SECRET;

  const variations = [
    { name: "Original Credentials", key: originalKey, secret: originalSecret },
    { name: "Trimmed Credentials", key: originalKey.trim(), secret: originalSecret.trim() },
    { name: "URL Encoded", key: encodeURIComponent(originalKey), secret: encodeURIComponent(originalSecret) },
  ];

  for (const env of ["sandbox", "production"]) {
    console.log(`▶ Testing ${env.toUpperCase()} Environment:`);
    
    for (const variation of variations) {
      console.log(`  Testing: ${variation.name}`);
      const result = await testCredentialVariation(variation.key, variation.secret, env);
      
      if (result.statusCode === 200) {
        console.log(`    ✅ SUCCESS - Status: ${result.statusCode}`);
        console.log(`    ✅ Body: ${result.body.substring(0, 100)}...`);
        console.log(`\n🎉 FOUND WORKING CREDENTIALS: ${variation.name} in ${env} environment`);
        process.exit(0);
      } else {
        console.log(`    ❌ FAILED - Status: ${result.statusCode}`);
      }
    }
    console.log();
  }

  console.log("=========================================================================");
  console.log("❌ All credential variations failed");
  console.log("=========================================================================");
  console.log("📋 Possible Issues:");
  console.log("  1. Credentials are completely invalid/expired");
  console.log("  2. App is not properly configured on Safaricom portal");
  console.log("  3. App requires additional approval/activation");
  console.log("  4. IP whitelist restrictions");
  console.log("  5. The credentials shown in the image may be incomplete/corrupted");
  console.log("\n📋 Recommended Actions:");
  console.log("  1. Regenerate credentials on Safaricom portal");
  console.log("  2. Ensure app is fully approved for production use");
  console.log("  3. Check if there are any IP whitelist settings");
  console.log("  4. Verify the app status on Safaricom portal");
  console.log("=========================================================================\n");
  process.exit(1);
};

runTests();
