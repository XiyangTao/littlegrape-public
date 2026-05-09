import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import AvatarPreview from '@/components/AvatarPreview';
import CustomImagePicker from '@/components/CustomImagePicker';
import ImageCropModal from '@/components/ImageCropModal';
import { createStyles } from './styles';

interface AvatarSectionProps {
  user: any;
  newAvatarUri: string | null;
  isUploadingAvatar: boolean;
  showAvatarModal: boolean;
  setShowAvatarModal: (visible: boolean) => void;
  showCustomImagePicker: boolean;
  setShowCustomImagePicker: (visible: boolean) => void;
  selectedImageForCrop: string | null;
  setSelectedImageForCrop: (uri: string | null) => void;
  handleCameraPhoto: () => void;
  handleLibraryPhoto: () => void;
  handleCustomImageSelected: (uri: string) => void;
  handleCropComplete: (croppedUri: string) => void;
}

export default function AvatarSection({
  user,
  newAvatarUri,
  isUploadingAvatar,
  showAvatarModal,
  setShowAvatarModal,
  showCustomImagePicker,
  setShowCustomImagePicker,
  selectedImageForCrop,
  setSelectedImageForCrop,
  handleCameraPhoto,
  handleLibraryPhoto,
  handleCustomImageSelected,
  handleCropComplete,
}: AvatarSectionProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  return (
    <>
      {/* 头像区域 */}
      <View style={styles.avatarSection}>
        {/* 头像图片 - 点击查看大图 */}
        <View style={styles.avatarWrapper}>
          <AvatarPreview
            uri={newAvatarUri || user?.avatar}
            fallbackText={user?.nickname || user?.username || '?'}
            size={100}
            previewable={!isUploadingAvatar}
          />
          {isUploadingAvatar && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}
        </View>
        {/* 更换头像文字 - 点击更换头像 */}
        <TouchableOpacity
          onPress={() => !isUploadingAvatar && setShowAvatarModal(true)}
          disabled={isUploadingAvatar}
          activeOpacity={0.7}
        >
          <Text style={styles.avatarHint}>
            {isUploadingAvatar ? t('profileEdit.avatar.uploading') : t('profileEdit.avatar.tapToChange')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 头像选择模态框 */}
      <Modal
        visible={showAvatarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarModal(false)}
        >
          <TouchableOpacity
            style={styles.avatarModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />

            <Text style={styles.avatarModalTitle}>{t('profileEdit.avatar.selectTitle')}</Text>
            <Text style={styles.avatarModalSubtitle}>{t('profileEdit.avatar.selectSubtitle')}</Text>

            <View style={styles.avatarOptionsGrid}>
              <TouchableOpacity
                style={styles.avatarOptionCard}
                onPress={handleCameraPhoto}
                activeOpacity={0.7}
              >
                <View style={styles.avatarOptionIconWrapper}>
                  <Icon name={IconNames.camera} size={28} color={theme.colors.primary} />
                </View>
                <Text style={styles.avatarOptionLabel}>{t('profileEdit.avatar.camera')}</Text>
                <Text style={styles.avatarOptionDesc}>{t('profileEdit.avatar.cameraDesc')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarOptionCard}
                onPress={handleLibraryPhoto}
                activeOpacity={0.7}
              >
                <View style={styles.avatarOptionIconWrapper}>
                  <Icon name={IconNames.image} size={28} color={theme.colors.primary} />
                </View>
                <Text style={styles.avatarOptionLabel}>{t('profileEdit.avatar.gallery')}</Text>
                <Text style={styles.avatarOptionDesc}>{t('profileEdit.avatar.galleryDesc')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.avatarCancelButton}
              onPress={() => setShowAvatarModal(false)}
            >
              <Text style={styles.avatarCancelText}>{t('profileEdit.actions.cancel')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* CustomImagePicker - 相册选择器 */}
      <CustomImagePicker
        visible={showCustomImagePicker}
        onClose={() => setShowCustomImagePicker(false)}
        onImageSelected={handleCustomImageSelected}
      />

      {/* ImageCropModal - 图片裁剪界面 */}
      <ImageCropModal
        visible={!!selectedImageForCrop}
        imageUri={selectedImageForCrop}
        onClose={() => setSelectedImageForCrop(null)}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
