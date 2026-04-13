import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientEntity } from '../infrastructure/client.entity';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('clients')
export class ClientController {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clients: Repository<ClientEntity>,
  ) {}

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    const qb = this.clients.createQueryBuilder('c');
    if (search) qb.where('c.name ILIKE :s', { s: `%${search}%` });
    qb.skip((page - 1) * limit).take(limit).orderBy('c.createdAt', 'DESC');
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
    };
  }

  @Post()
  async create(@Body() dto: CreateClientDto) {
    const client = this.clients.create(dto);
    return this.clients.save(client);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const client = await this.clients.findOne({ where: { id }, relations: ['projects'] });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateClientDto>) {
    const client = await this.clients.findOneBy({ id });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    Object.assign(client, dto);
    return this.clients.save(client);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    const client = await this.clients.findOneBy({ id });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    await this.clients.remove(client);
  }
}
