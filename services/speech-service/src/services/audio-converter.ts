import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { logger } from '@/utils/logger';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

// 设置FFmpeg路径
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface AudioConversionOptions {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  format?: 'wav' | 'pcm';
}

export class AudioConverter {
  /**
   * 将任何格式的音频转换为ASR要求的PCM格式
   * - PCM格式
   * - 单声道 (1 channel)
   * - 16位采样
   * - 16,000 Hz采样率
   * - Little-endian格式
   */
  static async convertToASRFormat(
    audioBuffer: Buffer,
    originalFormat?: string
  ): Promise<Buffer> {
    const requestId = uuidv4();

    logger.info('Starting audio conversion for ASR', {
      requestId,
      inputSize: audioBuffer.length,
      originalFormat
    });

    const options: AudioConversionOptions = {
      sampleRate: 16000,  // ASR要求的采样率
      channels: 1,        // 单声道
      bitDepth: 16,       // 16位采样
      format: 'wav'       // WAV容器格式
    };

    try {
      const convertedBuffer = await this.convertAudio(audioBuffer, options, requestId);

      logger.info('Audio conversion completed', {
        requestId,
        outputSize: convertedBuffer.length,
        compressionRatio: (audioBuffer.length / convertedBuffer.length).toFixed(2)
      });

      return convertedBuffer;
    } catch (error) {
      logger.error('Audio conversion failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Audio conversion failed: ${error}`);
    }
  }

  /**
   * 通用音频转换方法
   */
  private static async convertAudio(
    inputBuffer: Buffer,
    options: AudioConversionOptions,
    requestId: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // 检测音频格式，决定使用文件模式还是流模式
        const format = this.detectAudioFormat(inputBuffer);
        const useFileMode = this.needsFileMode(format);

        logger.info('Setting up FFmpeg conversion', {
          requestId,
          options,
          format,
          useFileMode,
          inputSize: inputBuffer.length
        });

        if (useFileMode) {
          // 文件模式：适用于MP4等容器格式
          this.convertWithFileMode(inputBuffer, options, requestId).then(resolve).catch(reject);
        } else {
          // 流模式：适用于MP3、WAV等流格式
          this.convertWithStreamMode(inputBuffer, options, requestId).then(resolve).catch(reject);
        }
      } catch (error) {
        logger.error('FFmpeg setup error', {
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
        reject(error);
      }
    });
  }

  /**
   * 流模式转换：适用于MP3、WAV等格式
   */
  private static async convertWithStreamMode(
    inputBuffer: Buffer,
    options: AudioConversionOptions,
    requestId: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];

        // 创建可读流从Buffer
        const inputStream = new Readable({
          read() {
            this.push(inputBuffer);
            this.push(null); // 结束流
          }
        });

        logger.info('Using stream mode conversion', { requestId });

        // 配置FFmpeg转换 - 修复重复参数问题
        const command = ffmpeg(inputStream)
          .audioFrequency(options.sampleRate || 16000)  // 采样率
          .audioChannels(options.channels || 1)         // 声道数
          .audioCodec('pcm_s16le')                      // 16位 PCM Little-endian
          .format('wav')                                // 输出格式
          // 性能优化参数（移除重复和无效参数）
          .addOption('-threads', '2')                   // 使用2个线程
          .on('start', (cmdline) => {
            logger.info('FFmpeg stream conversion started', {
              requestId,
              command: cmdline
            });
          })
          .on('progress', (progress) => {
            logger.debug('FFmpeg stream conversion progress', {
              requestId,
              percent: progress.percent,
              timemark: progress.timemark
            });
          })
          .on('error', (error) => {
            logger.error('FFmpeg stream conversion error', {
              requestId,
              error: error.message
            });
            reject(new Error(`FFmpeg stream conversion error: ${error.message}`));
          })
          .on('end', () => {
            logger.info('FFmpeg stream conversion completed', {
              requestId,
              outputChunks: chunks.length,
              totalSize: Buffer.concat(chunks).length
            });
            resolve(Buffer.concat(chunks));
          });

        // 将输出写入Buffer
        const stream = command.pipe();
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on('error', (error) => {
          logger.error('FFmpeg stream error', {
            requestId,
            error: error.message
          });
          reject(error);
        });

      } catch (error) {
        logger.error('FFmpeg stream setup error', {
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
        reject(error);
      }
    });
  }

  /**
   * 文件模式转换：适用于MP4、M4A等容器格式
   */
  private static async convertWithFileMode(
    inputBuffer: Buffer,
    options: AudioConversionOptions,
    requestId: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      // 创建临时文件
      const tempDir = os.tmpdir();
      const tempInputFile = path.join(tempDir, `ffmpeg_input_${requestId}.dat`);
      const tempOutputFile = path.join(tempDir, `ffmpeg_output_${requestId}.wav`);

      try {
        logger.info('Using file mode conversion', {
          requestId,
          tempInputFile,
          tempOutputFile
        });

        // 写入临时输入文件
        fs.writeFileSync(tempInputFile, inputBuffer);

        // 使用文件模式进行转换
        const command = ffmpeg(tempInputFile)
          .audioFrequency(options.sampleRate || 16000)
          .audioChannels(options.channels || 1)
          .audioCodec('pcm_s16le')
          .format('wav')
          .addOption('-threads', '2')
          .on('start', (cmdline) => {
            logger.info('FFmpeg file conversion started', {
              requestId,
              command: cmdline
            });
          })
          .on('progress', (progress) => {
            logger.debug('FFmpeg file conversion progress', {
              requestId,
              percent: progress.percent,
              timemark: progress.timemark
            });
          })
          .on('error', (error) => {
            // 清理临时文件
            this.cleanupTempFiles([tempInputFile, tempOutputFile], requestId);

            logger.error('FFmpeg file conversion error', {
              requestId,
              error: error.message
            });
            reject(new Error(`FFmpeg file conversion error: ${error.message}`));
          })
          .on('end', () => {
            try {
              // 读取输出文件
              const outputBuffer = fs.readFileSync(tempOutputFile);

              // 清理临时文件
              this.cleanupTempFiles([tempInputFile, tempOutputFile], requestId);

              logger.info('FFmpeg file conversion completed', {
                requestId,
                outputSize: outputBuffer.length
              });

              resolve(outputBuffer);
            } catch (readError) {
              // 清理临时文件
              this.cleanupTempFiles([tempInputFile, tempOutputFile], requestId);

              logger.error('Failed to read converted file', {
                requestId,
                error: readError instanceof Error ? readError.message : String(readError)
              });
              reject(new Error(`Failed to read converted audio: ${readError}`));
            }
          });

        // 保存到临时输出文件
        command.save(tempOutputFile);

      } catch (error) {
        // 清理可能创建的临时文件
        this.cleanupTempFiles([tempInputFile, tempOutputFile], requestId);

        logger.error('FFmpeg file setup error', {
          requestId,
          error: error instanceof Error ? error.message : String(error)
        });
        reject(new Error(`FFmpeg file setup error: ${error}`));
      }
    });
  }

  /**
   * 清理临时文件
   */
  private static cleanupTempFiles(files: string[], requestId: string) {
    const fs = require('fs');

    files.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temp file', {
          requestId,
          file,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        });
      }
    });
  }

  /**
   * 检测音频格式
   */
  static detectAudioFormat(buffer: Buffer): string {
    const header = buffer.slice(0, 12).toString('ascii');

    if (header.includes('ftypmp4') || header.includes('ftypisom')) {
      return 'mp4';
    } else if (header.includes('ftypM4A')) {
      return 'm4a';
    } else if (header.startsWith('RIFF') && header.includes('WAVE')) {
      return 'wav';
    } else if (header.startsWith('ID3') || buffer.slice(0, 2).toString('hex') === 'fff3') {
      return 'mp3';
    } else if (header.includes('OggS')) {
      return 'ogg';
    } else {
      return 'unknown';
    }
  }

  /**
   * 判断格式是否需要文件模式（支持随机访问）
   * 容器格式（MP4, M4A, MOV等）需要文件模式，流格式（MP3, WAV等）可以用pipe
   */
  private static needsFileMode(format: string): boolean {
    // 这些格式需要随机访问，必须使用文件模式
    const containerFormats = ['mp4', 'm4a', 'mov', 'unknown'];
    return containerFormats.includes(format);
  }

  /**
   * 验证音频是否符合ASR要求
   */
  static async validateASRFormat(buffer: Buffer): Promise<boolean> {
    try {
      // 简单检查：WAV文件头和基本结构
      if (buffer.length < 44) {
        return false; // WAV文件至少需要44字节的头部
      }

      const header = buffer.slice(0, 44);
      const riff = header.slice(0, 4).toString('ascii');
      const wave = header.slice(8, 12).toString('ascii');

      if (riff !== 'RIFF' || wave !== 'WAVE') {
        return false;
      }

      // 检查格式信息
      const audioFormat = header.readUInt16LE(20); // PCM = 1
      const channels = header.readUInt16LE(22);
      const sampleRate = header.readUInt32LE(24);
      const bitsPerSample = header.readUInt16LE(34);

      const isValidFormat =
        audioFormat === 1 &&           // PCM
        channels === 1 &&              // 单声道
        (sampleRate === 8000 || sampleRate === 16000) && // 支持的采样率
        bitsPerSample === 16;           // 16位

      logger.info('ASR format validation', {
        isValid: isValidFormat,
        audioFormat,
        channels,
        sampleRate,
        bitsPerSample
      });

      return isValidFormat;
    } catch (error) {
      logger.error('ASR format validation error', { error });
      return false;
    }
  }
}