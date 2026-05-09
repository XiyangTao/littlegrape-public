import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, LayoutChangeEvent } from 'react-native';
import Icon from '@/components/Icon';
import { PremiumBadge } from '@/components/PremiumBadge';
import { createStyles } from '../styles';
import { Theme } from '@/context/ThemeProvider';

import { useTTS } from '@/hooks/useTTS';
import { useLongPressSeek } from '@/hooks/useLongPressSeek';
import WordLookupCard from '@/components/WordLookupCard';

import type { ArticleParagraph, KeyWord, IntensiveArticle } from '@/api/modules/reading';
import type { LocalWord } from '@/types/word';

interface TTSState {
  isPlaying: boolean;
  isLoading: boolean;
  isFinished: boolean;
  currentMessageId: string | null;
  currentTime: number;
  duration: number;
}

interface ReadingStepProps {
  paragraphs: ArticleParagraph[];
  showTranslation: boolean;
  onToggleTranslation: () => void;
  onPlayFullAudio: () => void;
  onPlayExplanation: () => void;
  onTogglePlayPause: () => void;
  onStopAudio: () => void;
  onSeek: (seconds: number) => void;
  ttsState: TTSState;
  article: IntensiveArticle;
  keyVocabulary: KeyWord[];
  wordDetail: LocalWord | null;
  onWordPress: (word: string) => void;
  onDismissWordDetail: () => void;
  onNext: () => void;
  theme: Theme;
  t: (key: string) => string;
  /** 教师名（来自 characters store） */
  teacherName?: string;
  /** 教师角色描述（来自 characters store） */
  teacherRole?: string;
  /** 教师头像 URL */
  teacherAvatar?: string;
  /** TTS 声音 ID（= 角色 ID） */
  voice: string;
  /** 当前高亮的段落索引 */
  highlightParagraphIndex?: number | null;
  /** 当前高亮的英文句子 */
  highlightSentence?: string | null;
  /** 讲解按钮是否显示锁图标（免费用户） */
  showExplanationLock?: boolean;
}

/** 难度等级颜色 */
function getLevelColor(level: string, theme: Theme): string {
  switch (level) {
    case 'beginner': return theme.colors.success;
    case 'intermediate': return theme.colors.warning;
    case 'advanced': return theme.colors.error;
    default: return theme.colors.text.tertiary;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ReadingStep({
  paragraphs,
  showTranslation,
  onToggleTranslation,
  onPlayFullAudio,
  onPlayExplanation,
  onTogglePlayPause,
  onStopAudio,
  onSeek,
  ttsState,
  article,
  keyVocabulary,
  wordDetail,
  onWordPress,
  onDismissWordDetail,
  onNext,
  theme,
  t,
  teacherName,
  teacherRole,
  teacherAvatar,
  voice,
  highlightParagraphIndex,
  highlightSentence,
  showExplanationLock,
}: ReadingStepProps) {
  const styles = createStyles(theme);
  const wordTts = useTTS();
  const articleId = article.id;

  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  // 段落级：记录每个段落在 ScrollView 内容中的 Y 坐标
  const paragraphYRef = useRef<Record<number, number>>({});
  // 段落级：缓存 onTextLayout 的行布局数据（每行的字符范围和 Y 坐标）
  const paragraphLinesRef = useRef<Record<number, Array<{ charStart: number; charEnd: number; y: number }>>>({});

  // 高亮句子变化时，查缓存的行布局数据计算精确滚动位置
  useEffect(() => {
    if (highlightParagraphIndex == null || !highlightSentence || !scrollViewRef.current) return;

    const paraY = paragraphYRef.current[highlightParagraphIndex];
    if (paraY == null) return;

    const viewportH = scrollViewHeightRef.current;
    const contentH = contentHeightRef.current;
    if (viewportH <= 0) return;

    // 找到句子在段落文本中的起始位置
    const para = paragraphs.find(p => p.index === highlightParagraphIndex);
    if (!para) return;
    const sentenceStart = para.en.indexOf(highlightSentence);
    if (sentenceStart < 0) return;

    // 从缓存的行数据中找到句子所在行
    let lineY = 0;
    const lines = paragraphLinesRef.current[highlightParagraphIndex];
    if (lines) {
      for (const line of lines) {
        if (sentenceStart >= line.charStart && sentenceStart < line.charEnd) {
          lineY = line.y;
          break;
        }
      }
    }

    const targetY = paraY + lineY;

    // 目标：让高亮句子出现在视口上方 1/3 处
    const targetOffset = viewportH * 0.3;
    let scrollY = targetY - targetOffset;

    // 边缘情况：clamp 到合法滚动范围
    const maxScroll = Math.max(0, contentH - viewportH);
    scrollY = Math.max(0, Math.min(scrollY, maxScroll));

    scrollViewRef.current.scrollTo({ y: scrollY, animated: true });
  }, [highlightParagraphIndex, highlightSentence, paragraphs]);

  const onScrollViewLayout = useCallback((e: LayoutChangeEvent) => {
    scrollViewHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  const onContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeightRef.current = h;
  }, []);

  const seekBackward = useLongPressSeek(useCallback((s: number) => onSeek(-s), [onSeek]));
  const seekForward = useLongPressSeek(useCallback((s: number) => onSeek(s), [onSeek]));

  const handleWordTap = useCallback((token: string, key: string) => {
    // 纯标点/过短 token 直接忽略：不设高亮、不触发查词（避免孤立高亮）
    const cleaned = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (!cleaned || cleaned.length < 2) return;
    setHighlightKey(key);
    onWordPress(token);
  }, [onWordPress]);

  const handleDismissWord = useCallback(() => {
    setHighlightKey(null);
    onDismissWordDetail();
  }, [onDismissWordDetail]);

  const fullMessageId = `full_${articleId}`;
  const explanationMessageId = `explanation_${articleId}`;
  const isFullActive = ttsState.currentMessageId === fullMessageId;
  const isExplanationActive = ttsState.currentMessageId === explanationMessageId;
  const hasAudioSession = ttsState.currentMessageId !== null;

  // 元信息：来源 · 日期 · 分类 · 难度 · 词数
  const metaParts: string[] = [];
  if (article.source) metaParts.push(article.source);
  if (article.publishDate) metaParts.push(article.publishDate.replace(/-/g, '.'));
  const levelText = t(`intensiveReading.level${article.level.charAt(0).toUpperCase() + article.level.slice(1)}`);
  const categoryText = t(`intensiveReading.category${article.category.charAt(0).toUpperCase() + article.category.slice(1)}`);

  const hasTeacher = !!(teacherName && teacherRole);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContent}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
        onLayout={onScrollViewLayout}
        onContentSizeChange={onContentSizeChange}
      >
        {/* ===== 文章标题区 ===== */}
        <View style={styles.articleHero}>
          <Text style={styles.articleTitleEn}>
            {article.title.split(/(\s+)/).map((token, i) =>
              /^\s+$/.test(token)
                ? <Text key={i}>{token}</Text>
                : <Text
                    key={i}
                    style={highlightKey === `title-${i}` && styles.clickableWordHighlight}
                    onPress={() => handleWordTap(token, `title-${i}`)}
                  >
                    {token}
                  </Text>
            )}
          </Text>
          {article.titleZh && (
            <Text style={styles.articleTitleZh}>{article.titleZh}</Text>
          )}

          {/* 元信息单行：来源 · 日期 */}
          <Text style={styles.articleMetaLine} numberOfLines={1}>
            {metaParts.join('  ·  ')}
          </Text>

          {/* 标签行 */}
          <View style={styles.articleTags}>
            <View style={styles.articleTag}>
              <Text style={styles.articleTagText}>{categoryText}</Text>
            </View>
            <View style={[styles.articleTag, { backgroundColor: getLevelColor(article.level, theme) + '12' }]}>
              <Text style={[styles.articleTagText, { color: getLevelColor(article.level, theme) }]}>{levelText}</Text>
            </View>
            <View style={styles.articleTag}>
              <Text style={styles.articleTagText}>{article.wordCount} {t('intensiveReading.words')}</Text>
            </View>
            {hasTeacher && (
              <>
                <View style={[styles.articleTag, styles.articleTagTeacher]}>
                  <Text style={[styles.articleTagText, { color: theme.colors.primary }]}>
                    {teacherName} · {teacherRole}
                  </Text>
                </View>
                {teacherAvatar ? (
                  <Image source={{ uri: teacherAvatar }} style={styles.teacherAvatar} />
                ) : null}
              </>
            )}
          </View>
        </View>

        {/* ===== 工具栏（三个等宽按钮） ===== */}
        <View style={styles.readingActions}>
          <TouchableOpacity
            style={[styles.actionButton, isFullActive && styles.actionButtonActive]}
            onPress={onPlayFullAudio}
            activeOpacity={0.7}
          >
            {isFullActive && ttsState.isLoading ? (
              <ActivityIndicator size={14} color={theme.colors.primary} />
            ) : (
              <Icon
                name={isFullActive ? 'volume-up' : 'headphones'}
                size={16}
                color={isFullActive ? theme.colors.primary : theme.colors.text.tertiary}
              />
            )}
            <Text style={[styles.actionButtonText, isFullActive && styles.actionButtonTextActive]}>
              {t('intensiveReading.playArticle')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, isExplanationActive && styles.actionButtonActive]}
            onPress={onPlayExplanation}
            activeOpacity={0.7}
          >
            {isExplanationActive && ttsState.isLoading ? (
              <ActivityIndicator size={14} color={theme.colors.primary} />
            ) : (
              <Icon
                name={isExplanationActive ? 'volume-up' : 'school'}
                size={16}
                color={isExplanationActive ? theme.colors.primary : theme.colors.text.tertiary}
              />
            )}
            <Text style={[styles.actionButtonText, isExplanationActive && styles.actionButtonTextActive]}>
              {t('intensiveReading.listenExplanation')}
            </Text>
            {showExplanationLock && (
              <View style={{ position: 'absolute', top: -2, right: -2 }}>
                <PremiumBadge size="xs" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, showTranslation && styles.actionButtonActive]}
            onPress={onToggleTranslation}
            activeOpacity={0.7}
          >
            <Icon
              name={showTranslation ? 'visibility' : 'visibility-off'}
              size={16}
              color={showTranslation ? theme.colors.primary : theme.colors.text.tertiary}
            />
            <Text style={[styles.actionButtonText, showTranslation && styles.actionButtonTextActive]}>
              {t('intensiveReading.showTranslation')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ===== 段落 ===== */}
        {paragraphs.map((para) => {
          // 判断当前段落是否有句子级高亮
          const isThisPara = highlightParagraphIndex === para.index;
          const sentenceStart = isThisPara && highlightSentence ? para.en.indexOf(highlightSentence) : -1;
          const sentenceEnd = sentenceStart >= 0 ? sentenceStart + highlightSentence!.length : -1;

          // 渲染词级文本，支持句子高亮背景 + 词级点击
          const renderTokens = (text: string, baseKey: string, isHighlighted: boolean) =>
            text.split(/(\s+)/).map((token, i) =>
              /^\s+$/.test(token)
                ? <Text key={`${baseKey}-${i}`} style={isHighlighted ? styles.sentenceHighlight : undefined}>{token}</Text>
                : <Text
                    key={`${baseKey}-${i}`}
                    style={[
                      styles.clickableWord,
                      isHighlighted && styles.sentenceHighlight,
                      highlightKey === `${baseKey}-${i}` && styles.clickableWordHighlight,
                    ]}
                    onPress={() => handleWordTap(token, `${baseKey}-${i}`)}
                  >
                    {token}
                  </Text>
            );

          return (
            <View
              key={para.index}
              style={styles.paragraphCard}
              onLayout={(e) => { paragraphYRef.current[para.index] = e.nativeEvent.layout.y; }}
            >
              <Text
                style={styles.paragraphText}
                onTextLayout={(e) => {
                  // 缓存该段落的行布局数据，供 useEffect 查询句子所在行
                  const lines = e.nativeEvent.lines;
                  let charCount = 0;
                  paragraphLinesRef.current[para.index] = lines.map((line) => {
                    const charStart = charCount;
                    charCount += line.text.length;
                    return { charStart, charEnd: charCount, y: line.y };
                  });
                }}
              >
                {sentenceStart >= 0 ? (
                  <>
                    {renderTokens(para.en.substring(0, sentenceStart), `${para.index}-pre`, false)}
                    {renderTokens(para.en.substring(sentenceStart, sentenceEnd), `${para.index}-hl`, true)}
                    {renderTokens(para.en.substring(sentenceEnd), `${para.index}-post`, false)}
                  </>
                ) : (
                  renderTokens(para.en, `${para.index}`, false)
                )}
              </Text>
              {showTranslation && para.zh && (
                <Text style={styles.paragraphTranslation}>
                  {para.zh}
                </Text>
              )}
            </View>
          );
        })}

        {/* ===== 核心生词 ===== */}
        {keyVocabulary.length > 0 && (
          <View style={styles.vocabSection}>
            <Text style={styles.vocabTitle}>{t('intensiveReading.coreVocabulary')}</Text>
            {keyVocabulary.map((word, i) => {
              const vocabId = `vocab_${i}`;
              const isVocabPlaying = wordTts.isPlaying && wordTts.currentMessageId === vocabId;
              return (
                <View key={i} style={[styles.vocabItem, i > 0 && styles.vocabItemBorder]}>
                  <View style={styles.vocabWordRow}>
                    <Text style={styles.vocabWord}>{word.word}</Text>
                    {word.audioUrl ? (
                      <TouchableOpacity
                        style={[styles.vocabPlayButton, isVocabPlaying && styles.vocabPlayButtonActive]}
                        onPress={() => isVocabPlaying ? wordTts.stop() : wordTts.playUrl(vocabId, word.audioUrl!)}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name={isVocabPlaying ? 'stop' : 'volume-up'}
                          size={14}
                          color={isVocabPlaying ? theme.colors.text.inverse : theme.colors.primary}
                        />
                      </TouchableOpacity>
                    ) : null}
                    <Text style={styles.vocabPhonetic}>{word.phonetic} {word.pos}</Text>
                  </View>
                  <Text style={styles.vocabMeaning}>{word.meaningCn}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ===== 底部区域 ===== */}
      <View style={styles.bottomBar}>
        {/* 迷你词卡 — 复用 WordLookupCard（default variant） */}
        {wordDetail && (
          <WordLookupCard word={wordDetail} onClose={handleDismissWord} />
        )}

        {/* 音频播放器（有会话时显示，替代进入练习按钮） */}
        {hasAudioSession ? (
          <View style={styles.playerCard}>
            {/* 进度条 + 时间 */}
            <View style={styles.playerTimeRow}>
              <Text style={styles.playerTimeText}>{formatTime(ttsState.currentTime)}</Text>
              <View style={styles.playerProgressTrack}>
                <View
                  style={[
                    styles.playerProgressFill,
                    { width: ttsState.duration > 0 ? `${(ttsState.currentTime / ttsState.duration) * 100}%` : '0%' },
                  ]}
                />
              </View>
              <Text style={styles.playerTimeText}>{formatTime(ttsState.duration)}</Text>
            </View>
            {/* 控件 */}
            <View style={styles.playerControls}>
              <TouchableOpacity
                onPressIn={seekBackward.onPressIn}
                onPressOut={seekBackward.onPressOut}
                activeOpacity={0.7}
                style={styles.playerBtn}
              >
                <Icon name="fast-rewind" size={20} color={theme.colors.text.secondary} />
                <Text style={styles.playerSeekLabel}>-5s</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onTogglePlayPause} activeOpacity={0.7} style={styles.playerPlayBtn}>
                {ttsState.isLoading ? (
                  <ActivityIndicator size={18} color={theme.colors.text.inverse} />
                ) : (
                  <Icon
                    name={ttsState.isPlaying ? 'pause' : 'play-arrow'}
                    size={24}
                    color={theme.colors.text.inverse}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPressIn={seekForward.onPressIn}
                onPressOut={seekForward.onPressOut}
                activeOpacity={0.7}
                style={styles.playerBtn}
              >
                <Icon name="fast-forward" size={20} color={theme.colors.text.secondary} />
                <Text style={styles.playerSeekLabel}>+5s</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.7}>
            <Text style={styles.nextButtonText}>{t('intensiveReading.startIntensive')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
