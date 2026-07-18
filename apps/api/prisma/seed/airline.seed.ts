import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Representative major-carrier dataset (T26).
const AIRLINES: { iataCode: string; icaoCode?: string; name: string }[] = [
  { iataCode: 'AA', icaoCode: 'AAL', name: 'American Airlines' },
  { iataCode: 'DL', icaoCode: 'DAL', name: 'Delta Air Lines' },
  { iataCode: 'UA', icaoCode: 'UAL', name: 'United Airlines' },
  { iataCode: 'BA', icaoCode: 'BAW', name: 'British Airways' },
  { iataCode: 'AF', icaoCode: 'AFR', name: 'Air France' },
  { iataCode: 'LH', icaoCode: 'DLH', name: 'Lufthansa' },
  { iataCode: 'EK', icaoCode: 'UAE', name: 'Emirates' },
  { iataCode: 'QR', icaoCode: 'QTR', name: 'Qatar Airways' },
  { iataCode: 'SQ', icaoCode: 'SIA', name: 'Singapore Airlines' },
  { iataCode: 'CX', icaoCode: 'CPA', name: 'Cathay Pacific' },
  { iataCode: 'JL', icaoCode: 'JAL', name: 'Japan Airlines' },
  { iataCode: 'NH', icaoCode: 'ANA', name: 'All Nippon Airways' },
  { iataCode: 'AI', icaoCode: 'AIC', name: 'Air India' },
  { iataCode: '6E', icaoCode: 'IGO', name: 'IndiGo' },
  { iataCode: 'QF', icaoCode: 'QFA', name: 'Qantas' },
  { iataCode: 'AC', icaoCode: 'ACA', name: 'Air Canada' },
  { iataCode: 'CA', icaoCode: 'CCA', name: 'Air China' },
  { iataCode: 'MU', icaoCode: 'CES', name: 'China Eastern Airlines' },
  { iataCode: 'TK', icaoCode: 'THY', name: 'Turkish Airlines' },
  { iataCode: 'KL', icaoCode: 'KLM', name: 'KLM Royal Dutch Airlines' },
  { iataCode: 'BG', icaoCode: 'BBC', name: 'Biman Bangladesh Airlines' },
  { iataCode: 'TG', icaoCode: 'THA', name: 'Thai Airways' },
  { iataCode: 'KE', icaoCode: 'KAL', name: 'Korean Air' },
  { iataCode: 'AZ', icaoCode: 'ITY', name: 'ITA Airways' },
  { iataCode: 'IB', icaoCode: 'IBE', name: 'Iberia' },
  { iataCode: 'MH', icaoCode: 'MAS', name: 'Malaysia Airlines' },
];

async function main() {
  for (const airline of AIRLINES) {
    await prisma.airline.upsert({
      where: { iataCode: airline.iataCode },
      update: { name: airline.name, icaoCode: airline.icaoCode },
      create: airline,
    });
  }

  const count = await prisma.airline.count();
  console.log(`Seeded/verified ${count} airlines.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
