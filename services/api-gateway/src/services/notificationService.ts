/**
 * 通知服务
 * Expo Push 离线推送
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

// ==================== Expo Push ====================

/**
 * 发送 Expo 离线推送通知
 * 通过 Expo Push Service 转发到 APNs (iOS) / FCM (Android)
 */
export async function sendExpoPush(userId: string, title: string, body: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (!user?.pushToken) {
      logger.debug('[ExpoPush] 用户无 pushToken，跳过', { userId });
      return;
    }

    if (!Expo.isExpoPushToken(user.pushToken)) {
      logger.warn('[ExpoPush] pushToken 格式无效，跳过', { userId, token: String(user.pushToken).substring(0, 20) });
      return;
    }

    const [ticket] = await expo.sendPushNotificationsAsync([{
      to: user.pushToken,
      sound: 'default',
      title,
      body,
      channelId: 'assistant',
    }]);

    if (ticket.status === 'error') {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await prisma.user.update({
          where: { id: userId },
          data: { pushToken: null, pushPlatform: null },
        });
        logger.warn('[ExpoPush] Token 已失效，已清除', { userId });
      } else {
        logger.error('[ExpoPush] 推送失败', { userId, error: ticket.message, details: ticket.details?.error });
      }
      return;
    }

    logger.info('[ExpoPush] 推送成功', { userId, title });
  } catch (error) {
    logger.error('[ExpoPush] 发送失败:', error);
  }
}
