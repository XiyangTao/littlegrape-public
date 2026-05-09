/**
 * 数据库迁移系统
 *
 * 设计原则：
 * 1. 版本号递增，不可跳过中间版本
 * 2. 每个迁移脚本只负责从 version N 升级到 version N+1
 * 3. 迁移在事务中执行，失败自动回滚
 * 4. 支持破坏性变更（需要数据转换）和非破坏性变更（仅添加列）
 *
 * 使用方式：
 * 1. 在 MIGRATIONS 数组中添加新的迁移
 * 2. 更新 CURRENT_VERSION
 * 3. 调用 runMigrations(db) 执行迁移
 */

import type { DB } from '@op-engineering/op-sqlite';

// ==================== 版本定义 ====================

/**
 * 当前数据库版本
 * 每次修改表结构时递增此值，并添加对应的迁移脚本
 */
export const CURRENT_VERSION = 3;

// ==================== 迁移类型 ====================

export interface Migration {
  /** 迁移到的目标版本 */
  version: number;
  /** 迁移描述 */
  description: string;
  /** 迁移脚本，在事务中执行 */
  up: (db: DB) => Promise<void>;
}

// ==================== 迁移脚本 ====================

/**
 * 迁移脚本列表
 * 按版本号升序排列，从 version 1 开始
 *
 * 注意事项：
 * - 永远不要修改已发布版本的迁移脚本
 * - 新的变更必须添加新的迁移版本
 * - SQLite 不支持 DROP COLUMN，需要重建表
 */
export const MIGRATIONS: Migration[] = [
  // ========== Version 1: 初始版本 ==========
  // 这是基础表结构，新安装的用户直接创建这些表
  // 已有用户从 version 0 (无版本) 迁移到 version 1
  {
    version: 1,
    description: '初始版本 - 创建基础表结构',
    up: async (db) => {
      // 对于全新安装，创建所有表
      // 对于已有数据库（从 version 0 升级），这些语句会因为 IF NOT EXISTS 而跳过

      // ConversationDB 表
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          session_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          scenario TEXT NOT NULL,
          ai_role TEXT NOT NULL,
          difficulty_level TEXT NOT NULL,
          english_variant TEXT NOT NULL,
          conversation_style TEXT NOT NULL,
          enable_tips INTEGER NOT NULL DEFAULT 1,
          voice_id TEXT,
          voice_name TEXT,
          predefined_scenario_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          text TEXT NOT NULL,
          sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
          timestamp TEXT NOT NULL,
          tips TEXT,
          score REAL,
          voice_uri TEXT,
          voice_duration REAL,
          translation TEXT,
          FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
        )
      `);

      await db.execute('CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');

      // 学习进度表
      // ID 策略：generateShortId(`${userId}_${wordId}`, now) — 基于哈希生成，因为同一用户同一单词可能重新学习
      await db.execute(`
        CREATE TABLE IF NOT EXISTS word_progress (
          id TEXT PRIMARY KEY,
          word_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'learned', 'mastered')),
          learned_at INTEGER,
          mastered_at INTEGER,
          synced_at INTEGER,
          updated_at INTEGER NOT NULL,
          UNIQUE(word_id, user_id)
        )
      `);

      await db.execute('CREATE INDEX IF NOT EXISTS idx_word_progress_user ON word_progress(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_word_progress_status ON word_progress(user_id, status)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_word_progress_synced ON word_progress(synced_at)');

      // 收藏表：用户手动收藏的单词
      // 注意：word_id 引用预置数据库中的 words 表，无法使用外键
      // ID 策略：确定性拼接 `fav_${wordId}_${userId}` — 同一用户同一单词只会有一条记录，便于幂等插入和同步去重
      await db.execute(`
        CREATE TABLE IF NOT EXISTS favorite_words (
          id TEXT PRIMARY KEY,
          word_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          synced_at INTEGER,
          UNIQUE(word_id, user_id)
        )
      `);

      await db.execute('CREATE INDEX IF NOT EXISTS idx_favorite_words_user ON favorite_words(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_favorite_words_synced ON favorite_words(synced_at)');

      // 生词本表：答错自动加入，答对3次自动移除
      // ID 策略：确定性拼接 `diff_${wordId}_${userId}` — 同理收藏表，同一用户同一单词只有一条记录
      await db.execute(`
        CREATE TABLE IF NOT EXISTS difficult_words (
          id TEXT PRIMARY KEY,
          word_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          wrong_count INTEGER NOT NULL DEFAULT 1,
          correct_count INTEGER NOT NULL DEFAULT 0,
          last_wrong_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          synced_at INTEGER,
          UNIQUE(word_id, user_id)
        )
      `);

      await db.execute('CREATE INDEX IF NOT EXISTS idx_difficult_words_user ON difficult_words(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_difficult_words_synced ON difficult_words(synced_at)');

      // ==================== 词库表（从 assets 导入数据） ====================

      // 单词表
      await db.execute(`
        CREATE TABLE IF NOT EXISTS words (
          id TEXT PRIMARY KEY,
          word TEXT NOT NULL,
          phonetic_us TEXT,
          phonetic_uk TEXT,
          audio_url_us TEXT,
          audio_url_uk TEXT,
          audio_ai_explanation_url TEXT,
          pos TEXT,
          meaning_cn TEXT NOT NULL,
          meaning_en TEXT,
          level INTEGER,
          bnc_coca_level INTEGER,
          is_headword INTEGER DEFAULT 0,
          headword_id TEXT,
          meanings TEXT NOT NULL DEFAULT '[]',
          examples TEXT NOT NULL DEFAULT '[]',
          etymology TEXT,
          collocations TEXT NOT NULL DEFAULT '[]',
          inflections TEXT NOT NULL DEFAULT '[]',
          tags TEXT NOT NULL DEFAULT '[]',
          synced_at INTEGER NOT NULL
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_words_word ON words(word)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_words_bnc_coca_level ON words(bnc_coca_level)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_words_is_headword ON words(is_headword)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_words_headword_level ON words(is_headword, bnc_coca_level)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_words_headword_id ON words(headword_id)');

      // 单词标签关联表
      await db.execute(`
        CREATE TABLE IF NOT EXISTS word_tags (
          word_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          PRIMARY KEY (word_id, tag),
          FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_word_tags_tag ON word_tags(tag)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_word_tags_word_id ON word_tags(word_id)');

      // 词库信息表（存储每个词库的单词数量）
      await db.execute(`
        CREATE TABLE IF NOT EXISTS library_info (
          tag TEXT PRIMARY KEY,
          word_count INTEGER NOT NULL
        )
      `);

      // 词汇量测试结果表（支持多条记录，用于同步）
      // ID 策略：generateShortId(`${userId}_vocab_test`, now) — 每次测试都是新记录，需要时间戳区分
      await db.execute(`
        CREATE TABLE IF NOT EXISTS vocabulary_test_results (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          estimated_vocabulary INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          correct_count INTEGER NOT NULL,
          duration INTEGER NOT NULL,
          level TEXT NOT NULL,
          level_description TEXT NOT NULL,
          confidence_lower INTEGER NOT NULL,
          confidence_upper INTEGER NOT NULL,
          event_time INTEGER NOT NULL,
          sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
          synced_at INTEGER
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_vocabulary_test_user ON vocabulary_test_results(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_vocabulary_test_time ON vocabulary_test_results(user_id, event_time)');

      // 学习事件表：用于每日学习/掌握统计
      // ID 策略：generateShortId(uniqueKey, 0) — timestamp 固定为 0，确保同一天同一事件生成相同 id，实现幂等
      await db.execute(`
        CREATE TABLE IF NOT EXISTS learning_events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          entity_type TEXT,
          entity_id TEXT,
          quantity INTEGER NOT NULL DEFAULT 1,
          event_date TEXT NOT NULL,
          event_time INTEGER NOT NULL,
          sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
          synced_at INTEGER,
          UNIQUE(user_id, event_type, entity_type, entity_id)
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_learning_events_date ON learning_events(user_id, event_date)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_learning_events_time ON learning_events(event_time)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_learning_events_sync ON learning_events(sync_status)');

      // 每日统计汇总表：避免实时聚合，页面直接读取
      // ID 策略：确定性拼接 `${userId}_${date}` — 每用户每天只有一条记录，便于 UPSERT
      // 注意：此表没有 sync_status 字段，同步状态通过 synced_at 是否为 NULL 判断
      await db.execute(`
        CREATE TABLE IF NOT EXISTS daily_stats (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          date TEXT NOT NULL,
          learned_count INTEGER DEFAULT 0,
          mastered_count INTEGER DEFAULT 0,
          reviewed_count INTEGER DEFAULT 0,
          grammar_practiced_count INTEGER DEFAULT 0,
          grammar_mastered_count INTEGER DEFAULT 0,
          phoneme_practiced_count INTEGER DEFAULT 0,
          updated_at INTEGER NOT NULL,
          synced_at INTEGER,
          UNIQUE(user_id, date)
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_daily_stats_user ON daily_stats(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(user_id, date)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_daily_stats_synced ON daily_stats(synced_at)');

      // 学习会话临时记录表：记录当前会话已加载的单词，避免重复推荐
      await db.execute(`
        CREATE TABLE IF NOT EXISTS learning_session_words (
          word_id TEXT PRIMARY KEY
        )
      `);

      // 同步元数据表：记录各 syncer 的最后同步时间（服务端时间）
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          user_id TEXT NOT NULL,
          syncer_name TEXT NOT NULL,
          last_server_time INTEGER,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (user_id, syncer_name)
        )
      `);

      // AI 学习助手 - 消息本地缓存
      await db.execute(`
        CREATE TABLE IF NOT EXISTS assistant_messages (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT NOT NULL,
          synced INTEGER NOT NULL DEFAULT 0
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_assistant_msg_created ON assistant_messages(created_at)');

      // ==================== 关卡系统表 ====================

      // 关卡定义表
      await db.execute(`
        CREATE TABLE IF NOT EXISTS word_levels (
          id TEXT PRIMARY KEY,
          tag TEXT NOT NULL,
          level_index INTEGER NOT NULL,
          chapter_index INTEGER NOT NULL,
          is_boss INTEGER NOT NULL DEFAULT 0,
          word_ids TEXT NOT NULL DEFAULT '[]',
          UNIQUE(tag, level_index)
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_word_levels_tag ON word_levels(tag)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_word_levels_tag_index ON word_levels(tag, level_index)');

      // 用户关卡进度表
      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_level_progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          level_index INTEGER NOT NULL,
          stars INTEGER NOT NULL DEFAULT 0,
          flash_correct INTEGER NOT NULL DEFAULT 0,
          flash_total INTEGER NOT NULL DEFAULT 0,
          challenge_correct INTEGER NOT NULL DEFAULT 0,
          challenge_total INTEGER NOT NULL DEFAULT 0,
          combo_max INTEGER NOT NULL DEFAULT 0,
          score INTEGER NOT NULL DEFAULT 0,
          xp_earned INTEGER NOT NULL DEFAULT 0,
          weak_word_ids TEXT NOT NULL DEFAULT '[]',
          completed_at INTEGER,
          updated_at INTEGER NOT NULL,
          UNIQUE(user_id, tag, level_index)
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_ulp_user_tag ON user_level_progress(user_id, tag)');

      // ========== 词根系统表 ==========

      // 词根索引表（预计算，按 tag 分组，tag=NULL 为全量索引）
      await db.execute(`
        CREATE TABLE IF NOT EXISTS root_index (
          id TEXT PRIMARY KEY,
          tag TEXT,
          root TEXT NOT NULL,
          root_meaning TEXT,
          word_count INTEGER NOT NULL DEFAULT 0,
          word_ids TEXT NOT NULL DEFAULT '[]',
          UNIQUE(root, tag)
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_root_index_tag ON root_index(tag)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_root_index_root ON root_index(root)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_root_index_count ON root_index(tag, word_count DESC)');

      // 用户词根进度表
      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_root_progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          root_id TEXT NOT NULL,
          learned_count INTEGER NOT NULL DEFAULT 0,
          total_count INTEGER NOT NULL DEFAULT 0,
          is_lit INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL,
          UNIQUE(user_id, root_id)
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_urp_user ON user_root_progress(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_urp_user_root ON user_root_progress(user_id, root_id)');

      // ========== AI 造句系统表 ==========

      // 造句挑战记录
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sentence_challenges (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          word_id TEXT NOT NULL,
          sentence TEXT NOT NULL,
          grammar_score INTEGER,
          usage_score INTEGER,
          natural_score INTEGER,
          overall_score INTEGER,
          feedback TEXT,
          improved_sentence TEXT,
          created_at INTEGER NOT NULL
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_sc_user ON sentence_challenges(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_sc_word ON sentence_challenges(word_id, user_id)');

      // 单词遭遇记录
      await db.execute(`
        CREATE TABLE IF NOT EXISTS encountered_words (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          word_id TEXT NOT NULL,
          source TEXT NOT NULL,
          context_sentence TEXT,
          encountered_at INTEGER NOT NULL
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_ew_user ON encountered_words(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_ew_word ON encountered_words(user_id, word_id)');

      // word_progress 表扩展列（遭遇/造句统计）
      await addColumnIfNotExists(db, 'word_progress', 'encounter_count', 'INTEGER DEFAULT 0');
      await addColumnIfNotExists(db, 'word_progress', 'sentence_count', 'INTEGER DEFAULT 0');
      await addColumnIfNotExists(db, 'word_progress', 'best_sentence_score', 'INTEGER');

      // word_progress 表扩展列（跳过标记）
      await addColumnIfNotExists(db, 'word_progress', 'is_skipped', 'INTEGER NOT NULL DEFAULT 0');

      // ========== 发音练习系统表 ==========

      // 音素进度表：记录每个音素的练习统计
      // ID 策略：确定性拼接 `pp_${phonemeSymbol}_${userId}` — 同一用户同一音素只有一条记录
      await db.execute(`
        CREATE TABLE IF NOT EXISTS phoneme_progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          phoneme_symbol TEXT NOT NULL,
          practice_count INTEGER NOT NULL DEFAULT 0,
          total_word_count INTEGER NOT NULL DEFAULT 0,
          avg_score REAL NOT NULL DEFAULT 0,
          best_score REAL NOT NULL DEFAULT 0,
          last_score REAL NOT NULL DEFAULT 0,
          mastery_level TEXT NOT NULL DEFAULT 'none' CHECK (mastery_level IN ('none', 'beginner', 'intermediate', 'advanced', 'mastered')),
          listen_correct_count INTEGER NOT NULL DEFAULT 0,
          listen_total_count INTEGER NOT NULL DEFAULT 0,
          last_practiced_at INTEGER,
          updated_at INTEGER NOT NULL,
          UNIQUE(user_id, phoneme_symbol)
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_phoneme_progress_user ON phoneme_progress(user_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_phoneme_progress_symbol ON phoneme_progress(user_id, phoneme_symbol)');
      await addColumnIfNotExists(db, 'phoneme_progress', 'synced_at', 'INTEGER');

      // ========== 练习历史表（错题复习） ==========

      await db.execute(`
        CREATE TABLE IF NOT EXISTS exercise_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exercise_type TEXT NOT NULL,
          question_json TEXT NOT NULL,
          is_correct INTEGER NOT NULL DEFAULT 0,
          answered_at INTEGER NOT NULL
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_exercise_history_type ON exercise_history(exercise_type)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_exercise_history_correct ON exercise_history(is_correct)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_exercise_history_time ON exercise_history(answered_at)');

      // ========== 同步 Outbox 表 ==========
      // 记录所有需要推送到服务端的写操作，支持失败重试和指数退避
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sync_outbox (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          op_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          max_attempts INTEGER NOT NULL DEFAULT 5,
          last_error TEXT,
          scheduled_at INTEGER NOT NULL DEFAULT 0
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_outbox_scheduled ON sync_outbox(scheduled_at)');

      // ========== 单词详情缓存表（words.db 瘦身） ==========

      await db.execute(`
        CREATE TABLE IF NOT EXISTS word_details_cache (
          word_id TEXT PRIMARY KEY,
          phonetic_us TEXT,
          phonetic_uk TEXT,
          audio_url_us TEXT,
          audio_url_uk TEXT,
          audio_ai_explanation_url TEXT,
          meanings TEXT DEFAULT '[]',
          examples TEXT DEFAULT '[]',
          etymology TEXT,
          collocations TEXT DEFAULT '[]',
          inflections TEXT DEFAULT '[]',
          tags TEXT DEFAULT '[]',
          cached_at INTEGER NOT NULL
        )
      `);

      // words 表添加 etymology_root 列
      await addColumnIfNotExists(db, 'words', 'etymology_root', 'TEXT');

      // ========== 音素数据缓存表 ==========

      await db.execute(`
        CREATE TABLE IF NOT EXISTS phoneme_data_cache (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          version INTEGER NOT NULL DEFAULT 0,
          data_json TEXT NOT NULL,
          cached_at INTEGER NOT NULL
        )
      `);

      // ==================== 伙伴对话表 ====================

      await db.execute(`
        CREATE TABLE IF NOT EXISTS companion_threads (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          character_id TEXT NOT NULL,
          agno_session_id TEXT NOT NULL,
          message_count INTEGER NOT NULL DEFAULT 0,
          last_message_at TEXT,
          last_message_preview TEXT,
          difficulty TEXT NOT NULL DEFAULT 'cet4',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(user_id, character_id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS companion_messages (
          id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL,
          text TEXT NOT NULL,
          sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
          timestamp TEXT NOT NULL,
          voice_uri TEXT,
          voice_duration REAL,
          translation TEXT,
          tips TEXT,
          synced INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (thread_id) REFERENCES companion_threads(id) ON DELETE CASCADE
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_companion_msg_thread ON companion_messages(thread_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_companion_msg_ts ON companion_messages(timestamp)');
    },
  },
  {
    version: 2,
    description: '添加同声传译记录表',
    up: async (db: DB) => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS interpretation_records (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          source_language TEXT NOT NULL,
          target_language TEXT NOT NULL,
          mode TEXT NOT NULL,
          duration_ms INTEGER NOT NULL,
          transcript TEXT NOT NULL,
          source_audio_path TEXT,
          translation_audio_path TEXT,
          created_at TEXT NOT NULL
        )
      `);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_interpretation_user_created ON interpretation_records(user_id, created_at DESC)');
    },
  },
  {
    version: 3,
    description: 'sync_outbox 加 user_id 列（防跨用户残留误推）',
    up: async (db: DB) => {
      // 加列：DEFAULT '' 满足 NOT NULL，旧 entry 缺失归属信息无法判断推给谁
      await addColumnIfNotExists(db, 'sync_outbox', 'user_id', "TEXT NOT NULL DEFAULT ''");
      // 旧 entry 一次性丢弃 —— 本地数据状态由 word_progress.synced_at 等承担最终一致性，
      // 留着旧 entry 会被新登录用户的 SyncManager 用其 token 推上去，导致归属错误
      await db.execute(`DELETE FROM sync_outbox WHERE user_id = ''`);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_outbox_user ON sync_outbox(user_id)');
    },
  },
];

// ==================== 迁移执行器 ====================

/**
 * 获取当前数据库版本
 */
export async function getDatabaseVersion(db: DB): Promise<number> {
  const result = await db.execute('PRAGMA user_version');
  return Number(result.rows[0]?.user_version ?? 0);
}

/**
 * 设置数据库版本
 */
async function setDatabaseVersion(db: DB, version: number): Promise<void> {
  await db.execute(`PRAGMA user_version = ${version}`);
}

/**
 * 执行数据库迁移
 *
 * @param db 数据库实例
 * @param dbName 数据库名称（用于日志）
 * @returns 是否执行了迁移
 */
export async function runMigrations(
  db: DB,
  dbName: string = 'database'
): Promise<boolean> {
  const currentVersion = await getDatabaseVersion(db);

  if (currentVersion >= CURRENT_VERSION) {
    if (__DEV__) console.log(`[Migration] ${dbName} is up to date (v${currentVersion})`);
    return false;
  }

  if (__DEV__) console.log(`[Migration] ${dbName} needs upgrade: v${currentVersion} → v${CURRENT_VERSION}`);

  // 启用外键约束
  await db.execute('PRAGMA foreign_keys = ON');

  // 按顺序执行迁移
  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue; // 跳过已执行的迁移
    }

    if (migration.version > CURRENT_VERSION) {
      break; // 不执行超过目标版本的迁移
    }

    if (__DEV__) console.log(`[Migration] Running migration v${migration.version}: ${migration.description}`);

    try {
      // 在事务中执行迁移
      await db.transaction(async (tx) => {
        // 将事务对象转换为可执行格式
        const txDb: DB = {
          ...db,
          execute: tx.execute.bind(tx),
        } as DB;
        await migration.up(txDb);
      });

      // 更新版本号（在事务外，确保迁移成功后才更新）
      await setDatabaseVersion(db, migration.version);
      if (__DEV__) console.log(`[Migration] Completed migration v${migration.version}`);
    } catch (error) {
      console.error(`[Migration] Failed at v${migration.version}:`, error);
      throw new Error(
        `Database migration failed at version ${migration.version}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  if (__DEV__) console.log(`[Migration] ${dbName} upgraded to v${CURRENT_VERSION}`);
  return true;
}

// ==================== 辅助函数 ====================

/**
 * 检查表是否存在
 */
export async function tableExists(db: DB, tableName: string): Promise<boolean> {
  const result = await db.execute(
    "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
    [tableName]
  );
  return Number(result.rows[0]?.count ?? 0) > 0;
}

/**
 * 检查列是否存在
 */
export async function columnExists(
  db: DB,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const result = await db.execute(`PRAGMA table_info(${tableName})`);
  return result.rows.some((col: any) => col.name === columnName);
}

/**
 * 安全添加列（如果不存在才添加）
 */
export async function addColumnIfNotExists(
  db: DB,
  tableName: string,
  columnName: string,
  columnDef: string
): Promise<void> {
  const exists = await columnExists(db, tableName, columnName);
  if (!exists) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    if (__DEV__) console.log(`[Migration] Added column ${tableName}.${columnName}`);
  }
}
