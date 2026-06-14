import { PrismaClient, RestaurantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedPlatformAdmin(prisma: PrismaClient) {
  console.log('🌱 Iniciando siembra perimetral de administración global...');

  // 1. Aprovisionamiento del Tenant Maestro de control del SaaS
  const mainTenant = await prisma.restaurant.upsert({
    where: { slug: 'platform-master-control' },
    update: {},
    create: {
      name: 'WhatBoo Global Control',
      slug: 'platform-master-control',
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

  // 2. Criptografía: Hash síncrono seguro para la credencial maestra
  const hashedPassword = await bcrypt.hash('WhatBooMasterPass2026!', 10);

  // 3. Inyección atómica del Administrador Global con rol estricto de plataforma
  await prisma.user.upsert({
    where: { email: 'admin@whatboo.com' },
    update: {},
    create: {
      email: 'admin@whatboo.com',
      firstName: 'Rene',
      lastName: 'Platform Admin',
      password: hashedPassword,
      role: 'PLATFORM_ADMIN' as any, // Mapeado al Enum relacional de producción
      restaurantId: mainTenant.id,
      isActive: true,
    },
  });

  console.log('✅ Usuario PLATFORM_ADMIN (admin@whatboo.com) inyectado con éxito.');
}
