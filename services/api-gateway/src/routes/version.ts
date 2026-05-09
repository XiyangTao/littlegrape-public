import express from 'express';
import { versionConfig, compareVersions } from '@/config/version';

const router = express.Router();

/**
 * 版本检查
 * GET /api/version/check
 * PUBLIC - 未登录也可检查
 */
router.get('/check', (req, res) => {
  const currentVersion = (req.headers['x-app-version'] as string) || '0.0.0';
  const { minVersion, latestVersion, releaseNotes, iosUrl, androidUrl } = versionConfig;

  // 确定更新类型
  let updateType: 'none' | 'optional' | 'forced' = 'none';

  if (compareVersions(currentVersion, minVersion) < 0) {
    updateType = 'forced';
  } else if (compareVersions(currentVersion, latestVersion) < 0) {
    updateType = 'optional';
  }

  // 根据请求语言返回对应的更新说明（优先 x-app-language，fallback accept-language）
  const appLang = req.headers['x-app-language'] as string || '';
  const acceptLang = req.headers['accept-language'] || '';
  const lang = appLang.includes('zh') || acceptLang.includes('zh') ? 'zh' : 'en';

  res.json({
    success: true,
    data: {
      updateType,
      latestVersion,
      currentVersion,
      releaseNotes: releaseNotes[lang],
      iosUrl,
      androidUrl,
    },
  });
});

export default router;
