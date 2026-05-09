/**
 * 情景学习模式 — 核心播放页
 * 类聊天界面，Step 逐步推进
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme } from '@/context/ThemeProvider';
import { useRoute, RouteProp } from '@react-navigation/native';
import { createStyles } from './styles';
import { useScenarioPlay } from './useScenarioPlay';
import type {
  ScenarioStep,
  NarrationStep,
  DialogueStep,
  IllustrationStep,
  ChoiceStep,
  ReadAloudStep,
  ConversationStep,
  ListeningStep,
  StepResult,
  ScenarioScene,
} from '@/types/scenarioMode';
import type { Character } from '@/types/conversation';

type RouteParams = { ScenarioPlay: { chapterId: string } };

export default function ScenarioPlayScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const route = useRoute<RouteProp<RouteParams, 'ScenarioPlay'>>();
  const { chapterId } = route.params;

  const {
    chapter,
    visibleSteps,
    phase,
    stepResults,
    showTranslation,
    listeningRevealed,
    activeInteraction,
    isCurrentStepDone,
    isAllStepsVisible,
    scrollViewRef,
    tts,
    t,
    advanceStep,
    handleChoiceSelect,
    handleListeningSelect,
    handleReadAloudComplete,
    handleConversationComplete,
    toggleTranslation,
    handlePlayTTS,
    handleBack,
    calculateScore,
    getSceneTransition,
    getCharacterById,
  } = useScenarioPlay({ chapterId });

  if (!chapter) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.text.secondary }}>Chapter not found</Text>
      </View>
    );
  }

  // ==================== 总结页 ====================
  if (phase === 'summary') {
    const score = calculateScore();
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.summaryContainer}
      >
        <Text style={styles.summaryTitle}>{t('scenario.chapterComplete')}</Text>
        <Text style={styles.summaryChapterTitle}>{chapter.titleZh}</Text>

        {/* 星星 */}
        <View style={styles.summaryStarsRow}>
          {[1, 2, 3].map(star => (
            <MaterialIcons
              key={star}
              name="star"
              size={36}
              color={star <= score.stars ? '#FFD700' : theme.colors.border.light}
            />
          ))}
        </View>

        {/* 分数 */}
        <View style={styles.summaryScoreCard}>
          <View style={styles.summaryScoreRow}>
            <View style={styles.summaryScoreItem}>
              <Text style={styles.summaryScoreValue}>{score.comprehension}</Text>
              <Text style={styles.summaryScoreLabel}>{t('scenario.comprehension')}</Text>
            </View>
            <View style={styles.summaryScoreItem}>
              <Text style={styles.summaryScoreValue}>{score.expression}</Text>
              <Text style={styles.summaryScoreLabel}>{t('scenario.expression')}</Text>
            </View>
            <View style={styles.summaryScoreItem}>
              <Text style={styles.summaryScoreValue}>{score.pronunciation}</Text>
              <Text style={styles.summaryScoreLabel}>{t('scenario.pronunciation')}</Text>
            </View>
          </View>
        </View>

        {/* 重点短语 */}
        <View style={styles.summaryPhraseCard}>
          <Text style={styles.summaryPhraseTitle}>{t('scenario.keyPhrases')}</Text>
          {chapter.summary.keyPhrases.map((kp, i) => (
            <View key={i} style={styles.summaryPhraseItem}>
              <Text style={styles.summaryPhrase}>{kp.phrase}</Text>
              <Text style={styles.summaryPhraseTranslation}>{kp.translation}</Text>
              <Text style={styles.summaryPhraseExample}>{kp.example}</Text>
            </View>
          ))}
        </View>

        {/* 返回按钮 */}
        <TouchableOpacity style={styles.summaryBackButton} onPress={handleBack}>
          <Text style={styles.summaryBackButtonText}>{t('scenario.backToList')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ==================== 播放页 ====================
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chapter.titleZh}</Text>
          <Text style={styles.headerSubtitle}>
            {t('scenario.chapter')} {chapter.chapterNumber}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Step 列表 */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleSteps.map((item, index) => (
          <React.Fragment key={item.step.id}>
            {/* 场景切换标题 */}
            {renderSceneTransition(getSceneTransition(index), styles)}
            {/* Step 内容 */}
            {renderStep({
              step: item.step,
              styles,
              theme,
              stepResults,
              showTranslation,
              listeningRevealed,
              activeInteraction,
              tts,
              t,
              handleChoiceSelect,
              handleListeningSelect,
              handleReadAloudComplete,
              handleConversationComplete,
              toggleTranslation,
              handlePlayTTS,
              getCharacterById,
            })}
          </React.Fragment>
        ))}

        {/* 继续按钮 */}
        {isCurrentStepDone && (
          <TouchableOpacity style={styles.continueButton} onPress={advanceStep}>
            <Text style={styles.continueButtonText}>
              {isAllStepsVisible ? t('scenario.viewSummary') : t('scenario.continue')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ==================== 场景切换标题 ====================
function renderSceneTransition(scene: ScenarioScene | null, styles: any) {
  if (!scene) return null;
  return (
    <View style={styles.sceneCard}>
      <Text style={styles.sceneTitle}>{scene.title}</Text>
      <Text style={styles.sceneTitleZh}>{scene.titleZh}</Text>
    </View>
  );
}

// ==================== Step 分发渲染 ====================
interface RenderStepProps {
  step: ScenarioStep;
  styles: any;
  theme: any;
  stepResults: Record<string, StepResult>;
  showTranslation: Record<string, boolean>;
  listeningRevealed: Record<string, boolean>;
  activeInteraction: string | null;
  tts: any;
  t: (key: string) => string;
  handleChoiceSelect: (stepId: string, optionId: string, correctOptionId: string) => void;
  handleListeningSelect: (stepId: string, optionId: string, correctOptionId: string) => void;
  handleReadAloudComplete: (stepId: string, score?: number) => void;
  handleConversationComplete: (stepId: string, userInput: string, score?: number) => void;
  toggleTranslation: (stepId: string) => void;
  handlePlayTTS: (stepId: string, text: string, characterId?: string) => void;
  getCharacterById: (id: string) => Character | undefined;
}

type StepViewProps = Omit<RenderStepProps, 'step'>;

function renderStep(props: RenderStepProps) {
  const { step, ...rest } = props;
  switch (step.type) {
    case 'narration':
      return <NarrationStepView step={step} {...rest} />;
    case 'dialogue':
      return <DialogueStepView step={step} {...rest} />;
    case 'illustration':
      return <IllustrationStepView step={step} {...rest} />;
    case 'choice':
      return <ChoiceStepView step={step} {...rest} />;
    case 'read_aloud':
      return <ReadAloudStepView step={step} {...rest} />;
    case 'conversation':
      return <ConversationStepView step={step} {...rest} />;
    case 'listening':
      return <ListeningStepView step={step} {...rest} />;
    default:
      return null;
  }
}

// ==================== 旁白 ====================
function NarrationStepView({ step, styles, showTranslation, toggleTranslation }: StepViewProps & { step: NarrationStep }) {
  return (
    <TouchableOpacity
      style={styles.narrationContainer}
      onPress={() => toggleTranslation(step.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.narrationText}>{step.text}</Text>
      {showTranslation[step.id] && (
        <Text style={styles.translationText}>{step.translation}</Text>
      )}
    </TouchableOpacity>
  );
}

// ==================== 角色对话 ====================
function DialogueStepView({ step, styles, theme, showTranslation, toggleTranslation, handlePlayTTS, getCharacterById, tts }: StepViewProps & { step: DialogueStep }) {
  const character = getCharacterById(step.characterId);
  const isPlaying = tts.isPlaying && tts.currentMessageId === step.id;

  return (
    <View style={styles.dialogueContainer}>
      <View style={styles.dialogueAvatar}>
        {character?.avatar ? (
          <Image source={{ uri: character.avatar }} style={styles.dialogueAvatarImage} />
        ) : (
          <View style={[styles.dialogueAvatarImage, { backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
            <Text>{step.characterId[0].toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.dialogueBubbleContainer}>
        <Text style={styles.dialogueCharacterName}>{character?.name || step.characterId}</Text>
        <TouchableOpacity
          style={styles.dialogueBubble}
          onPress={() => toggleTranslation(step.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.dialogueText}>{step.text}</Text>
          {showTranslation[step.id] && (
            <Text style={styles.translationText}>{step.translation}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.dialogueActions}>
          <TouchableOpacity
            style={styles.dialogueActionButton}
            onPress={() => handlePlayTTS(step.id, step.text, step.characterId)}
          >
            <MaterialIcons
              name={isPlaying ? 'pause-circle-outline' : 'play-circle-outline'}
              size={20}
              color={theme.colors.text.tertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dialogueActionButton}
            onPress={() => toggleTranslation(step.id)}
          >
            <MaterialIcons
              name="translate"
              size={18}
              color={showTranslation[step.id] ? theme.colors.primary : theme.colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ==================== 插图 ====================
function IllustrationStepView({ step, styles }: StepViewProps & { step: IllustrationStep }) {
  return (
    <View style={styles.illustrationContainer}>
      <Image source={{ uri: step.image }} style={styles.illustrationImage} resizeMode="cover" />
      {step.caption && <Text style={styles.illustrationCaption}>{step.caption}</Text>}
    </View>
  );
}

// ==================== 选择题 ====================
function ChoiceStepView({ step, styles, stepResults, handleChoiceSelect }: StepViewProps & { step: ChoiceStep }) {
  const result = stepResults[step.id];
  const answered = !!result;

  return (
    <View style={styles.choiceContainer}>
      <Text style={styles.choicePrompt}>{step.prompt}</Text>
      <Text style={styles.choicePromptTranslation}>{step.promptTranslation}</Text>
      {step.options.map(option => {
        let optionStyle = styles.choiceOption;
        if (answered) {
          if (option.id === step.correctOptionId) {
            optionStyle = [styles.choiceOption, styles.choiceOptionCorrect];
          } else if (option.id === result.selectedOptionId && !result.correct) {
            optionStyle = [styles.choiceOption, styles.choiceOptionIncorrect];
          }
        }
        return (
          <TouchableOpacity
            key={option.id}
            style={optionStyle}
            onPress={() => !answered && handleChoiceSelect(step.id, option.id, step.correctOptionId)}
            activeOpacity={answered ? 1 : 0.7}
          >
            <Text style={styles.choiceOptionText}>{option.text}</Text>
          </TouchableOpacity>
        );
      })}
      {answered && (
        <View style={[styles.choiceFeedback, result.correct ? styles.choiceFeedbackCorrect : styles.choiceFeedbackIncorrect]}>
          <Text style={styles.choiceFeedbackText}>
            {result.correct ? step.feedback.correct : step.feedback.incorrect}
          </Text>
          <Text style={styles.choiceFeedbackTranslation}>
            {result.correct ? step.feedback.correctTranslation : step.feedback.incorrectTranslation}
          </Text>
        </View>
      )}
    </View>
  );
}

// ==================== 跟读 ====================
function ReadAloudStepView({ step, styles, theme, stepResults, handleReadAloudComplete, handlePlayTTS, t }: StepViewProps & { step: ReadAloudStep }) {
  const result = stepResults[step.id];
  const done = !!result;

  return (
    <View style={styles.readAloudContainer}>
      <View style={styles.readAloudCard}>
        <Text style={styles.readAloudLabel}>{t('scenario.readAloud')}</Text>
        <Text style={styles.readAloudText}>{step.text}</Text>
        <Text style={styles.translationText}>{step.translation}</Text>
        {!done ? (
          <>
            <View style={styles.readAloudButtonRow}>
              <TouchableOpacity
                style={styles.readAloudListenButton}
                onPress={() => handlePlayTTS(step.id, step.text, step.characterId)}
              >
                <MaterialIcons name="volume-up" size={18} color={theme.colors.text.secondary} />
                <Text style={styles.readAloudButtonText}>{t('scenario.listen')}</Text>
              </TouchableOpacity>
              {/* MVP: 跳过跟读，直接完成 */}
              <TouchableOpacity
                style={styles.readAloudRecordButton}
                onPress={() => handleReadAloudComplete(step.id, 85)}
              >
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.readAloudButtonTextWhite}>{t('scenario.done')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.readAloudSkipButton}
              onPress={() => handleReadAloudComplete(step.id, 60)}
            >
              <Text style={styles.readAloudSkipText}>{t('scenario.skip')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.conversationDoneText}>{t('scenario.readAloudDone')}</Text>
        )}
      </View>
    </View>
  );
}

// ==================== 自由对话 ====================
function ConversationStepView({ step, styles, theme, stepResults, handleConversationComplete, t }: StepViewProps & { step: ConversationStep }) {
  const [input, setInput] = useState('');
  const [showHints, setShowHints] = useState(false);
  const result = stepResults[step.id];
  const done = !!result;

  const onSubmit = () => {
    if (input.trim().length === 0) return;
    // MVP: 直接给分，不调用 AI
    handleConversationComplete(step.id, input.trim(), 80);
  };

  return (
    <View style={styles.conversationContainer}>
      <View style={styles.conversationCard}>
        <Text style={styles.conversationGoalLabel}>{t('scenario.conversationGoal')}</Text>
        <Text style={styles.conversationGoalText}>{step.goal}</Text>
        <Text style={styles.conversationGoalZh}>{step.goalZh}</Text>

        {!done ? (
          <>
            <View style={styles.conversationInputRow}>
              <TextInput
                style={styles.conversationInput}
                placeholder={t('scenario.typeHere')}
                placeholderTextColor={theme.colors.text.disabled}
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity
                style={[styles.conversationSendButton, input.trim().length === 0 && styles.conversationSendButtonDisabled]}
                onPress={onSubmit}
                disabled={input.trim().length === 0}
              >
                <MaterialIcons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.conversationHintButton}
              onPress={() => setShowHints(!showHints)}
            >
              <Text style={styles.conversationHintText}>
                {showHints ? t('scenario.hideHints') : t('scenario.showHints')}
              </Text>
            </TouchableOpacity>

            {showHints && (
              <View style={styles.conversationHintContent}>
                {step.hints.map((hint, i) => (
                  <Text key={i} style={styles.conversationHintSentence}>
                    💡 {hint}
                  </Text>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.conversationDoneText}>{t('scenario.conversationDone')}</Text>
        )}
      </View>
    </View>
  );
}

// ==================== 听力判断 ====================
function ListeningStepView({ step, styles, theme, stepResults, listeningRevealed, handleListeningSelect, handlePlayTTS, getCharacterById, t }: StepViewProps & { step: ListeningStep }) {
  const character = getCharacterById(step.characterId);
  const result = stepResults[step.id];
  const answered = !!result;
  const revealed = listeningRevealed[step.id];

  return (
    <View>
      {/* 角色气泡 — 不显示文字 */}
      <View style={styles.dialogueContainer}>
        <View style={styles.dialogueAvatar}>
          {character?.avatar ? (
            <Image source={{ uri: character.avatar }} style={styles.dialogueAvatarImage} />
          ) : (
            <View style={[styles.dialogueAvatarImage, { backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
              <Text>{step.characterId[0].toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.dialogueBubbleContainer}>
          <Text style={styles.dialogueCharacterName}>{character?.name || step.characterId}</Text>
          <TouchableOpacity
            style={styles.listeningBubble}
            onPress={() => handlePlayTTS(step.id, step.audioText, step.characterId)}
            activeOpacity={0.7}
          >
            <View style={styles.listeningPlayButton}>
              <MaterialIcons name="volume-up" size={20} color="#FFFFFF" />
            </View>
            {!revealed ? (
              <Text style={styles.listeningHintText}>{t('scenario.tapToListen')}</Text>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={styles.dialogueText}>{step.audioText}</Text>
                <Text style={styles.translationText}>{step.audioTranslation}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 问题和选项 */}
      <View style={styles.choiceContainer}>
        <Text style={styles.choicePrompt}>{step.question}</Text>
        <Text style={styles.choicePromptTranslation}>{step.questionTranslation}</Text>
        {step.options.map(option => {
          let optionStyle = styles.choiceOption;
          if (answered) {
            if (option.id === step.correctOptionId) {
              optionStyle = [styles.choiceOption, styles.choiceOptionCorrect];
            } else if (option.id === result.selectedOptionId && !result.correct) {
              optionStyle = [styles.choiceOption, styles.choiceOptionIncorrect];
            }
          }
          return (
            <TouchableOpacity
              key={option.id}
              style={optionStyle}
              onPress={() => !answered && handleListeningSelect(step.id, option.id, step.correctOptionId)}
              activeOpacity={answered ? 1 : 0.7}
            >
              <Text style={styles.choiceOptionText}>{option.text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
