/**
 * 权限引导 Store
 *
 * 全局控制权限用途说明弹窗，在系统权限弹窗前展示。
 * 支持 Promise 式调用：await showGuide('camera') → 用户确认后 resolve
 */

import { create } from 'zustand';
import type { PermissionType } from '@/hooks/usePermission';

interface PermissionGuideState {
  visible: boolean;
  permissionType: PermissionType | null;
  resolve: ((confirmed: boolean) => void) | null;
}

interface PermissionGuideActions {
  /** 显示引导弹窗，返回用户是否确认 */
  showGuide: (type: PermissionType) => Promise<boolean>;
  /** 用户确认 */
  confirm: () => void;
  /** 用户取消 */
  cancel: () => void;
}

type PermissionGuideStore = PermissionGuideState & PermissionGuideActions;

export const usePermissionGuideStore = create<PermissionGuideStore>((set, get) => ({
  visible: false,
  permissionType: null,
  resolve: null,

  showGuide: (type) => {
    return new Promise<boolean>((resolve) => {
      set({ visible: true, permissionType: type, resolve });
    });
  },

  confirm: () => {
    const { resolve } = get();
    resolve?.(true);
    set({ visible: false, permissionType: null, resolve: null });
  },

  cancel: () => {
    const { resolve } = get();
    resolve?.(false);
    set({ visible: false, permissionType: null, resolve: null });
  },
}));
