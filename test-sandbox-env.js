const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Temporarily switch to sandbox environment for testing
envContent = envContent.replace(/MPESA_ENVIRONMENT=.*/, 'MPESA_ENVIRONMENT=sandbox');

fs.writeFileSync(envPath, envContent);
console.log('✅ Switched to SANDBOX environment for testing');
console.log('✅ Running OAuth test with sandbox...');

require('dotenv').config();
const https = require('https');

const testOAuthSandbox = async () => {
  const baseUrl = "https://sandbox.safaricom.co.ke";
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  
  console.log(`\n▶ Testing Sandbox OAuth`);
  console.log(`  URL: ${baseUrl}/oauth/v1/generate?grant_type=client_credentials`);
  console.log(`  Consumer Key: ${process.env.MPESA_CONSUMER_KEY.substring(0, 20)}...`);

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

    const req = https.request(options, (res) => {
      console.log(`  Response Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      
      res.on('end', () => {
        console.log(`  Response Body: ${data}`);
        
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`  ✅ SUCCESS - Access Token: ${jsonData.access_token ? jsonData.access_token.substring(0, 30) + '...' : 'N/A'}`);
            resolve({ success: true, data: jsonData });
          } catch (e) {
            resolve({ success: false, error: 'JSON Parse Error' });
          }
        } else {
          try {
            const jsonData = JSON.parse(data);
            resolve({ success: false, error: jsonData.errorMessage || data });
          } catch (e) {
            resolve({ success: false, error: data });
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

testOAuthSandbox().then(result => {
  // Switch back to production
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/MPESA_ENVIRONMENT=.*/, 'MPESA_ENVIRONMENT=production');
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Switched back to PRODUCTION environment');
  
  if (result.success) {
    console.log('\n✅ Sandbox credentials work - the issue is production app activation');
    console.log('📋 Action Required: Contact Safaricom to activate production app');
  } else {
    console.log('\n❌ Sandbox also failed - credentials may be invalid');
    console.log('📋 Action Required: Verify credentials on Safaricom portal');
  }
  process.exit(0);
}).catch(err => {
  console.error('❌ Test Failed:', err.message);
  process.exit(1);
});
