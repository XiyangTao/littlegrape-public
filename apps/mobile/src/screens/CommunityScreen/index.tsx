import React from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon, { IconNames } from '@/components/Icon';
import AvatarPreview from '@/components/AvatarPreview';
import { formatRelativeTime } from '@/utils/formatters';
import type { CommunityPost } from '@/api/modules/community';
import { useCommunity, TAB_KEYS } from './useCommunity';
import { createStyles } from './styles';

export default function CommunityScreen() {
  const {
    theme, t, posts, activeTab, page, hasMore, isLoading, isRefreshing,
    showCompose, composeText, composeType, isSubmitting,
    setActiveTab, setShowCompose, setComposeText, setComposeType,
    loadPosts, handleLike, handleSubmitPost, handlePostPress, handleAuthorPress,
    getTypeLabel, getTypeColor, navigation,
  } = useCommunity();
  const styles = createStyles(theme);

  const renderPost = ({ item }: { item: CommunityPost }) => (
    <TouchableOpacity style={styles.postCard} onPress={() => handlePostPress(item)}>
      <View style={styles.postHeader}>
        <TouchableOpacity onPress={() => handleAuthorPress(item.author.id)}>
          <AvatarPreview uri={item.author.avatar} fallbackText={item.author.nickname || '?'} size={36} previewable={false} />
        </TouchableOpacity>
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>{item.author.nickname || t('community.anonymous')}</Text>
          <Text style={styles.postTime}>{formatRelativeTime(item.createdAt, t)}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: getTypeColor(item.type) }]}>{getTypeLabel(item.type)}</Text>
        </View>
      </View>
      <Text style={styles.postContent} numberOfLines={4}>{item.content}</Text>
      {item.tags && (item.tags as string[]).length > 0 && (
        <View style={styles.tagsRow}>
          {(item.tags as string[]).map((tag, i) => (
            <View key={i} style={styles.tagChip}><Text style={styles.tagText}>#{tag}</Text></View>
          ))}
        </View>
      )}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
          <Icon name={item.isLiked ? 'favorite' : 'favorite-border'} size={18} color={item.isLiked ? theme.colors.error : theme.colors.text.tertiary} />
          <Text style={[styles.actionText, item.isLiked && { color: theme.colors.error }]}>{item.likeCount || ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handlePostPress(item)}>
          <Icon name="chat-bubble-outline" size={18} color={theme.colors.text.tertiary} />
          <Text style={styles.actionText}>{item.commentCount || ''}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('community.title')}</Text>
        <TouchableOpacity onPress={() => setShowCompose(true)} style={styles.backButton}>
          <Icon name="edit" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.tabRow}>
        {TAB_KEYS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tabItem, activeTab === tab && styles.tabItemActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{t(`community.tab.${tab}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading && posts.length === 0 ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={posts} renderItem={renderPost} keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
          refreshing={isRefreshing} onRefresh={() => loadPosts(1, true)}
          onEndReached={() => { if (hasMore) loadPosts(page + 1); }} onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="forum" size={48} color={theme.colors.text.disabled} />
              <Text style={styles.emptyText}>{t('community.noPosts')}</Text>
            </View>
          }
        />
      )}
      {showCompose && (
        <View style={styles.composeOverlay}>
          <View style={styles.composeContainer}>
            <View style={styles.composeHeader}>
              <TouchableOpacity onPress={() => setShowCompose(false)}>
                <Text style={styles.composeCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.composeTitle}>{t('community.newPost')}</Text>
              <TouchableOpacity onPress={handleSubmitPost} disabled={isSubmitting}>
                <Text style={[styles.composeSubmit, isSubmitting && { opacity: 0.5 }]}>
                  {isSubmitting ? t('common.loading') : t('community.publish')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.composeTypeRow}>
              {(['share', 'question', 'note'] as const).map(type => (
                <TouchableOpacity key={type}
                  style={[styles.composeTypeButton, composeType === type && { backgroundColor: getTypeColor(type) + '20', borderColor: getTypeColor(type) }]}
                  onPress={() => setComposeType(type)}>
                  <Text style={[styles.composeTypeText, composeType === type && { color: getTypeColor(type) }]}>{getTypeLabel(type)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.composeInput} placeholder={t('community.composePlaceholder')}
              placeholderTextColor={theme.colors.text.tertiary} multiline value={composeText}
              onChangeText={setComposeText} autoFocus />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
