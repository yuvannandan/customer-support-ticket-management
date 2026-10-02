import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'AGENT' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  if (ticket.assignedAgentId) {
    return NextResponse.json({ error: 'Ticket is already assigned' }, { status: 409 });
  }

  const newStatus = ticket.status === 'OPEN' ? 'ASSIGNED' : ticket.status;

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: {
      assignedAgentId: user.id,
      status: newStatus,
      updatedAt: new Date(),
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: id,
      userId: user.id,
      action: 'TICKET_ASSIGNED',
      newValue: user.name, // Or store the user ID, but name is nice for history display
    },
  });

  if (ticket.status !== newStatus) {
    await prisma.ticketActivity.create({
      data: {
        ticketId: id,
        userId: user.id,
        action: 'STATUS_CHANGED',
        oldValue: ticket.status,
        newValue: newStatus,
      },
    });
  }

  return NextResponse.json({ ticket: updatedTicket }, { status: 200 });
}
