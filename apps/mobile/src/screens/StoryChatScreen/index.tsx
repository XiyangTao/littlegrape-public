import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/stores/AuthStore';
import useStoryPractice from './useStoryPractice';
import { CHARACTER_THEME_COLORS } from '@/data/storyMockData';
import StoryProgressBar from './components/StoryProgressBar';
import NarratorBubble from './components/NarratorBubble';
import DialogueBubble from './components/DialogueBubble';
import ConversationQuestion from './components/ConversationQuestion';
import ChoiceQuestion from './components/ChoiceQuestion';
import PronunciationQuestion from './components/PronunciationQuestion';
import ListeningQuestion from './components/ListeningQuestion';
import ReviewCard from './components/ReviewCard';
import type { ConversationEvaluation, DisplayItem, DialogueItem, NarratorItem } from '@/types/storyMode';

// 评估反馈卡片（可折叠，适用所有题型）
function EvaluationCard({ item, styles, theme }: { item: any; styles: any; theme: any }) {
  const [expanded, setExpanded] = useState(false);

  const isCorrect = item.correct !== false;

  // 根据题型计算颜色和标签
  let evalColor: string;
  let evalLabel: string;
  let defaultInfo = '';

  if (item.questionType === 'choice' || item.questionType === 'listening') {
    evalColor = isCorrect ? theme.colors.success : '#FF3B30';
    evalLabel = isCorrect ? '✅ Correct' : '❌ Incorrect';
    if (item.correctAnswer) {
      defaultInfo = '✔ ' + item.correctAnswer;
    }
  } else if (item.questionType === 'pronunciation') {
    // 朗读题 score 是 0-100
    evalColor = item.score >= 75 ? theme.colors.success : theme.colors.warning;
    evalLabel = item.score >= 90 ? '🎤 Excellent!' : item.score >= 75 ? '🎤 Good!' : item.score >= 60 ? '🎤 Not Bad!' : '🎤 Keep Going!';
  } else {
    // 对话题 score 是 1-10
    evalColor = item.score >= 7 ? theme.colors.success : theme.colors.warning;
    evalLabel = item.score >= 9 ? 'Excellent!' : item.score >= 7 ? 'Good!' : item.score >= 5 ? 'Not Bad!' : 'Keep Going!';
  }

  const hasDetails = item.feedback || (item.corrections?.length > 0);
  const canExpand = hasDetails;

  // 单词颜色
  const getWordColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return '#FF3B30';
  };

  return (
    <TouchableOpacity
      style={[styles.evalCard, { borderLeftColor: evalColor }]}
      onPress={() => canExpand && setExpanded(!expanded)}
      activeOpacity={canExpand ? 0.6 : 1}
    >
      <View style={styles.evalHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.evalLabel, { color: evalColor }]}>{evalLabel}</Text>
          {defaultInfo ? <Text style={styles.evalDefaultInfo}>{defaultInfo}</Text> : null}

        </View>
        {canExpand && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={theme.colors.text.tertiary}
          />
        )}
      </View>
      {expanded && (
        <>
          {item.feedback ? <Text style={styles.evalFeedback}>{item.feedback}</Text> : null}
          {item.corrections?.length > 0 && item.corrections.map((c: any, ci: number) => (
            <View key={ci} style={styles.evalCorrectionRow}>
              <Text style={styles.evalOriginal}>{c.original}</Text>
              <Ionicons name="arrow-forward" size={11} color={theme.colors.text.tertiary} />
              <Text style={styles.evalCorrected}>{c.corrected}</Text>
            </View>
          ))}
        </>
      )}
    </TouchableOpacity>
  );
}

// 标题栏（点击标题显示中文翻译，点击喇叭播放音频）
function TitleBar({ title, titleZh, onPlay, isPlaying, styles, theme }: {
  title: string; titleZh?: string; onPlay?: () => void; isPlaying?: boolean; styles: any; theme: any;
}) {
  const [showZh, setShowZh] = useState(false);

  return (
    <View style={styles.titleBar}>
      <TouchableOpacity onPress={onPlay} activeOpacity={0.6}>
        <Ionicons
          name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
          size={18}
          color={isPlaying ? theme.colors.primary : theme.colors.text.secondary}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.titleWrap}
        onPress={() => titleZh && setShowZh(!showZh)}
        activeOpacity={titleZh ? 0.6 : 1}
      >
        <Text style={styles.titleText}>{title}</Text>
        {showZh && titleZh ? (
          <Text style={styles.titleZhText}>{titleZh}</Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

// 题目提示气泡（choice/listening，点击显示翻译）
function QuestionPromptBubble({ icon, prompt, promptZh, styles, theme }: { icon: string; prompt: string; promptZh?: string; styles: any; theme: any }) {
  const [showZh, setShowZh] = useState(false);

  return (
    <TouchableOpacity
      style={styles.goalPrompt}
      onPress={() => promptZh && setShowZh(!showZh)}
      activeOpacity={promptZh ? 0.6 : 1}
    >
      <View style={styles.goalPromptHeader}>
        <Ionicons name={icon as any} size={14} color={theme.colors.primary} />
        <Text style={styles.goalPromptText}>{prompt}</Text>
      </View>
      {showZh && promptZh && (
        <Text style={styles.goalPromptZh}>{promptZh}</Text>
      )}
    </TouchableOpacity>
  );
}

// 对话题目标气泡（含可展开的 hint，点击显示翻译）
function ConversationGoalBubble({ goal, goalZh, hint, hintZh, styles, theme }: { goal: string; goalZh?: string; hint?: string; hintZh?: string; styles: any; theme: any }) {
  const [showHint, setShowHint] = useState(false);
  const [showZh, setShowZh] = useState(false);

  return (
    <View style={styles.goalPrompt}>
      {/* 目标文字（显示中文） */}
      <View style={styles.goalPromptHeader}>
        <Ionicons name="chatbubble-outline" size={14} color={theme.colors.primary} />
        <Text style={styles.goalPromptText}>{goalZh || goal}</Text>
      </View>

      {/* hint 切换按钮，始终可见 */}
      {hint && (
        <TouchableOpacity onPress={() => setShowHint(!showHint)} style={styles.hintToggleInline}>
          <Ionicons name={showHint ? 'bulb' : 'bulb-outline'} size={13} color={showHint ? theme.colors.warning : theme.colors.text.tertiary} />
          <Text style={[styles.hintToggleInlineText, showHint && { color: theme.colors.warning }]}>
            {showHint ? 'Hide hint' : 'Show hint'}
          </Text>
        </TouchableOpacity>
      )}

      {/* hint 内容 */}
      {hint && showHint && (
        <View style={styles.hintContentBox}>
          <Text style={styles.hintContentText}>{hint}</Text>
        </View>
      )}
    </View>
  );
}

export default function StoryChatScreen() {
  const { user } = useAuth();
  const {
    theme,
    t,
    characterId,
    episodeInfo,
    phase,
    error,
    episodeConfig,
    displayedItems,
    currentQuestion,
    answers,
    progressCurrent,
    totalItems,
    scrollViewRef,
    getCharacterName,
    getAvatarForCharacter,
    storyPlayer,
    inputText,
    setInputText,
    isVoiceMode,
    setIsVoiceMode,
    voiceInput,
    handleStart,
    handleBack,
    handleFinish,
    handleConversationSubmit,
    handleQuestionComplete,
    addUserDialogue,
    addEvaluationFeedback,
    addQuestionResult,
    handlePlayVoiceMessage,
    playingVoiceId,
    voicePlayer,
  } = useStoryPractice();

  const styles = createStyles(theme, CHARACTER_THEME_COLORS[characterId] || '#7C5CFC');

  // ==================== 加载中 ====================
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.transitionContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.transitionCenter}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== 回顾页 ====================
  if (phase === 'completed' && episodeConfig) {
    return (
      <SafeAreaView style={styles.container}>
        <ReviewCard
          title={episodeConfig.title}
          answers={answers}
          learningPoints={episodeConfig.learning_points}
          nextEpisodeHook={episodeConfig.next_episode_hook}
          characterName={getCharacterName(characterId)}
          onBack={handleBack}
          onPlayTTS={undefined}
          playingTTSId={undefined}
        />
      </SafeAreaView>
    );
  }

  // ==================== 剧情练习页 ====================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBackButton}>
          <Ionicons name="close" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerProgress}>
          <StoryProgressBar current={progressCurrent} total={totalItems} />
        </View>
      </View>

      {/* 标题 */}
      <TitleBar
        title={episodeConfig?.title || ''}
        titleZh={episodeConfig?.title_zh}
        onPlay={episodeConfig?.title_audio_url ? () => {
          storyPlayer.play(episodeConfig.title_audio_url!);
        } : undefined}
        isPlaying={
          storyPlayer.isPlaying && storyPlayer.currentUri === episodeConfig?.title_audio_url
        }
        styles={styles}
        theme={theme}
      />

      {/* 剧情流 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scriptScrollView}
        contentContainerStyle={styles.scriptContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {displayedItems.map((item, index) => {
          if (item.type === 'narrator') {
            const narratorItem = item as NarratorItem;
            return (
              <NarratorBubble
                key={`n-${index}`}
                text={narratorItem.text}
                translation={narratorItem.text_zh || narratorItem.translation}
                onPlayTTS={narratorItem.audioUrl ? () => {
                  storyPlayer.play(narratorItem.audioUrl!);
                } : undefined}
                isTTSPlaying={
                  storyPlayer.isPlaying && storyPlayer.currentUri === narratorItem.audioUrl
                }
              />
            );
          }
          if (item.type === 'dialogue') {
            const dialogueItem = item as DialogueItem;
            const isUser = dialogueItem.character === 'user';
            const itemKey = `d-${index}`;
            const hasVoice = isUser && dialogueItem.voiceUri;

            return (
              <DialogueBubble
                key={itemKey}
                character={dialogueItem.character}
                characterName={isUser ? 'You' : getCharacterName(dialogueItem.character)}
                line={dialogueItem.line}
                translation={dialogueItem.line_zh || dialogueItem.translation}
                avatarUrl={isUser ? (user?.avatar || undefined) : (getAvatarForCharacter(dialogueItem.character) || undefined)}
                isUser={isUser}
                onPlayTTS={!isUser && dialogueItem.audioUrl ? () => {
                  storyPlayer.play(dialogueItem.audioUrl!);
                } : undefined}
                isTTSPlaying={
                  !isUser && storyPlayer.isPlaying && storyPlayer.currentUri === dialogueItem.audioUrl
                }
                voiceUri={hasVoice ? dialogueItem.voiceUri : undefined}
                voiceDuration={hasVoice ? dialogueItem.voiceDuration : undefined}
                onPlayVoice={hasVoice ? () => handlePlayVoiceMessage(itemKey, dialogueItem.voiceUri!) : undefined}
                isVoicePlaying={hasVoice ? (playingVoiceId === itemKey && voicePlayer.isPlaying) : false}
                pronunciationWords={dialogueItem.pronunciationWords}
              />
            );
          }
          // evaluation — AI 评估反馈卡片（可折叠）
          if (item.type === 'evaluation') {
            return <EvaluationCard key={`eval-${index}`} item={item} styles={styles} theme={theme} />;
          }
          // question — 对话流中只显示目标提示
          if (item.type === 'question') {
            const qKey = `q-${index}`;
            // 对话型：显示目标提示
            if (item.question_type === 'conversation') {
              return (
                <ConversationGoalBubble key={qKey} goal={item.goal} goalZh={item.goal_zh} hint={item.hint} hintZh={item.hint_zh} styles={styles} theme={theme} />
              );
            }
            if (item.question_type === 'pronunciation') {
              return (
                <View key={qKey} style={styles.goalPrompt}>
                  <View style={styles.goalPromptHeader}>
                    <Ionicons name="mic-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.goalPromptText}>Read this sentence aloud</Text>
                  </View>
                  <Text style={styles.goalPromptSentence}>{item.sentence}</Text>
                </View>
              );
            }
            // 理解型（choice/listening）：显示题目标题
            if (item.question_type === 'choice') {
              return (
                <QuestionPromptBubble
                  key={qKey}
                  icon="help-circle-outline"
                  prompt={item.prompt}
                  promptZh={item.prompt_zh}
                  styles={styles}
                  theme={theme}
                />
              );
            }
            if (item.question_type === 'listening') {
              return (
                <QuestionPromptBubble
                  key={qKey}
                  icon="headset-outline"
                  prompt={item.prompt}
                  promptZh={item.prompt_zh}
                  styles={styles}
                  theme={theme}
                />
              );
            }
          }

          return null;
        })}

        {/* 故事结束按钮 */}
        {phase === 'finished' && (
          <View style={styles.finishedSection}>
            <Text style={styles.finishedEmoji}>🎉</Text>
            <Text style={styles.finishedTitle}>{t('story.complete')}</Text>
            <TouchableOpacity style={[styles.finishedButton, { backgroundColor: CHARACTER_THEME_COLORS[characterId] || '#7C5CFC' }]} onPress={handleFinish}>
              <Text style={styles.finishedButtonText}>{t('story.viewResults')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: currentQuestion ? 80 : 40 }} />
      </ScrollView>

      {/* 底部题目交互面板 */}
      {currentQuestion && currentQuestion.type === 'question' && (
        <View style={styles.questionPanel}>
          {currentQuestion.question_type === 'conversation' && (
            <ConversationQuestion
              goal={currentQuestion.goal}
              hint={currentQuestion.hint}
              onSubmit={handleConversationSubmit}
              onUserMessage={addUserDialogue}
              onEvaluated={(evaluation: ConversationEvaluation) => {
                addEvaluationFeedback(evaluation);
              }}
              onComplete={(evaluation: ConversationEvaluation, userText: string) => {
                handleQuestionComplete(evaluation.achieved, evaluation.score, userText);
              }}
            />
          )}

          {currentQuestion.question_type === 'choice' && (
            <ChoiceQuestion
              prompt={currentQuestion.prompt}
              options={currentQuestion.options}
              explanation={currentQuestion.explanation}
              onAnswer={(correct: boolean) => {
                const correctOption = currentQuestion.options.find((o: any) => o.correct);
                addQuestionResult({
                  questionType: 'choice',
                  correct,
                  correctAnswer: correctOption?.text,
                  explanation: currentQuestion.explanation,
                  explanationZh: currentQuestion.explanation_zh,
                });
                handleQuestionComplete(correct);
              }}
            />
          )}

          {currentQuestion.question_type === 'pronunciation' && (
            <PronunciationQuestion
              sentence={currentQuestion.sentence}
              onComplete={(score: number, words?: { word: string; accuracyScore: number }[]) => {
                addQuestionResult({
                  questionType: 'pronunciation',
                  score,
                  words,
                  sentence: currentQuestion.sentence,
                });
                handleQuestionComplete(score >= 60, score);
              }}
              onUserMessage={addUserDialogue}
            />
          )}

          {currentQuestion.question_type === 'listening' && (
            <ListeningQuestion
              prompt={currentQuestion.prompt}
              options={currentQuestion.options}
              onAnswer={(correct: boolean) => {
                const correctOption = currentQuestion.options.find((o: any) => o.correct);
                addQuestionResult({
                  questionType: 'listening',
                  correct,
                  correctAnswer: correctOption?.text,
                });
                handleQuestionComplete(correct);
              }}
            />
          )}
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme, themeColor: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },

    // ==================== 过渡屏 ====================
    transitionContent: {
      flex: 1,
      padding: theme.spacing.lg,
      justifyContent: 'space-between',
    },
    backButton: {
      alignSelf: 'flex-start',
      padding: theme.spacing.sm,
    },
    transitionCenter: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    episodeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColor,
      borderRadius: theme.spacing.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    episodeTagText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      color: '#FFFFFF',
    },
    episodeTagDifficulty: {
      fontSize: theme.typography.fontSize.xs,
      color: 'rgba(255,255,255,0.8)',
    },
    transitionTitle: {
      fontSize: theme.fontScale(28),
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    transitionNarrator: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: theme.typography.fontSize.base * 1.6,
      paddingHorizontal: theme.spacing.lg,
    },
    errorBox: {
      backgroundColor: '#FF3B3015',
      borderRadius: theme.spacing.borderRadius.sm,
      padding: theme.spacing.md,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: '#FF3B30',
    },
    startButton: {
      backgroundColor: themeColor,
      borderRadius: theme.spacing.borderRadius.base,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    startButtonDisabled: {
      opacity: 0.6,
    },
    startButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: '#FFFFFF',
    },

    // ==================== 剧情练习页 ====================
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    headerBackButton: {
      padding: theme.spacing.xs,
    },
    headerProgress: {
      flex: 1,
    },
    titleBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.light,
    },
    titleWrap: {
      alignItems: 'center',
    },
    titleZhText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
    titleText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    scriptScrollView: {
      flex: 1,
    },
    scriptContent: {
      paddingVertical: theme.spacing.md,
    },
    goalPrompt: {
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.primary + '10',
      borderRadius: theme.spacing.borderRadius.sm,
    },
    goalPromptHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    goalPromptText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    hintToggleInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
      paddingLeft: theme.spacing.sm + 14, // 对齐 icon 后的文字
    },
    hintToggleInlineText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
    hintInline: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
      paddingLeft: theme.spacing.sm + 14,
    },
    // ==================== 评估反馈卡片 ====================
    evalCard: {
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.xs,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background.primary,
      borderRadius: theme.spacing.borderRadius.sm,
      borderLeftWidth: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    evalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    evalLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    evalDefaultInfo: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.success,
      marginTop: 4,
    },
    evalPronunciationBlock: {
      marginTop: theme.spacing.xs,
    },
    evalSentenceOriginal: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginBottom: 4,
    },
    evalWordsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    evalWord: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      lineHeight: theme.typography.fontSize.base * 1.5,
    },
    evalFeedback: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      lineHeight: theme.typography.fontSize.xs * 1.5,
    },
    evalCorrectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
      flexWrap: 'wrap',
    },
    evalOriginal: {
      fontSize: theme.typography.fontSize.xs,
      color: '#FF3B30',
      textDecorationLine: 'line-through',
    },
    evalCorrected: {
      fontSize: theme.typography.fontSize.xs,
      color: '#34C759',
      fontWeight: theme.typography.fontWeight.medium,
    },

    // ==================== 故事结束 ====================
    finishedSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing['2xl'],
      gap: theme.spacing.md,
    },
    finishedEmoji: {
      fontSize: theme.fontScale(40),
    },
    finishedTitle: {
      fontSize: theme.fontScale(20),
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    finishedButton: {
      paddingHorizontal: theme.spacing['2xl'],
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.spacing.borderRadius.base,
    },
    finishedButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: '#FFFFFF',
    },

    hintContentBox: {
      marginTop: theme.spacing.xs,
      marginLeft: 14 + theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.warning + '10',
      borderRadius: theme.spacing.borderRadius.sm,
    },
    hintContentText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
    },
    hintContentZh: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
    goalPromptSentence: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
      marginTop: theme.spacing.xs,
      paddingLeft: 14 + theme.spacing.sm,
    },
    goalPromptZh: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: 4,
      paddingLeft: 14 + theme.spacing.sm,
    },
    questionPanel: {
      backgroundColor: theme.colors.background.primary,
      paddingBottom: theme.spacing.sm,
    },
  });
