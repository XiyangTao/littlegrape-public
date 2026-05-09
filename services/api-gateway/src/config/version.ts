/**
 * App 版本配置
 *
 * 发新版只需更新此文件 + apps/mobile/app.json 的 version
 * 修改后重启 api-gateway 即可生效
 */

export const versionConfig = {
  /** 最低支持版本（低于此版本强制更新） */
  minVersion: '1.0.1',
  /** 最新版本（高于用户版本时建议更新） */
  latestVersion: '1.1.5',
  /** 更新说明 */
  releaseNotes: {
    zh: '🌐 网络稳定性显著提升：修复部分场景下间歇性"网络异常"问题\n🔐 账户体验优化：切换账号、退出登录更稳定\n✨ 多项 UI 优化与稳定性修复',
    en: '🌐 Major network stability improvements: fixed intermittent "network error" issues in some scenarios\n🔐 Smoother account experience: more reliable account switching and sign-out\n✨ UI refinements and stability fixes',
  },
  /** iOS 下载链接（App Store） */
  iosUrl: 'https://apps.apple.com/app/id0000000000',
  /** Android 下载链接 */
  androidUrl: 'https://littlegrape.coderhythm.cn/download',
};

/**
 * 比较两个语义化版本号
 * @returns -1: a < b, 0: a == b, 1: a > b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}
