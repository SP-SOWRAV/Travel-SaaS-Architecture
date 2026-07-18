import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Representative global dataset — enough to support Airport/Airline seeding (T25/T26)
// and the Reference Data pickers (T27). Not exhaustive; platform-maintained, seeded once.
const COUNTRIES: { name: string; isoCode: string; cities: string[] }[] = [
  { name: 'United States', isoCode: 'US', cities: ['New York', 'Los Angeles', 'Chicago'] },
  { name: 'United Kingdom', isoCode: 'GB', cities: ['London', 'Manchester'] },
  { name: 'France', isoCode: 'FR', cities: ['Paris', 'Nice'] },
  { name: 'Germany', isoCode: 'DE', cities: ['Frankfurt', 'Berlin', 'Munich'] },
  { name: 'United Arab Emirates', isoCode: 'AE', cities: ['Dubai', 'Abu Dhabi'] },
  { name: 'Singapore', isoCode: 'SG', cities: ['Singapore'] },
  { name: 'Japan', isoCode: 'JP', cities: ['Tokyo', 'Osaka'] },
  { name: 'India', isoCode: 'IN', cities: ['Delhi', 'Mumbai', 'Bengaluru'] },
  { name: 'Australia', isoCode: 'AU', cities: ['Sydney', 'Melbourne'] },
  { name: 'Canada', isoCode: 'CA', cities: ['Toronto', 'Vancouver'] },
  { name: 'China', isoCode: 'CN', cities: ['Beijing', 'Shanghai'] },
  { name: 'Qatar', isoCode: 'QA', cities: ['Doha'] },
  { name: 'Turkey', isoCode: 'TR', cities: ['Istanbul'] },
  { name: 'Netherlands', isoCode: 'NL', cities: ['Amsterdam'] },
  { name: 'Bangladesh', isoCode: 'BD', cities: ['Dhaka', 'Chittagong'] },
  { name: 'Thailand', isoCode: 'TH', cities: ['Bangkok'] },
  { name: 'South Korea', isoCode: 'KR', cities: ['Seoul'] },
  { name: 'Italy', isoCode: 'IT', cities: ['Rome', 'Milan'] },
  { name: 'Spain', isoCode: 'ES', cities: ['Madrid', 'Barcelona'] },
  { name: 'Malaysia', isoCode: 'MY', cities: ['Kuala Lumpur'] },
];

async function main() {
  for (const country of COUNTRIES) {
    const record = await prisma.country.upsert({
      where: { isoCode: country.isoCode },
      update: { name: country.name },
      create: { name: country.name, isoCode: country.isoCode },
    });

    for (const cityName of country.cities) {
      await prisma.city.upsert({
        where: { countryId_name: { countryId: record.id, name: cityName } },
        update: {},
        create: { countryId: record.id, name: cityName },
      });
    }
  }

  const countryCount = await prisma.country.count();
  const cityCount = await prisma.city.count();
  console.log(`Seeded/verified ${countryCount} countries and ${cityCount} cities.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
