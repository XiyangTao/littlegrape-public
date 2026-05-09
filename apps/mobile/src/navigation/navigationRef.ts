/**
 * 全局导航引用
 *
 * 供不在 Navigator Screen 内的组件使用（如全局悬浮球、弹窗等）。
 * Screen 内的组件仍应使用 useNavigation() hook。
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

/** 安全导航（仅在 navigation ready 时执行） */
export function navigate(name: string, params?: Record<string, unknown>) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

/** 获取当前路由名 */
export function getCurrentRouteName(): string {
  if (!navigationRef.isReady()) return '';
  return navigationRef.getCurrentRoute()?.name || '';
}
