/**
 * 支付宝 SDK 配置
 */

import { AlipaySdk } from 'alipay-sdk';
import { config } from './index';

export const alipaySdk = new AlipaySdk({
  appId: config.alipay.appId,
  privateKey: config.alipay.privateKey,
  alipayPublicKey: config.alipay.alipayPublicKey,
  gateway: config.alipay.gateway,
  signType: 'RSA2',
});
