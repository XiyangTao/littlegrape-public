import { useState } from 'react';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useI18n } from '@/context/I18nProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { uploadFeedbackFile, submitFeedback } from '@/services/FeedbackService';
import { smartCompressImage } from '@/utils/imageUtils';
import { getErrorMessage } from '@/utils/errorUtils';

export function useFeedback() {
  const { t } = useI18n();
  const { toast, AlertComponent } = useCustomAlert();

  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('bug');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackImages, setFeedbackImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // 选择图片
  const handleImageSelected = async (uri: string) => {
    if (feedbackImages.length >= 5) {
      toast('', t('helpFeedback.errors.maxImages'), 'error');
      return;
    }

    setUploadingImage(true);
    try {
      // 压缩图片
      const compressedUri = await smartCompressImage(uri, 2 * 1024 * 1024);
      if (!compressedUri) {
        toast('', t('helpFeedback.errors.uploadFailed'), 'error');
        return;
      }

      // 上传图片到 OSS
      const formData = new FormData();
      formData.append('file', {
        uri: compressedUri,
        type: 'image/jpeg',
        name: `feedback_${Date.now()}.jpg`,
      } as any);
      formData.append('folder', 'feedback');

      const result = await uploadFeedbackFile(formData);
      if (result.success && result.data?.url) {
        setFeedbackImages(prev => [...prev, result.data!.url]);
      } else {
        toast('', t('helpFeedback.errors.uploadFailed'), 'error');
      }
    } catch (error) {
      toast('', t('helpFeedback.errors.uploadFailed'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setFeedbackImages(prev => prev.filter((_, i) => i !== index));
  };

  // 提交反馈
  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) {
      toast('', t('helpFeedback.errors.contentRequired'), 'error');
      return;
    }

    if (feedbackContent.trim().length < 10) {
      toast('', t('helpFeedback.errors.contentTooShort'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 获取设备信息
      const deviceInfo = {
        platform: Platform.OS,
        systemVersion: Platform.Version.toString(),
        appVersion: Constants.expoConfig?.version ?? '1.0.0',
        deviceModel: `${Platform.OS} ${Platform.Version}`,
      };

      // 调用后端 API 提交反馈
      const result = await submitFeedback({
        type: feedbackType,
        content: feedbackContent.trim(),
        images: feedbackImages.length > 0 ? feedbackImages : undefined,
        deviceInfo,
      });

      if (result.success) {
        toast('', t('helpFeedback.submitSuccess'), 'success');
        setFeedbackContent('');
        setFeedbackImages([]);
      } else {
        toast('', result.error || t('helpFeedback.submitFailed'), 'error');
      }
    } catch (error) {
      toast('', getErrorMessage(error) || t('helpFeedback.submitFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 联系客服
  const handleContactSupport = () => {
    const email = 'feedback@coderhythm.cn';
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(t('helpFeedback.emailSubject'))}`);
  };

  return {
    feedbackType,
    setFeedbackType,
    feedbackContent,
    setFeedbackContent,
    feedbackImages,
    isSubmitting,
    showImagePicker,
    setShowImagePicker,
    uploadingImage,
    handleImageSelected,
    handleRemoveImage,
    handleSubmitFeedback,
    handleContactSupport,
    AlertComponent,
  };
}
