/**
 * 文本审核测试：跑 nickname 和 bio 两种 contentType，每种 正常 + 违规 各一条
 * 用法：npx tsx scripts/test-text-moderation.ts
 */

import { findUpSync } from 'find-up';
import * as dotenv from 'dotenv';
const envPath = findUpSync('.env', { cwd: process.cwd() });
if (envPath) dotenv.config({ path: envPath });

import { moderateText } from '../src/services/moderationService';

interface Case {
  label: string;
  content: string;
  contentType: 'nickname' | 'bio';
  expectPass: boolean;
}

const CASES: Case[] = [
  { label: '正常昵称',     content: '小葡萄爱学习',             contentType: 'nickname', expectPass: true },
  { label: '涉黄昵称',     content: '约炮加微信',               contentType: 'nickname', expectPass: false },
  { label: '广告昵称',     content: '加V信xxx月入十万',         contentType: 'nickname', expectPass: false },
  { label: '正常 bio',     content: '喜欢英语和旅行，座右铭是努力向前', contentType: 'bio', expectPass: true },
  { label: '政治 bio',     content: '打倒共产党推翻政府',       contentType: 'bio',      expectPass: false },
  { label: '辱骂 bio',     content: '你他妈傻逼',               contentType: 'bio',      expectPass: false },
];

async function main() {
  let passCount = 0;
  let failCount = 0;

  for (const c of CASES) {
    const r = await moderateText(c.content, c.contentType);
    const ok = r.pass === c.expectPass;
    const status = ok ? '✓' : '✗';
    console.log(
      `${status} [${c.contentType}] ${c.label.padEnd(10)} | ` +
      `pass=${String(r.pass).padEnd(5)} ` +
      `labels=${(r.labels || '-').padEnd(30)} ` +
      `reason="${r.reason || '-'}"`
    );
    if (!ok) {
      console.log(`    期望 pass=${c.expectPass}，实际 pass=${r.pass}，内容="${c.content}"`);
      failCount++;
    } else {
      passCount++;
    }
  }

  console.log(`\n总计 ${CASES.length}：通过 ${passCount}，失败 ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
