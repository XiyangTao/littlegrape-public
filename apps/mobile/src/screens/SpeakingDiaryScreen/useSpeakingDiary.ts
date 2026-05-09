import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '@/context/I18nProvider';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { apiClient } from '@/api';
import { getLocalDateString } from '@/utils/dateUtils';
import { getErrorMessage } from '@/utils/errorUtils';
import type { DailyTopic, DiaryEntry } from '@/api/modules/diary';

export type TabType = 'today' | 'history';

export function useSpeakingDiary() {
  const navigation = useNavigation<any>();
  const { t, effectiveLanguage: locale } = useI18n();
  const aiGate = useFeatureGate('aiChat');

  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [topic, setTopic] = useState<DailyTopic | null>(null);
  const [userText, setUserText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayDiary, setTodayDiary] = useState<DiaryEntry | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = getLocalDateString();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [topicRes, listRes] = await Promise.all([
        apiClient.getDailyTopic(),
        apiClient.getDiaryList(),
      ]);
      if (topicRes.success) setTopic(topicRes.data);
      if (listRes.success) {
        setDiaries(listRes.data);
        const todayEntry = listRes.data.find((d: DiaryEntry) => d.eventDate === today);
        if (todayEntry) setTodayDiary(todayEntry);
      }
    } catch (error) {
      console.error('加载日记数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!userText.trim() || !topic) return;
    if (!aiGate.guard()) return;

    try {
      setIsSubmitting(true);

      const diaryRes = await apiClient.createDiary({
        topic: topic.topic,
        topicZh: topic.topicZh,
        userText: userText.trim(),
        eventDate: today,
      });

      if (diaryRes.success) {
        setTodayDiary(diaryRes.data);
        setDiaries(prev => [diaryRes.data, ...prev]);
        Alert.alert(t('diary.submitted'), t('diary.submittedDesc'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error) || t('diary.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [userText, topic, today, t]);

  const goBack = () => navigation.goBack();

  return {
    t,
    locale,
    activeTab,
    setActiveTab,
    topic,
    userText,
    setUserText,
    isSubmitting,
    todayDiary,
    diaries,
    isLoading,
    handleSubmit,
    goBack,
  };
}
