import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Airport, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../core/pagination/pagination';
import { AirportRepository } from './airport.repository';
import { CreateAirportDto } from './dto/create-airport.dto';
import { UpdateAirportDto } from './dto/update-airport.dto';

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

function isForeignKeyViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003';
}

@Injectable()
export class AirportService {
  constructor(private readonly airportRepository: AirportRepository) {}

  async list(page: number, pageSize: number): Promise<PaginatedResult<Airport>> {
    return this.airportRepository.paginate<Airport>({ orderBy: { iataCode: 'asc' }, page, pageSize });
  }

  async getById(id: string): Promise<Airport> {
    const airport = (await this.airportRepository.findById(id)) as Airport | null;
    if (!airport) {
      throw new NotFoundException('Airport not found');
    }
    return airport;
  }

  async create(dto: CreateAirportDto): Promise<Airport> {
    try {
      return (await this.airportRepository.create({ ...dto })) as Airport;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('IATA code already in use');
      }
      if (isForeignKeyViolation(err)) {
        throw new UnprocessableEntityException('cityId must reference an existing city');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAirportDto): Promise<Airport> {
    try {
      return (await this.airportRepository.update(id, { ...dto })) as Airport;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('IATA code already in use');
      }
      if (isForeignKeyViolation(err)) {
        throw new UnprocessableEntityException('cityId must reference an existing city');
      }
      throw err;
    }
  }
}
