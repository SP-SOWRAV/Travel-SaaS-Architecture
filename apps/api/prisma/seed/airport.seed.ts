import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Representative major-hub dataset, matched to cities seeded by geo.seed.ts (T24).
const AIRPORTS: { cityName: string; iataCode: string; icaoCode?: string; name: string }[] = [
  { cityName: 'New York', iataCode: 'JFK', icaoCode: 'KJFK', name: 'John F. Kennedy International Airport' },
  { cityName: 'Los Angeles', iataCode: 'LAX', icaoCode: 'KLAX', name: 'Los Angeles International Airport' },
  { cityName: 'Chicago', iataCode: 'ORD', icaoCode: 'KORD', name: "O'Hare International Airport" },
  { cityName: 'London', iataCode: 'LHR', icaoCode: 'EGLL', name: 'Heathrow Airport' },
  { cityName: 'Paris', iataCode: 'CDG', icaoCode: 'LFPG', name: 'Charles de Gaulle Airport' },
  { cityName: 'Frankfurt', iataCode: 'FRA', icaoCode: 'EDDF', name: 'Frankfurt Airport' },
  { cityName: 'Dubai', iataCode: 'DXB', icaoCode: 'OMDB', name: 'Dubai International Airport' },
  { cityName: 'Singapore', iataCode: 'SIN', icaoCode: 'WSSS', name: 'Singapore Changi Airport' },
  { cityName: 'Tokyo', iataCode: 'NRT', icaoCode: 'RJAA', name: 'Narita International Airport' },
  { cityName: 'Delhi', iataCode: 'DEL', icaoCode: 'VIDP', name: 'Indira Gandhi International Airport' },
  { cityName: 'Mumbai', iataCode: 'BOM', icaoCode: 'VABB', name: 'Chhatrapati Shivaji Maharaj International Airport' },
  { cityName: 'Sydney', iataCode: 'SYD', icaoCode: 'YSSY', name: 'Sydney Kingsford Smith Airport' },
  { cityName: 'Toronto', iataCode: 'YYZ', icaoCode: 'CYYZ', name: 'Toronto Pearson International Airport' },
  { cityName: 'Beijing', iataCode: 'PEK', icaoCode: 'ZBAA', name: 'Beijing Capital International Airport' },
  { cityName: 'Shanghai', iataCode: 'PVG', icaoCode: 'ZSPD', name: 'Shanghai Pudong International Airport' },
  { cityName: 'Doha', iataCode: 'DOH', icaoCode: 'OTHH', name: 'Hamad International Airport' },
  { cityName: 'Istanbul', iataCode: 'IST', icaoCode: 'LTFM', name: 'Istanbul Airport' },
  { cityName: 'Amsterdam', iataCode: 'AMS', icaoCode: 'EHAM', name: 'Amsterdam Airport Schiphol' },
  { cityName: 'Dhaka', iataCode: 'DAC', icaoCode: 'VGHS', name: 'Hazrat Shahjalal International Airport' },
  { cityName: 'Bangkok', iataCode: 'BKK', icaoCode: 'VTBS', name: 'Suvarnabhumi Airport' },
  { cityName: 'Seoul', iataCode: 'ICN', icaoCode: 'RKSI', name: 'Incheon International Airport' },
  { cityName: 'Rome', iataCode: 'FCO', icaoCode: 'LIRF', name: 'Leonardo da Vinci–Fiumicino Airport' },
  { cityName: 'Madrid', iataCode: 'MAD', icaoCode: 'LEMD', name: 'Adolfo Suárez Madrid–Barajas Airport' },
  { cityName: 'Kuala Lumpur', iataCode: 'KUL', icaoCode: 'WMKK', name: 'Kuala Lumpur International Airport' },
];

async function main() {
  for (const airport of AIRPORTS) {
    const city = await prisma.city.findFirst({ where: { name: airport.cityName } });
    if (!city) {
      throw new Error(`City "${airport.cityName}" not found — run geo.seed.ts first`);
    }

    await prisma.airport.upsert({
      where: { iataCode: airport.iataCode },
      update: { name: airport.name, icaoCode: airport.icaoCode, cityId: city.id },
      create: {
        cityId: city.id,
        iataCode: airport.iataCode,
        icaoCode: airport.icaoCode,
        name: airport.name,
      },
    });
  }

  const count = await prisma.airport.count();
  console.log(`Seeded/verified ${count} airports.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
