import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { usePermission } from '@/hooks/usePermission';
import Icon, { IconNames } from '@/components/Icon';
import { getErrorMessage } from '@/utils/errorUtils';

interface CustomImagePickerProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string) => void;
}

interface PhotoAsset {
  id: string;
  uri: string;
  width: number;
  height: number;
  creationTime: number;
}

interface Album {
  id: string;
  title: string;
  assetCount: number;
  coverUri?: string; // 相册封面图
}

export default function CustomImagePicker({
  visible,
  onClose,
  onImageSelected,
}: CustomImagePickerProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { toast, AlertComponent } = useCustomAlert();
  const mediaPermission = usePermission('mediaLibrary');
  const cameraPermission = usePermission('camera');
  const styles = createStyles(theme);

  // ==================== 状态管理 ====================

  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [showAlbumSelector, setShowAlbumSelector] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>();


  // ==================== 权限处理 ====================

  const checkPermission = async (): Promise<boolean> => {
    const status = await mediaPermission.check();
    const granted = status === 'granted';
    setHasPermission(granted);
    return granted;
  };

  const requestPermission = async (): Promise<boolean> => {
    const granted = await mediaPermission.request();
    setHasPermission(granted);
    return granted;
  };

  // ==================== 相册管理 ====================
  const loadAlbums = useCallback(async () => {
    try {
      // 然后异步加载相册列表
      const albumsData = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true,
      });

      // 获取每个相册的照片数量和封面图
      const albumsInfo = await Promise.all(
        albumsData.map(async (album) => {
          try {
            const assets = await MediaLibrary.getAssetsAsync({
              album: album.id,
              mediaType: MediaLibrary.MediaType.photo,
              first: 1, // 获取第一张照片作为封面
            });
            return {
              id: album.id,
              title: album.title,
              assetCount: assets.totalCount,
              coverUri: assets.assets[0]?.uri, // 封面图
            };
          } catch (error) {
            return {
              id: album.id,
              title: album.title,
              assetCount: 0,
            };
          }
        })
      );

      // 过滤掉空相册和没有封面图的相册
      const nonEmptyAlbums = albumsInfo.filter(album => album.assetCount > 0 && album.coverUri);

      // 计算所有照片总数
      const totalCount = nonEmptyAlbums.reduce((sum, album) => sum + album.assetCount, 0);

      // 获取所有照片中的第一张作为封面
      let allPhotosCover: string | undefined;
      try {
        const allAssets = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          first: 1,
        });
        allPhotosCover = allAssets.assets[0]?.uri;
      } catch (error) {
        console.error('获取所有照片封面失败:', error);
      }

      // 添加"所有照片"到列表顶部
      const allAlbumsWithDefault = [
        {
          id: 'all',
          title: t('imagePicker.allPhotos'),
          assetCount: totalCount,
          coverUri: allPhotosCover,
        },
        ...nonEmptyAlbums
      ];

      setAlbums(allAlbumsWithDefault);

      // 设置默认相册为"所有照片"
      const defaultAlbum = allAlbumsWithDefault[0];
      setCurrentAlbum(defaultAlbum);

      // 加载所有照片（跳过权限检查，因为我们已经确认有权限了）
      await loadPhotos('all', false, true);

    } catch (error) {
      console.error('加载相册失败:', error);
      toast(t('common.error'), t('imagePicker.loadAlbumsFailed'), 'error');
    }
  }, [toast, t]);

  // ==================== 照片加载 ====================
  const loadPhotos = async (albumId?: string, loadMore = false, skipPermissionCheck = false) => {
    // 跳过权限检查（用于初始化时）
    if (!skipPermissionCheck && !hasPermission) {
      return;
    }

    if (loadMore) {
      if (loadingMore || !hasNextPage) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPhotos([]);
      setHasNextPage(true);
      setEndCursor(undefined);
    }

    try {
      const options: MediaLibrary.AssetsOptions = {
        first: loadMore ? 50 : 100, // 首次加载更多，后续较少
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime,
      };

      if (albumId && albumId !== 'all') {
        options.album = albumId;
      }

      if (loadMore && endCursor) {
        options.after = endCursor;
      }

      const media = await MediaLibrary.getAssetsAsync(options);

      const photoAssets: PhotoAsset[] = media.assets.map(asset => ({
        id: asset.id,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        creationTime: asset.creationTime,
      }));

      if (loadMore) {
        setPhotos(prev => [...prev, ...photoAssets]);
      } else {
        setPhotos(photoAssets);
      }

      setHasNextPage(media.hasNextPage);
      setEndCursor(media.endCursor);
    } catch (error) {
      console.error('加载照片失败:', error);
      toast(t('common.error'), t('imagePicker.loadPhotosFailed'), 'error');
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // ==================== 相机和照片选择 ====================
  const handleCameraPhoto = async () => {
    try {
      const granted = await cameraPermission.request();
      if (!granted) {
        toast(t('common.error'), t('imagePicker.cameraPermissionDenied'), 'error');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        onImageSelected(result.assets[0].uri);
        onClose();
      }
    } catch (error) {
      toast(t('common.error'), t('imagePicker.cameraError') + '：' + getErrorMessage(error), 'error');
    }
  };
  const handlePhotoSelect = (photo: PhotoAsset) => {
    onImageSelected(photo.uri);
    onClose();
  };
  const handleAlbumChange = async (album: Album) => {
    setCurrentAlbum(album);
    setShowAlbumSelector(false);
    await loadPhotos(album.id, false);
  };

  const loadMorePhotos = () => {
    if (currentAlbum) {
      loadPhotos(currentAlbum.id, true);
    }
  };

  // ==================== 生命周期 ====================
  useEffect(() => {
    if (visible) {
      // 先检查，已有权限直接加载；否则请求（自动弹引导弹窗）
      checkPermission().then(granted => {
        if (granted) {
          loadAlbums();
        } else {
          requestPermission().then(g => { if (g) loadAlbums(); });
        }
      });
    }
  }, [visible]);

  // ==================== 渲染函数 ====================
  const renderPhotoItem = ({ item, index }: { item: PhotoAsset; index: number }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => handlePhotoSelect(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.photoImage} />
    </TouchableOpacity>
  );

  // 渲染相册选择项
  const renderAlbumItem = ({ item }: { item: Album }) => {
    const isSelected = currentAlbum?.id === item.id;

    return (
      <TouchableOpacity
        style={styles.albumItem}
        onPress={() => handleAlbumChange(item)}
        activeOpacity={0.7}
      >
        {/* 封面图 */}
        <Image
          source={{ uri: item.coverUri || '' }}
          style={styles.albumCover}
        />

        <View style={styles.albumInfo}>
          <Text style={styles.albumItemTitle}>{item.title}</Text>
          <Text style={styles.albumCount}>({item.assetCount})</Text>
        </View>

        {isSelected && (
          <Icon name="check" size={24} color={theme.colors.success} />
        )}
      </TouchableOpacity>
    );
  };

  // ==================== 主渲染 ====================

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Icon name={IconNames.close} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.albumSelector}
            onPress={() => setShowAlbumSelector(!showAlbumSelector)}
          >
            <Text style={styles.albumTitle}>
              {currentAlbum?.title || t('imagePicker.allPhotos')}
            </Text>
            <Icon
              name={showAlbumSelector ? IconNames.up : IconNames.down}
              size={16}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>

          <View style={styles.headerButton} />
        </View>

        {/* 相册选择下拉 */}
        {showAlbumSelector && (
          <>
            <TouchableOpacity
              style={styles.albumOverlay}
              activeOpacity={1}
              onPress={() => setShowAlbumSelector(false)}
            />
            <View style={styles.albumDropdown}>
              <FlatList
                data={albums}
                keyExtractor={(item) => item.id}
                renderItem={renderAlbumItem}
                style={styles.albumList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </>
        )}

        {/* 照片网格 */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{t('imagePicker.loading')}</Text>
          </View>
        ) : (
          <FlatList
            data={[{ id: 'camera', uri: '', width: 0, height: 0, creationTime: 0 }, ...photos]}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              if (item.id === 'camera') {
                return (
                  <TouchableOpacity
                    style={[styles.photoItem, styles.cameraItem]}
                    onPress={handleCameraPhoto}
                    activeOpacity={0.8}
                  >
                    <Icon name={IconNames.camera} size={32} color={theme.colors.text.secondary} />
                    <Text style={styles.cameraText}>{t('imagePicker.camera')}</Text>
                  </TouchableOpacity>
                );
              }
              return renderPhotoItem({ item, index: index - 1 });
            }}
            numColumns={4}
            contentContainerStyle={styles.photoGrid}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMorePhotos}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingMoreText}>{t('imagePicker.loadingMore')}</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {photos.length === 0 ? t('imagePicker.noPhotos') : ''}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
      {AlertComponent}
    </Modal>
  );
}

const createStyles = (theme: Theme) => {
  const imageSize = (theme.screen.width - 6) / 4;
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  albumTitle: {
    color: theme.colors.text.primary, // 顶部按钮的文字颜色
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    marginRight: theme.spacing.xs,
  },
  albumOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
    zIndex: 999,
  },
  // 相册下拉列表采用 iOS 原生风格深色半透明背景，与系统行为一致，不走主题色
  albumDropdown: {
    position: 'absolute',
    top: 85,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(44, 44, 46, 0.95)',
    maxHeight: 550, // 增加高度，可以显示更多相册
    zIndex: 1000,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  albumList: {
    paddingVertical: 0,
  },
  albumItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm, // 减小上下内边距，显示更多相册
    borderBottomWidth: 0.5,
    borderBottomColor: '#3A3A3C', // 深色分隔线
  },
  albumCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: theme.spacing.md,
    backgroundColor: '#3A3A3C',
  },
  albumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  albumItemTitle: {
    color: '#FFFFFF', // 白色文字（下拉列表中的相册名称）
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.normal,
  },
  albumCount: {
    color: '#8E8E93', // 浅灰色（微信风格）
    fontSize: theme.typography.fontSize.base,
    marginLeft: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.base,
  },
  photoGrid: {
    padding: 1,
    backgroundColor: theme.colors.background.primary,
  },
  photoItem: {
    width: imageSize,
    height: imageSize,
    margin: 1,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.secondary,
  },
  cameraItem: {
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.base,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  loadingMoreText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing.sm,
  },
});
};