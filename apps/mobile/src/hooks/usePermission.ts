import { useState, useCallback } from 'react';
import { Platform, PermissionsAndroid, Linking } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { usePermissionGuideStore } from '@/stores/PermissionGuideStore';

// ==================== 类型定义 ====================

export type PermissionType = 'camera' | 'mediaLibrary' | 'microphone';
export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'blocked';

interface PermissionState {
  status: PermissionStatus;
  /** 检查当前权限状态（不触发系统弹窗） */
  check: () => Promise<PermissionStatus>;
  /** 请求权限（触发系统弹窗，永久拒绝时跳转设置） */
  request: () => Promise<boolean>;
  /** 前往系统设置 */
  openSettings: () => Promise<void>;
}

// ==================== 内部实现 ====================

async function checkCamera(): Promise<{ status: PermissionStatus }> {
  const result = await ImagePicker.getCameraPermissionsAsync();
  return { status: mapExpoStatus(result.status, result.canAskAgain) };
}

async function requestCamera(): Promise<{ status: PermissionStatus }> {
  const result = await ImagePicker.requestCameraPermissionsAsync();
  return { status: mapExpoStatus(result.status, result.canAskAgain) };
}

async function checkMediaLibrary(): Promise<{ status: PermissionStatus }> {
  const result = await MediaLibrary.getPermissionsAsync();
  return { status: mapExpoStatus(result.status, result.canAskAgain) };
}

async function requestMediaLibrary(): Promise<{ status: PermissionStatus }> {
  const result = await MediaLibrary.requestPermissionsAsync();
  return { status: mapExpoStatus(result.status, result.canAskAgain) };
}

async function checkMicrophone(): Promise<{ status: PermissionStatus }> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    return { status: result ? 'granted' : 'undetermined' };
  }
  // iOS 无法单独检查麦克风状态，返回 undetermined 让调用方请求
  return { status: 'undetermined' };
}

async function requestMicrophone(): Promise<{ status: PermissionStatus }> {
  if (Platform.OS === 'android') {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) return { status: 'granted' };
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return { status: 'blocked' };
      return { status: 'denied' };
    } catch {
      return { status: 'denied' };
    }
  }
  // iOS 首次使用时自动请求
  return { status: 'granted' };
}

function mapExpoStatus(status: string, canAskAgain: boolean): PermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied' && !canAskAgain) return 'blocked';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

const permissionHandlers: Record<PermissionType, {
  check: () => Promise<{ status: PermissionStatus }>;
  request: () => Promise<{ status: PermissionStatus }>;
}> = {
  camera: { check: checkCamera, request: requestCamera },
  mediaLibrary: { check: checkMediaLibrary, request: requestMediaLibrary },
  microphone: { check: checkMicrophone, request: requestMicrophone },
};

// ==================== Hook ====================

export function usePermission(type: PermissionType): PermissionState {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const handler = permissionHandlers[type];

  const check = useCallback(async (): Promise<PermissionStatus> => {
    const result = await handler.check();
    setStatus(result.status);
    return result.status;
  }, [handler]);

  const request = useCallback(async (): Promise<boolean> => {
    // 已授权直接返回
    const current = await handler.check();
    if (current.status === 'granted') {
      setStatus('granted');
      return true;
    }

    // 永久拒绝，跳设置
    if (current.status === 'blocked') {
      setStatus('blocked');
      // 弹引导，用户确认后跳设置
      const confirmed = await usePermissionGuideStore.getState().showGuide(type);
      if (confirmed) await Linking.openSettings();
      return false;
    }

    // 先弹引导说明用途，用户确认后再请求系统权限
    const confirmed = await usePermissionGuideStore.getState().showGuide(type);
    if (!confirmed) return false;

    // 请求权限
    const result = await handler.request();
    setStatus(result.status);
    return result.status === 'granted';
  }, [handler, type]);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return { status, check, request, openSettings };
}
