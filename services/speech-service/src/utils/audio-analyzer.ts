import { logger } from '@/utils/logger';

// WAV音频元数据接口
export interface WAVMetadata {
  sampleRate: number;      // 采样率
  channels: number;        // 声道数
  bitDepth: number;        // 位深度
  bitRate: number;         // 比特率
  fileSize: number;        // 文件大小
  isValid: boolean;        // 是否为有效WAV文件
}

// WAV音频分析工具类 - 专门处理WAV格式
export class AudioAnalyzer {

  // WAV文件完整分析
  static analyzeWAV(audioBuffer: Buffer): WAVMetadata {
    if (!this.isWAVFormat(audioBuffer)) {
      throw new Error('Not a valid WAV file');
    }

    const metadata = this.parseWAV(audioBuffer);

    logger.debug('WAV analysis completed', {
      sampleRate: metadata.sampleRate,
      channels: metadata.channels,
      bitDepth: metadata.bitDepth,
      fileSize: metadata.fileSize,
      isValid: metadata.isValid
    });

    return metadata;
  }

  // 检测是否为WAV格式
  static isWAVFormat(audioBuffer: Buffer): boolean {
    return audioBuffer.length >= 12 &&
           audioBuffer.toString('ascii', 0, 4) === 'RIFF' &&
           audioBuffer.toString('ascii', 8, 12) === 'WAVE';
  }

  // WAV格式解析 - 按照标准RIFF/WAV规范
  static parseWAV(audioBuffer: Buffer): WAVMetadata {
    // 基本长度检查 - RIFF头部(12字节) + 最小fmt chunk(24字节) = 36字节
    if (audioBuffer.length < 36) {
      throw new Error('Invalid WAV file: too small for basic structure');
    }

    // 查找fmt chunk
    const fmtChunk = this.findChunk(audioBuffer, 'fmt ', 12);
    if (!fmtChunk) {
      throw new Error('Invalid WAV file: missing fmt chunk');
    }

    // 解析fmt chunk (标准PCM格式至少16字节)
    if (fmtChunk.size < 16) {
      throw new Error('Invalid WAV file: fmt chunk too small');
    }

    const audioFormat = audioBuffer.readUInt16LE(fmtChunk.offset + 8);
    const channels = audioBuffer.readUInt16LE(fmtChunk.offset + 10);
    const sampleRate = audioBuffer.readUInt32LE(fmtChunk.offset + 12);
    const byteRate = audioBuffer.readUInt32LE(fmtChunk.offset + 16);
    const bitDepth = audioBuffer.readUInt16LE(fmtChunk.offset + 22);

    // 验证音频格式 (1 = PCM)
    if (audioFormat !== 1) {
      throw new Error(`Unsupported audio format: ${audioFormat} (only PCM supported)`);
    }
    // 验证计算的一致性
    const expectedByteRate = sampleRate * channels * (bitDepth / 8);

    if (Math.abs(byteRate - expectedByteRate) > 1) {
      logger.warn('WAV byte rate mismatch', {
        declared: byteRate,
        calculated: expectedByteRate
      });
    }

    return {
      sampleRate,
      channels,
      bitDepth,
      bitRate: byteRate * 8,
      fileSize: audioBuffer.length,
      isValid: true
    };
  }

  // 查找指定的chunk
  private static findChunk(buffer: Buffer, chunkId: string, startOffset: number = 12): { offset: number; size: number } | null {
    let offset = startOffset;

    while (offset + 8 <= buffer.length) {
      const currentChunkId = buffer.toString('ascii', offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);

      if (currentChunkId === chunkId) {
        return { offset, size: chunkSize };
      }

      // 移动到下一个chunk，确保对齐
      const nextOffset = offset + 8 + chunkSize;
      // WAV chunk需要2字节对齐
      offset = (chunkSize % 2 === 1) ? nextOffset + 1 : nextOffset;

      // 防止无限循环
      if (offset >= buffer.length) break;
    }

    return null;
  }


  // 检查WAV音频是否符合Azure ASR要求
  static checkAzureCompatibility(metadata: WAVMetadata): {
    compatible: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (metadata.sampleRate !== 16000) {
      issues.push('Sample rate must be 16kHz');
    }

    if (metadata.channels !== 1) {
      issues.push('Must be mono (single channel)');
    }

    if (metadata.bitDepth !== 16) {
      issues.push('Bit depth must be 16-bit');
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }
}