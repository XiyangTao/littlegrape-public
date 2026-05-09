import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onCropComplete: (croppedUri: string) => void;
}

export default function ImageCropModal({
  visible,
  imageUri,
  onClose,
  onCropComplete,
}: ImageCropModalProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const cropSizeValue = theme.screen.width * 0.85; // 裁剪框固定大小：屏幕宽度的85%

  // ==================== 状态管理 ====================
  const [isCropping, setIsCropping] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 });
  const [isLandscape, setIsLandscape] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 图片位置偏移
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // 使用 ref 存储尺寸，避免闭包问题
  const displaySizeRef = useRef({ width: 0, height: 0 });
  const cropSizeRef = useRef({ width: 0, height: 0 });
  const isLandscapeRef = useRef(false);

  // ==================== 图片加载与尺寸计算 ====================
  const loadImageAndCalculateSize = async (uri: string) => {
    try {
      // 使用 expo-image-manipulator 读取图片信息（不做任何处理）
      // 这样可以确保获取的是实际文件的尺寸，并且后续显示和裁剪使用同一个文件
      const result = await ImageManipulator.manipulateAsync(uri, []);
      const { uri: processedUri, width, height } = result;

      // 使用 manipulator 返回的 URI，确保显示的图片和实际裁剪的是同一个
      setCurrentImageUri(processedUri);
      setImageSize({ width, height });

      const isLandscapeImage = width > height;
      setIsLandscape(isLandscapeImage);
      isLandscapeRef.current = isLandscapeImage;

      let displayWidth: number;
      let displayHeight: number;

      // 图片的短边与裁剪框边长一致，长边按比例放大
      if (isLandscapeImage) {
        // 横向图片：短边是高度
        displayHeight = cropSizeValue;
        displayWidth = (cropSizeValue * width) / height;
      } else {
        // 纵向图片：短边是宽度
        displayWidth = cropSizeValue;
        displayHeight = (cropSizeValue * height) / width;
      }

      const newDisplaySize = { width: displayWidth, height: displayHeight };
      const newCropSize = { width: cropSizeValue, height: cropSizeValue };

      setDisplaySize(newDisplaySize);
      setCropSize(newCropSize);

      // 更新 ref
      displaySizeRef.current = newDisplaySize;
      cropSizeRef.current = newCropSize;

    } catch (error) {
      console.error('获取图片尺寸失败:', error);
    }
  };

  // 重置图片URI并获取准确尺寸
  useEffect(() => {
    if (visible && imageUri) {
      pan.setValue({ x: 0, y: 0 });
      loadImageAndCalculateSize(imageUri);
    }
  }, [visible, imageUri]);

  // ==================== 手势处理 ====================
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: (_, gesture) => {
        if (isLandscapeRef.current) {
          // 横向图片：只能左右移动
          pan.setValue({ x: gesture.dx, y: 0 });
        } else {
          // 纵向图片：只能上下移动
          pan.setValue({ x: 0, y: gesture.dy });
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();

        // 限制移动范围
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        let clampedX = currentX;
        let clampedY = currentY;
        let needsClamp = false;

        if (isLandscapeRef.current) {
          // 横向图片：限制左右移动范围
          const maxX = (displaySizeRef.current.width - cropSizeRef.current.width) / 2;
          const minX = -maxX;
          const newX = Math.max(minX, Math.min(maxX, currentX));
          if (newX !== currentX) {
            clampedX = newX;
            needsClamp = true;
          }
          clampedY = 0;
        } else {
          // 纵向图片：限制上下移动范围
          const maxY = (displaySizeRef.current.height - cropSizeRef.current.height) / 2;
          const minY = -maxY;
          const newY = Math.max(minY, Math.min(maxY, currentY));
          if (newY !== currentY) {
            clampedY = newY;
            needsClamp = true;
          }
          clampedX = 0;
        }

        // 只有超出边界时才弹回
        if (needsClamp) {
          Animated.spring(pan, {
            toValue: { x: clampedX, y: clampedY },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // ==================== 图片操作 ====================

  // 旋转图片
  const handleRotate = async () => {
    if (!currentImageUri || isRotating) return;

    setIsRotating(true);
    try {
      // 执行旋转操作
      const result = await ImageManipulator.manipulateAsync(
        currentImageUri,
        [{ rotate: 90 }]
      );

      // 重置位置
      pan.setValue({ x: 0, y: 0 });

      // 重新加载旋转后的图片并计算尺寸
      // 这样会更新 isLandscape 和 displaySize，确保移动方向正确
      await loadImageAndCalculateSize(result.uri);
    } catch (error) {
      console.error('旋转失败:', error);
    } finally {
      setIsRotating(false);
    }
  };

  // 裁剪图片
  const handleCrop = async () => {
    if (!currentImageUri || !imageSize.width || !displaySizeRef.current.width) return;

    setIsCropping(true);
    try {
      const currentDisplaySize = displaySizeRef.current;
      const currentCropSize = cropSizeRef.current;

      // 计算图片显示比例
      const scale = imageSize.width / currentDisplaySize.width;

      // 获取图片当前偏移量
      const offsetX = (pan.x as any)._value;
      const offsetY = (pan.y as any)._value;

      // 计算图片容器和裁剪框的实际位置
      const imageLeft = (containerSize.width - currentDisplaySize.width) / 2;
      const imageTop = (containerSize.height - currentDisplaySize.height) / 2;
      const cropLeft = (containerSize.width - currentCropSize.width) / 2;
      const cropTop = (containerSize.height - currentCropSize.height) / 2;

      // 图片实际位置（考虑偏移）
      const actualImageLeft = imageLeft + offsetX;
      const actualImageTop = imageTop + offsetY;

      // 裁剪框相对于图片容器左上角的位置
      const cropRelativeX = cropLeft - actualImageLeft;
      const cropRelativeY = cropTop - actualImageTop;

      // 转换为原图坐标
      const originX = cropRelativeX * scale;
      const originY = cropRelativeY * scale;
      let cropWidth = currentCropSize.width * scale;
      let cropHeight = currentCropSize.height * scale;

      // 确保裁剪尺寸不超过图片尺寸
      cropWidth = Math.min(cropWidth, imageSize.width);
      cropHeight = Math.min(cropHeight, imageSize.height);

      // 确保裁剪区域在图片范围内
      const clampedX = Math.max(0, Math.min(imageSize.width - cropWidth, originX));
      const clampedY = Math.max(0, Math.min(imageSize.height - cropHeight, originY));

      // 最终验证：确保裁剪区域完全在图片范围内
      const finalCropWidth = Math.min(cropWidth, imageSize.width - clampedX);
      const finalCropHeight = Math.min(cropHeight, imageSize.height - clampedY);

      // 使用 expo-image-manipulator 裁剪图片
      const result = await ImageManipulator.manipulateAsync(
        currentImageUri,
        [
          {
            crop: {
              originX: Math.round(clampedX),
              originY: Math.round(clampedY),
              width: Math.round(finalCropWidth),
              height: Math.round(finalCropHeight),
            },
          },
        ]
      );

      onCropComplete(result.uri);
    } catch (error) {
      console.error('裁剪失败:', error);
      onClose();
    } finally {
      setIsCropping(false);
    }
  };

  // 获取容器尺寸
  const handleContainerLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  // ==================== 渲染 ====================

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>{t('imageCrop.cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('imageCrop.title')}</Text>
          <TouchableOpacity
            onPress={handleCrop}
            style={styles.headerButton}
            disabled={isCropping}
          >
            {isCropping ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.confirmText}>{t('imageCrop.done')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 图片预览和裁剪区域 */}
        <View style={styles.imageContainer} onLayout={handleContainerLayout}>
          {currentImageUri && displaySize.width > 0 && containerSize.width > 0 ? (
            <>
              {/* 可拖动的图片 */}
              <Animated.View
                style={[
                  styles.imageWrapper,
                  {
                    width: displaySize.width,
                    height: displaySize.height,
                    left: (containerSize.width - displaySize.width) / 2,
                    top: (containerSize.height - displaySize.height) / 2,
                    transform: [
                      { translateX: pan.x },
                      { translateY: pan.y },
                    ],
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <Image
                  source={{ uri: currentImageUri }}
                  style={{ width: displaySize.width, height: displaySize.height }}
                  resizeMode="stretch"
                />
              </Animated.View>

              {/* 固定的裁剪框遮罩层 */}
              <View style={styles.cropOverlay} pointerEvents="none">
                {/* 上遮罩 */}
                <View style={styles.maskTop} />

                {/* 中间行 */}
                <View style={styles.middleRow}>
                  {/* 左遮罩 */}
                  <View style={styles.maskSide} />

                  {/* 裁剪框（固定在中心） */}
                  <View style={[styles.cropBox, { width: cropSize.width, height: cropSize.height }]}>
                    {/* 裁剪框边框 */}
                    <View style={styles.cropBorder} />

                    {/* 网格线 */}
                    <View style={styles.gridContainer}>
                      <View style={[styles.gridLine, styles.gridVertical, { left: '33.33%' }]} />
                      <View style={[styles.gridLine, styles.gridVertical, { left: '66.66%' }]} />
                      <View style={[styles.gridLine, styles.gridHorizontal, { top: '33.33%' }]} />
                      <View style={[styles.gridLine, styles.gridHorizontal, { top: '66.66%' }]} />
                    </View>

                    {/* 四个角的手柄 */}
                    <View style={[styles.cornerHandle, styles.cornerTopLeft]} />
                    <View style={[styles.cornerHandle, styles.cornerTopRight]} />
                    <View style={[styles.cornerHandle, styles.cornerBottomLeft]} />
                    <View style={[styles.cornerHandle, styles.cornerBottomRight]} />
                  </View>

                  {/* 右遮罩 */}
                  <View style={styles.maskSide} />
                </View>

                {/* 下遮罩 */}
                <View style={styles.maskTop} />
              </View>
            </>
          ) : null}
        </View>

        {/* 底部工具栏 */}
        <View style={styles.footer}>
          <View style={styles.toolBar}>
            {/* 旋转按钮 */}
            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleRotate}
              disabled={isRotating}
            >
              {isRotating ? (
                <ActivityIndicator size="small" color={theme.colors.text.inverse} />
              ) : (
                <Icon name={IconNames.refresh} size={24} color={theme.colors.text.inverse} />
              )}
              <Text style={styles.toolButtonText}>{t('imageCrop.rotate')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            {isLandscape ? t('imageCrop.dragHintLandscape') : t('imageCrop.dragHintPortrait')}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    height: 60,
    backgroundColor: theme.colors.shadow,
  },
  headerButton: {
    minWidth: 60,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.inverse,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
  },
  confirmText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: theme.screen.width,
    height: '100%',
  },
  imageWrapper: {
    position: 'absolute',
  },
  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskTop: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.overlay,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maskSide: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
  },
  cropBox: {
    position: 'relative',
  },
  cropBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: theme.colors.text.inverse,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridVertical: {
    width: 1,
    height: '100%',
  },
  gridHorizontal: {
    width: '100%',
    height: 1,
  },
  cornerHandle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: theme.colors.text.inverse,
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: -3,
    right: -3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: -3,
    left: -3,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: -3,
    right: -3,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  footer: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.shadow,
    minHeight: 80,
  },
  toolBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  toolButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.inverse,
    marginTop: 4,
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
