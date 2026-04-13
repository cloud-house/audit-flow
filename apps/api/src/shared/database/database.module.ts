import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditEntity } from '../../modules/analysis/infrastructure/audit.entity';
import { AuditCheckEntity } from '../../modules/analysis/infrastructure/audit-check.entity';
import { ClientEntity } from '../../modules/client-project/infrastructure/client.entity';
import { ProjectEntity } from '../../modules/client-project/infrastructure/project.entity';
import { ReportEntity } from '../../modules/reporting/infrastructure/report.entity';
import { UserEntity } from '../../modules/auth/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [
          AuditEntity,
          AuditCheckEntity,
          ClientEntity,
          ProjectEntity,
          ReportEntity,
          UserEntity,
        ],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
