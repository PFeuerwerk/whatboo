import { PrismaClient, RestaurantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedPlatformAdmin(prisma: PrismaClient) {
  console.log('🌱 Iniciando siembra perimetral de administración global...');

  const mainTenant = await prisma.restaurant.upsert({
    where: { slug: 'platform-master-control' },
    update: {},
    create: {
      name: 'WhatBoo Global Control',
      slug: 'platform-master-control',
        phone: '+34900000000',
        closingHourLimit: '03:00',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      locale: 'es-ES',
      defaultReservationDuration: 90,
      slotIntervalMinutes: 30,
      bufferTimeMinutes: 10,
      status: RestaurantStatus.ACTIVE,
      autoConfirm: true,
      allowWaitlist: true,
    },
  });

  const hashedPassword = await bcrypt.hash('WhatBooMasterPass2026!', 10);

  // Alineado a la clave compuesta restaurantId_email y passwordHash exacta de tu esquema
  await prisma.user.upsert({
    where: { restaurantId_email: { restaurantId: mainTenant.id, email: 'admin@whatboo.com' } },
    update: {},
    create: {
      email: 'admin@whatboo.com',
      firstName: 'Rene',
      lastName: 'Platform Admin',
        shift: 'FULL_TIME' as any,
      passwordHash: hashedPassword,
      role: 'TECHSOFT' as any,
      restaurantId: mainTenant.id,
      isActive: true,
    },
  });

  console.log('✅ Usuario PLATFORM_ADMIN (admin@whatboo.com) inyectado con éxito.');
}
