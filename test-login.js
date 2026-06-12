async function run() {
  try {
    const adminLoginRes = await fetch('http://localhost:5500/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const adminLogin = await adminLoginRes.json();
    if (!adminLoginRes.ok) throw new Error(adminLogin.message);
    const token = adminLogin.token;
    console.log('Admin login successful');

    const username = 'testuser_' + Date.now();
    const createRes = await fetch('http://localhost:5500/user/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        username: username,
        password: 'testpassword',
        role: 'cashier'
      })
    });
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(createData.message);
    console.log('Create user response:', createRes.status);

    const loginRes = await fetch('http://localhost:5500/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        password: 'testpassword'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.message);
    console.log('Test user login successful:', loginData.username);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
