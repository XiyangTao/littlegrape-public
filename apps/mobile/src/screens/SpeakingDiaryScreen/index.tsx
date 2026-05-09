import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { STAR_GOLD } from '@/constants/colors';
import Icon, { IconNames } from '@/components/Icon';
import { useSpeakingDiary } from './useSpeakingDiary';
import { createStyles } from './styles';

export default function SpeakingDiaryScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const diary = useSpeakingDiary();

  if (diary.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={diary.goBack} style={styles.backButton}>
            <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{diary.t('diary.title')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={diary.goBack} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{diary.t('diary.title')}</Text>
        <View style={styles.backButton} />
      </View>

      {/* 标签页 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, diary.activeTab === 'today' && styles.tabActive]}
          onPress={() => diary.setActiveTab('today')}
        >
          <Text style={[styles.tabText, diary.activeTab === 'today' && styles.tabTextActive]}>
            {diary.t('diary.todayTab')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, diary.activeTab === 'history' && styles.tabActive]}
          onPress={() => diary.setActiveTab('history')}
        >
          <Text style={[styles.tabText, diary.activeTab === 'history' && styles.tabTextActive]}>
            {diary.t('diary.historyTab')}
          </Text>
        </TouchableOpacity>
      </View>

      {diary.activeTab === 'today' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 今日话题 */}
          <View style={styles.topicCard}>
            <View style={styles.topicHeader}>
              <Icon name="lightbulb" size={20} color={STAR_GOLD} />
              <Text style={styles.topicLabel}>{diary.t('diary.todayTopic')}</Text>
            </View>
            <Text style={styles.topicText}>{diary.topic?.topic}</Text>
            {diary.topic?.topicZh && (
              <Text style={styles.topicTextZh}>{diary.topic.topicZh}</Text>
            )}
          </View>

          {diary.todayDiary ? (
            /* 已提交 */
            <View style={styles.completedCard}>
              <Icon name={IconNames.checkCircle} size={32} color={theme.colors.success} />
              <Text style={styles.completedTitle}>{diary.t('diary.alreadyDone')}</Text>
              <View style={styles.diaryContent}>
                <Text style={styles.diaryLabel}>{diary.t('diary.yourAnswer')}</Text>
                <Text style={styles.diaryText}>{diary.todayDiary.userText}</Text>
                {diary.todayDiary.aiCorrection && (
                  <>
                    <Text style={styles.diaryLabel}>{diary.t('diary.aiCorrection')}</Text>
                    <Text style={styles.aiText}>{diary.todayDiary.aiCorrection}</Text>
                  </>
                )}
                {diary.todayDiary.aiSuggestion && (
                  <>
                    <Text style={styles.diaryLabel}>{diary.t('diary.aiSuggestion')}</Text>
                    <Text style={styles.aiText}>{diary.todayDiary.aiSuggestion}</Text>
                  </>
                )}
                {diary.todayDiary.aiScore !== null && (
                  <View style={styles.scoreRow}>
                    <Text style={styles.diaryLabel}>{diary.t('diary.score')}</Text>
                    <Text style={styles.scoreValue}>{diary.todayDiary.aiScore}/10</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* 未提交 - 输入区域 */
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{diary.t('diary.inputHint')}</Text>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder={diary.t('diary.inputPlaceholder')}
                placeholderTextColor={theme.colors.text.disabled}
                value={diary.userText}
                onChangeText={diary.setUserText}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {diary.userText.length} {diary.t('diary.characters')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!diary.userText.trim() || diary.isSubmitting) && styles.submitButtonDisabled,
                ]}
                onPress={diary.handleSubmit}
                disabled={!diary.userText.trim() || diary.isSubmitting}
              >
                {diary.isSubmitting ? (
                  <ActivityIndicator color={theme.colors.text.inverse} />
                ) : (
                  <Text style={styles.submitButtonText}>{diary.t('diary.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* 历史标签 */
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {diary.diaries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="book" size={48} color={theme.colors.text.disabled} />
              <Text style={styles.emptyText}>{diary.t('diary.noHistory')}</Text>
            </View>
          ) : (
            diary.diaries.map((entry) => (
              <View key={entry.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>{entry.eventDate}</Text>
                  {entry.aiScore !== null && (
                    <View style={styles.historyScore}>
                      <Icon name="star" size={14} color={STAR_GOLD} />
                      <Text style={styles.historyScoreText}>{entry.aiScore}/10</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.historyTopic} numberOfLines={1}>
                  {diary.locale === 'zh-CN' && entry.topicZh ? entry.topicZh : entry.topic}
                </Text>
                <Text style={styles.historyText} numberOfLines={2}>
                  {entry.userText}
                </Text>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
