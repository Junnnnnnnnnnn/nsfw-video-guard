/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-require-imports */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node-gpu';
import ffmpegPath from 'ffmpeg-static';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fs from 'node:fs/promises';
import Pipe2Jpeg from 'pipe2jpeg';

type Summary = {
  sexy: string; // '70%'
  nude: string; // '10%'
  totalFrames: number;
  sexyFrames: number;
  nudeFrames: number;
};

@Injectable()
export class VideoFilterService implements OnModuleInit, OnModuleDestroy {
  private totalFrames = 0;
  private sexyFrames = 0;
  private nudeFrames = 0;

  private labels = [
    'exposed anus',
    'exposed armpits',
    'belly',
    'exposed belly',
    'buttocks',
    'exposed buttocks',
    'female face',
    'male face',
    'feet',
    'exposed feet',
    'breast',
    'exposed breast',
    'vagina',
    'exposed vagina',
    'male breast',
    'exposed male breast',
  ];

  private composite = {
    person: [6, 7],
    sexy: [1, 2, 3, 4, 8, 9, 10, 15],
    nude: [0, 5, 11, 12, 13],
  };
  private busy = false;

  private readonly logger = new Logger(VideoFilterService.name);
  private model!: tf.GraphModel;

  private pipe = new Pipe2Jpeg();
  private ffmpeg?: ChildProcessWithoutNullStreams;

  private frame = 0;

  private readonly options = {
    modelPath: 'file://libs/filter/src/nsfw/model/default-f16/model.json',
    outputNodes: ['output1', 'output2', 'output3'] as const,
    fpsScaleFilter: 'fps=1,scale=320:320:flags=bilinear',
  };

  async onModuleInit() {
    await tf.ready();
    this.logger.log(`TFJS backend: ${tf.getBackend()}`);

    this.model = await tf.loadGraphModel(this.options.modelPath);

    await this.assertFfmpegAvailable();

    const warm = tf.zeros<tf.Rank.R4>([1, 320, 320, 3]);
    await this.model.executeAsync(warm, this.options.outputNodes as any);
    warm.dispose();

    this.pipe.on('data', async (jpeg: Buffer) => {
      if (this.busy) return;
      this.busy = true;
      try {
        await this.runDetectionAndLog(jpeg);
      } catch (e) {
        this.logger.error(e);
      } finally {
        this.busy = false;
      }
    });

    this.pipe.on('error', (e) => this.logger.error('pipe2jpeg error', e));
    this.logger.log('NSFW model loaded and pipe ready.');
  }

  async analyzeFileAndCleanup(
    filePath: string,
  ): Promise<{ sexy: string; nude: string }> {
    if (this.ffmpeg) this.stop('restart');

    this.frame = 0;
    this.resetCounters();

    try {
      await this.spawnFfmpegFromFile(filePath, this.options.fpsScaleFilter);
      const summary = this.makeSummary();

      this.logger.log(`✅ analyze done: ${JSON.stringify(summary)}`);
      return { sexy: summary.sexy, nude: summary.nude };
    } finally {
      try {
        await fs.unlink(filePath);
      } catch {
        this.logger.warn(`unlink failed: ${filePath}`);
      }
    }
  }

  private spawnFfmpegFromFile(
    inputPath: string,
    fpsScaleFilter: string,
  ): Promise<void> {
    const args = [
      '-loglevel',
      'quiet',
      '-i',
      inputPath,
      '-an',
      '-c:v',
      'mjpeg',
      '-q:v',
      '7',
      '-pix_fmt',
      'yuvj422p',
      '-f',
      'image2pipe',
      'pipe:1',
    ];

    const bin = this.getFfmpegBin();

    this.ffmpeg = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    this.ffmpeg.stdout.pipe(this.pipe);

    this.ffmpeg.on('error', (err) => this.logger.error('ffmpeg error', err));
    this.logger.log(
      `FFmpeg started for ${inputPath} (filter: ${fpsScaleFilter})`,
    );

    return new Promise<void>((resolve, reject) => {
      this.ffmpeg.once('exit', (code, sig) => {
        this.logger.log(`ffmpeg exit: code=${code} sig=${sig}`);
        try {
          this.ffmpeg.stdout.unpipe(this.pipe);
        } catch {}
        this.ffmpeg = undefined;
        resolve();
      });
      this.ffmpeg.once('error', (err) => {
        try {
          this.ffmpeg.stdout.unpipe(this.pipe);
        } catch {}
        this.ffmpeg = undefined;
        reject(err);
      });
    });
  }

  private resetCounters() {
    this.totalFrames = 0;
    this.sexyFrames = 0;
    this.nudeFrames = 0;
  }

  private makeSummary(): Summary {
    const pct = (num: number, den: number) =>
      den === 0 ? 0 : Math.round((num / den) * 100);
    const sexyPct = pct(this.sexyFrames, this.totalFrames);
    const nudePct = pct(this.nudeFrames, this.totalFrames);
    return {
      sexy: `${sexyPct}%`,
      nude: `${nudePct}%`,
      totalFrames: this.totalFrames,
      sexyFrames: this.sexyFrames,
      nudeFrames: this.nudeFrames,
    };
  }

  private async runDetectionAndLog(jpegBuffer: Buffer): Promise<void> {
    this.frame += 1;
    this.totalFrames += 1;

    const t0 = process.hrtime.bigint();
    const img = tf.node.decodeJpeg(jpegBuffer, 3);
    const f32 = img.toFloat();
    const input = f32.expandDims(0);

    let boxes: tf.Tensor | undefined;
    let scores: tf.Tensor | undefined;
    let classes: tf.Tensor | undefined;

    try {
      [boxes, scores, classes] = (await this.model.executeAsync(
        input,
        this.options.outputNodes as any,
      )) as tf.Tensor[];

      const { sexy, nude } = await this.classifyFrame(boxes, scores, classes);

      if (sexy) this.sexyFrames += 1;
      if (nude) this.nudeFrames += 1;

      const t1 = process.hrtime.bigint();
      const timeMs = Math.round(Number(t1 - t0) / 1e6);

      this.logger.debug(
        JSON.stringify({
          frame: this.frame,
          timeMs,
          sexyFrame: sexy,
          nudeFrame: nude,
        }),
      );
    } finally {
      tf.dispose([img, f32, input, boxes, scores, classes].filter(Boolean));
    }
  }

  /** 실행 중 파이프라인 종료 */
  private stop(reason = 'stop') {
    try {
      this.ffmpeg?.stdin?.destroy();
      this.ffmpeg?.stdout?.unpipe(this.pipe);
      this.ffmpeg?.kill('SIGTERM');
      this.ffmpeg = undefined;
      this.logger.log(`FFmpeg stopped (${reason})`);
    } catch (e) {
      this.logger.error(e);
    }
  }

  private getFfmpegBin() {
    return (
      ffmpegPath || (process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
    );
  }

  private async assertFfmpegAvailable() {
    const bin = this.getFfmpegBin();
    try {
      const { spawnSync } = await import('node:child_process');
      const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
      if (r.error) throw r.error;
      this.logger.log(
        `FFmpeg OK: ${r.stdout?.split('\n')?.[0] ?? 'version checked'}`,
      );
    } catch (e) {
      this.logger.error(`FFmpeg not available. Tried: ${bin}`);
      throw e;
    }
  }

  private async classifyFrame(
    boxesTensor?: tf.Tensor,
    scoresTensor?: tf.Tensor,
    classesTensor?: tf.Tensor,
  ): Promise<{ sexy: boolean; nude: boolean }> {
    const boxes = await boxesTensor.array();
    const scores = await scoresTensor.data();
    const classes = await classesTensor.data();
    const MAX_BOXES = 20;
    const IOU_TH = 0.5;
    const SCORE_TH = 0.6;

    const nmsT = await tf.image.nonMaxSuppressionAsync(
      boxes[0],
      scores,
      MAX_BOXES,
      IOU_TH,
      SCORE_TH,
    );

    const nms = await nmsT.data();

    tf.dispose(nmsT);

    const parts = [];

    nms.forEach((i) => {
      const id = parseInt(i);
      parts.push({
        score: scores[i],
        id: classes[id],
        class: this.labels[classes[id]],
        box: [
          Math.trunc(boxes[0][id][0]),
          Math.trunc(boxes[0][id][1]),
          Math.trunc(boxes[0][id][3] - boxes[0][id][1]),
          Math.trunc(boxes[0][id][2] - boxes[0][id][0]),
        ],
      });
    });

    const result = {
      sexy: parts.filter((a) => this.composite.sexy.includes(a.id)).length > 0,
      nude: parts.filter((a) => this.composite.nude.includes(a.id)).length > 0,
    };
    return result;
  }

  async onModuleDestroy() {
    this.stop('onModuleDestroy');
    try {
      this.pipe.removeAllListeners();
      this.model?.dispose();
    } catch (e) {
      this.logger.error(e);
    }
  }
}
