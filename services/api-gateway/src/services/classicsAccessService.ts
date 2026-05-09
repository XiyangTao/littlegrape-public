/**
 * 名著模块访问权限检查
 *
 * 薄壳层：把名著特定的 action 映射到通用 checkFeatureAccess。
 * 不再维护独立 planType 判断，统一走 featureAccessService。
 */
import { checkFeatureAccess, type FeatureAccessResult } from './featureAccessService';

export type ClassicsAction = 'readChapter' | 'listen' | 'shadow';

export type ClassicsAccessResult = FeatureAccessResult;

export async function checkClassicsAccess(
  userId: string,
  action: ClassicsAction,
  chapterNumber?: number,
  bookSlug?: string,
): Promise<ClassicsAccessResult> {
  if (action === 'readChapter') {
    return checkFeatureAccess(userId, 'classicsChapter', { chapterNumber, bookSlug });
  }
  // listen 和 shadow 都走 classicsAudio（UI 侧三按钮朗读/讲解/跟读共用一档权限）
  return checkFeatureAccess(userId, 'classicsAudio');
}
