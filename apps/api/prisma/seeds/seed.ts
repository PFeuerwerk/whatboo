import {
  DayOfWeek,
  PrismaClient,
  ReservationSource,
  ReservationStatus,
  RestaurantStatus,
  UserRole,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedPlatformAdmin } from './platform-admin.seed';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const DEMO_RESTAURANT = {
  slug: 'la-bella-italia',
  name: 'La Bella Italia',
  legalName: 'La Bella Italia Demo SL',
  taxId: 'B00000000',
  email: 'reservas@labellaitalia.test',
  phone: '+34600000000',
  website: 'https://labellaitalia.test',
  addressLine1: 'Calle Mayor 24',
  city: 'Madrid',
  country: 'ES',
  timezone: 'Europe/Madrid',
  currency: 'EUR',
  locale: 'es-ES',
};

const DEMO_PASSWORD = 'WhatBooDemo2026!';

async function main(): Promise<void> {
  console.log('Starting consolidated seed...');

  await seedPlatformAdmin(prisma);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: DEMO_RESTAURANT.slug },
    update: {
      ...DEMO_RESTAURANT,
      defaultReservationDuration: 90,
      slotIntervalMinutes: 30,
      bufferTimeMinutes: 15,
      maxCapacity: 80,
      allowWaitlist: true,
      autoConfirm: true,
      status: RestaurantStatus.ACTIVE,
    },
    create: {
      ...DEMO_RESTAURANT,
      defaultReservationDuration: 90,
      slotIntervalMinutes: 30,
      bufferTimeMinutes: 15,
      maxCapacity: 80,
      allowWaitlist: true,
      autoConfirm: true,
      status: RestaurantStatus.ACTIVE,
    },
  });

  await prisma.capacityRule.upsert({
    where: { restaurantId: restaurant.id },
    update: {
      maxGuestsPerReservation: 10,
      maxReservationsPerSlot: 4,
      slotDurationMinutes: 90,
      bufferMinutes: 15,
      maxDailyCapacity: 80,
      overbookingAllowed: false,
      active: true,
    },
    create: {
      restaurantId: restaurant.id,
      maxGuestsPerReservation: 10,
      maxReservationsPerSlot: 4,
      slotDurationMinutes: 90,
      bufferMinutes: 15,
      maxDailyCapacity: 80,
      overbookingAllowed: false,
      active: true,
    },
  });

  const [salon, terraza, privado] = await Promise.all([
    upsertZone(restaurant.id, 'Salón Principal', 1),
    upsertZone(restaurant.id, 'Terraza', 2),
    upsertZone(restaurant.id, 'Privado', 3),
  ]);

  const tables = await Promise.all([
    upsertTable(restaurant.id, 'Mesa 1', 2, salon.id),
    upsertTable(restaurant.id, 'Mesa 2', 2, salon.id),
    upsertTable(restaurant.id, 'Mesa 3', 4, salon.id),
    upsertTable(restaurant.id, 'Mesa 4', 4, salon.id),
    upsertTable(restaurant.id, 'Mesa 5', 6, terraza.id),
    upsertTable(restaurant.id, 'Mesa 6', 6, terraza.id),
    upsertTable(restaurant.id, 'Privado 1', 8, privado.id),
  ]);

  await seedOpeningHours(restaurant.id);

  await Promise.all([
    upsertUser(restaurant.id, 'owner@labellaitalia.test', 'Rene', 'Owner', UserRole.OWNER, passwordHash),
    upsertUser(restaurant.id, 'manager@labellaitalia.test', 'Sofia', 'Manager', UserRole.MANAGER, passwordHash),
    upsertUser(restaurant.id, 'staff@labellaitalia.test', 'Marco', 'Sala', UserRole.STAFF, passwordHash),
    upsertUser(restaurant.id, 'viras_user@labellaitaliatest.com', 'Viras', 'User', UserRole.OWNER, passwordHash),
  ]);

  await prisma.whatsappAccount.upsert({
    where: { phoneNumber: '+34910000000' },
    update: {
      restaurantId: restaurant.id,
      displayName: 'La Bella Italia WhatsApp Demo',
      status: 'ACTIVE',
    },
    create: {
      restaurantId: restaurant.id,
      phoneNumber: '+34910000000',
      displayName: 'La Bella Italia WhatsApp Demo',
      status: 'ACTIVE',
    },
  });

  const customers = await Promise.all([
    upsertCustomer(restaurant.id, 'Lucia', 'Fernandez', '+34611111111', 'lucia.fernandez@example.test', 'Sin gluten. Prefiere terraza.'),
    upsertCustomer(restaurant.id, 'Carlos', 'Mendez', '+34622222222', 'carlos.mendez@example.test', 'Cliente frecuente.'),
    upsertCustomer(restaurant.id, 'Ana', 'Lopez', '+34633333333', 'ana.lopez@example.test', 'Celebracion de aniversario.'),
    upsertCustomer(restaurant.id, 'Diego', 'Santos', '+34644444444', 'diego.santos@example.test', 'Mesa tranquila si es posible.'),
    upsertCustomer(restaurant.id, 'Marta', 'Ruiz', '+34655555555', 'marta.ruiz@example.test', 'Alergia a frutos secos.'),
  ]);

  const day = startOfToday();
  await Promise.all([
    upsertReservation(restaurant.id, customers[0].id, day, '12:30', 2, ReservationStatus.CONFIRMED, 'WB-DEMO-1230', tables[0].id),
    upsertReservation(restaurant.id, customers[1].id, day, '13:00', 4, ReservationStatus.CONFIRMED, 'WB-DEMO-1300', tables[2].id),
    upsertReservation(restaurant.id, customers[2].id, day, '14:00', 6, ReservationStatus.PENDING, 'WB-DEMO-1400', tables[4].id),
    upsertReservation(restaurant.id, customers[3].id, day, '20:30', 2, ReservationStatus.CONFIRMED, 'WB-DEMO-2030', tables[1].id),
    upsertReservation(restaurant.id, customers[4].id, day, '21:00', 8, ReservationStatus.PENDING, 'WB-DEMO-2100', tables[6].id),
  ]);

  await refreshCustomerCounters(customers.map((customer) => customer.id));

  console.log('Seed completed.');
  console.log(`Restaurant slug: ${DEMO_RESTAURANT.slug}`);
  console.log(`Owner login: owner@labellaitalia.test / ${DEMO_PASSWORD}`);
  console.log(`Manager login: manager@labellaitalia.test / ${DEMO_PASSWORD}`);
  console.log(`Staff login: staff@labellaitalia.test / ${DEMO_PASSWORD}`);
}

async function upsertZone(restaurantId: string, name: string, priority: number) {
  return prisma.restaurantZone.upsert({
    where: { restaurantId_name: { restaurantId, name } },
    update: { priority, active: true },
    create: { restaurantId, name, priority, active: true },
  });
}

async function upsertTable(restaurantId: string, name: string, capacity: number, zoneId: string) {
  return prisma.restaurantTable.upsert({
    where: { restaurantId_name: { restaurantId, name } },
    update: { capacity, zoneId, active: true },
    create: { restaurantId, name, capacity, zoneId, active: true },
  });
}

async function upsertUser(
  restaurantId: string,
  email: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { restaurantId_email: { restaurantId, email } },
    update: { firstName, lastName, role, passwordHash, isActive: true },
    create: { restaurantId, email, firstName, lastName, role, passwordHash, isActive: true },
  });
}

async function upsertCustomer(
  restaurantId: string,
  firstName: string,
  lastName: string,
  phone: string,
  email: string,
  notes: string,
) {
  return prisma.customer.upsert({
    where: { restaurantId_phone: { restaurantId, phone } },
    update: { firstName, lastName, email, notes, preferredLanguage: 'es', active: true },
    create: { restaurantId, firstName, lastName, phone, email, notes, preferredLanguage: 'es', active: true },
  });
}

async function seedOpeningHours(restaurantId: string): Promise<void> {
  const openDays = [
    [DayOfWeek.MONDAY, '12:00', '23:00', false],
    [DayOfWeek.TUESDAY, '12:00', '23:00', false],
    [DayOfWeek.WEDNESDAY, '12:00', '23:00', false],
    [DayOfWeek.THURSDAY, '12:00', '23:00', false],
    [DayOfWeek.FRIDAY, '12:00', '23:30', false],
    [DayOfWeek.SATURDAY, '12:00', '23:30', false],
    [DayOfWeek.SUNDAY, '00:00', '00:00', true],
  ] as const;

  for (const [dayOfWeek, openTime, closeTime, isClosed] of openDays) {
    await prisma.openingHour.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId, dayOfWeek } },
      update: { openTime, closeTime, isClosed, active: true, deletedAt: null },
      create: { restaurantId, dayOfWeek, openTime, closeTime, isClosed, active: true },
    });
  }
}

async function upsertReservation(
  restaurantId: string,
  customerId: string,
  day: Date,
  time: string,
  guestCount: number,
  status: ReservationStatus,
  confirmationCode: string,
  tableId: string,
) {
  const reservationStart = withTime(day, time);
  const reservationEnd = new Date(reservationStart.getTime() + 90 * 60 * 1000);

  const reservation = await prisma.reservation.upsert({
    where: { confirmationCode },
    update: {
      restaurantId,
      customerId,
      reservationDate: day,
      reservationStart,
      reservationEnd,
      guestCount,
      status,
      source: ReservationSource.DASHBOARD,
      notes: 'Reserva demo creada por seed enterprise.',
      confirmedAt: status === ReservationStatus.CONFIRMED ? new Date() : null,
      cancelledAt: null,
      completedAt: null,
      noShowAt: null,
      deletedAt: null,
    },
    create: {
      restaurantId,
      customerId,
      reservationDate: day,
      reservationStart,
      reservationEnd,
      guestCount,
      status,
      source: ReservationSource.DASHBOARD,
      notes: 'Reserva demo creada por seed enterprise.',
      confirmationCode,
      confirmedAt: status === ReservationStatus.CONFIRMED ? new Date() : null,
    },
  });

  await prisma.reservationTable.deleteMany({
    where: { reservationId: reservation.id },
  });

  await prisma.reservationTable.create({
    data: { reservationId: reservation.id, tableId, autoAssigned: false },
  });

  return reservation;
}

async function refreshCustomerCounters(customerIds: string[]): Promise<void> {
  for (const customerId of customerIds) {
    const reservations = await prisma.reservation.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { reservationStart: 'desc' },
      select: { reservationStart: true },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalReservations: reservations.length,
        lastReservationAt: reservations[0]?.reservationStart ?? null,
      },
    });
  }
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function withTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
