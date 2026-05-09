import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';

export interface PostAuthor {
  id: string;
  nickname: string | null;
  avatar: string | null;
}

export interface CommunityPost {
  id: string;
  userId: string;
  type: string;
  content: string;
  images: string[] | null;
  tags: string[] | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  author: PostAuthor;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId: string | null;
  author: PostAuthor;
  replies?: PostComment[];
  createdAt: string;
}

export interface PostListResult {
  posts: CommunityPost[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CommentListResult {
  comments: PostComment[];
  total: number;
  hasMore: boolean;
}

declare module '../client' {
  interface Client {
    getCommunityPosts(page?: number, type?: string): Promise<{ success: boolean; data: PostListResult }>;
    getCommunityPostDetail(postId: string): Promise<{ success: boolean; data: CommunityPost }>;
    createCommunityPost(body: { type?: string; content: string; images?: string[]; tags?: string[] }): Promise<{ success: boolean; data: CommunityPost }>;
    deleteCommunityPost(postId: string): Promise<{ success: boolean }>;
    getPostComments(postId: string, page?: number): Promise<{ success: boolean; data: CommentListResult }>;
    addPostComment(postId: string, content: string, parentId?: string): Promise<{ success: boolean; data: PostComment }>;
    togglePostLike(postId: string): Promise<{ success: boolean; data: { liked: boolean } }>;
  }
}

Client.prototype.getCommunityPosts = async function(page = 1, type?: string) {
  return this.api.get(`${ENDPOINTS.COMMUNITY_POSTS}${buildQuery({ page, type })}`);
};

Client.prototype.getCommunityPostDetail = async function(postId: string) {
  return this.api.get(`${ENDPOINTS.COMMUNITY_POSTS}/${postId}`);
};

Client.prototype.createCommunityPost = async function(body) {
  return this.api.post(ENDPOINTS.COMMUNITY_POSTS, body);
};

Client.prototype.deleteCommunityPost = async function(postId: string) {
  return this.api.delete(`${ENDPOINTS.COMMUNITY_POSTS}/${postId}`);
};

Client.prototype.getPostComments = async function(postId: string, page = 1) {
  return this.api.get(`${ENDPOINTS.COMMUNITY_POSTS}/${postId}/comments${buildQuery({ page })}`);
};

Client.prototype.addPostComment = async function(postId: string, content: string, parentId?: string) {
  return this.api.post(`${ENDPOINTS.COMMUNITY_POSTS}/${postId}/comments`, { content, parentId });
};

Client.prototype.togglePostLike = async function(postId: string) {
  return this.api.post(`${ENDPOINTS.COMMUNITY_POSTS}/${postId}/like`);
};
