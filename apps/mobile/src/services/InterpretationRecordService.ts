/**
 * 同声传译记录服务
 *
 * 管理同传记录的保存、查询、删除及关联文件
 */

import { File, Directory, Paths } from 'expo-file-system';
import {
  insertRecord,
  deleteRecord,
  deleteAllRecords,
  getRecords as getRecordsLocal,
  getRecordById as getRecordByIdLocal,
  getRecordCount as getRecordCountLocal,
  InterpretationRecordRow,
} from '@/db/InterpretationRecordDB';
import type { SubtitleSegment } from '@/hooks/useSimultaneousInterpretation';

// ==================== 常量 ====================

/** 持久存储目录名（在 documentDirectory 下） */
const RECORDS_DIR = 'interpretation_records';

// ==================== 文件管理 ====================

function getRecordsDir(): Directory {
  return new Directory(Paths.document, RECORDS_DIR);
}

function ensureRecordsDir(): Directory {
  const dir = getRecordsDir();
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

/** 将缓存文件移到持久存储，返回新路径 */
function moveToStorage(cacheUri: string, recordId: string, suffix: string): string | null {
  try {
    const sourceFile = new File(cacheUri);
    if (!sourceFile.exists) return null;

    const dir = ensureRecordsDir();
    const destFile = new File(dir, `${recordId}_${suffix}.wav`);
    sourceFile.move(destFile);
    return destFile.uri;
  } catch (err) {
    console.error('[InterpretationRecordService] Move file failed:', err);
    return null;
  }
}

/** 删除记录关联的音频文件 */
function deleteRecordFiles(record: InterpretationRecordRow): void {
  try {
    if (record.sourceAudioPath) {
      const f = new File(record.sourceAudioPath);
      if (f.exists) f.delete();
    }
    if (record.translationAudioPath) {
      const f = new File(record.translationAudioPath);
      if (f.exists) f.delete();
    }
  } catch (err) {
    console.error('[InterpretationRecordService] Delete files failed:', err);
  }
}

// ==================== 公开方法 ====================

/**
 * 保存一条同传记录
 *
 * 将录音文件从缓存目录移到持久存储，保存元数据到 SQLite
 */
export async function saveInterpretationRecord(params: {
  userId: string;
  sourceLanguage: string;
  targetLanguage: string;
  mode: string;
  durationMs: number;
  segments: SubtitleSegment[];
  sourceAudioCacheUri: string | null;
  translationAudioCacheUri: string | null;
}): Promise<string> {
  const id = `ir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 移动音频文件到持久存储
  const sourceAudioPath = params.sourceAudioCacheUri
    ? moveToStorage(params.sourceAudioCacheUri, id, 'source')
    : null;
  const translationAudioPath = params.translationAudioCacheUri
    ? moveToStorage(params.translationAudioCacheUri, id, 'translation')
    : null;

  const record: InterpretationRecordRow = {
    id,
    userId: params.userId,
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    mode: params.mode,
    durationMs: params.durationMs,
    transcript: JSON.stringify(params.segments),
    sourceAudioPath,
    translationAudioPath,
    createdAt: new Date().toISOString(),
  };

  await insertRecord(record);
  return id;
}

export function getRecords(userId: string, limit: number = 50, offset: number = 0) {
  return getRecordsLocal(userId, limit, offset);
}

export function getRecordById(userId: string, id: string) {
  return getRecordByIdLocal(userId, id);
}

export function getRecordCount(userId: string) {
  return getRecordCountLocal(userId);
}

/** 删除记录（含关联文件） */
export async function removeInterpretationRecord(userId: string, id: string): Promise<void> {
  const record = await getRecordByIdLocal(userId, id);
  if (record) {
    deleteRecordFiles(record);
    await deleteRecord(userId, id);
  }
}

/** 清空该用户所有同传记录（含所有关联音频文件） */
export async function removeAllInterpretationRecords(userId: string): Promise<number> {
  // 先取全量（不分页）—— limit 给大些，同传场景单用户不太可能攒到几千条
  const records = await getRecordsLocal(userId, 10000, 0);
  for (const record of records) {
    deleteRecordFiles(record);
  }
  await deleteAllRecords(userId);
  return records.length;
}

// ==================== 导出文本 ====================

interface ExportTexts {
  header: string;
  duration: string;
  direction: string;
  langNames: Record<string, string>;
}

/**
 * 生成导出文本
 * @param texts 由调用方传入（走 i18n），保持 Service 层无 i18n 依赖
 */
export function generateExportText(record: InterpretationRecordRow, texts: ExportTexts): string {
  const segments: SubtitleSegment[] = JSON.parse(record.transcript);
  const date = new Date(record.createdAt);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const durationSec = Math.floor(record.durationMs / 1000);
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const durationStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const sourceLang = texts.langNames[record.sourceLanguage] || record.sourceLanguage;
  const targetLang = texts.langNames[record.targetLanguage] || record.targetLanguage;

  const lines: string[] = [
    `${texts.header} ${dateStr}`,
    `${texts.duration}: ${durationStr}`,
    `${texts.direction}: ${sourceLang} → ${targetLang}`,
    '',
  ];

  for (const seg of segments) {
    if (!seg.sourceText && !seg.translatedText) continue;
    const timeTag = seg.startTime != null
      ? `[${String(Math.floor(seg.startTime / 60000)).padStart(2, '0')}:${String(Math.floor((seg.startTime % 60000) / 1000)).padStart(2, '0')}] `
      : '';
    if (seg.sourceText) {
      lines.push(`${timeTag}${seg.sourceText}`);
    }
    if (seg.translatedText) {
      lines.push(`        ${seg.translatedText}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** 生成导出文本文件，返回文件路径 */
export function generateExportTextFile(record: InterpretationRecordRow, texts: ExportTexts): string {
  const text = generateExportText(record, texts);
  const dir = ensureRecordsDir();
  const filename = `interpretation_${record.id.slice(0, 8)}.txt`;
  const file = new File(dir, filename);
  file.write(text);
  return file.uri;
}
