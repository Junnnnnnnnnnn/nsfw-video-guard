import { VideoFilterService } from '@app/filter/nsfw/video.filter.service';
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { diskStorage } from 'multer';

@Controller('nsfw')
export class AppController {
  constructor(private readonly videoFilterService: VideoFilterService) {}

  @Post('analyze-upload')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/tmp', // must be exist dir
        filename: (_req, file, cb) => {
          const safe = (file.originalname ?? 'upload.bin').replace(
            /[^\w.\-]+/g,
            '_',
          );
          cb(null, `${Date.now()}__${safe}`);
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  async analyzeUpload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Record<string, any>> {
    if (!file?.path) {
      throw new BadRequestException('file is required');
    }

    return await this.videoFilterService.analyzeFileAndCleanup(file.path);
  }
}
