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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message } = body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  if (user.role === 'AGENT' && ticket.assignedAgentId !== user.id) {
    return NextResponse.json({ error: 'Forbidden. You must be assigned to this ticket.' }, { status: 403 });
  }

  const newMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      senderId: user.id,
      message: message.trim(),
      isInternal: true, // Crucial: marked as internal note
    },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });

  // Update ticket updatedAt by touching it
  await prisma.ticket.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ message: newMessage }, { status: 201 });
}
