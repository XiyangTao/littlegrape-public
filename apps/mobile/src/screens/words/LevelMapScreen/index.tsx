/**
 * 关卡地图页面
 * 纵向排列关卡节点，显示进度、星级、锁定状态
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useLevelMap, type LevelNode } from './useLevelMap';
import { createStyles } from './styles';

export default function LevelMapScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const {
    isLoading,
    tag,
    levels,
    chapters,
    currentLevelIndex,
    totalStars,
    completedCount,
    libraryColor,
    handleLevelPress,
    handleContinue,
    navigation,
  } = useLevelMap();

  // ==================== 节点渲染 ====================

  const renderNode = useCallback((node: LevelNode) => {
    const { level, progress, status } = node;
    const isBoss = level.isBoss;

    let bgColor = theme.colors.border.light;
    let borderStyle = styles.nodeLocked;

    if (status === 'completed') {
      bgColor = libraryColor;
      borderStyle = styles.nodeCompleted;
    } else if (status === 'current') {
      bgColor = theme.colors.primary;
      borderStyle = styles.nodeCurrent;
    }

    return (
      <View key={level.id} style={styles.nodeContainer}>
        <TouchableOpacity
          onPress={() => handleLevelPress(node)}
          disabled={status === 'locked'}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.node,
              borderStyle,
              { backgroundColor: status === 'locked' ? theme.colors.background.secondary : bgColor },
            ]}
          >
            {status === 'locked' ? (
              <Icon name="lock" size={20} color={theme.colors.text.disabled} />
            ) : (
              <Text style={styles.nodeNumber}>
                {level.levelIndex + 1}
              </Text>
            )}
            {isBoss && (
              <Text style={styles.bossIcon}>{'👑'}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Stars */}
        {status === 'completed' && progress && (
          <View style={styles.nodeStars}>
            {[1, 2, 3].map((starIdx) => (
              <Icon
                key={starIdx}
                name={starIdx <= progress.stars ? 'star' : 'star-border'}
                size={12}
                color={starIdx <= progress.stars ? theme.colors.warning : theme.colors.border.light}
              />
            ))}
          </View>
        )}
      </View>
    );
  }, [theme, styles, libraryColor, handleLevelPress]);

  // ==================== Loading ====================

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{tag}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{tag}</Text>
          <Text style={styles.headerSubtitle}>
            {t('levelLearn.totalProgress', { completed: completedCount, total: levels.length, stars: totalStars })}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Level Nodes */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {chapters.map((chapter) => (
          <View key={chapter.chapterIndex}>
            <View style={styles.chapterHeader}>
              <Icon name="book" size={18} color={theme.colors.text.secondary} />
              <Text style={styles.chapterTitle}>{t('levelLearn.chapterTitle', { chapter: chapter.chapterIndex + 1 })}</Text>
            </View>
            <View style={styles.levelRow}>
              {chapter.nodes.map(renderNode)}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Continue Button */}
      {currentLevelIndex < levels.length && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: libraryColor }]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {t('levelLearn.continueLevel', { level: currentLevelIndex + 1 })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
