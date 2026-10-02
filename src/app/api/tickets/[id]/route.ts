import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

async function getTicketOrForbid(ticketId: string, userId: string, role: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      category: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, email: true } },
      assignedAgent: { select: { id: true, name: true } },
      messages: {
        where: { isInternal: false },
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      activities: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) return null;

  // Customers can only access their own tickets
  if (role === 'CUSTOMER' && ticket.customerId !== userId) return 'forbidden';

  return ticket;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const result = await getTicketOrForbid(id, user.id, user.role);

  if (result === null) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  if (result === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({ ticket: result }, { status: 200 });
}
