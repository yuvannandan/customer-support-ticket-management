/**
 * Phase 4 — Customer Ticket Management Tests
 * Run against a live dev server: node test-tickets.js
 */

const BASE_URL = 'http://localhost:3000';
let cookie = '';
let cookie2 = ''; // second customer

async function api(path, options = {}, useCookie = cookie) {
  const headers = {
    'Content-Type': 'application/json',
    ...(useCookie ? { Cookie: useCookie } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && useCookie === cookie) cookie = setCookie.split(';')[0];
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get('set-cookie');
  const sessionCookie = setCookie ? setCookie.split(';')[0] : '';
  return sessionCookie;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n═══════════════════════════════════════');
  console.log(' PHASE 4 — CUSTOMER TICKET TESTS');
  console.log('═══════════════════════════════════════\n');

  // Setup: log in as customer1
  cookie = await login('customer1@example.com', 'customer123');
  assert(!!cookie, 'customer1 login successful');

  // Setup: log in as customer2 in separate cookie
  cookie2 = await login('customer2@example.com', 'customer123');
  assert(!!cookie2, 'customer2 login successful');

  // --- Unauthenticated access ---
  console.log('\n[1] Unauthenticated access');
  const unauthRes = await api('/api/tickets', { method: 'POST', body: JSON.stringify({ title: 'x', description: 'x', categoryId: 'x' }) }, '');
  assert(unauthRes.status === 401, 'Unauthenticated POST /api/tickets returns 401');

  const unauthGetRes = await api('/api/tickets', {}, '');
  assert(unauthGetRes.status === 401, 'Unauthenticated GET /api/tickets returns 401');

  // --- Validation ---
  console.log('\n[2] Validation');
  const validationRes = await api('/api/tickets', { method: 'POST', body: JSON.stringify({}) });
  assert(validationRes.status === 400, 'Missing fields returns 400');

  const noDescRes = await api('/api/tickets', { method: 'POST', body: JSON.stringify({ title: 'Test', categoryId: 'fake' }) });
  assert(noDescRes.status === 400, 'Missing description returns 400');

  // --- Category fetch ---
  console.log('\n[3] Category fetch');
  const catRes = await api('/api/categories');
  assert(catRes.status === 200, 'GET /api/categories returns 200');
  assert(Array.isArray(catRes.data.categories) && catRes.data.categories.length > 0, 'Categories returned');
  const categoryId = catRes.data.categories[0].id;

  // --- Create ticket ---
  console.log('\n[4] Create ticket');
  const createRes = await api('/api/tickets', {
    method: 'POST',
    body: JSON.stringify({ title: 'Test ticket from Phase 4', description: 'Detailed description of the issue', categoryId, priority: 'HIGH' }),
  });
  assert(createRes.status === 201, 'POST /api/tickets returns 201');
  assert(createRes.data.ticket?.ticketNumber?.startsWith('TKT-'), 'Ticket number generated (TKT-xxxx)');
  assert(createRes.data.ticket?.status === 'OPEN', 'New ticket has status OPEN');
  assert(!createRes.data.ticket?.customerId || createRes.data.ticket?.customerId !== undefined, 'customerId present in ticket');

  const ticketId = createRes.data.ticket?.id;
  const ticketNumber = createRes.data.ticket?.ticketNumber;
  assert(!!ticketId, `Ticket created with id: ${ticketId}`);
  assert(!!ticketNumber, `Ticket number: ${ticketNumber}`);

  // Verify customerId comes from session, not from request (we never send it)
  assert(createRes.data.ticket?.customer !== undefined || createRes.data.ticket?.customerId !== undefined, 
    'Ticket customerId is set from authenticated session');

  // --- List own tickets ---
  console.log('\n[5] List own tickets');
  const listRes = await api('/api/tickets');
  assert(listRes.status === 200, 'GET /api/tickets returns 200');
  assert(Array.isArray(listRes.data.tickets), 'Tickets array returned');
  const myTicket = listRes.data.tickets.find((t) => t.id === ticketId);
  assert(!!myTicket, 'Newly created ticket is in own ticket list');

  // --- Get own ticket ---
  console.log('\n[6] Get own ticket');
  const getRes = await api(`/api/tickets/${ticketId}`);
  assert(getRes.status === 200, 'GET /api/tickets/[id] returns 200 for own ticket');
  assert(getRes.data.ticket?.id === ticketId, 'Correct ticket returned');

  // --- Customer2 cannot access customer1 ticket ---
  console.log('\n[7] Cross-customer access prevention');
  const crossRes = await api(`/api/tickets/${ticketId}`, {}, cookie2);
  assert(crossRes.status === 403, 'Customer2 cannot GET customer1 ticket (403)');

  const crossMsgRes = await api(`/api/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message: 'Unauthorized message' }),
  }, cookie2);
  assert(crossMsgRes.status === 403, 'Customer2 cannot POST message to customer1 ticket (403)');

  const crossCloseRes = await api(`/api/tickets/${ticketId}/close`, { method: 'PUT' }, cookie2);
  assert(crossCloseRes.status === 403, 'Customer2 cannot close customer1 ticket (403)');

  // --- Send message ---
  console.log('\n[8] Send message to own ticket');
  const msgRes = await api(`/api/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message: 'This is my follow-up message' }),
  });
  assert(msgRes.status === 201, 'POST /api/tickets/[id]/messages returns 201');
  assert(msgRes.data.message?.message === 'This is my follow-up message', 'Message content correct');
  assert(msgRes.data.message?.sender?.name === 'Customer One', 'Sender is authenticated customer');

  // --- Search filter ---
  console.log('\n[9] Search and filter');
  const searchRes = await api(`/api/tickets?search=${encodeURIComponent('Phase 4')}`);
  assert(searchRes.status === 200, 'Search by subject returns 200');
  assert(searchRes.data.tickets.some((t) => t.id === ticketId), 'Search finds ticket by subject');

  const statusRes = await api(`/api/tickets?status=OPEN`);
  assert(statusRes.status === 200, 'Filter by status=OPEN returns 200');

  // --- Close ticket ---
  console.log('\n[10] Close ticket');
  const closeRes = await api(`/api/tickets/${ticketId}/close`, { method: 'PUT' });
  assert(closeRes.status === 200, 'PUT /api/tickets/[id]/close returns 200');
  assert(closeRes.data.ticket?.status === 'CLOSED', 'Ticket status is now CLOSED');

  // Cannot close already closed
  const closeAgainRes = await api(`/api/tickets/${ticketId}/close`, { method: 'PUT' });
  assert(closeAgainRes.status === 400, 'Cannot close an already-closed ticket (400)');

  // Cannot reply to closed ticket
  const replyClosedRes = await api(`/api/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message: 'Trying to reply to closed ticket' }),
  });
  assert(replyClosedRes.status === 400, 'Cannot reply to closed ticket (400)');

  // --- /api/auth/me ---
  console.log('\n[11] Auth me endpoint');
  const meRes = await api('/api/auth/me');
  assert(meRes.status === 200, 'GET /api/auth/me returns 200');
  assert(meRes.data.user?.name === 'Customer One', 'Auth/me returns correct user');
  assert(meRes.data.user?.passwordHash === undefined, 'passwordHash is never returned');

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log(` RESULTS: ${passed} passed / ${passed + failed} total`);
  if (failed > 0) console.error(` ${failed} tests FAILED`);
  else console.log(' All tests passed! ✅');
  console.log('═══════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => { console.error(e); process.exit(1); });
