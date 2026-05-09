import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import CustomImagePicker from '@/components/CustomImagePicker';
import FAQSection from './FAQSection';
import FeedbackForm from './FeedbackForm';
import { useFeedback } from './useFeedback';
import { createStyles } from './styles';

export default function HelpFeedbackScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
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
  } = useFeedback();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('helpFeedback.title')}</Text>
        <View style={styles.headerButtonRight} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 常见问题 */}
        <FAQSection />

        {/* 意见反馈 */}
        <FeedbackForm
          feedbackType={feedbackType}
          setFeedbackType={setFeedbackType}
          feedbackContent={feedbackContent}
          setFeedbackContent={setFeedbackContent}
          feedbackImages={feedbackImages}
          isSubmitting={isSubmitting}
          uploadingImage={uploadingImage}
          onAddImage={() => setShowImagePicker(true)}
          onRemoveImage={handleRemoveImage}
          onSubmit={handleSubmitFeedback}
        />

        {/* 联系我们 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('helpFeedback.contactTitle')}</Text>

          <TouchableOpacity style={styles.contactItem} onPress={handleContactSupport}>
            <View style={styles.contactLeft}>
              <Icon name="email" size={24} color={theme.colors.primary} style={styles.contactIcon} />
              <View>
                <Text style={styles.contactLabel}>{t('helpFeedback.emailSupport')}</Text>
                <Text style={styles.contactValue}>feedback@coderhythm.cn</Text>
              </View>
            </View>
            <Icon name={IconNames.right} size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 底部间距 */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 图片选择器 */}
      <CustomImagePicker
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={handleImageSelected}
      />

      {AlertComponent}
    </SafeAreaView>
  );
}
