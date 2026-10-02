import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return salt + ':' + derivedKey.toString('hex');
}

async function main() {
  console.log('Seeding database...');
  
  const adminPass = hashPassword('admin123');
  const agentPass = hashPassword('agent123');
  const custPass = hashPassword('customer123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@example.com',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@example.com' },
    update: {},
    create: {
      name: 'Support Agent',
      email: 'agent@example.com',
      passwordHash: agentPass,
      role: 'AGENT',
    },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: 'customer1@example.com' },
    update: {},
    create: {
      name: 'Customer One',
      email: 'customer1@example.com',
      passwordHash: custPass,
      role: 'CUSTOMER',
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'customer2@example.com' },
    update: {},
    create: {
      name: 'Customer Two',
      email: 'customer2@example.com',
      passwordHash: custPass,
      role: 'CUSTOMER',
    },
  });

  const categoryNames = [
    'Technical Issue',
    'Billing',
    'Account',
    'Login Problem',
    'Bug Report',
    'Feature Request',
    'Other'
  ];

  const categories = [];
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, description: `Tickets related to ${name}` },
    });
    categories.push(cat);
  }

  // Sample tickets
  const ticketsData = [
    {
      ticketNumber: 'TKT-001',
      title: 'Cannot access my account',
      description: 'I keep getting a password error even after resetting it.',
      customerId: customer1.id,
      assignedAgentId: agent.id,
      categoryId: categories.find(c => c.name === 'Login Problem').id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    },
    {
      ticketNumber: 'TKT-002',
      title: 'Double charged for subscription',
      description: 'My credit card was charged twice this month.',
      customerId: customer2.id,
      assignedAgentId: null,
      categoryId: categories.find(c => c.name === 'Billing').id,
      priority: 'URGENT',
      status: 'OPEN',
    },
    {
      ticketNumber: 'TKT-003',
      title: 'How to export data?',
      description: 'Is there a way to export my data to CSV?',
      customerId: customer1.id,
      assignedAgentId: agent.id,
      categoryId: categories.find(c => c.name === 'Feature Request').id,
      priority: 'LOW',
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
    {
      ticketNumber: 'TKT-004',
      title: 'App crashes on launch',
      description: 'Since the latest update, the mobile app crashes.',
      customerId: customer2.id,
      assignedAgentId: agent.id,
      categoryId: categories.find(c => c.name === 'Bug Report').id,
      priority: 'HIGH',
      status: 'WAITING_FOR_CUSTOMER',
    },
    {
      ticketNumber: 'TKT-005',
      title: 'Change email address',
      description: 'I want to change my email address from this one to another.',
      customerId: customer1.id,
      assignedAgentId: admin.id,
      categoryId: categories.find(c => c.name === 'Account').id,
      priority: 'MEDIUM',
      status: 'ASSIGNED',
    }
  ];

  for (const data of ticketsData) {
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: data.ticketNumber },
      update: {},
      create: data,
    });

    // Add some messages
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: data.customerId,
        message: 'Hello, ' + data.description,
      }
    });

    if (data.assignedAgentId) {
      await prisma.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          userId: admin.id,
          action: 'ASSIGNED_AGENT',
          newValue: data.assignedAgentId,
        }
      });
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: data.assignedAgentId,
          message: 'I am looking into this issue for you.',
        }
      });
    }
  }

  console.log('Database seeded successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  });
