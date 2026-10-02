const http = require('http');

const BASE_URL = 'http://localhost:3000';
let cookie = '';

async function fetchAPI(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(cookie ? { 'Cookie': cookie } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  
  // Extract set-cookie
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    // very basic cookie parsing
    cookie = setCookie.split(';')[0];
  }

  const text = await response.text();
  try {
    return { status: response.status, data: JSON.parse(text) };
  } catch {
    return { status: response.status, data: text };
  }
}

async function runTests() {
  console.log('--- RUNNING AUTH TESTS ---');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
    }
  }

  try {
    // 1. Registration
    const newUser = { name: 'Test User', email: `test${Date.now()}@example.com`, password: 'password123' };
    const regRes = await fetchAPI('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(newUser)
    });
    assert(regRes.status === 201, `Registration successful. Response: ${JSON.stringify(regRes)}`);
    assert(regRes.data.user && regRes.data.user.role === 'CUSTOMER', 'Registered user gets CUSTOMER role');
    assert(regRes.data.user.passwordHash === undefined, 'Password is never returned by API (Registration)');

    // 4. Duplicate registration
    const dupRes = await fetchAPI('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(newUser)
    });
    assert(dupRes.status === 409, 'Duplicate registration returns 409 Conflict');

    // 5. Logout
    const logoutRes = await fetchAPI('/api/auth/logout', { method: 'POST' });
    assert(logoutRes.status === 200, 'Logout successful');

    // 3. Login failure
    const badLoginRes = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: newUser.email, password: 'wrongpassword' })
    });
    assert(badLoginRes.status === 401, 'Login failure returns 401 Unauthorized');

    // 2. Login success
    const loginRes = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: newUser.email, password: 'password123' })
    });
    assert(loginRes.status === 200, 'Login success returns 200 OK');
    assert(loginRes.data.user.passwordHash === undefined, 'Password is never returned by API (Login)');
    
    // Test Protected Routes (Next.js Middleware will redirect or return HTML)
    // 6. Unauthenticated access
    cookie = ''; // Clear cookie
    const noAuthRes = await fetchAPI('/customer/dashboard', { redirect: 'manual' });
    // Since Next.js middleware returns a 307 or 308 redirect when `redirect()` is used
    assert([302, 307, 308].includes(noAuthRes.status), 'Unauthenticated access is redirected (30x)');

    // 7. CUSTOMER authorization
    // Log in as customer again
    await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: newUser.email, password: 'password123' })
    });
    const custDashRes = await fetchAPI('/customer/dashboard', { redirect: 'manual' });
    assert(custDashRes.status === 200, 'CUSTOMER can access customer dashboard');
    
    const custAdminDashRes = await fetchAPI('/admin/dashboard', { redirect: 'manual' });
    assert([302, 307, 308].includes(custAdminDashRes.status), 'CUSTOMER cannot access admin dashboard');

    // 8. AGENT authorization
    cookie = '';
    await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'agent@example.com', password: 'agent123' }) // Assuming seeded password
    });
    const agentDashRes = await fetchAPI('/agent/dashboard', { redirect: 'manual' });
    assert(agentDashRes.status === 200, 'AGENT can access agent dashboard');

    const agentAdminDashRes = await fetchAPI('/admin/dashboard', { redirect: 'manual' });
    assert([302, 307, 308].includes(agentAdminDashRes.status), 'AGENT cannot access admin dashboard');

    // 9. ADMIN authorization
    cookie = '';
    await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }) // Assuming seeded password
    });
    const adminDashRes = await fetchAPI('/admin/dashboard', { redirect: 'manual' });
    assert(adminDashRes.status === 200, 'ADMIN can access admin dashboard');

    const adminCustDashRes = await fetchAPI('/customer/dashboard', { redirect: 'manual' });
    assert([302, 307, 308].includes(adminCustDashRes.status), 'ADMIN cannot access customer dashboard directly via middleware');

    console.log(`--- TESTS COMPLETED: ${passed}/${total} PASSED ---`);
    process.exit(passed === total ? 0 : 1);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

runTests();
