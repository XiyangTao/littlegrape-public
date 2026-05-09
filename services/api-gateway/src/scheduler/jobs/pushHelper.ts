/**
 * 通知写入助手 — 批量创建通知记录
 *
 * 功能：
 * - 24h 同类型去重
 * - 每日上限 5 条
 * - 安静时段降级（22:00-08:00 notification -> in_app）
 * - 批量写入通知记录
 * - notification 类型直接调 sendExpoPush()
 */

import { prisma } from '@/config/database';
import { sendExpoPush } from '@/services/notificationService';
import { getTodayStartCN, getCurrentHourCN } from '@/utils/dateUtils';

export type NotificationType =
  | 'daily_remind'
  | 'streak_celebrate'
  | 'streak_recover'
  | 'milestone'
  | 'review_remind'
  | 'weak_remind'
  | 'daily_summary'
  | 'weekly_summary'
  | 'birthday'
  | 'inactive_remind'
  | 'holiday';

type NotificationChannel = 'in_app' | 'notification';

export interface BatchItem {
  userId: string;
  content: string;
}

/** 22:00-08:00 不发系统通知 */
function isQuietHour(): boolean {
  const hour = getCurrentHourCN();
  return hour >= 22 || hour < 8;
}

/**
 * 批量创建通知记录（防打扰 + 批量写入）
 * notification 类型直接调 sendExpoPush()
 */
export async function createPushRecords(
  items: BatchItem[],
  type: NotificationType,
  channel: NotificationChannel = 'in_app',
): Promise<{ count: number }> {
  if (items.length === 0) return { count: 0 };

  const userIds = items.map(i => i.userId);

  // 1. 24h 内同类型去重
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const alreadySent = await prisma.userNotification.findMany({
    where: { userId: { in: userIds }, type, createdAt: { gte: oneDayAgo } },
    select: { userId: true },
    distinct: ['userId'],
  });
  const alreadySentSet = new Set(alreadySent.map(p => p.userId));

  // 2. 每日上限 5 条
  const todayStart = getTodayStartCN();
  const overLimitUsers: Array<{ userId: string }> = await prisma.$queryRaw`
    SELECT "userId" FROM "user_notifications"
    WHERE "userId" = ANY(${userIds})
      AND "createdAt" >= ${todayStart}
    GROUP BY "userId"
    HAVING COUNT(*) >= 5
  `;
  const overLimitSet = new Set(overLimitUsers.map(u => u.userId));

  // 3. 过滤
  const validItems = items.filter(
    i => !alreadySentSet.has(i.userId) && !overLimitSet.has(i.userId),
  );
  if (validItems.length === 0) return { count: 0 };

  // 4. 安静时段降级
  let actualChannel: NotificationChannel = channel;
  if (channel === 'notification' && isQuietHour()) {
    actualChannel = 'in_app';
  }

  // 5. 批量写入通知记录
  const records = await prisma.$transaction(
    validItems.map(item =>
      prisma.userNotification.create({
        data: {
          userId: item.userId,
          type,
          channel: actualChannel,
          content: item.content,
        },
      }),
    ),
  );

  // 6. notification 类型直接发送 Expo Push（失败不影响通知写入）
  if (actualChannel === 'notification') {
    for (const item of validItems) {
      sendExpoPush(item.userId, '小葡萄学习助手', item.content).catch(() => {});
    }
  }

  return { count: records.length };
}
