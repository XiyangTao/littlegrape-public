import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

export interface InvitationRecord {
  id: string;
  invitee: { id: string; nickname: string | null; avatar: string | null };
  rewardGranted: boolean;
  createdAt: string;
}

export interface InvitationStats {
  totalInvited: number;
  totalRewarded: number;
  totalXpEarned: number;
}

declare module '../client' {
  interface Client {
    getInviteCode(): Promise<{ success: boolean; data: { inviteCode: string } }>;
    applyInviteCode(inviteCode: string): Promise<{ success: boolean; error?: string; inviterNickname?: string }>;
    getInvitationList(): Promise<{ success: boolean; data: InvitationRecord[] }>;
    getInvitationStats(): Promise<{ success: boolean; data: InvitationStats }>;
  }
}

Client.prototype.getInviteCode = async function() {
  return this.api.get(ENDPOINTS.INVITATION_CODE);
};

Client.prototype.applyInviteCode = async function(inviteCode: string) {
  return this.api.post(ENDPOINTS.INVITATION_APPLY, { inviteCode });
};

Client.prototype.getInvitationList = async function() {
  return this.api.get(ENDPOINTS.INVITATION_LIST);
};

Client.prototype.getInvitationStats = async function() {
  return this.api.get(ENDPOINTS.INVITATION_STATS);
};
