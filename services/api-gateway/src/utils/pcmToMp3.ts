/**
 * PCM → MP3 转码（用于流式 TTS 结果入 OSS 缓存）
 *
 * 输入：16kHz 16bit mono signed LE PCM buffer
 * 输出：32 kbps mono 16kHz MP3 buffer（与现有批量 TTS 格式一致）
 */
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { Readable } from 'stream';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function pcmToMp3(
  pcmBuffer: Buffer,
  sampleRate = 16000,
  channels = 1,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const inputStream = Readable.from(pcmBuffer);
    const chunks: Buffer[] = [];

    const command = ffmpeg(inputStream)
      .inputFormat('s16le')
      .inputOptions([`-ar ${sampleRate}`, `-ac ${channels}`])
      .outputFormat('mp3')
      .audioCodec('libmp3lame')
      .audioBitrate('32k')
      .audioChannels(channels)
      .audioFrequency(sampleRate)
      .addOption('-threads', '2')
      .on('error', (err) => reject(new Error(`PCM→MP3 failed: ${err.message}`)));

    const outStream = command.pipe();
    outStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    outStream.on('end', () => resolve(Buffer.concat(chunks)));
    outStream.on('error', (err) => reject(err));
  });
}
