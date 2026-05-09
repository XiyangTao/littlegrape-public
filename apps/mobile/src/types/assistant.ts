// ==================== AI 学习助手类型定义 ====================

// ==================== 消息类型 ====================

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: AssistantMessageMetadata | null;
  createdAt: string; // ISO 8601
}

export interface AssistantMessageMetadata {
  /** 快捷操作类型 */
  quickAction?: QuickActionType;
  /** 推送来源 */
  pushSource?: string;
  /** 语音消息 URI */
  voiceUri?: string;
  /** 语音时长（秒） */
  voiceDuration?: number;
  /** AI 建议的操作按钮 */
  actions?: SuggestedAction[];
}

// ==================== 快捷操作 ====================

export type QuickActionType =
  | 'daily_summary'    // 今日总结
  | 'review_remind'    // 复习提醒
  | 'weak_analysis'    // 薄弱分析
  | 'study_advice'     // 学习建议
  | 'encourage';       // 鼓励我

export interface QuickAction {
  type: QuickActionType;
  label: string;
  icon: string;
}

// ==================== 建议操作（AI 回复附带） ====================

export interface SuggestedAction {
  type: 'navigate' | 'quick_action';
  label: string;
  /** navigate 时的目标路由 */
  route?: string;
  /** quick_action 时的操作类型 */
  actionType?: QuickActionType;
}

// ==================== API 请求/响应 ====================

export interface AssistantChatRequest {
  message: string;
  metadata?: AssistantMessageMetadata;
}

export interface AssistantChatResponse {
  reply: string;
  messageId: string;
  userMessageId: string;
  tokenUsage?: number;
  actions?: SuggestedAction[];
}

export interface AssistantMessagesResponse {
  messages: AssistantMessage[];
  hasMore: boolean;
}

// ==================== 通知类型 ====================

export type NotificationType =
  | 'daily_remind'      // 打卡提醒
  | 'streak_celebrate'  // 连续打卡庆祝
  | 'streak_recover'    // 断签挽回
  | 'milestone'         // 里程碑达成
  | 'review_remind'     // 复习提醒
  | 'weak_remind'       // 薄弱点提示
  | 'daily_summary'     // 学完即时总结
  | 'weekly_summary'    // 每周总结
  | 'birthday'          // 生日祝福
  | 'inactive_remind'   // 长期未学提醒
  | 'holiday';          // 节日问候

export interface AppNotification {
  id: string;
  type: NotificationType;
  channel: 'in_app' | 'notification';
  content: string;
  isRead: boolean;
  createdAt: string; // ISO 8601
}

// ==================== WebSocket 消息 ====================

export interface AssistantWsMessage {
  type: 'auth' | 'auth_ok' | 'push' | 'ping' | 'pong' | 'error';
  token?: string;
  push?: AppNotification;
  error?: string;
}

// ==================== 本地 DB 类型 ====================

export interface LocalAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: string | null; // JSON 字符串
  created_at: string;
  synced: number; // 0 | 1
}
