import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';

const VALID_ROLES = ['CUSTOMER', 'AGENT', 'ADMIN'];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { name, email, password, role } = body;
  const data: any = {};

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim())
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    data.name = name.trim();
  }

  if (email !== undefined) {
    if (!email || typeof email !== 'string' || !email.trim())
      return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 });
    const emailLow = email.trim().toLowerCase();
    const conflict = await prisma.user.findUnique({ where: { email: emailLow } });
    if (conflict && conflict.id !== id)
      return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
    data.email = emailLow;
  }

  if (password !== undefined && password !== '') {
    if (password.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    data.passwordHash = await hashPassword(password);
  }

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role))
      return NextResponse.json({ error: 'Invalid role. Must be CUSTOMER, AGENT, or ADMIN' }, { status: 400 });
    // Prevent removing the last admin
    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1)
        return NextResponse.json({ error: 'Cannot demote the last remaining ADMIN account' }, { status: 400 });
    }
    data.role = role;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Cannot delete yourself
  if (id === user.id)
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { tickets: true, assignedTickets: true, messages: true, activities: true } },
    },
  });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Protect last admin
  if (target.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1)
      return NextResponse.json({ error: 'Cannot delete the last remaining ADMIN account' }, { status: 400 });
  }

  // Protect historical data — refuse if any related records exist
  const { tickets, assignedTickets, messages, activities } = target._count;
  if (tickets > 0 || assignedTickets > 0 || messages > 0 || activities > 0) {
    return NextResponse.json({
      error: `Cannot delete user who has related records (${tickets} tickets created, ${assignedTickets} tickets assigned, ${messages} messages, ${activities} activities). Change their role instead.`,
    }, { status: 409 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
