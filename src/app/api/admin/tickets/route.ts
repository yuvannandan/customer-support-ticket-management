import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status          = searchParams.get('status')          || undefined;
  const priority        = searchParams.get('priority')        || undefined;
  const categoryId      = searchParams.get('categoryId')      || undefined;
  const assignedAgentId = searchParams.get('assignedAgentId') || undefined;
  const customerId      = searchParams.get('customerId')      || undefined;
  const search          = searchParams.get('search')          || undefined;

  const where: any = {};
  if (status)   where.status   = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;
  if (customerId) where.customerId  = customerId;
  if (assignedAgentId === 'unassigned') {
    where.assignedAgentId = null;
  } else if (assignedAgentId) {
    where.assignedAgentId = assignedAgentId;
  }
  if (search) {
    where.OR = [
      { ticketNumber: { contains: search } },
      { title:        { contains: search } },
      { customer: { name:  { contains: search } } },
      { customer: { email: { contains: search } } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      category:      { select: { id: true, name: true } },
      customer:      { select: { id: true, name: true, email: true } },
      assignedAgent: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ tickets });
}
