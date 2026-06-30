import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import {
  BillingPlan,
  BillingStatus,
  DayOfWeek,
  ReservationSource,
  ReservationStatus,
  RestaurantStatus,
  UserRole,
} from '@prisma/client';
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
  let platformAdmin: TestTenant;
  let customerAId: string;
  let customerBId: string;
  let reservationAId: string;
  let registeredTenantId: string | undefined;
  let tableAId: string;
  let tableBId: string;
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const onboardingToken = `onboarding-${runId}`;
  const whatsappAppSecret = `whatsapp-secret-${runId}`;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-dashboard-api-secret';
    process.env.ONBOARDING_INVITE_TOKEN = onboardingToken;
    process.env.WHATSAPP_APP_SECRET = whatsappAppSecret;
    process.env.RATE_LIMIT_SHORT_LIMIT = process.env.RATE_LIMIT_SHORT_LIMIT || '1000';
    process.env.RATE_LIMIT_LONG_LIMIT = process.env.RATE_LIMIT_LONG_LIMIT || '10000';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
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
    platformAdmin = await createPlatformAdmin(tenantA);

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
    const tableA = await prisma.restaurantTable.create({
      data: {
        restaurantId: tenantA.restaurantId,
        name: `Mesa A ${runId}`,
        capacity: 4,
        active: true,
      },
    });
    tableAId = tableA.id;

    const tableB = await prisma.restaurantTable.create({
      data: {
        restaurantId: tenantA.restaurantId,
        name: `Mesa B ${runId}`,
        capacity: 6,
        active: true,
      },
    });
    tableBId = tableB.id;

    await prisma.restaurantTable.create({
      data: {
        restaurantId: tenantA.restaurantId,
        name: `Mesa C ${runId}`,
        capacity: 6,
        active: true,
      },
    });

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
        assignedTables: {
          create: {
            tableId: tableAId,
            autoAssigned: false,
          },
        },
      },
    });
    reservationAId = reservation.id;

    const conflictingReservation = await prisma.reservation.create({
      data: {
        restaurantId: tenantA.restaurantId,
        customerId: customerAId,
        reservationDate: new Date(reservationStart.toISOString().slice(0, 10)),
        reservationStart,
        reservationEnd,
        guestCount: 4,
        status: ReservationStatus.CONFIRMED,
        source: ReservationSource.DASHBOARD,
        confirmationCode: `E2E-B-${runId}`.slice(0, 32),
      },
    });
    await prisma.reservationTable.create({
      data: {
        reservationId: conflictingReservation.id,
        tableId: tableBId,
        autoAssigned: false,
      },
    });
  });

  after(async () => {
    await cleanupTenant(tenantA?.restaurantId);
    await cleanupTenant(tenantB?.restaurantId);
    await cleanupTenant(registeredTenantId);
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

    const unavailableTable = await api<{ statusCode: number }>(tenantA, `/reservations/${reservationAId}`, {
      method: 'PATCH',
      body: { tableId: tableBId },
    });
    assert.equal(unavailableTable.status, 400);

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

    const cancelled = await api<{ id: string; status: ReservationStatus; notes: string | null }>(
      tenantA,
      `/reservations/${reservationAId}/cancel`,
      {
        method: 'PATCH',
        body: { reason: 'Cliente solicito cancelacion por WhatsApp', source: ReservationSource.DASHBOARD },
      },
    );
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, ReservationStatus.CANCELLED);
    assert.equal(cancelled.body.notes, 'Mesa tranquila');

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

  it('no-show stores structured audit separately from generic audit log', async () => {
    const noShowStart = new Date(Date.now() + 72 * 60 * 60 * 1000);
    noShowStart.setMinutes(0, 0, 0);
    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: tenantA.restaurantId,
        customerId: customerAId,
        reservationDate: new Date(noShowStart.toISOString().slice(0, 10)),
        reservationStart: noShowStart,
        reservationEnd: new Date(noShowStart.getTime() + 90 * 60 * 1000),
        guestCount: 2,
        status: ReservationStatus.CONFIRMED,
        source: ReservationSource.DASHBOARD,
        confirmationCode: `NS-${runId}`.slice(0, 32),
        notes: 'Cliente VIP',
      },
    });

    const marked = await api<{ id: string; status: ReservationStatus; notes: string | null }>(
      tenantA,
      `/reservations/${reservation.id}/no-show`,
      {
        method: 'PATCH',
        body: { reasonCode: 'CUSTOMER_UNREACHABLE', details: 'No respondio a la llamada' },
      },
    );

    assert.equal(marked.status, 200);
    assert.equal(marked.body.status, ReservationStatus.NO_SHOW);
    assert.equal(marked.body.notes, 'Cliente VIP');

    const audits = await api<Array<{ reservationId: string; reasonCode: string; details: string | null }>>(
      tenantA,
      `/reservations/${reservation.id}/no-show-audits`,
    );

    assert.equal(audits.status, 200);
    assert.equal(audits.body[0]?.reservationId, reservation.id);
    assert.equal(audits.body[0]?.reasonCode, 'CUSTOMER_UNREACHABLE');
    assert.equal(audits.body[0]?.details, 'No respondio a la llamada');
  });

  it('platform admin exposes and updates billing fields', async () => {
    const listed = await api<{
      data: Array<{
        id: string;
        billingPlan: BillingPlan;
        billingStatus: BillingStatus;
      }>;
      total: number;
      take: number;
      skip: number;
    }>(platformAdmin, '/platform/admin/restaurants?take=10');

    assert.equal(listed.status, 200);
    assert.ok(listed.body.total >= 2);
    const tenantRow = listed.body.data.find(item => item.id === tenantA.restaurantId);
    assert.equal(tenantRow?.billingPlan, BillingPlan.FREE);
    assert.equal(tenantRow?.billingStatus, BillingStatus.TRIAL);

    const trialEndsAt = new Date('2030-01-15T00:00:00.000Z').toISOString();
    const periodEndsAt = new Date('2030-02-15T00:00:00.000Z').toISOString();
    const updated = await api<{
      id: string;
      billingPlan: BillingPlan;
      billingStatus: BillingStatus;
    }>(platformAdmin, `/platform/admin/restaurants/${tenantA.restaurantId}`, {
      method: 'PATCH',
      body: {
        billingPlan: BillingPlan.PRO,
        billingStatus: BillingStatus.ACTIVE,
        billingEmail: `billing-${runId}@whatboo.test`,
        billingCustomerReference: `cus_${runId}`.replace(/[^a-zA-Z0-9_]/g, ''),
        trialEndsAt,
        currentPeriodEndsAt: periodEndsAt,
      },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.billingPlan, BillingPlan.PRO);
    assert.equal(updated.body.billingStatus, BillingStatus.ACTIVE);

    const detail = await api<{
      id: string;
      billingPlan: BillingPlan;
      billingStatus: BillingStatus;
      billingEmail: string | null;
      billingCustomerReference: string | null;
      trialEndsAt: string | null;
      currentPeriodEndsAt: string | null;
    }>(platformAdmin, `/platform/admin/restaurants/${tenantA.restaurantId}`);

    assert.equal(detail.status, 200);
    assert.equal(detail.body.billingPlan, BillingPlan.PRO);
    assert.equal(detail.body.billingStatus, BillingStatus.ACTIVE);
    assert.equal(detail.body.billingEmail, `billing-${runId}@whatboo.test`);
    assert.match(detail.body.billingCustomerReference ?? '', /^cus_/);
    assert.equal(new Date(detail.body.trialEndsAt ?? '').toISOString(), trialEndsAt);
    assert.equal(new Date(detail.body.currentPeriodEndsAt ?? '').toISOString(), periodEndsAt);
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

  it('register tenant requires a valid onboarding token', async () => {
    const payload = {
      name: `Registered ${runId}`,
      slug: `registered-${runId}`.toLowerCase(),
      maxCapacity: 80,
      ownerEmail: `registered-owner-${runId}@whatboo.test`,
      ownerFirstName: 'Registered',
      ownerLastName: 'Owner',
      timezone: 'Europe/Madrid',
    };

    const missingToken = await fetch(`${baseUrl}/auth/register-tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const missingTokenText = await missingToken.text();
    assert.equal(missingToken.status, 403, missingTokenText);

    const invalidToken = await fetch(`${baseUrl}/auth/register-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Onboarding-Token': 'wrong-token',
      },
      body: JSON.stringify(payload),
    });
    assert.equal(invalidToken.status, 403);

    const validToken = await fetch(`${baseUrl}/auth/register-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Onboarding-Token': onboardingToken,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(validToken.status, 201);
    const body = await validToken.json() as { accessToken?: string };
    assert.ok(body.accessToken);

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: payload.slug },
      select: { id: true },
    });
    registeredTenantId = restaurant?.id;
    assert.ok(registeredTenantId);
  });

  it('whatsapp webhook validates signature against the raw request body', async () => {
    const rawBody = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry-id',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '34910000000', phone_number_id: 'phone-number-id' },
                messages: [
                  {
                    id: `wamid.${runId}`,
                    from: '34611111111',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'text',
                    text: { body: 'Hola, quiero reservar' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const signature = `sha256=${crypto.createHmac('sha256', whatsappAppSecret).update(rawBody).digest('hex')}`;

    const accepted = await fetch(`${baseUrl}/whatsapp/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
      },
      body: rawBody,
    });
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { status: 'ok' });

    const rejected = await fetch(`${baseUrl}/whatsapp/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=bad',
      },
      body: rawBody,
    });
    assert.equal(rejected.status, 401);
  });

  it('email healthcheck reports smtp and queue status', async () => {
    const response = await fetch(`${baseUrl}/health/email`);
    assert.equal(response.status, 200);
    const body = await response.json() as {
      status: string;
      checks: {
        smtp: { status: string };
        queue: { status: string; mode: string };
      };
    };

    assert.equal(body.status, 'ok');
    assert.equal(body.checks.smtp.status, 'up');
    assert.equal(body.checks.queue.status, 'up');
    assert.equal(body.checks.queue.mode, 'test');
  });

  it('queue healthcheck reports email and whatsapp queues', async () => {
    const response = await fetch(`${baseUrl}/health/queues`);
    assert.equal(response.status, 200);
    const body = await response.json() as {
      status: string;
      checks: {
        email: { status: string };
        whatsapp: { status: string; mode: string };
      };
    };

    assert.equal(body.status, 'ok');
    assert.equal(body.checks.email.status, 'up');
    assert.equal(body.checks.whatsapp.status, 'up');
    assert.equal(body.checks.whatsapp.mode, 'redis');
  });

  it('liveness and readiness healthchecks expose deployment probes', async () => {
    const live = await fetch(`${baseUrl}/health/live`);
    assert.equal(live.status, 200);
    const liveBody = await live.json() as { status: string; checks: { api: { status: string } } };
    assert.equal(liveBody.status, 'ok');
    assert.equal(liveBody.checks.api.status, 'up');

    const ready = await fetch(`${baseUrl}/health/ready`);
    assert.equal(ready.status, 200);
    const readyBody = await ready.json() as {
      status: string;
      checks: {
        database: { status: string };
        emailQueue: { status: string };
        whatsappQueue: { status: string };
      };
    };
    assert.equal(readyBody.status, 'ok');
    assert.equal(readyBody.checks.database.status, 'up');
    assert.equal(readyBody.checks.emailQueue.status, 'up');
    assert.equal(readyBody.checks.whatsappQueue.status, 'up');
  });

  it('runtime openapi endpoint serves the validated contract', async () => {
    const response = await fetch(`${baseUrl}/openapi.json`);
    assert.equal(response.status, 200);
    const body = await response.json() as { openapi?: string; info?: { version?: string }; paths?: Record<string, unknown> };

    assert.equal(body.openapi, '3.1.0');
    assert.equal(body.info?.version, '2026.06.30');
    assert.ok(body.paths?.['/reservations/{id}/no-show-audits']);
    assert.ok(body.paths?.['/platform/admin/restaurants/{id}']);
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

    await prisma.openingHour.createMany({
      data: Object.values(DayOfWeek).map((dayOfWeek) => ({
        restaurantId: restaurant.id,
        dayOfWeek,
        openTime: '00:00',
        closeTime: '23:59',
        isClosed: false,
        active: true,
      })),
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

  async function createPlatformAdmin(tenant: TestTenant): Promise<TestTenant> {
    const email = `platform-admin-${runId}@whatboo.test`;
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await prisma.user.create({
      data: {
        restaurantId: tenant.restaurantId,
        email,
        firstName: 'Platform',
        lastName: 'Admin',
        passwordHash,
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
      },
    });

    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': tenant.slug,
      },
      body: JSON.stringify({
        email,
        password: 'Password123!',
        restaurantSlug: tenant.slug,
      }),
    });

    assert.equal(login.status, 200);
    const body = await login.json() as { accessToken: string };
    return {
      restaurantId: tenant.restaurantId,
      slug: tenant.slug,
      ownerEmail: email,
      token: body.accessToken,
    };
  }

  async function cleanupTenant(restaurantId?: string): Promise<void> {
    if (!restaurantId) return;
    await prisma.reservationCancellationAudit.deleteMany({ where: { restaurantId } });
    await prisma.reservationNoShowAudit.deleteMany({ where: { restaurantId } });
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
