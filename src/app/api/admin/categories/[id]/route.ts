import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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

  const target = await prisma.category.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  const { name, description } = body;
  const data: any = {};

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim())
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    const conflict = await prisma.category.findUnique({ where: { name: name.trim() } });
    if (conflict && conflict.id !== id)
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    data.name = name.trim();
  }

  if (description !== undefined) {
    data.description = description ? String(description).trim() : null;
  }

  const updated = await prisma.category.update({ where: { id }, data });
  return NextResponse.json({ category: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const target = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { tickets: true } } },
  });
  if (!target) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  if (target._count.tickets > 0) {
    return NextResponse.json({
      error: `Cannot delete category "${target.name}" — it is used by ${target._count.tickets} ticket(s). Reassign those tickets first.`,
    }, { status: 409 });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
