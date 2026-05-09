import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createTrialSubscription } from '@/services/quotaService';

export interface CreateUserData {
  email?: string;
  username?: string;
  password?: string;
  phone?: string;
  wechatOpenId?: string;
  wechatUnionId?: string;
  wechatNickname?: string | null;
  wechatAvatar?: string | null;
  nickname?: string;
  avatar?: string;
  gender?: string;
}

export interface UpdateUserData {
  username?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  bio?: string;
  wechatOpenId?: string;
  wechatUnionId?: string;
  wechatNickname?: string | null;
  wechatAvatar?: string | null;
}

export class UserService {
  // 创建用户
  static async createUser(userData: CreateUserData) {
    try {
      // 检查邮箱是否已存在
      if (userData.email) {
        const existingEmailUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });
        if (existingEmailUser) {
          throw new Error('邮箱已被注册');
        }
      }

      // 检查手机号是否已存在
      if (userData.phone) {
        const existingPhoneUser = await prisma.user.findUnique({
          where: { phone: userData.phone }
        });
        if (existingPhoneUser) {
          throw new Error('手机号已被注册');
        }
      }

      // 检查昵称是否已存在
      if (userData.nickname) {
        const existingNicknameUser = await prisma.user.findUnique({
          where: { nickname: userData.nickname }
        });
        if (existingNicknameUser) {
          throw new Error('昵称已被使用');
        }
      }

      // 检查微信OpenId是否已存在
      if (userData.wechatOpenId) {
        const existingWechatUser = await prisma.user.findUnique({
          where: { wechatOpenId: userData.wechatOpenId }
        });
        if (existingWechatUser) {
          throw new Error('微信账号已被绑定');
        }
      }

      // 创建用户
      const user = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          username: true,
          nickname: true,
          avatar: true,
          phone: true,
          gender: true,
          birthday: true,
          bio: true,
          wechatOpenId: true,
          wechatNickname: true,
          wechatAvatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      logger.info(`新用户创建成功: ${user.id}`);

      // 初始化体验期订阅（异步，不阻塞注册流程）
      createTrialSubscription(user.id).catch(err => {
        logger.error('初始化体验期订阅失败:', err);
      });

      // 新创建的用户默认没有密码
      return { ...user, hasPassword: false, hasWechat: !!user.wechatOpenId };
    } catch (error) {
      logger.error('创建用户失败:', error);
      throw error;
    }
  }
  // 根据用户ID获取用户信息
  static async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          nickname: true,
          avatar: true,
          phone: true,
          gender: true,
          birthday: true,
          bio: true,
          password: true,
          wechatOpenId: true,
          wechatNickname: true,
          wechatAvatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      return user;
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      throw error;
    }
  }

  // 根据邮箱查找用户
  static async getUserByEmail(email: string) {
    try {
      return await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          nickname: true,
          avatar: true,
          isActive: true,
        }
      });
    } catch (error) {
      logger.error('根据邮箱查找用户失败:', error);
      throw error;
    }
  }

  // 根据手机号查找用户
  static async getUserByPhone(phone: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { phone },
        select: {
          id: true,
          email: true,
          username: true,
          nickname: true,
          avatar: true,
          phone: true,
          gender: true,
          birthday: true,
          bio: true,
          password: true,
          wechatOpenId: true,
          wechatNickname: true,
          wechatAvatar: true,
          isActive: true,
          createdAt: true,
        }
      });
      if (!user) return null;
      // 转换 password 为 hasPassword，添加 hasWechat
      const { password, ...userInfo } = user;
      return { ...userInfo, hasPassword: !!password, hasWechat: !!user.wechatOpenId };
    } catch (error) {
      logger.error('根据手机号查找用户失败:', error);
      throw error;
    }
  }

  // 根据微信OpenId查找用户
  static async getUserByWechatOpenId(wechatOpenId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: {
          wechatOpenId
        },
        select: {
          id: true,
          email: true,
          phone: true,
          username: true,
          nickname: true,
          avatar: true,
          gender: true,
          birthday: true,
          bio: true,
          password: true,
          wechatOpenId: true,
          wechatNickname: true,
          wechatAvatar: true,
          isActive: true,
          createdAt: true,
        }
      });
      if (!user) return null;
      // 转换 password 为 hasPassword，添加 hasWechat
      const { password, ...userInfo } = user;
      return { ...userInfo, hasPassword: !!password, hasWechat: true };
    } catch (error) {
      logger.error('根据微信OpenId查找用户失败:', error);
      throw error;
    }
  }

  // 根据邮箱查找用户（包含密码字段，用于登录验证）
  static async getUserByEmailWithPassword(email: string) {
    try {
      return await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          nickname: true,
          avatar: true,
          password: true,
          isActive: true,
        }
      });
    } catch (error) {
      logger.error('根据邮箱查找用户（含密码）失败:', error);
      throw error;
    }
  }

  // 根据标识符查找用户（支持邮箱|昵称|手机号，包含密码字段，用于登录验证）
  static async getUserByIdentifierWithPassword(identifier: string) {
    try {
      // 邮箱格式检查
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(identifier);

      // 手机号格式检查
      const phoneRegex = /^1[3-9]\d{9}$/;
      const isPhone = phoneRegex.test(identifier);

      let whereCondition;

      if (isEmail) {
        whereCondition = { email: identifier };
      } else if (isPhone) {
        whereCondition = { phone: identifier };
      } else {
        // 作为用户名或昵称查找
        whereCondition = { nickname: identifier};
      }

      return await prisma.user.findFirst({
        where: whereCondition,
        select: {
          id: true,
          email: true,
          phone: true,
          username: true,
          nickname: true,
          avatar: true,
          gender: true,
          birthday: true,
          bio: true,
          password: true,
          wechatOpenId: true,
          wechatNickname: true,
          wechatAvatar: true,
          isActive: true,
          createdAt: true,
        }
      });
    } catch (error) {
      logger.error('根据标识符查找用户（含密码）失败:', error);
      throw error;
    }
  }

  // 检查昵称是否可用
  static async isNicknameAvailable(nickname: string, excludeUserId?: string) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { nickname },
        select: { id: true }
      });

      // 如果没找到用户，昵称可用
      if (!existingUser) {
        return true;
      }

      // 如果是当前用户自己，也算可用
      if (excludeUserId && existingUser.id === excludeUserId) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('检查昵称可用性失败:', error);
      throw error;
    }
  }

  // 更新用户信息
  static async updateUser(userId: string, updateData: UpdateUserData) {
    try {
      // 如果要更新昵称，先检查是否可用
      if (updateData.nickname) {
        const isAvailable = await this.isNicknameAvailable(updateData.nickname, userId);
        if (!isAvailable) {
          throw new Error('昵称已被使用');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          nickname: true,
          avatar: true,
          phone: true,
          gender: true,
          birthday: true,
          bio: true,
          password: true,
          wechatOpenId: true,
          wechatNickname: true,
          wechatAvatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      logger.info(`用户信息更新成功: ${userId}`);
      const { password, ...userInfo } = updatedUser;
      return { ...userInfo, hasPassword: !!password, hasWechat: !!updatedUser.wechatOpenId };
    } catch (error) {
      logger.error('更新用户信息失败:', error);
      throw error;
    }
  }

  // 更新用户密码
  static async updateUserPassword(userId: string, hashedPassword: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      logger.info(`用户密码更新成功: ${userId}`);
    } catch (error) {
      logger.error('更新用户密码失败:', error);
      throw error;
    }
  }

  // 停用用户账户
  static async deactivateUser(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });

      logger.info(`用户账户已停用: ${userId}`);
    } catch (error) {
      logger.error('停用用户账户失败:', error);
      throw error;
    }
  }

  // 激活用户账户
  static async activateUser(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true }
      });

      logger.info(`用户账户已激活: ${userId}`);
    } catch (error) {
      logger.error('激活用户账户失败:', error);
      throw error;
    }
  }

  // 删除用户（软删除，实际上是停用）
  static async deleteUser(userId: string) {
    try {
      await this.deactivateUser(userId);
      logger.info(`用户已删除（软删除）: ${userId}`);
    } catch (error) {
      logger.error('删除用户失败:', error);
      throw error;
    }
  }

  // 清理测试数据（仅开发环境使用）
  static async cleanupTestData(options: {
    emails?: string[];
    phones?: string[];
    wechatOpenIds?: string[];
  }) {
    try {
      let deletedCount = 0;

      // 删除指定邮箱的用户
      if (options.emails && options.emails.length > 0) {
        const emailResult = await prisma.user.deleteMany({
          where: {
            email: {
              in: options.emails
            }
          }
        });
        deletedCount += emailResult.count;
        logger.info(`删除邮箱用户: ${emailResult.count}个`);
      }

      // 删除指定手机号的用户
      if (options.phones && options.phones.length > 0) {
        const phoneResult = await prisma.user.deleteMany({
          where: {
            phone: {
              in: options.phones
            }
          }
        });
        deletedCount += phoneResult.count;
        logger.info(`删除手机号用户: ${phoneResult.count}个`);
      }

      // 删除指定微信OpenId的用户
      if (options.wechatOpenIds && options.wechatOpenIds.length > 0) {
        const wechatResult = await prisma.user.deleteMany({
          where: {
            wechatOpenId: {
              in: options.wechatOpenIds
            }
          }
        });
        deletedCount += wechatResult.count;
        logger.info(`删除微信用户: ${wechatResult.count}个`);
      }

      return { deletedCount };
    } catch (error) {
      logger.error('清理测试数据失败:', error);
      throw error;
    }
  }
}