/**
 * 统一数据库管理器
 *
 * 职责：
 * 1. 管理数据库连接生命周期
 * 2. 执行数据库迁移
 * 3. 从 assets 导入词库数据
 * 4. 提供统一的数据库访问入口
 *
 * 数据库架构（单库设计）：
 * - littlegrape.db：包含所有数据
 *   - 用户数据：学习进度、收藏、生词本、用户选择的词库
 *   - 词库数据：单词、标签、词库信息（从 assets/words.db 导入）
 *
 * 设计说明：
 * - 使用单例模式管理数据库连接
 * - 所有数据库操作共享同一个连接
 * - 初始化时自动执行迁移
 * - 词库数据通过 ATTACH DATABASE 从 assets 导入
 * - 使用 op-sqlite 提供最佳性能
 *
 * 词库数据更新策略：
 * - 使用 WORDS_DATA_VERSION 定义词库数据版本
 * - APP 启动时通过 AsyncStorage 检查已安装版本
 * - 版本不匹配时从 assets/words.db 重新导入数据
 * - 更新词库时，只需递增 WORDS_DATA_VERSION
 */

import { open, moveAssetsDatabase, type DB } from '@op-engineering/op-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { runMigrations, getDatabaseVersion, CURRENT_VERSION } from './migrations';

// ==================== 版本配置 ====================

/**
 * 词库数据版本
 * 每次更新 assets/sqlite/words.db 时递增此版本号
 * 这会触发 APP 重新导入词库数据
 */
const WORDS_DATA_VERSION = 2;

/** AsyncStorage 键名 */
const WORDS_DATA_VERSION_KEY = 'words_data_version';

// 数据库文件名
const DB_NAME = 'littlegrape.db';           // 主数据库
const WORDS_SOURCE_DB_NAME = 'words.db';    // Assets 中的词库源数据库

// SQLCipher 加密密钥（用于读取加密的 words.db）
const WORDS_DB_ENCRYPTION_KEY = 'LittleGrape2024WordsDBSecretKey123';

// 单例实例
let dbInstance: DB | null = null;
let initPromise: Promise<DB> | null = null;

// 词库导入状态：启动时导入失败后，ensureWordsData 可再次尝试
let wordsDataReady = false;
let ensureWordsPromise: Promise<void> | null = null;

// ==================== 公共 API ====================

/**
 * 获取数据库实例
 * 这是获取数据库连接的唯一入口
 */
export async function getDatabase(): Promise<DB> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = initializeDatabase();
  try {
    dbInstance = await initPromise;
  } finally {
    initPromise = null;
  }

  return dbInstance;
}

/**
 * 确保词库数据已导入
 * 如果启动时导入失败，此函数会再次尝试
 * 供词汇量测试等依赖词库的功能调用
 */
export async function ensureWordsData(): Promise<void> {
  if (wordsDataReady) return;

  if (ensureWordsPromise) {
    return ensureWordsPromise;
  }

  ensureWordsPromise = (async () => {
    try {
      const db = await getDatabase();
      await importWordsDataIfNeeded(db);
    } finally {
      ensureWordsPromise = null;
    }
  })();

  return ensureWordsPromise;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    if (__DEV__) console.log('[DatabaseManager] Database closed');
  }
}

/**
 * 重置数据库（仅用于开发/测试）
 * 警告：这会删除所有数据！
 */
export async function resetDatabase(): Promise<void> {
  console.warn('[DatabaseManager] Resetting database - all data will be lost!');

  if (dbInstance) {
    dbInstance.delete();
    dbInstance = null;
  }

  // 清除词库版本记录，下次启动时重新导入
  await AsyncStorage.removeItem(WORDS_DATA_VERSION_KEY);
  wordsDataReady = false;

  // 重新初始化
  await getDatabase();
  if (__DEV__) console.log('[DatabaseManager] Database reset complete');
}

/**
 * 获取数据库信息（用于调试）
 */
export async function getDatabaseInfo(): Promise<{
  version: number;
  wordsDataVersion: number;
  tables: string[];
  size: string;
  wordCount: number;
}> {
  const db = await getDatabase();
  const version = await getDatabaseVersion(db);

  // 获取已安装的词库版本
  const wordsVersionStr = await AsyncStorage.getItem(WORDS_DATA_VERSION_KEY);
  const wordsDataVersion = wordsVersionStr ? parseInt(wordsVersionStr, 10) : 0;

  // 获取所有表
  const tablesResult = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );

  // 获取数据库大小
  const pageCountResult = await db.execute('PRAGMA page_count');
  const pageSizeResult = await db.execute('PRAGMA page_size');
  const pageCount = Number(pageCountResult.rows[0]?.page_count ?? 0);
  const pageSize = Number(pageSizeResult.rows[0]?.page_size ?? 0);
  const sizeBytes = pageCount * pageSize;
  const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

  // 获取单词数量
  const wordCountResult = await db.execute('SELECT COUNT(*) as count FROM words');
  const wordCount = Number(wordCountResult.rows[0]?.count ?? 0);

  return {
    version,
    wordsDataVersion,
    tables: tablesResult.rows.map((t: any) => t.name),
    size: `${sizeMB} MB`,
    wordCount,
  };
}

// ==================== 内部实现 ====================

/**
 * 初始化数据库
 */
async function initializeDatabase(): Promise<DB> {
  if (__DEV__) console.log('[DatabaseManager] Initializing database...');

  // 打开主数据库
  const db = open({ name: DB_NAME });
  if (__DEV__) console.log(`[DatabaseManager] DB path: ${db.getDbPath()}`);

  // 启用外键约束
  db.executeSync('PRAGMA foreign_keys = ON');

  // 执行迁移（创建表结构）
  const currentVersion = await getDatabaseVersion(db);
  if (__DEV__) console.log(`[DatabaseManager] DB version: ${currentVersion}, Target: ${CURRENT_VERSION}`);

  if (currentVersion < CURRENT_VERSION) {
    if (__DEV__) console.log('[DatabaseManager] Running migrations...');
    await runMigrations(db, DB_NAME);
  }

  // 检查并导入词库数据（失败不阻塞 DB 返回）
  try {
    await importWordsDataIfNeeded(db);
  } catch (error) {
    console.error('[DatabaseManager] Words import failed, will retry on demand:', error);
  }

  // [DEBUG] 验证词库数据
  if (__DEV__) {
    try {
      const wordCountResult = await db.execute('SELECT COUNT(*) as count FROM words');
      const wordTagsResult = await db.execute('SELECT COUNT(*) as count FROM word_tags');
      const libraryInfoResult = await db.execute('SELECT COUNT(*) as count FROM library_info');
      console.log(`[DatabaseManager] === 数据验证 ===`);
      console.log(`[DatabaseManager] words 表: ${wordCountResult.rows[0]?.count} 条`);
      console.log(`[DatabaseManager] word_tags 表: ${wordTagsResult.rows[0]?.count} 条`);
      console.log(`[DatabaseManager] library_info 表: ${libraryInfoResult.rows[0]?.count} 条`);

      if (Number(libraryInfoResult.rows[0]?.count) > 0) {
        const libs = await db.execute('SELECT tag, word_count FROM library_info');
        console.log(`[DatabaseManager] 可用词库:`, JSON.stringify(libs.rows));
      }
    } catch (debugError) {
      console.error('[DatabaseManager] 数据验证失败:', debugError);
    }
  }

  if (__DEV__) console.log('[DatabaseManager] Database ready');
  return db;
}

/**
 * 检查并导入词库数据
 */
async function importWordsDataIfNeeded(db: DB): Promise<void> {
  if (wordsDataReady) return;

  const needsImport = await checkWordsDataNeedsUpdate();

  if (!needsImport) {
    wordsDataReady = true;
    if (__DEV__) console.log('[DatabaseManager] Words data is up to date');
    return;
  }

  if (__DEV__) console.log('[DatabaseManager] Importing words data from assets...');

  try {
    // 1. 从 assets 复制 words.db 到本地（带重试）
    if (__DEV__) console.log('[DatabaseManager] Step 1: moveAssetsDatabase...');
    let moved = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      moved = await moveAssetsDatabase({
        filename: WORDS_SOURCE_DB_NAME,
        path: 'sqlite',
        overwrite: true,
      });
      if (moved) break;
      if (__DEV__) console.warn(`[DatabaseManager] moveAssetsDatabase attempt ${attempt + 1} returned false, retrying...`);
      await new Promise(r => setTimeout(r, 500));
    }
    if (__DEV__) console.log(`[DatabaseManager] Step 1 result: moved=${moved}`);

    if (!moved) {
      throw new Error('Failed to move words database from assets after 3 attempts');
    }

    // 2. 获取 words.db 的路径
    const wordsDbPath = db.getDbPath().replace(DB_NAME, WORDS_SOURCE_DB_NAME);
    if (__DEV__) console.log(`[DatabaseManager] Step 2: Words source DB path: ${wordsDbPath}`);

    // 3. ATTACH 加密的 words.db（使用 KEY 语法）
    if (__DEV__) console.log('[DatabaseManager] Step 3: ATTACH DATABASE...');
    await db.execute(`ATTACH DATABASE '${wordsDbPath}' AS words_source KEY '${WORDS_DB_ENCRYPTION_KEY}'`);
    if (__DEV__) console.log('[DatabaseManager] Step 3: ATTACH 成功');

    // 验证源数据库内容
    const srcWords = await db.execute('SELECT COUNT(*) as count FROM words_source.words');
    const srcTags = await db.execute('SELECT COUNT(*) as count FROM words_source.word_tags');
    const srcLib = await db.execute('SELECT COUNT(*) as count FROM words_source.library_info');
    if (__DEV__) console.log(`[DatabaseManager] 源数据库: words=${srcWords.rows[0]?.count}, word_tags=${srcTags.rows[0]?.count}, library_info=${srcLib.rows[0]?.count}`);

    // 4. 清空现有词库数据
    if (__DEV__) console.log('[DatabaseManager] Step 4: 清空现有数据...');
    await db.execute('DELETE FROM word_tags');
    await db.execute('DELETE FROM words');
    await db.execute('DELETE FROM library_info');

    // 5. 从 words_source 复制数据到主数据库（精简版 v2 只有核心字段）
    if (__DEV__) console.log('[DatabaseManager] Step 5: 复制数据...');

    // 检测源表是否有 etymology_root 列（v2 精简版有，v1 旧版没有）
    let hasEtymologyRoot = false;
    try {
      const colInfo = await db.execute('PRAGMA words_source.table_info(words)');
      hasEtymologyRoot = (colInfo.rows as any[]).some((col: any) => col.name === 'etymology_root');
    } catch {
      // 忽略
    }

    // 检测源表是否有 meanings 列（v1 旧版有，v2 精简版没有）
    let hasMeanings = false;
    try {
      const colInfo = await db.execute('PRAGMA words_source.table_info(words)');
      hasMeanings = (colInfo.rows as any[]).some((col: any) => col.name === 'meanings');
    } catch {
      // 忽略
    }

    if (hasMeanings) {
      // v1 旧格式（完整表）：选择性复制核心字段
      await db.execute(`
        INSERT INTO words (id, word, phonetic_us, phonetic_uk, audio_url_us, audio_url_uk,
          audio_ai_explanation_url, pos, meaning_cn, meaning_en, level, bnc_coca_level,
          is_headword, headword_id, meanings, examples, etymology, collocations, inflections,
          tags, synced_at)
        SELECT id, word, phonetic_us, phonetic_uk, audio_url_us, audio_url_uk,
          audio_ai_explanation_url, pos, meaning_cn, meaning_en, level, bnc_coca_level,
          is_headword, headword_id, meanings, examples, etymology, collocations, inflections,
          tags, synced_at
        FROM words_source.words
      `);
    } else {
      // v2 精简格式：只有核心字段
      const etymRootCol = hasEtymologyRoot ? ', etymology_root' : '';
      const etymRootSel = hasEtymologyRoot ? ', etymology_root' : '';
      await db.execute(`
        INSERT INTO words (id, word, phonetic_us, pos, meaning_cn, meaning_en,
          level, bnc_coca_level, is_headword, headword_id${etymRootCol}, synced_at)
        SELECT id, word, phonetic_us, pos, meaning_cn, meaning_en,
          level, bnc_coca_level, is_headword, headword_id${etymRootSel}, synced_at
        FROM words_source.words
      `);
    }
    if (__DEV__) console.log('[DatabaseManager] Words data imported');

    await db.execute(`
      INSERT INTO word_tags SELECT * FROM words_source.word_tags
    `);
    if (__DEV__) console.log('[DatabaseManager] Word tags data imported');

    await db.execute(`
      INSERT INTO library_info SELECT * FROM words_source.library_info
    `);
    if (__DEV__) console.log('[DatabaseManager] Library info data imported');

    // 6. DETACH words_source
    await db.execute('DETACH DATABASE words_source');

    // 7. 删除临时的 words.db 文件
    try {
      // expo-file-system 需要 file:// URI 格式
      const wordsDbUri = wordsDbPath.startsWith('file://') ? wordsDbPath : `file://${wordsDbPath}`;
      const wordsDbFile = new File(wordsDbUri);
      if (wordsDbFile.exists) {
        wordsDbFile.delete();
        if (__DEV__) console.log('[DatabaseManager] Temporary words.db deleted');
      }
    } catch (deleteError) {
      console.warn('[DatabaseManager] Failed to delete temporary words.db:', deleteError);
    }

    // 8. 更新版本记录
    await AsyncStorage.setItem(WORDS_DATA_VERSION_KEY, WORDS_DATA_VERSION.toString());
    wordsDataReady = true;
    if (__DEV__) console.log(`[DatabaseManager] Words data version updated to v${WORDS_DATA_VERSION}`);

  } catch (error) {
    console.error('[DatabaseManager] Failed to import words data:', error);
    // 尝试清理
    try {
      await db.execute('DETACH DATABASE words_source');
    } catch {
      // 忽略 detach 错误
    }
    throw error;
  }
}

/**
 * 检查词库数据是否需要更新
 */
async function checkWordsDataNeedsUpdate(): Promise<boolean> {
  try {
    const installedVersionStr = await AsyncStorage.getItem(WORDS_DATA_VERSION_KEY);
    const installedVersion = installedVersionStr ? parseInt(installedVersionStr, 10) : 0;
    if (__DEV__) console.log(`[DatabaseManager] AsyncStorage words_data_version = ${installedVersionStr} (parsed: ${installedVersion}), target: ${WORDS_DATA_VERSION}`);

    if (installedVersion < WORDS_DATA_VERSION) {
      if (__DEV__) console.log(
        `[DatabaseManager] Words data needs update: v${installedVersion} → v${WORDS_DATA_VERSION}`
      );
      return true;
    }

    if (__DEV__) console.log('[DatabaseManager] Words data version matches, skip import');
    return false;
  } catch (error) {
    console.warn('[DatabaseManager] Failed to check words data version, assuming needs import:', error);
    return true;
  }
}

// ==================== 写操作队列 ====================

/**
 * 写操作队列 - 确保所有写操作串行执行
 * 避免 "database is locked" 错误
 */
let writeQueue: Promise<void> = Promise.resolve();

/**
 * 串行执行写操作
 * 所有可能导致数据库锁的操作都应该通过这个函数执行
 */
export async function runSerialWrite<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // 关键：无论前一个操作成功还是失败，都执行当前操作
    // 但每个操作的错误只传播给自己的调用者
    writeQueue = writeQueue
      .catch(() => {
        // 忽略前一个操作的错误，确保队列继续
      })
      .then(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
          // 不要 re-throw，避免影响队列
        }
      });
  });
}
