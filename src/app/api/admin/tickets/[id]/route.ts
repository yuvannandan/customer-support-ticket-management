import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category:      { select: { id: true, name: true } },
      customer:      { select: { id: true, name: true, email: true } },
      assignedAgent: { select: { id: true, name: true } },
      messages: {
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy:  { createdAt: 'asc' },
      },
      activities: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy:  { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  return NextResponse.json({ ticket });
}
