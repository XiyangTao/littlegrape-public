import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { useConversationList, SessionSummary } from './useConversationList';
import SessionItem from './SessionItem';
import { createStyles } from './styles';

export default function ConversationListScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const {
    sessions,
    loading,
    refreshing,
    hasMore,
    loadingMore,
    loadingSession,
    isScrollable,
    isEditMode,
    selectedIds,
    isDeleting,
    swipeableRefs,
    voiceAvatars,
    handleRefresh,
    loadMore,
    handleDeleteSession,
    handleBatchDelete,
    handleSessionPress,
    handleStartNewConversation,
    toggleSelect,
    toggleSelectAll,
    enterEditMode,
    exitEditMode,
    getDisplayRole,
    getDisplayScenario,
    getDifficultyLabel,
    handleContentSizeChange,
    handleLayout,
    navigation,
    t,
    AlertComponent,
  } = useConversationList();

  // ============ 渲染函数 ============
  const renderSessionItem = useCallback(({ item }: { item: SessionSummary }) => {
    const isLoading = loadingSession === item.sessionId;
    const avatarUrl = item.voiceId ? voiceAvatars[item.voiceId] : null;
    const isSelected = selectedIds.has(item.sessionId);

    return (
      <SessionItem
        item={item}
        isLoading={isLoading}
        isEditMode={isEditMode}
        isSelected={isSelected}
        avatarUrl={avatarUrl}
        swipeableRefs={swipeableRefs}
        t={t}
        onPress={handleSessionPress}
        onDelete={handleDeleteSession}
        onToggleSelect={toggleSelect}
        getDisplayRole={getDisplayRole}
        getDisplayScenario={getDisplayScenario}
        getDifficultyLabel={getDifficultyLabel}
      />
    );
  }, [
    loadingSession, voiceAvatars, selectedIds, isEditMode, swipeableRefs, t,
    handleSessionPress, handleDeleteSession, toggleSelect,
    getDisplayRole, getDisplayScenario, getDifficultyLabel,
  ]);

  const renderHeader = () => (
    <TouchableOpacity
      style={styles.newConversationButton}
      onPress={handleStartNewConversation}
      activeOpacity={0.8}
    >
      <Icon name={IconNames.add} size={28} color={theme.colors.text.inverse} />
      <Text style={styles.newConversationText}>{t('conversationList.startNew')}</Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name={IconNames.chat} size={64} color={theme.colors.text.disabled} />
      <Text style={styles.emptyText}>{t('conversationList.empty')}</Text>
      <Text style={styles.emptySubtext}>{t('conversationList.emptyHint')}</Text>
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }
    // 只有可滚动时才显示"已经到底了"
    if (isScrollable && !hasMore) {
      return (
        <View style={styles.noMore}>
          <Text style={styles.noMoreText}>{t('conversationList.noMore')}</Text>
        </View>
      );
    }
    return null;
  };

  // ============ 加载状态 ============
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  // ============ 主渲染 ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 标题栏 */}
      <View style={styles.header}>
        {isEditMode ? (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={exitEditMode}>
              <Text style={styles.headerButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedIds.size > 0 ? t('conversationList.selectedCount', { count: selectedIds.size }) : t('conversationList.selectItems')}
            </Text>
            <TouchableOpacity style={styles.headerButton} onPress={toggleSelectAll}>
              <Text style={styles.headerButtonText}>
                {selectedIds.size === sessions.length ? t('common.deselectAll') : t('common.selectAll')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Icon name={IconNames.back} size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('conversationList.title')}</Text>
            {sessions.length > 0 ? (
              <TouchableOpacity style={styles.headerButton} onPress={enterEditMode}>
                <Text style={styles.headerButtonText}>{t('common.edit')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerRight} />
            )}
          </>
        )}
      </View>

      {/* 会话列表 */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.sessionId}
        renderItem={renderSessionItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={sessions.length === 0 ? styles.emptyList : undefined}
        showsVerticalScrollIndicator={false}
      />

      {/* 编辑模式底部栏 */}
      {isEditMode && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.batchDeleteButton, selectedIds.size === 0 && styles.batchDeleteButtonDisabled]}
            onPress={handleBatchDelete}
            disabled={selectedIds.size === 0 || isDeleting}
            activeOpacity={0.8}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.colors.text.inverse} />
            ) : (
              <>
                <Icon name={IconNames.delete} size={20} color={theme.colors.text.inverse} />
                <Text style={styles.batchDeleteButtonText}>
                  {t('common.delete')}{selectedIds.size > 0 && ` (${selectedIds.size})`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {AlertComponent}
    </SafeAreaView>
  );
}
