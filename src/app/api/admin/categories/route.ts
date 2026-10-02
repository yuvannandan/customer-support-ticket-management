import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const categories = await prisma.category.findMany({
    include: { _count: { select: { tickets: true } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description } = body;
  if (!name || typeof name !== 'string' || !name.trim())
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
  if (existing) return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      description: description ? String(description).trim() : null,
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
