/**
 * Phase 5 — Agent Ticket Management Tests
 * Run against a live dev server: node test-agent.js
 */

const BASE_URL = 'http://localhost:3000';
let agentCookie = '';
let customerCookie = '';
let adminCookie = '';
let testTicketId = '';

async function api(path, options = {}, useCookie = agentCookie) {
  const headers = {
    'Content-Type': 'application/json',
    ...(useCookie ? { Cookie: useCookie } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && useCookie === agentCookie) agentCookie = setCookie.split(';')[0];
  else if (setCookie && useCookie === customerCookie) customerCookie = setCookie.split(';')[0];
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
  return setCookie ? setCookie.split(';')[0] : '';
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
  console.log(' PHASE 5 — AGENT TICKET TESTS');
  console.log('═══════════════════════════════════════\n');

  // Setup: log in as agent, customer, and admin
  agentCookie = await login('agent@example.com', 'agent123');
  assert(!!agentCookie, 'Agent login successful');

  customerCookie = await login('customer1@example.com', 'customer123');
  assert(!!customerCookie, 'Customer login successful');

  adminCookie = await login('admin@example.com', 'admin123');
  assert(!!adminCookie, 'Admin login successful');

  // --- Unauthenticated and Customer Access ---
  console.log('\n[1] Access Control');
  const unauthRes = await api('/api/agent/tickets', {}, '');
  assert(unauthRes.status === 401, 'Unauthenticated user gets 401');

  const customerRes = await api('/api/agent/tickets', {}, customerCookie);
  assert(customerRes.status === 403, 'Customer gets 403 trying to access agent API');

  // Create a fresh ticket via customer to play with
  const catRes = await api('/api/categories', {}, customerCookie);
  const categoryId = catRes.data.categories[0].id;

  const createRes = await api('/api/tickets', {
    method: 'POST',
    body: JSON.stringify({ title: 'Agent Test Ticket', description: 'Testing agent features', categoryId }),
  }, customerCookie);
  testTicketId = createRes.data.ticket.id;
  assert(!!testTicketId, 'Customer created test ticket');

  // --- Agent List Tickets ---
  console.log('\n[2] Agent List Tickets');
  const listRes = await api('/api/agent/tickets', {}, agentCookie);
  assert(listRes.status === 200, 'Agent can GET /api/agent/tickets (200)');
  assert(Array.isArray(listRes.data.tickets), 'Tickets returned in array');
  const foundTicket = listRes.data.tickets.find((t) => t.id === testTicketId);
  assert(!!foundTicket, 'Agent can see the newly created ticket');

  // --- Agent Get Ticket Details ---
  console.log('\n[3] Agent Get Ticket Details');
  const getRes = await api(`/api/agent/tickets/${testTicketId}`, {}, agentCookie);
  assert(getRes.status === 200, 'Agent can GET ticket details (200)');
  assert(getRes.data.ticket.id === testTicketId, 'Ticket details match');
  assert(!getRes.data.ticket.assignedAgentId, 'Ticket is currently unassigned');

  // --- Claim Ticket ---
  console.log('\n[4] Claim / Assign Ticket');
  const claimRes = await api(`/api/agent/tickets/${testTicketId}/assign`, { method: 'POST' }, agentCookie);
  assert(claimRes.status === 200, 'Agent can claim unassigned ticket (200)');
  assert(claimRes.data.ticket.status === 'ASSIGNED', 'Status changed to ASSIGNED');

  const claimAgainRes = await api(`/api/agent/tickets/${testTicketId}/assign`, { method: 'POST' }, adminCookie);
  assert(claimAgainRes.status === 409, 'Cannot claim an already assigned ticket (409)');

  // Verify activity
  const getAfterClaim = await api(`/api/agent/tickets/${testTicketId}`, {}, agentCookie);
  const claimActivity = getAfterClaim.data.ticket.activities.find((a) => a.action === 'TICKET_ASSIGNED');
  assert(!!claimActivity, 'TICKET_ASSIGNED activity was recorded');

  // --- Status Update ---
  console.log('\n[5] Status Update');
  const statusRes = await api(`/api/agent/tickets/${testTicketId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'IN_PROGRESS' }),
  }, agentCookie);
  assert(statusRes.status === 200, 'Agent can update status to IN_PROGRESS (200)');
  assert(statusRes.data.ticket.status === 'IN_PROGRESS', 'Status updated successfully');

  const invalidStatusRes = await api(`/api/agent/tickets/${testTicketId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'FAKE_STATUS' }),
  }, agentCookie);
  assert(invalidStatusRes.status === 400, 'Invalid status is rejected (400)');

  // --- Priority Update ---
  console.log('\n[6] Priority Update');
  const priorityRes = await api(`/api/agent/tickets/${testTicketId}/priority`, {
    method: 'PUT',
    body: JSON.stringify({ priority: 'URGENT' }),
  }, agentCookie);
  assert(priorityRes.status === 200, 'Agent can update priority to URGENT (200)');
  assert(priorityRes.data.ticket.priority === 'URGENT', 'Priority updated successfully');

  // --- Internal Notes ---
  console.log('\n[7] Internal Notes');
  const noteRes = await api(`/api/agent/tickets/${testTicketId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ message: 'This is a secret note.' }),
  }, agentCookie);
  assert(noteRes.status === 201, 'Agent can create internal note (201)');
  assert(noteRes.data.message.isInternal === true, 'Message isInternal is true');

  const customerView = await api(`/api/tickets/${testTicketId}`, {}, customerCookie);
  const foundNote = customerView.data.ticket.messages.find((m) => m.message === 'This is a secret note.');
  assert(!foundNote, 'Customer API does NOT return internal notes');

  // --- Agent Public Reply ---
  console.log('\n[8] Agent Public Reply');
  const replyRes = await api(`/api/tickets/${testTicketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message: 'Hello, we are working on this.' }),
  }, agentCookie);
  assert(replyRes.status === 201, 'Agent can post public reply via customer API endpoint (201)');
  
  const customerView2 = await api(`/api/tickets/${testTicketId}`, {}, customerCookie);
  const foundReply = customerView2.data.ticket.messages.find((m) => m.message === 'Hello, we are working on this.');
  assert(!!foundReply, 'Customer CAN see agent public reply');

  // Agent cannot reply if unassigned (simulated by creating another ticket and not claiming it)
  const createRes2 = await api('/api/tickets', {
    method: 'POST',
    body: JSON.stringify({ title: 'Ticket 2', description: 'Another issue', categoryId }),
  }, customerCookie);
  const unassignedTicketId = createRes2.data.ticket.id;

  const unauthReplyRes = await api(`/api/tickets/${unassignedTicketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message: 'Reply without claiming' }),
  }, agentCookie);
  assert(unauthReplyRes.status === 403, 'Agent cannot reply to ticket they are not assigned to (403)');

  console.log('\n[9] Agent Unassigned Protections');
  const unauthStatusRes = await api(`/api/agent/tickets/${unassignedTicketId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'IN_PROGRESS' }),
  }, agentCookie);
  assert(unauthStatusRes.status === 403, 'Agent cannot update status on another agent\'s assigned ticket (403)');

  const unauthPriorityRes = await api(`/api/agent/tickets/${unassignedTicketId}/priority`, {
    method: 'PUT',
    body: JSON.stringify({ priority: 'URGENT' }),
  }, agentCookie);
  assert(unauthPriorityRes.status === 403, 'Agent cannot update priority on another agent\'s assigned ticket (403)');

  const unauthNoteRes = await api(`/api/agent/tickets/${unassignedTicketId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ message: 'Sneaky note' }),
  }, agentCookie);
  assert(unauthNoteRes.status === 403, 'Agent cannot create an internal note on another agent\'s assigned ticket (403)');

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log(` RESULTS: ${passed} passed / ${passed + failed} total`);
  if (failed > 0) console.error(` ${failed} tests FAILED`);
  else console.log(' All tests passed! ✅');
  console.log('═══════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => { console.error(e); process.exit(1); });
