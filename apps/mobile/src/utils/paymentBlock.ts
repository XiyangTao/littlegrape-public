/**
 * 统一处理后端返回的"付费拦截"错误消息
 *
 * 后端两种付费拦截错误，前端 UX 上都引导升级，复用 QuotaExceededModal：
 *   - quotaExceeded: true   — 预算耗尽（付费用户用完额度，或 Free 预算 0）
 *   - upgradeRequired: true — 套餐级别不足（Free 用户绕过 UI guard 直连 WS / REST）
 *
 * 使用方式（WS hook 的 error 分支）：
 *   if (handlePaymentBlockMessage(response)) return;  // 已弹 modal，短路后续错误处理
 *   // ... 其他 error 逻辑
 */
import { getQuotaStoreState } from '@/stores';

interface PaymentBlockMessage {
  quotaExceeded?: boolean;
  upgradeRequired?: boolean;
}

export function handlePaymentBlockMessage(msg: PaymentBlockMessage | unknown): boolean {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as PaymentBlockMessage;
  if (m.quotaExceeded || m.upgradeRequired) {
    // 两种语义都引导升级，复用同一 modal（内部会 refreshQuotaSilently）
    // 异步路径可能在 logout 后到达 —— 用 getQuotaStoreState() 防御 no-session
    getQuotaStoreState()?.triggerExceededModal();
    return true;
  }
  return false;
}
