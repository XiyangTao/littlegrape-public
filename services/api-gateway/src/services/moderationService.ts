/**
 * 内容审核服务（阿里云内容安全 2.0）
 *
 * 策略：严格拒绝——非 safe 结果一律 block。
 * 文本场景 chat_detection_pro：覆盖涉政、涉黄、涉恐、辱骂、广告、违禁等。
 * 图片场景 profilePhotoCheck：头像专用审核。
 *
 * 所有审核调用都会写 ModerationLog，满足合规留痕要求。
 */

import Green20220302 from '@alicloud/green20220302';
import {
  TextModerationPlusRequest,
  ImageModerationRequest,
} from '@alicloud/green20220302';
import * as OpenApi from '@alicloud/openapi-client';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

// ==================== 类型 ====================

export type ModerationContentType = 'nickname' | 'bio' | 'avatar' | 'other';

export interface ModerationResult {
  /** 是否通过 */
  pass: boolean;
  /** 命中的违规标签（逗号分隔） */
  labels: string;
  /** 命中的违禁词（逗号分隔，可能为空） */
  hitWords: string;
  /** 用户友好的拒绝原因（命中时才有值） */
  reason: string;
}

// ==================== 客户端单例 ====================

let _client: Green20220302 | null = null;

function getClient(): Green20220302 {
  if (_client) return _client;

  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  if (!accessKeyId || !accessKeySecret) {
    throw new Error('ALIYUN_ACCESS_KEY_ID/SECRET not configured');
  }

  const config = new OpenApi.Config({
    accessKeyId,
    accessKeySecret,
    endpoint: 'green-cip.cn-shanghai.aliyuncs.com', // 内容审核仅华东 2（上海）
  });
  _client = new Green20220302(config);
  return _client;
}

// ==================== 文本审核 ====================

/**
 * 审核文本内容（昵称/签名/评论等）
 *
 * 严格策略：非 "nonLabel" / 空标签 一律 block。
 */
export async function moderateText(
  content: string,
  contentType: ModerationContentType,
  userId?: string,
): Promise<ModerationResult> {
  if (!content || !content.trim()) {
    return { pass: true, labels: '', hitWords: '', reason: '' };
  }

  // Pro 版 service（比基础版标签更细、带位置信息、召回一样）。
  // 价格与基础版一致（均在 text_standard 类别，7.5 元/万次）。
  const service = contentType === 'nickname' ? 'nickname_detection_pro' : 'comment_detection_pro';
  const req = new TextModerationPlusRequest({
    service,
    serviceParameters: JSON.stringify({ content }),
  });

  try {
    const resp = await getClient().textModerationPlus(req);
    const code = resp.body?.code;
    if (code !== undefined && code !== 200) {
      throw new Error(`Text moderation API error ${code}: ${resp.body?.message || ''}`);
    }
    const data = (resp.body?.data as any) || {};

    // Pro 版响应结构：
    //   data.riskLevel: 'none' | 'low' | 'medium' | 'high'
    //   data.result[]: [ { label, confidence, description, riskWords, riskPositions }, ... ]
    //     正常内容返回 [{ label: 'nonLabel', description: '未检测出风险' }]
    const riskLevel = (data.riskLevel as string) || 'none';
    const results: any[] = Array.isArray(data.result) ? data.result : [];

    const riskLabels: string[] = [];
    const hitWordsArr: string[] = [];
    for (const r of results) {
      const label = r?.label as string | undefined;
      if (!label || label === 'nonLabel') continue;
      riskLabels.push(label);
      if (r?.riskWords) hitWordsArr.push(r.riskWords as string);
    }

    // 严格策略：riskLevel 非 none 或有命中标签 → 拦截
    const pass = riskLevel === 'none' && riskLabels.length === 0;
    const labels = riskLabels.join(',');
    const hitWords = hitWordsArr.join(',');
    const reason = pass ? '' : labelsToUserReason(riskLabels);

    await writeLog({
      userId,
      contentType,
      content,
      result: pass ? 'pass' : 'block',
      hitLabels: labels,
      hitWords,
    });

    return { pass, labels, hitWords, reason };
  } catch (err: any) {
    logger.error('[Moderation] 文本审核 API 失败:', {
      error: err?.message,
      code: err?.code,
      statusCode: err?.statusCode,
    });
    // Fail-close：审核 API 故障时拒绝，避免漏过违规内容
    await writeLog({
      userId,
      contentType,
      content,
      result: 'error',
      hitLabels: 'api_error',
      hitWords: err?.message ?? '',
    });
    return { pass: false, labels: 'api_error', hitWords: '', reason: '内容审核服务暂时不可用，请稍后再试' };
  }
}

// ==================== 图片审核 ====================

/**
 * 审核图片（头像）
 *
 * imageUrl 必须是公网可访问的 URL（CDN URL 也可以）。
 */
export async function moderateImage(
  imageUrl: string,
  contentType: ModerationContentType,
  userId?: string,
): Promise<ModerationResult> {
  if (!imageUrl) {
    return { pass: true, labels: '', hitWords: '', reason: '' };
  }

  const req = new ImageModerationRequest({
    service: 'profilePhotoCheck', // 头像审核
    serviceParameters: JSON.stringify({ imageUrl }),
  });

  try {
    const resp = await getClient().imageModeration(req);
    const code = resp.body?.code;
    if (code !== undefined && code !== 200) {
      const msg = (resp.body as any)?.msg || resp.body?.message || '';
      throw new Error(`Image moderation API error ${code}: ${msg}`);
    }
    const data = (resp.body?.data as any) || {};

    // 图片审核响应结构（同 textModerationPlus）：
    //   data.result[]: [{ label, confidence, description, ... }]
    //   正常图返回 [{ label: 'nonLabel', description: '未检测出风险' }]
    const results: any[] = Array.isArray(data.result) ? data.result : [];
    const riskLabels: string[] = [];
    for (const r of results) {
      const label = r?.label as string | undefined;
      if (!label || label === 'nonLabel') continue;
      riskLabels.push(label);
    }

    const pass = riskLabels.length === 0;
    const labels = riskLabels.join(',');
    const reason = pass ? '' : labelsToUserReason(riskLabels);

    await writeLog({
      userId,
      contentType,
      content: imageUrl,
      result: pass ? 'pass' : 'block',
      hitLabels: labels,
      hitWords: '',
    });

    return { pass, labels, hitWords: '', reason };
  } catch (err: any) {
    logger.error('[Moderation] 图片审核 API 失败:', {
      error: err?.message,
      code: err?.code,
      statusCode: err?.statusCode,
    });
    await writeLog({
      userId,
      contentType,
      content: imageUrl,
      result: 'error',
      hitLabels: 'api_error',
      hitWords: err?.message ?? '',
    });
    return { pass: false, labels: 'api_error', hitWords: '', reason: '图片审核服务暂时不可用，请稍后再试' };
  }
}

// ==================== 工具 ====================

/**
 * 标签 → 用户友好拒绝原因
 * 不暴露具体命中词，避免被研究绕过。
 */
function labelsToUserReason(labels: string[]): string {
  const l = labels.join(',').toLowerCase();
  if (l.includes('porn') || l.includes('sexy') || l.includes('sexual')) return '内容涉及敏感信息，请修改';
  if (l.includes('political') || l.includes('contraband')) return '内容涉及敏感信息，请修改';
  if (l.includes('terror') || l.includes('violen')) return '内容涉及敏感信息，请修改';
  if (l.includes('abuse') || l.includes('profanity') || l.includes('inappropriate')) return '内容包含不文明用语，请修改';
  if (l.includes('ad') || l.includes('spam') || l.includes('pt_to_sites') || l.includes('promotion')) return '内容疑似广告或引流信息，请修改';
  return '内容不符合社区规范，请修改';
}

async function writeLog(params: {
  userId?: string;
  contentType: ModerationContentType;
  content: string;
  result: 'pass' | 'block' | 'error';
  hitLabels: string;
  hitWords: string;
}) {
  try {
    await prisma.moderationLog.create({
      data: {
        userId: params.userId ?? null,
        contentType: params.contentType,
        content: params.content.slice(0, 500), // 截断防爆 DB
        result: params.result,
        hitLabels: params.hitLabels || null,
        hitWords: params.hitWords || null,
        provider: 'aliyun',
      },
    });
  } catch (err) {
    logger.error('[Moderation] 写日志失败:', err);
    // 不影响主流程
  }
}
