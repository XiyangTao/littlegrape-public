/**
 * 阿里云号码认证服务（PNVS）— 一键登录服务端
 *
 * 客户端 SDK 拉起授权页 → 用户同意 → SDK 返回一次性 accessToken
 * 服务端用 accessToken 调 GetMobile 换取真实手机号
 * accessToken 有效期约 60 秒，且只能用一次
 */

import Dypnsapi20170525, { GetMobileRequest } from '@alicloud/dypnsapi20170525';
import * as OpenApi from '@alicloud/openapi-client';
import { config } from '@/config';
import { logger } from '@/utils/logger';

let _client: Dypnsapi20170525 | null = null;

function getClient(): Dypnsapi20170525 {
  if (_client) return _client;
  const openApiConfig = new OpenApi.Config({
    accessKeyId: config.pnvs.accessKeyId,
    accessKeySecret: config.pnvs.accessKeySecret,
    endpoint: 'dypnsapi.aliyuncs.com',
  });
  _client = new Dypnsapi20170525(openApiConfig);
  return _client;
}

/**
 * 用客户端 SDK 返回的 accessToken 换取真实手机号
 *
 * @returns 11 位手机号（如 13912345678）
 * @throws PNVS 调用失败 / token 过期 / token 已使用 / 限流时抛错
 */
export async function getMobileByToken(accessToken: string): Promise<string> {
  if (!accessToken || accessToken.length < 8) {
    throw new Error('一键登录凭证无效');
  }

  const client = getClient();
  const req = new GetMobileRequest({ accessToken });

  let response;
  try {
    response = await client.getMobile(req);
  } catch (error) {
    logger.error('[PNVS] getMobile 调用失败:', error);
    throw new Error('一键登录服务暂时不可用，请稍后重试');
  }

  const body = response.body;
  if (!body) {
    throw new Error('一键登录服务返回为空');
  }

  if (body.code !== 'OK') {
    logger.warn(`[PNVS] getMobile 业务错误: code=${body.code}, message=${body.message}`);
    if (body.code === 'OVER_LIMIT') {
      throw new Error('一键登录请求过于频繁');
    }
    if (body.code === 'IP_NOT_IN_WHITE_LIST') {
      throw new Error('服务端 IP 未加入白名单，请联系管理员');
    }
    if (body.code === 'PARAM_INVALID' || body.code?.includes('TOKEN')) {
      throw new Error('一键登录凭证已失效，请重新登录');
    }
    throw new Error(body.message || '一键登录失败');
  }

  const mobile = body.getMobileResultDTO?.mobile;
  if (!mobile || !/^1[3-9]\d{9}$/.test(mobile)) {
    logger.error(`[PNVS] 取号成功但手机号格式异常: ${mobile}`);
    throw new Error('一键登录返回的手机号无效');
  }

  return mobile;
}
