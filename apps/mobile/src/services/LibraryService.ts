/**
 * 词库服务层
 *
 * 用户只有一个当前词库，存储在 UserStore + AsyncStorage 中。
 */

import { useUserStore } from '@/stores';

/**
 * 设置当前词库
 */
export async function setLibrary(tag: string): Promise<void> {
  await useUserStore.getState().setCurrentLibraryTag(tag);
}
