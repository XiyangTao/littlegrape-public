import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import Icon, { IconNames } from '@/components/Icon';
import { getCacheInfo, clearAllCache } from '@/services/CacheService';
import type { ThemeMode } from '@/theme';
import type { Language } from '@/locales';

type LanguageSetting = Language | 'system';
type ThemeSetting = ThemeMode | 'system';

interface SelectOption<T> {
  value: T;
  label: string;
  description?: string;
}

export default function AppSettingsScreen() {
  const navigation = useNavigation();
  const { theme, setting: themeSetting, setTheme } = useTheme();
  const { setting: languageSetting, setLanguage, t } = useI18n();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [cacheSize, setCacheSize] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const { confirm, toast, AlertComponent } = useCustomAlert();
  const styles = createStyles(theme);

  // 加载缓存大小
  const loadCacheSize = useCallback(async () => {
    try {
      const info = await getCacheInfo();
      setCacheSize(info.totalSizeFormatted);
    } catch (error) {
      console.error('Failed to get cache info:', error);
      setCacheSize('0 B');
    }
  }, []);

  useEffect(() => {
    loadCacheSize();
  }, [loadCacheSize]);

  // 清除缓存
  const handleClearCache = useCallback(() => {
    confirm(
      t('settings.cache.clearConfirmTitle'),
      t('settings.cache.clearConfirmMessage'),
      async () => {
        setIsClearing(true);
        try {
          await clearAllCache();
          setCacheSize('0 B');
          toast(t('common.tip'), t('settings.cache.clearSuccess'), 'success');
        } catch (error) {
          console.error('Failed to clear cache:', error);
          toast(t('common.error'), t('settings.cache.clearFailed'), 'error');
        } finally {
          setIsClearing(false);
        }
      }
    );
  }, [t, confirm, toast]);

  // 语言选项
  const languageOptions: SelectOption<LanguageSetting>[] = [
    { value: 'zh-CN', label: t('settings.languageOptions.zhCN'), description: '中文' },
    { value: 'en', label: t('settings.languageOptions.en'), description: 'English' },
    { value: 'system', label: t('settings.languageOptions.system'), description: t('settings.languageOptions.systemDesc') },
  ];

  // 主题选项
  const themeOptions: SelectOption<ThemeSetting>[] = [
    { value: 'light', label: t('settings.themeOptions.light'), description: t('settings.themeOptions.lightDesc') },
    { value: 'dark', label: t('settings.themeOptions.dark'), description: t('settings.themeOptions.darkDesc') },
    { value: 'system', label: t('settings.themeOptions.system'), description: t('settings.themeOptions.systemDesc') },
  ];

  const getCurrentLanguageLabel = () => {
    return languageOptions.find(opt => opt.value === languageSetting)?.label || '';
  };

  const getCurrentThemeLabel = () => {
    return themeOptions.find(opt => opt.value === themeSetting)?.label || '';
  };

  const handleLanguageSelect = (value: LanguageSetting) => {
    setLanguage(value);
    setShowLanguageModal(false);
  };

  const handleThemeSelect = (value: ThemeSetting) => {
    setTheme(value);
    setShowThemeModal(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screen.appSettings')}</Text>
        <View style={styles.headerButtonRight} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 外观设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>

          <TouchableOpacity style={styles.settingItem} onPress={() => setShowThemeModal(true)}>
            <View style={styles.settingLeft}>
              <Icon name="palette" size={24} color={theme.colors.blue} style={styles.settingIcon} />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('settings.themeMode')}</Text>
                <Text style={styles.settingValue}>{getCurrentThemeLabel()}</Text>
              </View>
            </View>
            <Icon name={IconNames.right} size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 语言设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>

          <TouchableOpacity style={styles.settingItem} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.settingLeft}>
              <Icon name="language" size={24} color={theme.colors.green} style={styles.settingIcon} />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('settings.appLanguage')}</Text>
                <Text style={styles.settingValue}>{getCurrentLanguageLabel()}</Text>
              </View>
            </View>
            <Icon name={IconNames.right} size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 存储与缓存 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.cache.title')}</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleClearCache}
            disabled={isClearing}
          >
            <View style={styles.settingLeft}>
              <Icon name="delete" size={24} color={theme.colors.orange} style={styles.settingIcon} />
              <Text style={styles.settingTitle}>{t('settings.cache.clearCache')}</Text>
            </View>
            <View style={styles.cacheRight}>
              {isClearing ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.cacheSizeText}>
                  {cacheSize === null ? t('settings.cache.calculating') : cacheSize}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 语言选择 Modal */}
      <SelectModal
        visible={showLanguageModal}
        title={t('settings.selectLanguage')}
        options={languageOptions}
        selectedValue={languageSetting}
        onSelect={handleLanguageSelect}
        onClose={() => setShowLanguageModal(false)}
        theme={theme}
      />

      {/* 主题选择 Modal */}
      <SelectModal
        visible={showThemeModal}
        title={t('settings.selectTheme')}
        options={themeOptions}
        selectedValue={themeSetting}
        onSelect={handleThemeSelect}
        onClose={() => setShowThemeModal(false)}
        theme={theme}
      />

      {/* Alert 组件 */}
      {AlertComponent}
    </SafeAreaView>
  );
}

// 通用选择器 Modal 组件
interface SelectModalProps<T> {
  visible: boolean;
  title: string;
  options: SelectOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  theme: Theme;
}

function SelectModal<T>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  theme,
}: SelectModalProps<T>) {
  const styles = createModalStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Modal 标题 */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* 选项列表 */}
          <View style={styles.optionsList}>
            {options.map((option, index) => {
              const isSelected = option.value === selectedValue;
              const isLast = index === options.length - 1;

              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[styles.optionItem, !isLast && styles.optionItemBorder]}
                  onPress={() => onSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    )}
                  </View>
                  {isSelected && (
                    <Icon name="check" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerButtonRight: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  cacheRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cacheSizeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
});

const createModalStyles = (theme: Theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.spacing.borderRadius.xl,
    borderTopRightRadius: theme.spacing.borderRadius.xl,
    paddingBottom: theme.spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -theme.spacing.sm,
  },
  optionsList: {
    paddingHorizontal: theme.spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
  },
  optionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  optionContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  optionLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  optionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
});
