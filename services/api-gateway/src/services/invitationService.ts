/**
 * 邀请系统服务
 * 邀请码生成、邀请奖励、邀请记录
 */

import { prisma } from '@/config/database';
import { addXP } from '@/services/achievementService';

// 邀请奖励：邀请人和被邀请人各得额外配额时间或经验
const INVITER_XP_REWARD = 100;
const INVITEE_XP_REWARD = 50;

/** 生成 6 位邀请码 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** 获取或生成用户邀请码 */
export async function getUserInviteCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inviteCode: true },
  });

  if (user?.inviteCode) return user.inviteCode;

  // 生成唯一邀请码
  let code: string;
  let attempts = 0;
  do {
    code = generateInviteCode();
    const existing = await prisma.user.findUnique({ where: { inviteCode: code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  await prisma.user.update({
    where: { id: userId },
    data: { inviteCode: code },
  });

  return code;
}

/** 使用邀请码注册（被邀请人调用） */
export async function applyInviteCode(inviteeId: string, inviteCode: string): Promise<{
  success: boolean;
  error?: string;
  inviterNickname?: string;
}> {
  // 检查邀请码是否有效
  const inviter = await prisma.user.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
    select: { id: true, nickname: true },
  });
  if (!inviter) return { success: false, error: 'invalid_code' };

  // 不能邀请自己
  if (inviter.id === inviteeId) return { success: false, error: 'self_invite' };

  // 检查是否已被邀请
  const existing = await prisma.userInvitation.findUnique({
    where: { inviteeId },
  });
  if (existing) return { success: false, error: 'already_invited' };

  // 创建邀请记录
  await prisma.userInvitation.create({
    data: {
      inviterId: inviter.id,
      inviteeId,
      inviteCode: inviteCode.toUpperCase(),
    },
  });

  // 发放经验奖励
  await addXP(inviter.id, INVITER_XP_REWARD);
  await addXP(inviteeId, INVITEE_XP_REWARD);

  // 标记奖励已发放
  await prisma.userInvitation.update({
    where: { inviteeId },
    data: { rewardGranted: true },
  });

  return { success: true, inviterNickname: inviter.nickname || undefined };
}

/** 获取用户邀请列表 */
export async function getInvitationList(userId: string) {
  const invitations = await prisma.userInvitation.findMany({
    where: { inviterId: userId },
    orderBy: { createdAt: 'desc' },
  });

  // 获取被邀请人信息
  const inviteeIds = invitations.map(i => i.inviteeId);
  const invitees = await prisma.user.findMany({
    where: { id: { in: inviteeIds } },
    select: { id: true, nickname: true, avatar: true, createdAt: true },
  });

  const inviteeMap = new Map(invitees.map(u => [u.id, u]));

  return invitations.map(inv => ({
    id: inv.id,
    invitee: inviteeMap.get(inv.inviteeId) || { id: inv.inviteeId, nickname: null, avatar: null },
    rewardGranted: inv.rewardGranted,
    createdAt: inv.createdAt,
  }));
}

/** 获取邀请统计 */
export async function getInvitationStats(userId: string) {
  const totalInvited = await prisma.userInvitation.count({ where: { inviterId: userId } });
  const totalRewarded = await prisma.userInvitation.count({ where: { inviterId: userId, rewardGranted: true } });

  return {
    totalInvited,
    totalRewarded,
    totalXpEarned: totalRewarded * INVITER_XP_REWARD,
  };
}
