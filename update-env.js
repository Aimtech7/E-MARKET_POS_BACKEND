const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Update M-Pesa credentials with correct values from Safaricom Daraja portal
envContent = envContent.replace(/MPESA_CONSUMER_KEY=.*/, 'MPESA_CONSUMER_KEY=tRAV3N4updxiOR8SZ1ArudoGllePOXvA21WBnOMAnleUpriy');
envContent = envContent.replace(/MPESA_CONSUMER_SECRET=.*/, 'MPESA_CONSUMER_SECRET=1xzniyl9gxoUL4X0WzbAPIAR8mYyAtW0EpG7izAj1zEmPHAfBx1lAGnxzHFzD43x');
envContent = envContent.replace(/MPESA_PASSKEY=.*/, 'MPESA_PASSKEY=67747a243c5f928a9dc72348a8a9fca5913533836850de56210a80f9a/U1/c/44');
envContent = envContent.replace(/MPESA_SHORTCODE=.*/, 'MPESA_SHORTCODE=4647219');

fs.writeFileSync(envPath, envContent);
console.log('✅ .env file updated with correct M-Pesa credentials');
console.log('✅ Consumer Key: tRAV3N4updxiOR8SZ1ArudoGllePOXvA21WBnOMAnleUpriy');
console.log('✅ Consumer Secret: 1xzniyl9gxoUL4X0WzbAPIAR8mYyAtW0EpG7izAj1zEmPHAfBx1lAGnxzHFzD43x');
console.log('✅ Passkey: 67747a243c5f928a9dc72348a8a9fca5913533836850de56210a80f9a/U1/c/44');
console.log('✅ Shortcode: 4647219');
