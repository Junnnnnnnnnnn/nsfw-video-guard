import { FilterModule } from '@app/filter/filter.module';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';

@Module({
  imports: [FilterModule],
  controllers: [AppController],
})
export class AppModule {}
