import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedPlatformAdmin } from './platform-admin.seed';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🚀 Iniciando proceso de siembra consolidado...');

  // ============================================================================
  // 1. INYECCIÓN DEL ADMINISTRADOR GLOBAL DE LA PLATAFORMA (SECURE DEVSECOPS)
  // ============================================================================
  await seedPlatformAdmin(prisma);

  // ============================================================================
  // 2. SIEMBRA DEL RESTAURANTE DE SIMULACIÓN COMERCIAL (TENANT DEMO)
  // ============================================================================
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

  console.log(`✅ Restaurante Demo Creado: ${restaurant.name} (${restaurant.id})`);

  // ============================================================================
  // 3. CREACIÓN DE LAS ZONAS FÍSICAS (ALGORITMO TETRIS INTEGRITY)
  // ============================================================================
  const zoneSalon = await prisma.restaurantZone.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Salón Principal' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Salón Principal', priority: 1, active: true }
  });

  const zoneTerraza = await prisma.restaurantZone.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Terraza' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Terraza', priority: 2, active: true }
  });

  // ============================================================================
  // 4. INYECCIÓN DE MESAS OPERATIVAS VINCULADAS POR INTEGRIDAD REFERENCIAL
  // ============================================================================
  const tables = [
    { name: 'Mesa 1', capacity: 2, zoneId: zoneSalon.id },
    { name: 'Mesa 2', capacity: 2, zoneId: zoneSalon.id },
    { name: 'Mesa 3', capacity: 4, zoneId: zoneSalon.id },
    { name: 'Mesa 4', capacity: 4, zoneId: zoneSalon.id },
    { name: 'Mesa 5', capacity: 6, zoneId: zoneTerraza.id },
  ];

  for (const table of tables) {
    await prisma.restaurantTable.upsert({
      where: { restaurantId_name: { restaurantId: restaurant.id, name: table.name } },
      update: {},
      create: { restaurantId: restaurant.id, name: table.name, capacity: table.capacity, zoneId: table.zoneId, active: true },
    });
  }

  console.log(`✅ ${tables.length} mesas relacionales inyectadas de forma exitosa.`);

  // ============================================================================
  // 5. PARAMETRIZACIÓN DE HORARIOS DE ATENCIÓN DE LA API
  // ============================================================================
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

  console.log('✅ Horarios operativos de slots guardados.');

  // ============================================================================
  // 6. CREACIÓN DEL USUARIO DUEÑO DEMO (OWNER ATÓMICO)
  // ============================================================================
  await prisma.user.upsert({
    where: { email: 'viras_user@labellaitaliatest.com' },
    update: {},
    create: {
      restaurantId: restaurant.id,
      email: 'viras_user@labellaitaliatest.com',
      password: '$2b$10$placeholderhashneveruseinprod', // Corregido a la columna real 'password'
      firstName: 'Viras',
      lastName: 'User',
      role: 'OWNER',
      isActive: true,
    },
  });

  console.log('✅ Usuario OWNER de prueba inyectado.');
  console.log('\n🎉 Proceso de siembra completado con éxito absoluto al 100%.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
