// 语音识别相关类型定义

export interface ASROptions {
  engine?: 'azure' | 'whisper';
  language?: string;
  enableWordLevelTimestamps?: boolean;
}

export interface ASRWordData {
  word: string;
  confidence: number;
  offset: number;
  duration: number;
}

export interface ASRData {
  requestId: string;
  engine: string;
  recognizedText: string;
  confidence: number;
  duration: number;
  wordCount: number;
  words?: ASRWordData[];
  processingTime: number;
}

export interface ASRResponse {
  success: boolean;
  data?: ASRData;
  error?: string;
}

// 录音相关类型
export interface RecordingState {
  isRecording: boolean;
  isInitialized: boolean;
  duration: number;
  error: string | null;
}

export interface RecordingControls {
  initialize: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<string | null>;
  cleanup: () => void;
}