import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ReservationSource, ReservationStatus, RestaurantStatus, UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

interface TestTenant {
  restaurantId: string;
  slug: string;
  ownerEmail: string;
  token: string;
}

describe('Dashboard API e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let customerAId: string;
  let customerBId: string;
  let reservationAId: string;
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-dashboard-api-secret';
    process.env.RATE_LIMIT_SHORT_LIMIT = process.env.RATE_LIMIT_SHORT_LIMIT || '1000';
    process.env.RATE_LIMIT_LONG_LIMIT = process.env.RATE_LIMIT_LONG_LIMIT || '10000';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
    prisma = app.get(PrismaService);

    tenantA = await createTenant('alpha');
    tenantB = await createTenant('bravo');

    const customerA = await prisma.customer.create({
      data: {
        restaurantId: tenantA.restaurantId,
        phone: `+3491${runId.replace(/\D/g, '').slice(0, 7).padEnd(7, '1')}`,
        firstName: 'Alice',
        lastName: 'Dashboard',
        email: `alice-${runId}@whatboo.test`,
      },
    });
    customerAId = customerA.id;

    const customerB = await prisma.customer.create({
      data: {
        restaurantId: tenantB.restaurantId,
        phone: `+3492${runId.replace(/\D/g, '').slice(0, 7).padEnd(7, '2')}`,
        firstName: 'Bob',
        lastName: 'Tenant',
        email: `bob-${runId}@whatboo.test`,
      },
    });
    customerBId = customerB.id;

    const reservationStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    reservationStart.setMinutes(0, 0, 0);
    const reservationEnd = new Date(reservationStart.getTime() + 90 * 60 * 1000);
    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: tenantA.restaurantId,
        customerId: customerAId,
        reservationDate: new Date(reservationStart.toISOString().slice(0, 10)),
        reservationStart,
        reservationEnd,
        guestCount: 4,
        status: ReservationStatus.PENDING,
        source: ReservationSource.DASHBOARD,
        confirmationCode: `E2E-${runId}`.slice(0, 32),
      },
    });
    reservationAId = reservation.id;
  });

  after(async () => {
    await cleanupTenant(tenantA?.restaurantId);
    await cleanupTenant(tenantB?.restaurantId);
    await app?.close();
    await prisma?.$disconnect();
  });

  it('customers list/search/view are tenant scoped', async () => {
    const list = await api<{ data: Array<{ id: string; firstName: string }>; total: number }>(
      tenantA,
      '/customers?q=Alice&take=10',
    );

    assert.equal(list.status, 200);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.data[0]?.id, customerAId);

    const view = await api<{ id: string; email: string }>(tenantA, `/customers/${customerAId}`);
    assert.equal(view.status, 200);
    assert.equal(view.body.id, customerAId);

    const crossTenantView = await api<{ statusCode: number }>(tenantA, `/customers/${customerBId}`);
    assert.equal(crossTenantView.status, 404);
  });

  it('reservations support advanced list, update, status and structured cancel audit', async () => {
    const listed = await api<{ data: Array<{ id: string }>; total: number }>(
      tenantA,
      `/reservations?status=PENDING&take=10&q=Alice`,
    );
    assert.equal(listed.status, 200);
    assert.equal(listed.body.total, 1);
    assert.equal(listed.body.data[0]?.id, reservationAId);

    const updated = await api<{ id: string; guestCount: number }>(tenantA, `/reservations/${reservationAId}`, {
      method: 'PATCH',
      body: { guestCount: 5, notes: 'Mesa tranquila' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.guestCount, 5);

    const confirmed = await api<{ id: string; status: ReservationStatus }>(
      tenantA,
      `/reservations/${reservationAId}/status`,
      {
        method: 'PATCH',
        body: { status: ReservationStatus.CONFIRMED },
      },
    );
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.status, ReservationStatus.CONFIRMED);

    const cancelled = await api<{ id: string; status: ReservationStatus }>(
      tenantA,
      `/reservations/${reservationAId}/cancel`,
      {
        method: 'PATCH',
        body: { reason: 'Cliente solicito cancelacion por WhatsApp', source: ReservationSource.DASHBOARD },
      },
    );
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, ReservationStatus.CANCELLED);

    const audits = await api<Array<{ reason: string; reservationId: string }>>(
      tenantA,
      `/reservations/${reservationAId}/cancellation-audits`,
    );
    assert.equal(audits.status, 200);
    assert.equal(audits.body[0]?.reservationId, reservationAId);
    assert.match(audits.body[0]?.reason ?? '', /WhatsApp/);
  });

  it('users create/update/activate/deactivate remain tenant scoped', async () => {
    const created = await api<{ id: string; email: string; role: UserRole; isActive: boolean }>(tenantA, '/users', {
      method: 'POST',
      body: {
        email: `staff-${runId}@whatboo.test`,
        firstName: 'Staff',
        lastName: 'E2E',
        role: UserRole.STAFF,
        password: 'Password123!',
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.role, UserRole.STAFF);
    assert.equal(created.body.isActive, true);

    const promoted = await api<{ id: string; role: UserRole }>(tenantA, `/users/${created.body.id}`, {
      method: 'PATCH',
      body: { role: UserRole.MANAGER },
    });
    assert.equal(promoted.status, 200);
    assert.equal(promoted.body.role, UserRole.MANAGER);

    const deactivated = await api<{ isActive: boolean }>(tenantA, `/users/${created.body.id}`, {
      method: 'PATCH',
      body: { isActive: false },
    });
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.isActive, false);

    const activated = await api<{ isActive: boolean }>(tenantA, `/users/${created.body.id}`, {
      method: 'PATCH',
      body: { isActive: true },
    });
    assert.equal(activated.status, 200);
    assert.equal(activated.body.isActive, true);
  });

  it('tenant isolation blocks mismatched tenant header and token', async () => {
    const response = await fetch(`${baseUrl}/customers`, {
      headers: {
        Authorization: `Bearer ${tenantA.token}`,
        'X-Tenant-Slug': tenantB.slug,
      },
    });

    assert.equal(response.status, 403);
  });

  async function createTenant(prefix: string): Promise<TestTenant> {
    const slug = `e2e-${prefix}-${runId}`.toLowerCase();
    const ownerEmail = `${prefix}-${runId}@whatboo.test`;
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const restaurant = await prisma.restaurant.create({
      data: {
        slug,
        name: `E2E ${prefix}`,
        timezone: 'Europe/Madrid',
        currency: 'EUR',
        locale: 'es-ES',
        status: RestaurantStatus.ACTIVE,
      },
    });

    await prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        email: ownerEmail,
        firstName: 'Owner',
        lastName: prefix,
        passwordHash,
        role: UserRole.OWNER,
        isActive: true,
      },
    });

    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': slug,
      },
      body: JSON.stringify({
        email: ownerEmail,
        password: 'Password123!',
        restaurantSlug: slug,
      }),
    });

    assert.equal(login.status, 200);
    const body = await login.json() as { accessToken: string };
    return {
      restaurantId: restaurant.id,
      slug,
      ownerEmail,
      token: body.accessToken,
    };
  }

  async function cleanupTenant(restaurantId?: string): Promise<void> {
    if (!restaurantId) return;
    await prisma.reservationCancellationAudit.deleteMany({ where: { restaurantId } });
    await prisma.reservationTable.deleteMany({ where: { reservation: { restaurantId } } });
    await prisma.reservation.deleteMany({ where: { restaurantId } });
    await prisma.customer.deleteMany({ where: { restaurantId } });
    await prisma.user.deleteMany({ where: { restaurantId } });
    await prisma.restaurantTable.deleteMany({ where: { restaurantId } });
    await prisma.restaurantZone.deleteMany({ where: { restaurantId } });
    await prisma.capacityRule.deleteMany({ where: { restaurantId } });
    await prisma.openingHour.deleteMany({ where: { restaurantId } });
    await prisma.blockedDate.deleteMany({ where: { restaurantId } });
    await prisma.whatsappAccount.deleteMany({ where: { restaurantId } });
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
  }

  async function api<T>(
    tenant: TestTenant,
    path: string,
    options?: { method?: string; body?: unknown },
  ): Promise<{ status: number; body: T }> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${tenant.token}`,
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenant.slug,
      },
      body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) as T : undefined as T;
    return { status: response.status, body };
  }
});
