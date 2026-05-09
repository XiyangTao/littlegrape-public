import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import type { CommunityPost, PostComment } from '@/api/modules/community';
import Icon, { IconNames } from '@/components/Icon';
import AvatarPreview from '@/components/AvatarPreview';
import { formatRelativeTime } from '@/utils/formatters';

export default function CommunityDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const postId = route.params?.postId as string;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [postRes, commentsRes] = await Promise.all([
        apiClient.getCommunityPostDetail(postId),
        apiClient.getPostComments(postId),
      ]);
      if (postRes.success) setPost(postRes.data);
      if (commentsRes.success) setComments(commentsRes.data.comments);
    } catch (error) {
      console.error('加载帖子详情失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      const res = await apiClient.togglePostLike(post.id);
      if (res.success) {
        setPost(prev => prev ? {
          ...prev,
          isLiked: res.data.liked,
          likeCount: res.data.liked ? prev.likeCount + 1 : prev.likeCount - 1,
        } : null);
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    try {
      setIsSending(true);
      const res = await apiClient.addPostComment(postId, commentText.trim());
      if (res.success) {
        setCommentText('');
        // 重新加载评论
        const commentsRes = await apiClient.getPostComments(postId);
        if (commentsRes.success) setComments(commentsRes.data.comments);
        if (post) setPost({ ...post, commentCount: post.commentCount + 1 });
      }
    } catch (error) {
      console.error('发送评论失败:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('community.detail')}</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 帖子内容 */}
          <View style={styles.postSection}>
            <View style={styles.authorRow}>
              <AvatarPreview
                uri={post.author.avatar}
                fallbackText={post.author.nickname || '?'}
                size={40}
              />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{post.author.nickname || t('community.anonymous')}</Text>
                <Text style={styles.postTime}>{formatRelativeTime(post.createdAt, t)}</Text>
              </View>
            </View>

            <Text style={styles.postContent}>{post.content}</Text>

            {post.tags && (post.tags as string[]).length > 0 && (
              <View style={styles.tagsRow}>
                {(post.tags as string[]).map((tag, i) => (
                  <View key={i} style={styles.tagChip}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.postStats}>
              <TouchableOpacity style={styles.statButton} onPress={handleLike}>
                <Icon
                  name={post.isLiked ? 'favorite' : 'favorite-border'}
                  size={20}
                  color={post.isLiked ? theme.colors.error : theme.colors.text.tertiary}
                />
                <Text style={[styles.statText, post.isLiked && { color: theme.colors.error }]}>
                  {post.likeCount} {t('community.likes')}
                </Text>
              </TouchableOpacity>
              <View style={styles.statButton}>
                <Icon name="chat-bubble-outline" size={20} color={theme.colors.text.tertiary} />
                <Text style={styles.statText}>{post.commentCount} {t('community.comments')}</Text>
              </View>
            </View>
          </View>

          {/* 评论列表 */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              {t('community.comments')} ({comments.length})
            </Text>

            {comments.length === 0 ? (
              <Text style={styles.noComments}>{t('community.noComments')}</Text>
            ) : (
              comments.map(comment => (
                <View key={comment.id} style={styles.commentItem}>
                  <AvatarPreview
                    uri={comment.author.avatar}
                    fallbackText={comment.author.nickname || '?'}
                    size={32}
                  />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>{comment.author.nickname || t('community.anonymous')}</Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt, t)}</Text>

                    {/* 回复 */}
                    {comment.replies && comment.replies.length > 0 && (
                      <View style={styles.repliesContainer}>
                        {comment.replies.map(reply => (
                          <View key={reply.id} style={styles.replyItem}>
                            <Text style={styles.replyAuthor}>
                              {reply.author.nickname || t('community.anonymous')}:
                            </Text>
                            <Text style={styles.replyText}>{reply.content}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* 评论输入框 */}
        <View style={styles.commentInputBar}>
          <TextInput
            style={styles.commentInput}
            placeholder={t('community.commentPlaceholder')}
            placeholderTextColor={theme.colors.text.tertiary}
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity
            style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || isSending}
          >
            <Icon name="send" size={20} color={commentText.trim() ? theme.colors.text.inverse : theme.colors.text.disabled} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },

  // 帖子内容
  postSection: { padding: theme.spacing.md, borderBottomWidth: 8, borderBottomColor: theme.colors.background.secondary },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  authorInfo: { flex: 1, marginLeft: theme.spacing.sm },
  authorName: {
    fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  postTime: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary },
  postContent: {
    fontSize: theme.typography.fontSize.base, color: theme.colors.text.primary,
    lineHeight: 24, marginBottom: theme.spacing.md,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.md },
  tagChip: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: theme.spacing.sm, paddingVertical: 2,
    borderRadius: theme.spacing.borderRadius.sm,
  },
  tagText: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.primary },
  postStats: { flexDirection: 'row', gap: theme.spacing.lg },
  statButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.tertiary },

  // 评论
  commentsSection: { padding: theme.spacing.md },
  commentsTitle: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.md,
  },
  noComments: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary,
    textAlign: 'center', paddingVertical: theme.spacing.lg,
  },
  commentItem: { flexDirection: 'row', marginBottom: theme.spacing.md },
  commentContent: { flex: 1, marginLeft: theme.spacing.sm },
  commentAuthor: {
    fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  commentText: {
    fontSize: theme.typography.fontSize.sm, color: theme.colors.text.primary,
    lineHeight: 20, marginTop: 2,
  },
  commentTime: {
    fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary, marginTop: 4,
  },
  repliesContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.sm,
    padding: theme.spacing.sm, marginTop: theme.spacing.xs,
  },
  replyItem: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  replyAuthor: {
    fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary, marginRight: 4,
  },
  replyText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary },

  // 评论输入
  commentInputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.border.light,
    backgroundColor: theme.colors.background.primary,
  },
  commentInput: {
    flex: 1, backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.lg, paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm, fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary, marginRight: theme.spacing.sm,
  },
  sendButton: {
    width: 36, height: 36, borderRadius: theme.spacing.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: theme.colors.border.light },
});
