import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizePhone } from '../src/common/phone/phone-normalizer.util';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const customers = await prisma.customer.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(
    'ID;RESTAURANT;CURRENT_PHONE;NORMALIZED_PHONE;VALID;COUNTRY',
  );

  for (const customer of customers) {
    const result = normalizePhone(customer.phone);

    console.log(
      [
        customer.id,
        customer.restaurantId,
        customer.phone,
        result.normalizedPhone,
        result.isValid,
        result.country ?? '',
      ].join(';'),
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
