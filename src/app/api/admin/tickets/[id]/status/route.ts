import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const VALID_STATUSES = [
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER',
  'RESOLVED', 'CLOSED', 'REOPENED',
];

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

  const { status } = body;
  if (!status || !VALID_STATUSES.includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  if (ticket.status === status) return NextResponse.json({ ticket });

  const resolvedAt = status === 'RESOLVED' && ticket.status !== 'RESOLVED' ? new Date() : ticket.resolvedAt;
  const closedAt   = status === 'CLOSED'   && ticket.status !== 'CLOSED'   ? new Date() : ticket.closedAt;

  const updated = await prisma.ticket.update({
    where: { id },
    data: { status, resolvedAt, closedAt, updatedAt: new Date() },
  });

  await prisma.ticketActivity.create({
    data: { ticketId: id, userId: user.id, action: 'STATUS_CHANGED', oldValue: ticket.status, newValue: status },
  });

  return NextResponse.json({ ticket: updated });
}
