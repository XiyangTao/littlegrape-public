import axios from 'axios';
import { config } from '@/config';
import { logger } from '@/utils/logger';

// 微信用户信息
export interface WechatUserInfo {
  openid: string;
  unionid?: string;
  nickname: string;
  headimgurl: string;
  sex: number; // 1=男 2=女 0=未知
}

// 微信 access_token 响应
interface WechatAccessTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

// 微信用户信息响应
interface WechatUserInfoResponse {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export class WechatService {
  private appId: string;
  private appSecret: string;

  constructor() {
    this.appId = config.wechat.appId;
    this.appSecret = config.wechat.appSecret;
  }

  /**
   * 静默授权：使用授权码换取 openid（不获取用户信息）
   * @param code 微信授权码（客户端通过 snsapi_base 获取）
   * @returns openid 和可选的 unionid
   */
  async getOpenIdByCode(code: string): Promise<{ openid: string; unionid?: string }> {
    try {
      const tokenUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token';
      const tokenResponse = await axios.get<WechatAccessTokenResponse>(tokenUrl, {
        params: {
          appid: this.appId,
          secret: this.appSecret,
          code: code,
          grant_type: 'authorization_code',
        },
      });

      const tokenData = tokenResponse.data;

      if (tokenData.errcode) {
        logger.error(`微信获取 access_token 失败: ${tokenData.errcode} - ${tokenData.errmsg}`);
        throw new Error(`微信授权失败: ${tokenData.errmsg}`);
      }

      logger.debug(`微信静默授权成功, openid: ${tokenData.openid}`);

      return {
        openid: tokenData.openid,
        unionid: tokenData.unionid,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('微信 API 请求失败:', error.message);
        throw new Error('微信服务暂时不可用，请稍后重试');
      }
      throw error;
    }
  }

  /**
   * 完整授权：使用授权码换取 access_token 和用户信息
   * @param code 微信授权码（客户端通过 snsapi_userinfo 获取）
   * @returns 微信用户信息
   */
  async getUserInfoByCode(code: string): Promise<WechatUserInfo> {
    try {
      // Step 1: 使用 code 换取 access_token
      logger.info(`[WechatService] Step1: 用code换取access_token, code前8位: ${code.substring(0, 8)}, appId: ${this.appId}`);
      const tokenUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token';
      const tokenResponse = await axios.get<WechatAccessTokenResponse>(tokenUrl, {
        params: {
          appid: this.appId,
          secret: this.appSecret,
          code: code,
          grant_type: 'authorization_code',
        },
        timeout: 10000,
      });

      const tokenData = tokenResponse.data;
      logger.info(`[WechatService] Step1 响应: errcode=${tokenData.errcode}, openid=${tokenData.openid}, has_access_token=${!!tokenData.access_token}`);

      if (tokenData.errcode) {
        logger.error(`[WechatService] 微信获取 access_token 失败: ${tokenData.errcode} - ${tokenData.errmsg}`);
        throw new Error(`微信授权失败: ${tokenData.errmsg}`);
      }

      logger.info(`[WechatService] Step1 成功, openid: ${tokenData.openid}`);

      // Step 2: 使用 access_token 获取用户信息
      logger.info(`[WechatService] Step2: 获取用户信息, openid: ${tokenData.openid}`);
      const userInfoUrl = 'https://api.weixin.qq.com/sns/userinfo';
      const userInfoResponse = await axios.get<WechatUserInfoResponse>(userInfoUrl, {
        params: {
          access_token: tokenData.access_token,
          openid: tokenData.openid,
          lang: 'zh_CN',
        },
        timeout: 10000,
      });

      const userInfoData = userInfoResponse.data;
      logger.info(`[WechatService] Step2 响应: errcode=${userInfoData.errcode}, nickname=${userInfoData.nickname}`);

      if (userInfoData.errcode) {
        logger.error(`[WechatService] 微信获取用户信息失败: ${userInfoData.errcode} - ${userInfoData.errmsg}`);
        throw new Error(`获取微信用户信息失败: ${userInfoData.errmsg}`);
      }

      logger.info(`[WechatService] Step2 成功: nickname=${userInfoData.nickname}, headimgurl=${userInfoData.headimgurl}`);

      // 获取高清头像（将末尾的 /132 替换为 /0 获取 640x640 原图）
      const hdHeadimgurl = userInfoData.headimgurl
        ? userInfoData.headimgurl.replace(/\/\d+$/, '/0')
        : userInfoData.headimgurl;

      return {
        openid: userInfoData.openid,
        unionid: userInfoData.unionid || tokenData.unionid,
        nickname: userInfoData.nickname,
        headimgurl: hdHeadimgurl,
        sex: userInfoData.sex,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('[WechatService] 微信API请求失败:', {
          message: error.message,
          code: error.code,
          url: error.config?.url,
          status: error.response?.status,
          responseData: JSON.stringify(error.response?.data).substring(0, 300),
        });
        throw new Error('微信服务暂时不可用，请稍后重试');
      }
      logger.error('[WechatService] 非Axios异常:', error);
      throw error;
    }
  }

  /**
   * 将微信性别转换为系统性别格式
   */
  static convertGender(sex: number): 'male' | 'female' | 'private' {
    switch (sex) {
      case 1:
        return 'male';
      case 2:
        return 'female';
      default:
        return 'private';
    }
  }
}

// 导出单例
export const wechatService = new WechatService();
