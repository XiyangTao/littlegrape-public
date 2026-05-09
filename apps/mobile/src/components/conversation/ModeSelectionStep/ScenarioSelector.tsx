import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { Theme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { PredefinedScenario, ScenarioType, ScenarioCategory, I18nText } from '@/types/conversation';
import { SCENARIO_CATEGORIES } from './constants';
import { createStyles } from './styles';

// 获取本地化文本的辅助函数
const getLocalizedText = (text: I18nText | string, language: string): string => {
  if (typeof text === 'string') return text;
  return text[language as keyof I18nText] || text['en'] || '';
};

interface ScenarioSelectorProps {
  theme: Theme;
  t: (key: string, params?: Record<string, any>) => string;
  effectiveLanguage: string;
  scenarioType: ScenarioType;
  selectedCategory: ScenarioCategory;
  selectedScenario: PredefinedScenario | null;
  customRole: string;
  customScenario: string;
  filteredScenarios: PredefinedScenario[];
  loading: boolean;
  onScenarioTypeChange: (type: ScenarioType) => void;
  onCategoryChange: (category: ScenarioCategory) => void;
  onScenarioSelect: (scenario: PredefinedScenario) => void;
  onCustomRoleChange: (text: string) => void;
  onCustomScenarioChange: (text: string) => void;
}

export default function ScenarioSelector({
  theme,
  t,
  effectiveLanguage,
  scenarioType,
  selectedCategory,
  selectedScenario,
  customRole,
  customScenario,
  filteredScenarios,
  loading,
  onScenarioTypeChange,
  onCategoryChange,
  onScenarioSelect,
  onCustomRoleChange,
  onCustomScenarioChange,
}: ScenarioSelectorProps) {
  const styles = createStyles(theme);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 下拉动画
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // 获取当前选中分类的信息
  const currentCategory = SCENARIO_CATEGORIES.find(c => c.value === selectedCategory);

  // 切换下拉框
  const toggleDropdown = () => {
    const toValue = isDropdownOpen ? 0 : 1;
    setIsDropdownOpen(!isDropdownOpen);

    Animated.parallel([
      Animated.timing(dropdownAnim, {
        toValue,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 选择分类
  const selectCategory = (category: ScenarioCategory) => {
    onCategoryChange(category);
    toggleDropdown();
  };

  // 箭头旋转动画
  const arrowRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // 下拉菜单高度动画 (每个选项固定高度 48px)
  const dropdownHeight = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCENARIO_CATEGORIES.length * 48],
  });

  return (
    <View style={styles.scenarioSection}>
      {/* Tab 切换 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, scenarioType === 'predefined' && styles.tabActive]}
          onPress={() => onScenarioTypeChange('predefined')}
        >
          <Icon
            name={IconNames.library}
            size={20}
            color={scenarioType === 'predefined' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, scenarioType === 'predefined' && styles.tabTextActive]}>
            {t('conversation.scenario.predefined')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, scenarioType === 'custom' && styles.tabActive]}
          onPress={() => onScenarioTypeChange('custom')}
        >
          <Icon
            name={IconNames.edit}
            size={20}
            color={scenarioType === 'custom' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, scenarioType === 'custom' && styles.tabTextActive]}>
            {t('conversation.scenario.custom')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 场景内容 */}
      {scenarioType === 'predefined' ? (
        <View style={styles.scenarioList}>
          {/* 分类下拉选择器 */}
          <View style={styles.dropdownContainer}>
            {/* 下拉触发按钮 */}
            <Pressable
              style={({ pressed }) => [
                styles.dropdownTrigger,
                pressed && styles.dropdownTriggerPressed,
                isDropdownOpen && styles.dropdownTriggerOpen,
              ]}
              onPress={toggleDropdown}
            >
              <View style={styles.dropdownTriggerContent}>
                <View style={styles.dropdownSelectedIcon}>
                  <Icon
                    name={currentCategory?.icon || IconNames.flightTakeoff}
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.dropdownSelectedText}>
                  {t(currentCategory?.labelKey || 'conversation.category.travel')}
                </Text>
              </View>
              <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
                <Icon
                  name={IconNames.down}
                  size={20}
                  color={theme.colors.text.secondary}
                />
              </Animated.View>
            </Pressable>

            {/* 下拉菜单 */}
            <Animated.View
              style={[
                styles.dropdownMenu,
                {
                  height: dropdownHeight,
                  opacity: dropdownAnim,
                },
              ]}
            >
              {SCENARIO_CATEGORIES.map((cat, index) => {
                const isSelected = selectedCategory === cat.value;
                const isLast = index === SCENARIO_CATEGORIES.length - 1;
                return (
                  <Pressable
                    key={cat.value}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemActive,
                      pressed && styles.dropdownItemPressed,
                      !isLast && styles.dropdownItemBorder,
                    ]}
                    onPress={() => selectCategory(cat.value)}
                  >
                    <View style={[
                      styles.dropdownItemIcon,
                      isSelected && styles.dropdownItemIconActive,
                    ]}>
                      <Icon
                        name={cat.icon}
                        size={16}
                        color={isSelected ? theme.colors.text.inverse : theme.colors.primary}
                      />
                    </View>
                    <Text style={[
                      styles.dropdownItemText,
                      isSelected && styles.dropdownItemTextActive,
                    ]}>
                      {t(cat.labelKey)}
                    </Text>
                    {isSelected && (
                      <Icon
                        name={IconNames.check}
                        size={18}
                        color={theme.colors.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </Animated.View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>{t('conversation.scenario.loading')}</Text>
            </View>
          ) : filteredScenarios.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name={IconNames.inbox} size={48} color={theme.colors.text.secondary} />
              <Text style={styles.emptyText}>{t('conversation.scenario.empty')}</Text>
            </View>
          ) : (
            filteredScenarios.map((scenario) => (
              <TouchableOpacity
                key={scenario.id}
                style={[
                  styles.scenarioCard,
                  selectedScenario?.id === scenario.id && styles.scenarioCardActive,
                ]}
                onPress={() => onScenarioSelect(scenario)}
                activeOpacity={0.8}
              >
                <View style={styles.scenarioImageContainer}>
                  <View style={styles.scenarioImageWrapper}>
                    <Image
                      source={{ uri: scenario.imageUrl }}
                      style={styles.scenarioImage}
                    />
                  </View>
                  {selectedScenario?.id === scenario.id && (
                    <View style={styles.selectedOverlay}>
                      <View style={styles.checkCircle}>
                        <Icon name={IconNames.check} size={16} color={theme.colors.text.inverse} />
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.scenarioInfo}>
                  <Text style={styles.scenarioTitle}>
                    {getLocalizedText(scenario.title, effectiveLanguage)}
                  </Text>
                  <Text style={styles.scenarioDescription} numberOfLines={2}>
                    {getLocalizedText(scenario.description, effectiveLanguage)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : (
        <View style={styles.customForm}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('conversation.scenario.aiRoleLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('conversation.scenario.aiRolePlaceholder')}
              placeholderTextColor={theme.colors.text.secondary}
              value={customRole}
              onChangeText={onCustomRoleChange}
              maxLength={20}
            />
            <Text style={styles.charCount}>{customRole.length}/20</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('conversation.scenario.scenarioLabel')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('conversation.scenario.scenarioPlaceholder')}
              placeholderTextColor={theme.colors.text.secondary}
              value={customScenario}
              onChangeText={onCustomScenarioChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={50}
            />
            <Text style={styles.charCount}>
              {t('conversation.scenario.charCount', { count: customScenario.length })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
