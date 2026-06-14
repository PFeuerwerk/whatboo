import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('Seeding database...');

  // 1. Create restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'la-bella-italia' },
    update: {},
    create: {
      slug: 'la-bella-italia',
      name: 'La Bella Italia',
      phone: '+34600000000',
      email: 'info@labellaitaliatest.com',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      locale: 'es-ES',
      defaultReservationDuration: 90,
      slotIntervalMinutes: 30,
      autoConfirm: true,
      status: 'ACTIVE',
    },
  });

  console.log(`Restaurant created: ${restaurant.name} (${restaurant.id})`);

  // 2. Create tables
  const tables = [
    { name: 'Table 1', capacity: 2, zone: 'Main Hall' },
    { name: 'Table 2', capacity: 2, zone: 'Main Hall' },
    { name: 'Table 3', capacity: 4, zone: 'Main Hall' },
    { name: 'Table 4', capacity: 4, zone: 'Main Hall' },
    { name: 'Table 5', capacity: 6, zone: 'Terrace' },
    { name: 'Table 6', capacity: 8, zone: 'Private Room' },
  ];

  for (const table of tables) {
    await prisma.restaurantTable.upsert({
      where: { restaurantId_name: { restaurantId: restaurant.id, name: table.name } },
      update: {},
      create: { restaurantId: restaurant.id, ...table, active: true },
    });
  }

  console.log(`${tables.length} tables created`);

  // 3. Create opening hours (Mon-Sat, closed Sunday)
  const openDays = [
    { dayOfWeek: 'MONDAY',    openTime: '12:00', closeTime: '23:00' },
    { dayOfWeek: 'TUESDAY',   openTime: '12:00', closeTime: '23:00' },
    { dayOfWeek: 'WEDNESDAY', openTime: '12:00', closeTime: '23:00' },
    { dayOfWeek: 'THURSDAY',  openTime: '12:00', closeTime: '23:00' },
    { dayOfWeek: 'FRIDAY',    openTime: '12:00', closeTime: '23:30' },
    { dayOfWeek: 'SATURDAY',  openTime: '12:00', closeTime: '23:30' },
    { dayOfWeek: 'SUNDAY',    openTime: '00:00', closeTime: '00:00', isClosed: true },
  ];

  for (const hours of openDays) {
    await prisma.openingHour.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: hours.dayOfWeek as any } },
      update: {},
      create: {
        restaurantId: restaurant.id,
        dayOfWeek: hours.dayOfWeek as any,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isClosed: hours.isClosed ?? false,
        active: true,
      },
    });
  }

  console.log('Opening hours created');

  // 4. Create owner user
  await prisma.user.upsert({
    where: { restaurantId_email: { restaurantId: restaurant.id, email: 'viras_user@labellaitaliatest.com' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      email: 'viras_user@labellaitaliatest.com',
      passwordHash: '$2b$10$placeholderhashneveruseinprod',
      firstName: 'Viras',
      lastName: 'User',
      role: 'OWNER',
      isActive: true,
    },
  });

  console.log('Owner user created');
  console.log('');
  console.log('Seed complete.');
  console.log(`Restaurant ID: ${restaurant.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
