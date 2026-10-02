import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

async function generateTicketNumber(): Promise<string> {
  // Find the highest existing TKT number and increment
  const last = await prisma.ticket.findFirst({
    where: { ticketNumber: { startsWith: 'TKT-' } },
    orderBy: { createdAt: 'desc' },
    select: { ticketNumber: true },
  });
  if (!last) return 'TKT-1001';
  const num = parseInt(last.ticketNumber.replace('TKT-', ''), 10);
  return `TKT-${isNaN(num) ? 1001 : num + 1}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'CUSTOMER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, description, categoryId, priority } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0)
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 });

  if (!description || typeof description !== 'string' || description.trim().length === 0)
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });

  if (!categoryId || typeof categoryId !== 'string')
    return NextResponse.json({ error: 'Category is required' }, { status: 400 });

  const resolvedPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : 'MEDIUM';

  // Verify category exists
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });

  const ticketNumber = await generateTicketNumber();

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      title: title.trim(),
      description: description.trim(),
      customerId: user.id, // Always from session — never client-supplied
      categoryId,
      priority: resolvedPriority,
      status: 'OPEN',
    },
    include: {
      category: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, email: true } },
    },
  });

  // Record creation activity
  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket.id,
      userId: user.id,
      action: 'TICKET_CREATED',
      newValue: ticketNumber,
    },
  });

  return NextResponse.json({ ticket }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const priority = searchParams.get('priority') || undefined;
  const categoryId = searchParams.get('categoryId') || undefined;
  const search = searchParams.get('search') || undefined;

  // Build where clause — customers only see their own tickets
  const where: any = user.role === 'CUSTOMER'
    ? { customerId: user.id }
    : {}; // Agents/admins get all — extended in later phases

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { ticketNumber: { contains: search } },
      { title: { contains: search } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
      assignedAgent: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ tickets }, { status: 200 });
}
