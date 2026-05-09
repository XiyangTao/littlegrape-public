/**
 * Toast Store
 *
 * 全局 Toast 通知队列：
 * - 队列消费：多条 toast 依次展示
 * - 去重：1 秒内相同 message + type 不重复入队
 * - 队列容量：最多 5 条
 * - 双入口：useToast() Hook + toast 对象（非 React 代码）
 */

import { create } from 'zustand';

// ==================== 类型定义 ====================

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

interface ShowConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastState {
  queue: ToastItem[];
  current: ToastItem | null;
}

interface ToastActions {
  show: (config: ShowConfig) => void;
  info: (message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: () => void;
}

type ToastStore = ToastState & ToastActions;

// ==================== 常量 ====================

const MAX_QUEUE_SIZE = 5;
const DEDUP_WINDOW_MS = 1000;
const DEFAULT_DURATION = 3000;
const DISMISS_GAP_MS = 300;

let idCounter = 0;

// 模块级 timer 句柄 —— dismiss 后展示下一条的延时回调。
// 保留句柄是为了 reset / 连续 dismiss 时能 clearTimeout，避免泄漏的 timer
// 在 store 已 reset 后才 fire，去 set 一个无意义的状态变更。
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function clearDismissTimer() {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

// ==================== 初始状态 ====================

const initialState: ToastState = {
  queue: [],
  current: null,
};

// ==================== Store 实现 ====================

export const useToastStore = create<ToastStore>()((set, get) => ({
  ...initialState,

  show: ({ message, type = 'info', duration = DEFAULT_DURATION }) => {
    const now = Date.now();
    const { queue, current } = get();

    // 去重：当前正在显示的 toast 或队列中 1 秒内相同 message + type 不重复入队
    const isDuplicate =
      (current && current.message === message && current.type === type) ||
      queue.some(item => item.message === message && item.type === type && now - item.createdAt < DEDUP_WINDOW_MS);
    if (isDuplicate) return;

    const item: ToastItem = {
      id: `toast_${++idCounter}`,
      message,
      type,
      duration,
      createdAt: now,
    };

    // 队列容量限制
    const newQueue = queue.length >= MAX_QUEUE_SIZE
      ? [...queue.slice(1), item]
      : [...queue, item];

    set({ queue: newQueue });

    // 如果当前没有 toast 在展示，立即展示
    if (!current) {
      showNext(set, get);
    }
  },

  info: (message, duration) => get().show({ message, type: 'info', duration }),
  success: (message, duration) => get().show({ message, type: 'success', duration }),
  error: (message, duration) => get().show({ message, type: 'error', duration }),
  warning: (message, duration) => get().show({ message, type: 'warning', duration }),

  dismiss: () => {
    set({ current: null });
    // 显式覆盖：连续 dismiss 不会堆叠 timer；多发的 dismiss 之间不会出现孤悬 timer
    clearDismissTimer();
    dismissTimer = setTimeout(() => {
      dismissTimer = null;
      showNext(set, get);
    }, DISMISS_GAP_MS);
  },
}));

// ==================== 辅助函数 ====================

function showNext(
  set: (partial: Partial<ToastState>) => void,
  get: () => ToastStore,
) {
  const { queue } = get();
  if (queue.length === 0) {
    set({ current: null });
    return;
  }
  const [next, ...rest] = queue;
  set({ current: next, queue: rest });
}

// ==================== 非 React 调用入口 ====================

export const toast = {
  show: (config: ShowConfig) => useToastStore.getState().show(config),
  info: (message: string, duration?: number) => useToastStore.getState().info(message, duration),
  success: (message: string, duration?: number) => useToastStore.getState().success(message, duration),
  error: (message: string, duration?: number) => useToastStore.getState().error(message, duration),
  warning: (message: string, duration?: number) => useToastStore.getState().warning(message, duration),
};

// ==================== 便捷 Hook ====================

export const useToast = () => {
  const show = useToastStore(s => s.show);
  const info = useToastStore(s => s.info);
  const success = useToastStore(s => s.success);
  const error = useToastStore(s => s.error);
  const warning = useToastStore(s => s.warning);
  return { show, info, success, error, warning };
};

// apiClient toast handler 注册集中在 @/session/interceptorBridge
