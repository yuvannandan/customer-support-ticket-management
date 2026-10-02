import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';

const VALID_ROLES = ['CUSTOMER', 'AGENT', 'ADMIN'];

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const role   = searchParams.get('role')   || undefined;
  const search = searchParams.get('search') || undefined;

  const where: any = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name:  { contains: search } },
      { email: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, email, password, role } = body;

  if (!name || typeof name !== 'string' || !name.trim())
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!email || typeof email !== 'string' || !email.trim())
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  if (!password || typeof password !== 'string' || password.length < 6)
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  if (!role || !VALID_ROLES.includes(role))
    return NextResponse.json({ error: 'Invalid role. Must be CUSTOMER, AGENT, or ADMIN' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
