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

  // agentId may be null (unassign) or a string (assign)
  const { agentId } = body;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  let newStatus = ticket.status;

  if (agentId !== null && agentId !== undefined) {
    // Validate target is an AGENT
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (agent.role !== 'AGENT')
      return NextResponse.json({ error: 'Target user is not an AGENT' }, { status: 400 });

    // Auto-promote OPEN → ASSIGNED when assigning
    if (!ticket.assignedAgentId && ticket.status === 'OPEN') newStatus = 'ASSIGNED';
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: {
      assignedAgentId: agentId ?? null,
      status: newStatus,
      updatedAt: new Date(),
    },
    include: { assignedAgent: { select: { id: true, name: true } } },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: id,
      userId:   user.id,
      action:   agentId ? 'TICKET_ASSIGNED' : 'TICKET_UNASSIGNED',
      oldValue: ticket.assignedAgentId ?? 'Unassigned',
      newValue: agentId ?? 'Unassigned',
    },
  });

  if (newStatus !== ticket.status) {
    await prisma.ticketActivity.create({
      data: {
        ticketId: id,
        userId:   user.id,
        action:   'STATUS_CHANGED',
        oldValue: ticket.status,
        newValue: newStatus,
      },
    });
  }

  return NextResponse.json({ ticket: updatedTicket });
}
