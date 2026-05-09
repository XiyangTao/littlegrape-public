/**
 * 图片审核测试：传 URL 直接调 moderateImage
 * 用法：
 *   npx tsx scripts/test-image-moderation.ts [urls...]
 *   不传参则跑内置样本（公网图）
 */

import { findUpSync } from 'find-up';
import * as dotenv from 'dotenv';
const envPath = findUpSync('.env', { cwd: process.cwd() });
if (envPath) dotenv.config({ path: envPath });

import { moderateImage } from '../src/services/moderationService';

interface Case {
  label: string;
  url: string;
  expectPass: boolean;
}

// 内置样本：2 张正常头像（公开头像 CDN），可扩展
const DEFAULT_CASES: Case[] = [
  {
    label: '正常头像 1 (GitHub avatar)',
    url: 'https://avatars.githubusercontent.com/u/9919?v=4',
    expectPass: true,
  },
  {
    label: '正常头像 2 (随机人像)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    expectPass: true,
  },
];

async function main() {
  const argvUrls = process.argv.slice(2);
  const cases: Case[] = argvUrls.length
    ? argvUrls.map((url, i) => ({ label: `arg#${i + 1}`, url, expectPass: true }))
    : DEFAULT_CASES;

  let passCount = 0;
  let failCount = 0;

  for (const c of cases) {
    const r = await moderateImage(c.url, 'avatar');
    const ok = r.pass === c.expectPass;
    const status = ok ? '✓' : '✗';
    console.log(
      `${status} ${c.label.padEnd(40)} | ` +
      `pass=${String(r.pass).padEnd(5)} ` +
      `labels=${(r.labels || '-').padEnd(20)} ` +
      `reason="${r.reason || '-'}"`
    );
    if (!ok) {
      console.log(`    期望 pass=${c.expectPass}，实际 pass=${r.pass}，URL=${c.url}`);
      failCount++;
    } else {
      passCount++;
    }
  }

  console.log(`\n总计 ${cases.length}：通过 ${passCount}，失败 ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
