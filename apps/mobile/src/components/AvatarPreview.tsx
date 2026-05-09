import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';

interface AvatarPreviewProps {
  /** 头像 URL */
  uri?: string | null;
  /** 默认显示的文字（无头像时显示首字母） */
  fallbackText?: string;
  /** 头像大小，默认 80 */
  size?: number;
  /** 是否可点击预览大图，默认 true */
  previewable?: boolean;
}

export default function AvatarPreview({
  uri,
  fallbackText = '?',
  size = 80,
  previewable = true,
}: AvatarPreviewProps) {
  const { theme } = useTheme();
  const [showPreview, setShowPreview] = useState(false);
  const styles = createStyles(theme, size);

  const handlePress = () => {
    if (previewable && uri) {
      setShowPreview(true);
    }
  };

  const renderAvatar = () => {
    if (uri) {
      return <Image source={{ uri }} style={styles.avatar} />;
    }
    return (
      <View style={styles.defaultAvatar}>
        <Text style={styles.avatarText}>{fallbackText[0] || '?'}</Text>
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        disabled={!previewable || !uri}
        activeOpacity={0.8}
      >
        {renderAvatar()}
      </TouchableOpacity>

      {/* 大图预览 Modal */}
      <Modal
        visible={showPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreview(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPreview(false)}>
          <View style={styles.modalContent}>
            {uri && (
              <Image
                source={{ uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPreview(false)}
            >
              <Icon name="close" size={28} color={theme.colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (theme: Theme, size: number) => StyleSheet.create({
  avatar: {
    width: size,
    height: size,
    borderRadius: size / 2,
  },
  defaultAvatar: {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: size * 0.4,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: theme.screen.width,
    height: theme.screen.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: theme.screen.width,
    height: theme.screen.width,
    maxHeight: theme.screen.height * 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
