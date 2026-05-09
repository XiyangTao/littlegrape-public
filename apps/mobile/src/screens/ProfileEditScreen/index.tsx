import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { useProfileForm } from './useProfileForm';
import { useAvatarUpload } from './useAvatarUpload';
import AvatarSection from './AvatarSection';
import FormSection from './FormSection';
import { createStyles } from './styles';

export default function ProfileEditScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    formData,
    validationErrors,
    showDatePicker,
    setShowDatePicker,
    selectedDate,
    isLoading,
    user,
    GENDER_OPTIONS,
    formatDisplayDate,
    updateFormData,
    handleDateConfirm,
    handleDateChange,
    handleSave,
    toast,
    AlertComponent,
  } = useProfileForm();

  const {
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
  } = useAvatarUpload(toast);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screen.profileEdit')}</Text>
        <View style={styles.headerButtonRight} />
      </View>

      <View style={styles.content}>
        <AvatarSection
          user={user}
          newAvatarUri={newAvatarUri}
          isUploadingAvatar={isUploadingAvatar}
          showAvatarModal={showAvatarModal}
          setShowAvatarModal={setShowAvatarModal}
          showCustomImagePicker={showCustomImagePicker}
          setShowCustomImagePicker={setShowCustomImagePicker}
          selectedImageForCrop={selectedImageForCrop}
          setSelectedImageForCrop={setSelectedImageForCrop}
          handleCameraPhoto={handleCameraPhoto}
          handleLibraryPhoto={handleLibraryPhoto}
          handleCustomImageSelected={handleCustomImageSelected}
          handleCropComplete={handleCropComplete}
        />

        <FormSection
          formData={formData}
          validationErrors={validationErrors}
          isLoading={isLoading}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
          selectedDate={selectedDate}
          GENDER_OPTIONS={GENDER_OPTIONS}
          formatDisplayDate={formatDisplayDate}
          updateFormData={updateFormData}
          handleDateConfirm={handleDateConfirm}
          handleDateChange={handleDateChange}
        />
      </View>

      {/* 底部保存按钮 */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? t('profileEdit.actions.saving') : t('profileEdit.actions.save')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 自定义警告组件 */}
      {AlertComponent}
    </SafeAreaView>
  );
}
