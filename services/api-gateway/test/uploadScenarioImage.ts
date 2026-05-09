/**
 * 场景图片压缩上传脚本
 * 使用方法: npx tsx test/uploadScenarioImage.ts <图片路径> <目标文件名>
 * 例如: npx tsx test/uploadScenarioImage.ts /path/to/image.png airport_checkin.png
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ossClient, OSS_CONFIG } from '../src/config/oss';

const MAX_SIZE = 1 * 1024 * 1024; // 1MB

interface CompressOptions {
  inputPath: string;
  targetFileName: string;
}

async function compressImage(inputBuffer: Buffer, quality: number = 80): Promise<Buffer> {
  return sharp(inputBuffer)
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

async function compressToTargetSize(inputBuffer: Buffer): Promise<Buffer> {
  let quality = 85;
  let compressed = await compressImage(inputBuffer, quality);

  console.log(`初始压缩 (quality=${quality}): ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);

  // 逐步降低质量直到小于目标大小
  while (compressed.length > MAX_SIZE && quality > 10) {
    quality -= 10;
    compressed = await compressImage(inputBuffer, quality);
    console.log(`调整压缩 (quality=${quality}): ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
  }

  // 如果还是太大，尝试缩小尺寸
  if (compressed.length > MAX_SIZE) {
    console.log('尝试缩小图片尺寸...');
    const metadata = await sharp(inputBuffer).metadata();
    let scale = 0.8;

    while (compressed.length > MAX_SIZE && scale > 0.3) {
      const newWidth = Math.round((metadata.width || 1024) * scale);
      compressed = await sharp(inputBuffer)
        .resize(newWidth)
        .jpeg({ quality: 70, mozjpeg: true })
        .toBuffer();
      console.log(`缩小尺寸 (scale=${scale.toFixed(1)}, width=${newWidth}): ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
      scale -= 0.1;
    }
  }

  return compressed;
}

async function uploadToOSS(buffer: Buffer, fileName: string): Promise<string> {
  const ossPath = `${OSS_CONFIG.pathPrefixes.scenarios}${fileName}`;

  console.log(`上传到 OSS: ${ossPath}`);
  const result = await ossClient.put(ossPath, buffer);

  const cdnUrl = `${OSS_CONFIG.cdnDomain}/${ossPath}`;
  return cdnUrl;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('使用方法: npx tsx test/uploadScenarioImage.ts <图片路径> <目标文件名>');
    console.log('例如: npx tsx test/uploadScenarioImage.ts /path/to/image.png airport_checkin.png');
    process.exit(1);
  }

  const [inputPath, targetFileName] = args;

  // 确保目标文件名以 .jpg 结尾（因为我们会转换为 JPEG）
  const finalFileName = targetFileName.replace(/\.[^.]+$/, '.jpg');

  if (!fs.existsSync(inputPath)) {
    console.error(`错误: 文件不存在 - ${inputPath}`);
    process.exit(1);
  }

  console.log('=== 场景图片压缩上传工具 ===');
  console.log(`输入文件: ${inputPath}`);
  console.log(`目标文件名: ${finalFileName}`);
  console.log(`目标大小: < 1MB`);
  console.log('');

  // 读取原始图片
  const inputBuffer = fs.readFileSync(inputPath);
  console.log(`原始大小: ${(inputBuffer.length / 1024 / 1024).toFixed(2)}MB`);

  // 压缩图片
  console.log('\n开始压缩...');
  const compressed = await compressToTargetSize(inputBuffer);
  console.log(`\n最终大小: ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);

  if (compressed.length > MAX_SIZE) {
    console.warn('警告: 无法将图片压缩到 1MB 以下，但仍将上传');
  }

  // 上传到 OSS
  console.log('\n开始上传...');
  const cdnUrl = await uploadToOSS(compressed, finalFileName);

  console.log('\n=== 上传成功 ===');
  console.log(`CDN URL: ${cdnUrl}`);
}

main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
