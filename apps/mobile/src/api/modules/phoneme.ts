import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';
import type { PhonemeCategory } from '@/data/phonemes';

declare module '../client' {
  interface Client {
    getPhonemeData(currentVersion?: number): Promise<{
      success: boolean;
      data: {
        version: number;
        categories: PhonemeCategory[] | null;
      };
    }>;
    reportPhonemePracticeDone(phoneme: string): Promise<{ success: boolean }>;
  }
}

Client.prototype.getPhonemeData = async function (
  currentVersion?: number
): Promise<{
  success: boolean;
  data: {
    version: number;
    categories: PhonemeCategory[] | null;
  };
}> {
  const query = buildQuery({ version: currentVersion });
  return this.api.get(`${ENDPOINTS.PHONEMES}${query}`);
};

Client.prototype.reportPhonemePracticeDone = async function (
  phoneme: string,
): Promise<{ success: boolean }> {
  return this.api.post(ENDPOINTS.PHONEME_PRACTICE_DONE, { phoneme });
};
