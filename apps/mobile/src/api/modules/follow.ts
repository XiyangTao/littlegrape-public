import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';
import type { FollowListResult, UserProfileData } from '@/types/follow';

declare module '../client' {
  interface Client {
    followUser(userId: string): Promise<{ success: boolean }>;
    unfollowUser(userId: string): Promise<{ success: boolean }>;
    getFollowingList(page?: number, userId?: string): Promise<{ success: boolean; data: FollowListResult }>;
    getFollowerList(page?: number, userId?: string): Promise<{ success: boolean; data: FollowListResult }>;
    getMutualList(page?: number): Promise<{ success: boolean; data: FollowListResult }>;
    searchUsers(keyword: string, page?: number): Promise<{ success: boolean; data: FollowListResult }>;
    getUserPublicProfile(userId: string): Promise<{ success: boolean; data: UserProfileData }>;
  }
}

Client.prototype.followUser = async function(userId: string) {
  return this.api.post(`${ENDPOINTS.FOLLOW}/${userId}`);
};

Client.prototype.unfollowUser = async function(userId: string) {
  return this.api.delete(`${ENDPOINTS.FOLLOW}/${userId}`);
};

Client.prototype.getFollowingList = async function(page = 1, userId?: string) {
  const path = userId ? `${ENDPOINTS.FOLLOW}/${userId}/following` : ENDPOINTS.FOLLOW_FOLLOWING;
  return this.api.get(`${path}${buildQuery({ page })}`);
};

Client.prototype.getFollowerList = async function(page = 1, userId?: string) {
  const path = userId ? `${ENDPOINTS.FOLLOW}/${userId}/followers` : ENDPOINTS.FOLLOW_FOLLOWERS;
  return this.api.get(`${path}${buildQuery({ page })}`);
};

Client.prototype.getMutualList = async function(page = 1) {
  return this.api.get(`${ENDPOINTS.FOLLOW_MUTUAL}${buildQuery({ page })}`);
};

Client.prototype.searchUsers = async function(keyword: string, page = 1) {
  return this.api.get(`${ENDPOINTS.FOLLOW_SEARCH}${buildQuery({ keyword, page })}`);
};

Client.prototype.getUserPublicProfile = async function(userId: string) {
  return this.api.get(`/api/user/${userId}/profile`);
};
