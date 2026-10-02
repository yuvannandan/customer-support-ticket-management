import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'AGENT' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { priority } = body;
  if (!priority || !VALID_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  if (user.role === 'AGENT' && ticket.assignedAgentId !== user.id) {
    return NextResponse.json({ error: 'Forbidden. You must be assigned to this ticket.' }, { status: 403 });
  }

  if (ticket.priority === priority) {
    return NextResponse.json({ ticket }, { status: 200 }); // No change
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: {
      priority,
      updatedAt: new Date(),
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: id,
      userId: user.id,
      action: 'PRIORITY_CHANGED',
      oldValue: ticket.priority,
      newValue: priority,
    },
  });

  return NextResponse.json({ ticket: updatedTicket }, { status: 200 });
}
