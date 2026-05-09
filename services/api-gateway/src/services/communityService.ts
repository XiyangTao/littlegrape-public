/**
 * 学习社区服务
 * 帖子发布、评论、点赞
 */

import { prisma } from '@/config/database';

// ==================== 帖子 ====================

interface CreatePostParams {
  userId: string;
  type: string;
  content: string;
  images?: string[];
  tags?: string[];
}

export async function createPost(params: CreatePostParams) {
  return prisma.userCommunityPost.create({
    data: {
      userId: params.userId,
      type: params.type,
      content: params.content,
      images: params.images || [],
      tags: params.tags || [],
    },
  });
}

export async function getPostList(page: number = 1, pageSize: number = 20, type?: string) {
  const where: any = { isDeleted: false };
  if (type) where.type = type;

  const [posts, total] = await Promise.all([
    prisma.userCommunityPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.userCommunityPost.count({ where }),
  ]);

  // 批量查询作者信息
  const userIds = [...new Set(posts.map(p => p.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, avatar: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const enrichedPosts = posts.map(post => ({
    ...post,
    author: userMap.get(post.userId) || { id: post.userId, nickname: null, avatar: null },
  }));

  return { posts: enrichedPosts, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getPostDetail(postId: string) {
  const post = await prisma.userCommunityPost.findUnique({ where: { id: postId } });
  if (!post || post.isDeleted) return null;

  const author = await prisma.user.findUnique({
    where: { id: post.userId },
    select: { id: true, nickname: true, avatar: true },
  });

  return { ...post, author };
}

export async function deletePost(postId: string, userId: string) {
  const post = await prisma.userCommunityPost.findUnique({ where: { id: postId } });
  if (!post || post.userId !== userId) throw new Error('无权删除');
  return prisma.userCommunityPost.update({
    where: { id: postId },
    data: { isDeleted: true },
  });
}

// ==================== 评论 ====================

export async function addComment(postId: string, userId: string, content: string, parentId?: string) {
  const [comment] = await Promise.all([
    prisma.userPostComment.create({
      data: { postId, userId, content, parentId },
    }),
    prisma.userCommunityPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    }),
  ]);
  return comment;
}

export async function getComments(postId: string, page: number = 1, pageSize: number = 20) {
  const where = { postId, isDeleted: false, parentId: null };

  const [comments, total] = await Promise.all([
    prisma.userPostComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.userPostComment.count({ where }),
  ]);

  // 查找回复
  const commentIds = comments.map(c => c.id);
  const replies = await prisma.userPostComment.findMany({
    where: { parentId: { in: commentIds }, isDeleted: false },
    orderBy: { createdAt: 'asc' },
  });

  // 查询用户信息
  const allUserIds = [...new Set([...comments.map(c => c.userId), ...replies.map(r => r.userId)])];
  const users = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, nickname: true, avatar: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const enrichedComments = comments.map(comment => ({
    ...comment,
    author: userMap.get(comment.userId) || { id: comment.userId, nickname: null, avatar: null },
    replies: replies
      .filter(r => r.parentId === comment.id)
      .map(r => ({
        ...r,
        author: userMap.get(r.userId) || { id: r.userId, nickname: null, avatar: null },
      })),
  }));

  return { comments: enrichedComments, total, hasMore: page * pageSize < total };
}

// ==================== 点赞 ====================

export async function toggleLike(postId: string, userId: string) {
  const existing = await prisma.userPostLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await Promise.all([
      prisma.userPostLike.delete({ where: { id: existing.id } }),
      prisma.userCommunityPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    return { liked: false };
  } else {
    await Promise.all([
      prisma.userPostLike.create({ data: { postId, userId } }),
      prisma.userCommunityPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  }
}

export async function getUserLikedPostIds(userId: string, postIds: string[]) {
  const likes = await prisma.userPostLike.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(likes.map(l => l.postId));
}
