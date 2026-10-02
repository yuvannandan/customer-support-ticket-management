import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  if (user.role === 'CUSTOMER' && ticket.customerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (ticket.status === 'CLOSED') {
    return NextResponse.json({ error: 'Ticket is already closed' }, { status: 400 });
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: id,
      userId: user.id,
      action: 'STATUS_CHANGED',
      oldValue: ticket.status,
      newValue: 'CLOSED',
    },
  });

  return NextResponse.json({ ticket: updatedTicket }, { status: 200 });
}
