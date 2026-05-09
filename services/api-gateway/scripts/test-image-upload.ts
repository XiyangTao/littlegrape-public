/**
 * 上传本地图片到 OSS → 调 moderateImage → 查看结果
 *
 * 用法：
 *   npx tsx scripts/test-image-upload.ts /path/to/image.jpg
 */

import { findUpSync } from 'find-up';
import * as dotenv from 'dotenv';
const envPath = findUpSync('.env', { cwd: process.cwd() });
if (envPath) dotenv.config({ path: envPath });

import fs from 'fs';
import path from 'path';
import { OSSService } from '../src/services/ossService';
import { moderateImage } from '../src/services/moderationService';
import Green20220302, { ImageModerationRequest } from '@alicloud/green20220302';
import * as OpenApi from '@alicloud/openapi-client';

async function main() {
  const filepath = process.argv[2];
  if (!filepath) {
    console.error('Usage: npx tsx scripts/test-image-upload.ts <local-file-path>');
    process.exit(1);
  }
  const buffer = fs.readFileSync(filepath);
  const filename = path.basename(filepath);
  const ext = path.extname(filepath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  console.log(`上传 ${filepath} (${buffer.length} bytes) 到 OSS...`);
  const uploadResult = await OSSService.uploadFile(buffer, filename, mime, {
    folder: 'avatars' as any,
    keepOriginalName: false,
  });
  if (!uploadResult.success || !uploadResult.cdnUrl) {
    console.error('上传失败:', uploadResult.error);
    process.exit(1);
  }
  console.log(`\nCDN URL: ${uploadResult.cdnUrl}\n`);

  // 先打印 raw response
  console.log('=== 原始响应 ===');
  const config = new OpenApi.Config({
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    endpoint: 'green-cip.cn-shanghai.aliyuncs.com',
  });
  const client = new Green20220302(config);
  const resp = await client.imageModeration(new ImageModerationRequest({
    service: 'profilePhotoCheck',
    serviceParameters: JSON.stringify({ imageUrl: uploadResult.cdnUrl }),
  }));
  console.log(JSON.stringify(resp.body, null, 2));

  // 再用 moderateImage 走完整链路
  console.log('\n=== moderateImage 结果 ===');
  const r = await moderateImage(uploadResult.cdnUrl, 'avatar');
  console.log(`pass:     ${r.pass}`);
  console.log(`labels:   ${r.labels || '(none)'}`);
  console.log(`reason:   ${r.reason || '(none)'}`);

  // 测试完清理 OSS 文件（避免留垃圾）
  if (uploadResult.ossPath) {
    await OSSService.deleteFile(uploadResult.ossPath);
    console.log(`\n已清理 OSS: ${uploadResult.ossPath}`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
