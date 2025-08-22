import { Module } from '@nestjs/common';
import { VideoFilterService } from './nsfw/video.filter.service';

@Module({
  providers: [VideoFilterService],
  exports: [VideoFilterService],
})
export class FilterModule {}
