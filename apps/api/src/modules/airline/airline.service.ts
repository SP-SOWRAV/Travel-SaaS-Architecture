import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Airline, Prisma } from '@prisma/client';
import { PaginatedResult } from '../../core/pagination/pagination';
import { AirlineRepository } from './airline.repository';
import { CreateAirlineDto } from './dto/create-airline.dto';
import { UpdateAirlineDto } from './dto/update-airline.dto';

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

@Injectable()
export class AirlineService {
  constructor(private readonly airlineRepository: AirlineRepository) {}

  async list(page: number, pageSize: number): Promise<PaginatedResult<Airline>> {
    return this.airlineRepository.paginate<Airline>({ orderBy: { iataCode: 'asc' }, page, pageSize });
  }

  async getById(id: string): Promise<Airline> {
    const airline = (await this.airlineRepository.findById(id)) as Airline | null;
    if (!airline) {
      throw new NotFoundException('Airline not found');
    }
    return airline;
  }

  async create(dto: CreateAirlineDto): Promise<Airline> {
    try {
      return (await this.airlineRepository.create({ ...dto })) as Airline;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('IATA code already in use');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateAirlineDto): Promise<Airline> {
    try {
      return (await this.airlineRepository.update(id, { ...dto })) as Airline;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('IATA code already in use');
      }
      throw err;
    }
  }
}
