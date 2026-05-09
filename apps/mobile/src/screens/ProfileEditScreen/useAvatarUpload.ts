import { useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '@/services/FileService';
import { smartCompressImage } from '@/utils/imageUtils';
import { useAuth } from '@/stores/AuthStore';
import { useI18n } from '@/context/I18nProvider';
import { usePermission } from '@/hooks/usePermission';
import { getErrorMessage } from '@/utils/errorUtils';

type ToastFn = (title: string, message: string, type?: 'info' | 'success' | 'error') => void;

export function useAvatarUpload(toast: ToastFn) {
  const { updateProfile } = useAuth();
  const { t } = useI18n();
  const cameraPermission = usePermission('camera');

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showCustomImagePicker, setShowCustomImagePicker] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string | null>(null);
  // 点击拍照：通过 usePermission 统一处理引导和权限请求
  const handleCameraPhoto = async () => {
    setShowAvatarModal(false);
    const granted = await cameraPermission.request();
    if (!granted) return;
    await launchCamera();
  };

  // 启动相机
  const launchCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        setSelectedImageForCrop(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast(t('common.error'), t('profileEdit.messages.cameraError') + '：' + getErrorMessage(error), 'error');
    }
  };

  // 从相册选择
  const handleLibraryPhoto = () => {
    setShowAvatarModal(false);
    setShowCustomImagePicker(true);
  };

  const handleCustomImageSelected = (uri: string) => {
    setSelectedImageForCrop(uri);
  };

  // 裁剪完成
  const handleCropComplete = async (croppedUri: string) => {
    setSelectedImageForCrop(null);

    // 使用智能压缩
    const processedUri = await smartCompressImage(croppedUri);

    if (processedUri) {
      setNewAvatarUri(processedUri);
      uploadAvatar(processedUri);
    } else {
      toast(t('common.error'), t('profileEdit.messages.imageProcessFailed'), 'error');
    }
  };

  // 上传头像
  const uploadAvatar = async (uri: string) => {
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();

      // 构建文件对象
      const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar_${Date.now()}.${fileExtension}`;

      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
        name: fileName,
      } as any);

      // 设置上传到 avatars 文件夹
      formData.append('folder', 'avatars');

      // 上传头像
      const uploadResult = await uploadFile(formData);

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || '头像上传失败');
      }

      await updateProfile({ avatar: uploadResult.data.cdnUrl });

      toast(t('common.success'), t('profileEdit.messages.avatarUploadSuccess'), 'success');
      setNewAvatarUri(null);
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast(t('common.error'), t('profileEdit.messages.avatarUploadFailed') + '：' + getErrorMessage(error), 'error');
      setNewAvatarUri(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return {
    showAvatarModal,
    setShowAvatarModal,
    newAvatarUri,
    isUploadingAvatar,
    showCustomImagePicker,
    setShowCustomImagePicker,
    selectedImageForCrop,
    setSelectedImageForCrop,
    handleCameraPhoto,
    handleLibraryPhoto,
    handleCustomImageSelected,
    handleCropComplete,
  };
}
