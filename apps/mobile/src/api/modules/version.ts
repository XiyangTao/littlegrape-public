import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

export type UpdateType = 'none' | 'optional' | 'forced';

export interface VersionCheckResult {
  updateType: UpdateType;
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string;
  iosUrl: string;
  androidUrl: string;
}

declare module '../client' {
  interface Client {
    checkVersion(): Promise<{ success: boolean; data: VersionCheckResult }>;
  }
}

Client.prototype.checkVersion = async function(): Promise<{ success: boolean; data: VersionCheckResult }> {
  return this.api.get(ENDPOINTS.VERSION_CHECK);
};
