// 先加载模块扩展 Client prototype，再创建实例
import './modules/auth';
import './modules/user';
import './modules/chat';
import './modules/words';
import './modules/sync';
import './modules/feedback';
import './modules/quota';
import './modules/usage';
import './modules/order';
import './modules/sentence';
import './modules/story';
import './modules/diary';
import './modules/reading';
import './modules/classics';
import './modules/listening';
import './modules/achievement';
import './modules/invitation';
import './modules/leaderboard';
import './modules/learningPath';
import './modules/exam';
import './modules/community';
import './modules/assistant';
import './modules/dailyChallenge';
import './modules/dailyTask';
import './modules/grammar';
import './modules/exercise';
import './modules/phoneme';
import './modules/follow';
import './modules/version';
import './modules/companion';

import { Client } from './client';

export { Client };
export const apiClient = new Client();

/**
 * 执行本地优先的异步远程同步：先完成本地写入，再异步同步到服务器。
 * 服务器同步失败不影响本地结果，仅打印警告日志。
 *
 * @param remoteOp  返回 Promise 的远程操作
 * @param context   日志上下文，格式为 "ServiceName" (输出: [ServiceName] 远程同步失败: ...)
 */
export function syncToServer(
  remoteOp: () => Promise<any>,
  context: string,
): void {
  remoteOp().catch((err: unknown) => {
    console.warn(`[${context}] 远程同步失败:`, err instanceof Error ? err.message : err);
  });
}
