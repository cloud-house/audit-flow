import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Public } from '../../shared/guards/jwt-auth.guard';

// Inline entity for users (simple approach — no separate module)
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ name: 'full_name', length: 255 })
  fullName!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class RegisterDto extends LoginDto {
  @IsString()
  @MinLength(2)
  fullName!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const existing = await this.users.findOneBy({ email: dto.email });
    if (existing) throw new UnauthorizedException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.users.create({ email: dto.email, passwordHash, fullName: dto.fullName });
    await this.users.save(user);

    return this.buildTokenResponse(user);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildTokenResponse(user);
  }

  @Post('logout')
  @HttpCode(204)
  logout() {
    // Stateless JWT — client drops the token
    return;
  }

  @Get('me')
  me(@Request() req: { user: { id: string; email: string; fullName: string } }) {
    return req.user;
  }

  private buildTokenResponse(user: UserEntity) {
    const payload = { sub: user.id, email: user.email, fullName: user.fullName };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      expiresIn: 900,
      user: { id: user.id, email: user.email, fullName: user.fullName },
    };
  }
}
