-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "wechatOpenId" TEXT,
    "wechatUnionId" TEXT,
    "wechatNickname" TEXT,
    "wechatAvatar" TEXT,
    "nickname" TEXT,
    "avatar" TEXT,
    "gender" TEXT,
    "birthday" TEXT,
    "bio" TEXT,
    "inviteCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pushToken" TEXT,
    "pushPlatform" TEXT,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_usages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_daily_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "phoneticUs" TEXT,
    "phoneticUk" TEXT,
    "audioUsUrl" TEXT,
    "audioUkUrl" TEXT,
    "aiExplanation" TEXT,
    "audioAiExplanationUrl" TEXT,
    "pos" TEXT,
    "meaningCn" TEXT NOT NULL,
    "meaningEn" TEXT,
    "level" TEXT NOT NULL DEFAULT 'basic',
    "bncCocaLevel" INTEGER,
    "isHeadword" BOOLEAN NOT NULL DEFAULT false,
    "headwordId" TEXT,
    "memoryTip" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'dictionary',
    "verifiedMeanings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_inflections" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "inflection" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_inflections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_meanings" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "pos" TEXT NOT NULL,
    "meaningCn" TEXT NOT NULL,
    "meaningEn" TEXT,
    "exampleEn" TEXT,
    "exampleCn" TEXT,
    "register" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_meanings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_examples" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "en" TEXT NOT NULL,
    "cn" TEXT NOT NULL,
    "audioUrl" TEXT,
    "level" TEXT NOT NULL DEFAULT 'easy',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_collocations" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "examples" JSONB NOT NULL,
    "meaningCn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_collocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_etymologies" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "root" TEXT,
    "rootMeaning" TEXT,
    "prefix" TEXT,
    "prefixMeaning" TEXT,
    "suffix" TEXT,
    "suffixMeaning" TEXT,
    "analysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_etymologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_practices" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_tags" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_confusables" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "confusableWord" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_confusables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_word_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'learned',
    "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "masteredAt" TIMESTAMP(3),
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_word_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventDate" TEXT NOT NULL,
    "learnedCount" INTEGER NOT NULL DEFAULT 0,
    "masteredCount" INTEGER NOT NULL DEFAULT 0,
    "reviewedCount" INTEGER NOT NULL DEFAULT 0,
    "grammarPracticedCount" INTEGER NOT NULL DEFAULT 0,
    "grammarMasteredCount" INTEGER NOT NULL DEFAULT 0,
    "phonemePracticedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_learning_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "eventDate" TEXT NOT NULL,
    "eventTime" BIGINT NOT NULL,
    "serverTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_learning_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vocabulary_tests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "estimatedVocabulary" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "levelDescription" TEXT NOT NULL,
    "confidenceLower" INTEGER NOT NULL,
    "confidenceUpper" INTEGER NOT NULL,
    "eventTime" BIGINT NOT NULL,
    "serverTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_vocabulary_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_words" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_difficult_words" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "wrongCount" INTEGER NOT NULL DEFAULT 1,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "lastWrongAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_difficult_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "yearlyPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "costBudget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "costBudget" DECIMAL(65,30) NOT NULL,
    "costOffset" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "supersededBy" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "content" TEXT NOT NULL,
    "contentCompressed" TEXT,
    "contentZh" TEXT,
    "level" TEXT NOT NULL DEFAULT 'intermediate',
    "category" TEXT NOT NULL DEFAULT 'general',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourcePublishedAt" TIMESTAMP(3),
    "summary" TEXT,
    "summaryZh" TEXT,
    "paragraphs" JSONB,
    "keyVocabulary" JSONB,
    "quiz" JSONB,
    "audioUrl" TEXT,
    "audioTimestamps" JSONB,
    "paragraphAudios" JSONB,
    "introZh" TEXT,
    "introAudioScript" TEXT,
    "introAudioUrl" TEXT,
    "teacherId" TEXT,
    "pipelineVersion" INTEGER NOT NULL DEFAULT 1,
    "explanationScript" TEXT,
    "explanationAudioUrl" TEXT,
    "explanationMapping" JSONB,
    "pipelineStatus" TEXT NOT NULL DEFAULT 'pending',
    "pipelineFailCount" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "publishDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reading_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reading',
    "readTime" INTEGER NOT NULL DEFAULT 0,
    "quizScore" INTEGER,
    "completedAt" TIMESTAMP(3),
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "currentParagraph" INTEGER NOT NULL DEFAULT 0,
    "quizAnswers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_speaking_diaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "topicZh" TEXT,
    "userText" TEXT NOT NULL,
    "aiCorrection" TEXT,
    "aiSuggestion" TEXT,
    "aiScore" INTEGER,
    "audioUrl" TEXT,
    "duration" INTEGER,
    "eventDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_speaking_diaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_lines" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '',
    "themeColor" TEXT NOT NULL DEFAULT '',
    "difficulty" TEXT NOT NULL DEFAULT 'elementary',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unlockCondition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_chapters" (
    "id" TEXT NOT NULL,
    "storyLineId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "episodeFrom" INTEGER NOT NULL,
    "episodeTo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_episodes" (
    "id" TEXT NOT NULL,
    "storyLineId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL DEFAULT '',
    "titleAudioUrl" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "learningPoints" JSONB,
    "script" JSONB,
    "narratorClosing" TEXT,
    "nextEpisodeHook" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_story_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyLineId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unlocked',
    "stars" INTEGER NOT NULL DEFAULT 0,
    "grade" TEXT,
    "answers" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_story_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "originalAmount" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "paymentTradeNo" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "rewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalLearned" INTEGER NOT NULL DEFAULT 0,
    "totalMastered" INTEGER NOT NULL DEFAULT 0,
    "totalReviewed" INTEGER NOT NULL DEFAULT 0,
    "totalConversations" INTEGER NOT NULL DEFAULT 0,
    "totalListening" INTEGER NOT NULL DEFAULT 0,
    "totalReading" INTEGER NOT NULL DEFAULT 0,
    "totalDiaries" INTEGER NOT NULL DEFAULT 0,
    "totalLevels" INTEGER NOT NULL DEFAULT 0,
    "totalBossKills" INTEGER NOT NULL DEFAULT 0,
    "totalPerfectStars" INTEGER NOT NULL DEFAULT 0,
    "totalSentences" INTEGER NOT NULL DEFAULT 0,
    "totalDailyChallenges" INTEGER NOT NULL DEFAULT 0,
    "totalSpeedReviews" INTEGER NOT NULL DEFAULT 0,
    "totalRootsLit" INTEGER NOT NULL DEFAULT 0,
    "totalEncounters" INTEGER NOT NULL DEFAULT 0,
    "totalDailyTaskDays" INTEGER NOT NULL DEFAULT 0,
    "totalPhonemePractices" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "maxStreakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT,
    "dailyXpEarned" INTEGER NOT NULL DEFAULT 0,
    "dailyXpDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "seriesCode" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionZh" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "ruleType" TEXT NOT NULL DEFAULT 'stat',
    "conditions" JSONB,
    "triggerEvents" JSONB,
    "levelCondition" INTEGER,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "rarity" TEXT,
    "rarityPercent" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seasonCode" TEXT,
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievement_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievement_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'unlock',
    "payload" JSONB NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievement_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_levels" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listening_materials" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "sentences" JSONB NOT NULL,
    "questions" JSONB,
    "level" TEXT NOT NULL DEFAULT 'intermediate',
    "category" TEXT NOT NULL DEFAULT 'general',
    "totalWords" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listening_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_listening_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'dictation',
    "dictationScore" INTEGER,
    "quizScore" INTEGER,
    "listenCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_listening_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_exam_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examTypeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_exam_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_community_posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'share',
    "content" TEXT NOT NULL,
    "images" JSONB,
    "tags" JSONB,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_post_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_post_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_assistant_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userProfile" JSONB NOT NULL,
    "learningStats" JSONB NOT NULL,
    "recentProgress" JSONB NOT NULL,
    "preferences" JSONB NOT NULL,
    "aiInsights" JSONB,
    "lastSnapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_assistant_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_assistant_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_assistant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "triggerData" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feedbacks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deviceInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_challenges" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 20,
    "timeLimit" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_challenge_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "maxCombo" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_challenge_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievement_event_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "eventDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievement_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT,
    "rewards" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionZh" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 10,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "taskDate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_daily_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_task_bonus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskDate" TEXT NOT NULL,
    "xpAwarded" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_task_bonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badge_showcases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badge_showcases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievement_shares" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "shareType" TEXT NOT NULL,
    "shareUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievement_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grammar_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7C5CFC',
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grammar_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grammar_points" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'basic',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT,
    "examples" JSONB,
    "explanationGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grammar_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grammar_practices" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cognitiveLevel" TEXT NOT NULL DEFAULT 'recognition',
    "question" TEXT NOT NULL,
    "options" JSONB,
    "answer" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'basic',
    "smartTip" JSONB,
    "errorPart" TEXT,
    "correctVersion" TEXT,
    "sentence1" TEXT,
    "sentence2" TEXT,
    "answer2" TEXT,
    "tableData" JSONB,
    "words" JSONB,
    "distractors" JSONB,
    "chineseTranslation" TEXT,
    "structureHint" TEXT,
    "acceptableAnswers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grammar_practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_grammar_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "readAt" TIMESTAMP(3),
    "practiceScore" INTEGER,
    "practiceCount" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER,
    "starRating" INTEGER,
    "bestStarRating" INTEGER,
    "lastPracticedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_grammar_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_phoneme_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phonemeSymbol" TEXT NOT NULL,
    "practiceCount" INTEGER NOT NULL DEFAULT 0,
    "totalWordCount" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "masteryLevel" TEXT NOT NULL DEFAULT 'none',
    "listenCorrectCount" INTEGER NOT NULL DEFAULT 0,
    "listenTotalCount" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_phoneme_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companion_threads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "agnoSessionId" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'cet4',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_companion_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companion_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_companion_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companion_mem0_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_companion_mem0_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_wechatOpenId_key" ON "users"("wechatOpenId");

-- CreateIndex
CREATE UNIQUE INDEX "users_wechatUnionId_key" ON "users"("wechatUnionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "users_inviteCode_key" ON "users"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_codes_email_type_key" ON "email_verification_codes"("email", "type");

-- CreateIndex
CREATE INDEX "user_daily_usages_userId_date_idx" ON "user_daily_usages"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_usages_userId_serviceType_date_key" ON "user_daily_usages"("userId", "serviceType", "date");

-- CreateIndex
CREATE UNIQUE INDEX "words_word_key" ON "words"("word");

-- CreateIndex
CREATE INDEX "words_level_idx" ON "words"("level");

-- CreateIndex
CREATE INDEX "words_bncCocaLevel_idx" ON "words"("bncCocaLevel");

-- CreateIndex
CREATE INDEX "words_isHeadword_idx" ON "words"("isHeadword");

-- CreateIndex
CREATE INDEX "words_isHeadword_bncCocaLevel_idx" ON "words"("isHeadword", "bncCocaLevel");

-- CreateIndex
CREATE INDEX "words_headwordId_idx" ON "words"("headwordId");

-- CreateIndex
CREATE INDEX "word_inflections_wordId_idx" ON "word_inflections"("wordId");

-- CreateIndex
CREATE INDEX "word_inflections_type_idx" ON "word_inflections"("type");

-- CreateIndex
CREATE UNIQUE INDEX "word_inflections_inflection_key" ON "word_inflections"("inflection");

-- CreateIndex
CREATE INDEX "word_meanings_wordId_idx" ON "word_meanings"("wordId");

-- CreateIndex
CREATE INDEX "word_examples_wordId_idx" ON "word_examples"("wordId");

-- CreateIndex
CREATE INDEX "word_collocations_wordId_idx" ON "word_collocations"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "word_etymologies_wordId_key" ON "word_etymologies"("wordId");

-- CreateIndex
CREATE INDEX "word_practices_wordId_idx" ON "word_practices"("wordId");

-- CreateIndex
CREATE INDEX "word_practices_wordId_type_idx" ON "word_practices"("wordId", "type");

-- CreateIndex
CREATE INDEX "word_tags_tag_idx" ON "word_tags"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "word_tags_wordId_tag_key" ON "word_tags"("wordId", "tag");

-- CreateIndex
CREATE INDEX "word_confusables_wordId_idx" ON "word_confusables"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "word_confusables_wordId_confusableWord_key" ON "word_confusables"("wordId", "confusableWord");

-- CreateIndex
CREATE INDEX "user_word_progress_userId_idx" ON "user_word_progress"("userId");

-- CreateIndex
CREATE INDEX "user_word_progress_userId_status_idx" ON "user_word_progress"("userId", "status");

-- CreateIndex
CREATE INDEX "user_word_progress_userId_updatedAt_idx" ON "user_word_progress"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_word_progress_userId_wordId_key" ON "user_word_progress"("userId", "wordId");

-- CreateIndex
CREATE INDEX "user_daily_stats_userId_idx" ON "user_daily_stats"("userId");

-- CreateIndex
CREATE INDEX "user_daily_stats_userId_serverTime_idx" ON "user_daily_stats"("userId", "serverTime");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_stats_userId_eventDate_key" ON "user_daily_stats"("userId", "eventDate");

-- CreateIndex
CREATE INDEX "user_learning_events_userId_idx" ON "user_learning_events"("userId");

-- CreateIndex
CREATE INDEX "user_learning_events_userId_eventDate_idx" ON "user_learning_events"("userId", "eventDate");

-- CreateIndex
CREATE INDEX "user_learning_events_userId_eventTime_idx" ON "user_learning_events"("userId", "eventTime");

-- CreateIndex
CREATE INDEX "user_learning_events_userId_eventType_idx" ON "user_learning_events"("userId", "eventType");

-- CreateIndex
CREATE INDEX "user_learning_events_userId_serverTime_idx" ON "user_learning_events"("userId", "serverTime");

-- CreateIndex
CREATE INDEX "user_learning_events_userId_eventDate_eventTime_idx" ON "user_learning_events"("userId", "eventDate", "eventTime");

-- CreateIndex
CREATE INDEX "user_vocabulary_tests_userId_idx" ON "user_vocabulary_tests"("userId");

-- CreateIndex
CREATE INDEX "user_vocabulary_tests_userId_eventTime_idx" ON "user_vocabulary_tests"("userId", "eventTime");

-- CreateIndex
CREATE INDEX "user_vocabulary_tests_userId_serverTime_idx" ON "user_vocabulary_tests"("userId", "serverTime");

-- CreateIndex
CREATE INDEX "user_favorite_words_userId_idx" ON "user_favorite_words"("userId");

-- CreateIndex
CREATE INDEX "user_favorite_words_userId_createdAt_idx" ON "user_favorite_words"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_words_userId_wordId_key" ON "user_favorite_words"("userId", "wordId");

-- CreateIndex
CREATE INDEX "user_difficult_words_userId_idx" ON "user_difficult_words"("userId");

-- CreateIndex
CREATE INDEX "user_difficult_words_userId_updatedAt_idx" ON "user_difficult_words"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_difficult_words_userId_wordId_key" ON "user_difficult_words"("userId", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_planType_key" ON "plans"("planType");

-- CreateIndex
CREATE INDEX "user_subscriptions_userId_idx" ON "user_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "user_subscriptions_userId_status_idx" ON "user_subscriptions"("userId", "status");

-- CreateIndex
CREATE INDEX "user_subscriptions_orderId_idx" ON "user_subscriptions"("orderId");

-- CreateIndex
CREATE INDEX "user_subscriptions_planId_idx" ON "user_subscriptions"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "reading_articles_sourceUrl_key" ON "reading_articles"("sourceUrl");

-- CreateIndex
CREATE INDEX "reading_articles_level_idx" ON "reading_articles"("level");

-- CreateIndex
CREATE INDEX "reading_articles_category_idx" ON "reading_articles"("category");

-- CreateIndex
CREATE INDEX "reading_articles_isPublished_publishDate_idx" ON "reading_articles"("isPublished", "publishDate");

-- CreateIndex
CREATE INDEX "reading_articles_pipelineStatus_idx" ON "reading_articles"("pipelineStatus");

-- CreateIndex
CREATE INDEX "user_reading_progress_userId_idx" ON "user_reading_progress"("userId");

-- CreateIndex
CREATE INDEX "user_reading_progress_articleId_idx" ON "user_reading_progress"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_reading_progress_userId_articleId_key" ON "user_reading_progress"("userId", "articleId");

-- CreateIndex
CREATE INDEX "user_speaking_diaries_userId_idx" ON "user_speaking_diaries"("userId");

-- CreateIndex
CREATE INDEX "user_speaking_diaries_userId_eventDate_idx" ON "user_speaking_diaries"("userId", "eventDate");

-- CreateIndex
CREATE INDEX "story_lines_sortOrder_idx" ON "story_lines"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "story_lines_characterId_title_key" ON "story_lines"("characterId", "title");

-- CreateIndex
CREATE INDEX "story_chapters_storyLineId_idx" ON "story_chapters"("storyLineId");

-- CreateIndex
CREATE UNIQUE INDEX "story_chapters_storyLineId_chapterNumber_key" ON "story_chapters"("storyLineId", "chapterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "story_episodes_episodeId_key" ON "story_episodes"("episodeId");

-- CreateIndex
CREATE INDEX "story_episodes_storyLineId_idx" ON "story_episodes"("storyLineId");

-- CreateIndex
CREATE UNIQUE INDEX "story_episodes_storyLineId_episodeNumber_key" ON "story_episodes"("storyLineId", "episodeNumber");

-- CreateIndex
CREATE INDEX "user_story_progress_userId_idx" ON "user_story_progress"("userId");

-- CreateIndex
CREATE INDEX "user_story_progress_userId_storyLineId_idx" ON "user_story_progress"("userId", "storyLineId");

-- CreateIndex
CREATE UNIQUE INDEX "user_story_progress_userId_storyLineId_episodeId_key" ON "user_story_progress"("userId", "storyLineId", "episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_orders_orderNo_key" ON "user_orders"("orderNo");

-- CreateIndex
CREATE INDEX "user_orders_userId_idx" ON "user_orders"("userId");

-- CreateIndex
CREATE INDEX "user_orders_userId_status_idx" ON "user_orders"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_inviteeId_key" ON "user_invitations"("inviteeId");

-- CreateIndex
CREATE INDEX "user_invitations_inviterId_idx" ON "user_invitations"("inviterId");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_userId_key" ON "user_stats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_definitions_code_key" ON "achievement_definitions"("code");

-- CreateIndex
CREATE INDEX "achievement_definitions_category_idx" ON "achievement_definitions"("category");

-- CreateIndex
CREATE INDEX "achievement_definitions_seriesCode_tier_idx" ON "achievement_definitions"("seriesCode", "tier");

-- CreateIndex
CREATE INDEX "achievement_definitions_seasonCode_idx" ON "achievement_definitions"("seasonCode");

-- CreateIndex
CREATE INDEX "user_achievement_notifications_userId_isRead_idx" ON "user_achievement_notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "user_levels_userId_key" ON "user_levels"("userId");

-- CreateIndex
CREATE INDEX "listening_materials_level_idx" ON "listening_materials"("level");

-- CreateIndex
CREATE INDEX "listening_materials_category_idx" ON "listening_materials"("category");

-- CreateIndex
CREATE INDEX "user_listening_progress_userId_idx" ON "user_listening_progress"("userId");

-- CreateIndex
CREATE INDEX "user_listening_progress_materialId_idx" ON "user_listening_progress"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "user_listening_progress_userId_materialId_mode_key" ON "user_listening_progress"("userId", "materialId", "mode");

-- CreateIndex
CREATE INDEX "user_exam_records_userId_idx" ON "user_exam_records"("userId");

-- CreateIndex
CREATE INDEX "user_exam_records_userId_examTypeId_idx" ON "user_exam_records"("userId", "examTypeId");

-- CreateIndex
CREATE INDEX "user_community_posts_userId_idx" ON "user_community_posts"("userId");

-- CreateIndex
CREATE INDEX "user_community_posts_type_idx" ON "user_community_posts"("type");

-- CreateIndex
CREATE INDEX "user_community_posts_createdAt_idx" ON "user_community_posts"("createdAt");

-- CreateIndex
CREATE INDEX "user_post_comments_postId_idx" ON "user_post_comments"("postId");

-- CreateIndex
CREATE INDEX "user_post_comments_userId_idx" ON "user_post_comments"("userId");

-- CreateIndex
CREATE INDEX "user_post_likes_postId_idx" ON "user_post_likes"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "user_post_likes_postId_userId_key" ON "user_post_likes"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_assistant_memories_userId_key" ON "user_assistant_memories"("userId");

-- CreateIndex
CREATE INDEX "user_assistant_messages_userId_createdAt_idx" ON "user_assistant_messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_notifications_userId_createdAt_idx" ON "user_notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_notifications_userId_isRead_idx" ON "user_notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "user_notifications_userId_type_createdAt_idx" ON "user_notifications"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "user_feedbacks_userId_idx" ON "user_feedbacks"("userId");

-- CreateIndex
CREATE INDEX "user_feedbacks_status_idx" ON "user_feedbacks"("status");

-- CreateIndex
CREATE INDEX "user_feedbacks_type_idx" ON "user_feedbacks"("type");

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenges_date_key" ON "daily_challenges"("date");

-- CreateIndex
CREATE INDEX "user_daily_challenge_results_date_score_idx" ON "user_daily_challenge_results"("date", "score");

-- CreateIndex
CREATE INDEX "user_daily_challenge_results_userId_idx" ON "user_daily_challenge_results"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_challenge_results_userId_date_key" ON "user_daily_challenge_results"("userId", "date");

-- CreateIndex
CREATE INDEX "user_achievement_event_logs_userId_eventType_createdAt_idx" ON "user_achievement_event_logs"("userId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "user_achievement_event_logs_userId_eventDate_idx" ON "user_achievement_event_logs"("userId", "eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_code_key" ON "seasons"("code");

-- CreateIndex
CREATE INDEX "seasons_isActive_idx" ON "seasons"("isActive");

-- CreateIndex
CREATE INDEX "seasons_startDate_endDate_idx" ON "seasons"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "task_templates_code_key" ON "task_templates"("code");

-- CreateIndex
CREATE INDEX "task_templates_type_isActive_idx" ON "task_templates"("type", "isActive");

-- CreateIndex
CREATE INDEX "user_daily_tasks_userId_taskDate_idx" ON "user_daily_tasks"("userId", "taskDate");

-- CreateIndex
CREATE INDEX "user_daily_tasks_userId_type_taskDate_idx" ON "user_daily_tasks"("userId", "type", "taskDate");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_tasks_userId_templateCode_taskDate_key" ON "user_daily_tasks"("userId", "templateCode", "taskDate");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_task_bonus_userId_taskDate_key" ON "user_daily_task_bonus"("userId", "taskDate");

-- CreateIndex
CREATE INDEX "user_badge_showcases_userId_idx" ON "user_badge_showcases"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_badge_showcases_userId_slotIndex_key" ON "user_badge_showcases"("userId", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "user_badge_showcases_userId_achievementId_key" ON "user_badge_showcases"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "user_achievement_shares_userId_idx" ON "user_achievement_shares"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "grammar_categories_code_key" ON "grammar_categories"("code");

-- CreateIndex
CREATE INDEX "grammar_categories_level_idx" ON "grammar_categories"("level");

-- CreateIndex
CREATE UNIQUE INDEX "grammar_points_code_key" ON "grammar_points"("code");

-- CreateIndex
CREATE INDEX "grammar_points_categoryId_idx" ON "grammar_points"("categoryId");

-- CreateIndex
CREATE INDEX "grammar_points_difficulty_idx" ON "grammar_points"("difficulty");

-- CreateIndex
CREATE INDEX "grammar_practices_pointId_idx" ON "grammar_practices"("pointId");

-- CreateIndex
CREATE INDEX "grammar_practices_pointId_type_idx" ON "grammar_practices"("pointId", "type");

-- CreateIndex
CREATE INDEX "grammar_practices_pointId_cognitiveLevel_idx" ON "grammar_practices"("pointId", "cognitiveLevel");

-- CreateIndex
CREATE INDEX "user_grammar_progress_userId_idx" ON "user_grammar_progress"("userId");

-- CreateIndex
CREATE INDEX "user_grammar_progress_userId_status_idx" ON "user_grammar_progress"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_grammar_progress_userId_pointId_key" ON "user_grammar_progress"("userId", "pointId");

-- CreateIndex
CREATE INDEX "user_phoneme_progress_userId_idx" ON "user_phoneme_progress"("userId");

-- CreateIndex
CREATE INDEX "user_phoneme_progress_userId_updatedAt_idx" ON "user_phoneme_progress"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_phoneme_progress_userId_phonemeSymbol_key" ON "user_phoneme_progress"("userId", "phonemeSymbol");

-- CreateIndex
CREATE INDEX "user_follows_followerId_idx" ON "user_follows"("followerId");

-- CreateIndex
CREATE INDEX "user_follows_followingId_idx" ON "user_follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_followerId_followingId_key" ON "user_follows"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "user_companion_threads_agnoSessionId_key" ON "user_companion_threads"("agnoSessionId");

-- CreateIndex
CREATE INDEX "user_companion_threads_userId_updatedAt_idx" ON "user_companion_threads"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_companion_threads_userId_characterId_key" ON "user_companion_threads"("userId", "characterId");

-- CreateIndex
CREATE INDEX "user_companion_memories_userId_characterId_idx" ON "user_companion_memories"("userId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "user_companion_memories_userId_characterId_category_key_key" ON "user_companion_memories"("userId", "characterId", "category", "key");

-- CreateIndex
CREATE INDEX "user_companion_mem0_messages_userId_characterId_createdAt_idx" ON "user_companion_mem0_messages"("userId", "characterId", "createdAt");

-- CreateIndex
CREATE INDEX "user_companion_mem0_messages_sessionId_idx" ON "user_companion_mem0_messages"("sessionId");

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_headwordId_fkey" FOREIGN KEY ("headwordId") REFERENCES "words"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_inflections" ADD CONSTRAINT "word_inflections_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_meanings" ADD CONSTRAINT "word_meanings_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_examples" ADD CONSTRAINT "word_examples_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_collocations" ADD CONSTRAINT "word_collocations_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_etymologies" ADD CONSTRAINT "word_etymologies_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_practices" ADD CONSTRAINT "word_practices_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_tags" ADD CONSTRAINT "word_tags_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_confusables" ADD CONSTRAINT "word_confusables_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_word_progress" ADD CONSTRAINT "user_word_progress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_words" ADD CONSTRAINT "user_favorite_words_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_difficult_words" ADD CONSTRAINT "user_difficult_words_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_chapters" ADD CONSTRAINT "story_chapters_storyLineId_fkey" FOREIGN KEY ("storyLineId") REFERENCES "story_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_episodes" ADD CONSTRAINT "story_episodes_storyLineId_fkey" FOREIGN KEY ("storyLineId") REFERENCES "story_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grammar_points" ADD CONSTRAINT "grammar_points_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "grammar_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grammar_practices" ADD CONSTRAINT "grammar_practices_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "grammar_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_grammar_progress" ADD CONSTRAINT "user_grammar_progress_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "grammar_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

