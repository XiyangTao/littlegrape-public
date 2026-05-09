import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import {
  formatDuration,
  getVocabularyLevelInfo,
  VOCABULARY_LEVELS,
  type VocabularyTestResult,
} from '@/services/VocabularyTestService';

interface ResultSectionProps {
  result: VocabularyTestResult;
  onRetry: () => void;
  onGoBack: () => void;
  styles: any;
}

const ResultSection = React.memo(({ result, onRetry, onGoBack, styles }: ResultSectionProps) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  const levelInfo = getVocabularyLevelInfo(result.estimatedVocabulary);

  return (
    <ScrollView
      style={styles.resultContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 主结果卡片 */}
      <View style={styles.resultCard}>
        {/* 词汇量区域 */}
        <View style={styles.vocabSection}>
          <Text style={styles.vocabLabel}>{t('vocabTest.yourVocabSize')}</Text>
          <Text style={styles.vocabValue}>
            {result.estimatedVocabulary >= 20000 ? t('vocabTest.vocabMax') : result.estimatedVocabulary.toLocaleString()}
          </Text>
          <Text style={styles.confidenceText}>
            {t('vocabTest.confidenceInterval', { lower: result.confidenceInterval.lower.toLocaleString(), upper: result.confidenceInterval.upper.toLocaleString() })}
          </Text>
        </View>

        {/* 分割线 */}
        <View style={styles.divider} />

        {/* 等级说明 */}
        <View style={styles.levelDescSection}>
          <Text style={styles.levelDescText}>{levelInfo.detail}</Text>
          {/* 进阶提示 */}
          {levelInfo.nextLevel && (
            <View style={styles.nextLevelHint}>
              <Icon name="trending-up" size={16} color={theme.colors.warning} />
              <Text style={styles.nextLevelText}>
                {t('vocabTest.nextLevelHint1')}<Text style={styles.nextLevelHighlight}>{(levelInfo.nextLevel.required - result.estimatedVocabulary).toLocaleString()}</Text>{t('vocabTest.nextLevelHint2')}<Text style={styles.nextLevelHighlight}>{levelInfo.nextLevel.name}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* 柱状图 */}
        <View style={styles.barChartContainer}>
          {/* 柱子区域 - 底部对齐 */}
          <View style={styles.barChartInner}>
            {VOCABULARY_LEVELS.map((level) => {
              const isCurrentLevel = levelInfo.level === level.level;
              const isPassed = result.estimatedVocabulary >= level.min;
              // 柱子高度与词汇量成比例，C2+ 当作 15K
              const maxVocab = 15000;
              const maxHeight = 60;
              const vocabValue = level.max === Infinity ? 15000 : level.max;
              const barHeight = Math.max(8, (vocabValue / maxVocab) * maxHeight);
              // 词汇量显示文本：只显示上限，C2+ 显示 "13k+"
              const vocabText = level.max === Infinity
                ? `${(level.min / 1000).toFixed(0)}k+`
                : `${(level.max / 1000).toFixed(1).replace('.0', '')}k`;

              return (
                <View key={level.level} style={styles.barColumn}>
                  {/* 词汇量（柱子上方） */}
                  <Text
                    style={[
                      styles.barVocab,
                      isCurrentLevel && styles.barVocabActive,
                    ]}
                  >
                    {vocabText}
                  </Text>
                  {/* 柱子 */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isCurrentLevel
                          ? theme.colors.primary
                          : isPassed
                            ? theme.colors.primary + '40'
                            : theme.colors.background.tertiary,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
          {/* 标签区域 - 等级和说明 */}
          <View style={styles.barLabelRow}>
            {VOCABULARY_LEVELS.map((level) => {
              const isCurrentLevel = levelInfo.level === level.level;
              // 完整说明文字（如"入门级·小学水平"）
              const fullDesc = level.description;

              return (
                <View key={level.level} style={styles.barLabelColumn}>
                  {/* 等级 */}
                  <Text
                    style={[
                      styles.barLabel,
                      isCurrentLevel && styles.barLabelActive,
                    ]}
                  >
                    {level.level}
                  </Text>
                  {/* 说明（竖排文字，单列） */}
                  <View style={styles.barDescContainer}>
                    {fullDesc.split('').map((char, i) => (
                      <Text
                        key={i}
                        style={[
                          styles.barDescChar,
                          isCurrentLevel && styles.barDescCharActive,
                        ]}
                      >
                        {char}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* 统计信息 */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>{t('vocabTest.statsTitle')}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{result.totalQuestions}</Text>
            <Text style={styles.statLabel}>{t('vocabTest.statQuestions')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{result.totalCorrect}</Text>
            <Text style={styles.statLabel}>{t('vocabTest.statKnown')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.round(result.accuracy * 100)}%
            </Text>
            <Text style={styles.statLabel}>{t('vocabTest.statAccuracy')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatDuration(result.testDuration)}
            </Text>
            <Text style={styles.statLabel}>{t('vocabTest.statDuration')}</Text>
          </View>
        </View>
      </View>

      {/* 操作按钮 */}
      <View style={styles.resultActions}>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Icon name="refresh" size={20} color={theme.colors.primary} />
          <Text style={styles.retryButtonText}>{t('vocabTest.retest')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={onGoBack}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>{t('vocabTest.done')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
});

export default ResultSection;
