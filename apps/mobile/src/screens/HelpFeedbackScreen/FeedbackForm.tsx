import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { createStyles } from './styles';

interface FeedbackFormProps {
  feedbackType: 'bug' | 'feature' | 'other';
  setFeedbackType: (type: 'bug' | 'feature' | 'other') => void;
  feedbackContent: string;
  setFeedbackContent: (content: string) => void;
  feedbackImages: string[];
  isSubmitting: boolean;
  uploadingImage: boolean;
  onAddImage: () => void;
  onRemoveImage: (index: number) => void;
  onSubmit: () => void;
}

export default function FeedbackForm({
  feedbackType,
  setFeedbackType,
  feedbackContent,
  setFeedbackContent,
  feedbackImages,
  isSubmitting,
  uploadingImage,
  onAddImage,
  onRemoveImage,
  onSubmit,
}: FeedbackFormProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const feedbackTypes = [
    { value: 'bug' as const, label: t('helpFeedback.feedbackTypes.bug'), icon: 'bug-report' },
    { value: 'feature' as const, label: t('helpFeedback.feedbackTypes.feature'), icon: 'lightbulb' },
    { value: 'other' as const, label: t('helpFeedback.feedbackTypes.other'), icon: 'chat' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('helpFeedback.feedbackTitle')}</Text>

      {/* 反馈类型选择 */}
      <View style={styles.feedbackTypeContainer}>
        {feedbackTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.feedbackTypeButton,
              feedbackType === type.value && styles.feedbackTypeButtonActive,
            ]}
            onPress={() => setFeedbackType(type.value)}
          >
            <Icon
              name={type.icon}
              size={20}
              color={feedbackType === type.value ? theme.colors.primary : theme.colors.text.secondary}
            />
            <Text
              style={[
                styles.feedbackTypeText,
                feedbackType === type.value && styles.feedbackTypeTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 反馈内容输入 */}
      <View style={styles.feedbackInputContainer}>
        <TextInput
          style={styles.feedbackInput}
          value={feedbackContent}
          onChangeText={setFeedbackContent}
          placeholder={t('helpFeedback.feedbackPlaceholder')}
          placeholderTextColor={theme.colors.text.disabled}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>
          {feedbackContent.length}/500
        </Text>
      </View>

      {/* 图片上传区域 */}
      <View style={styles.imageSection}>
        <View style={styles.imageList}>
          {feedbackImages.map((uri, index) => (
            <View key={index} style={styles.imageItem}>
              <Image source={{ uri }} style={styles.uploadedImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => onRemoveImage(index)}
              >
                <Icon name={IconNames.close} size={14} color={theme.colors.text.inverse} />
              </TouchableOpacity>
            </View>
          ))}
          {feedbackImages.length < 5 && (
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={onAddImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={theme.colors.text.secondary} />
              ) : (
                <>
                  <Icon name="add-photo" size={24} color={theme.colors.text.secondary} />
                  <Text style={styles.addImageText}>{t('helpFeedback.addImage')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.imageHint}>{t('helpFeedback.imageHint')}</Text>
      </View>

      {/* 提交按钮 */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={theme.colors.text.inverse} size="small" />
        ) : (
          <Text style={styles.submitButtonText}>{t('helpFeedback.submit')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
