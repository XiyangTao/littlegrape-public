import { Platform, PermissionsAndroid, Linking } from 'react-native';
import { usePermissionGuideStore } from '@/stores/PermissionGuideStore';

/**
 * 从 base64 编码的 PCM 音频数据计算音量级别 (0-1)
 * PCM 格式: 16位有符号整数，小端序
 */
export function calculateVolumeFromBase64(base64Data: string): number {
  try {
    const binaryString = atob(base64Data);
    const length = binaryString.length;

    if (length < 2) return 0;

    const totalSamples = Math.floor(length / 2);
    const MAX_SAMPLES = 128;
    const samplesToUse = Math.min(totalSamples, MAX_SAMPLES);
    const step = totalSamples <= MAX_SAMPLES ? 1 : totalSamples / MAX_SAMPLES;

    let sumOfSquares = 0;

    for (let s = 0; s < samplesToUse; s++) {
      const i = Math.floor(s * step) * 2;
      const low = binaryString.charCodeAt(i);
      const high = binaryString.charCodeAt(i + 1);
      let sample = (high << 8) | low;

      if (sample >= 32768) {
        sample -= 65536;
      }

      sumOfSquares += sample * sample;
    }

    const rms = Math.sqrt(sumOfSquares / samplesToUse);
    const normalizedLinear = rms / 32768;
    const volume = Math.min(1, Math.pow(normalizedLinear * 3, 0.5));

    return volume;
  } catch (e) {
    return 0;
  }
}

/**
 * 请求录音权限（Android 需显式请求，iOS 首次使用时自动请求）
 * 先弹用途说明引导弹窗，用户确认后再请求系统权限
 */
export async function requestAudioPermission(purpose: string = '语音录制'): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      // 检查是否已有权限
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (hasPermission) return true;

      // 先弹引导弹窗说明用途
      const confirmed = await usePermissionGuideStore.getState().showGuide('microphone');
      if (!confirmed) return false;

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
      // 永久拒绝，引导去设置
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        await Linking.openSettings();
      }
      return false;
    } catch (error) {
      console.error(`[audioUtils] 请求录音权限失败:`, error);
      return false;
    }
  }
  return true;
}
