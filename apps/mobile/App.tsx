import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StatusBar, Text, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 设置全局默认值，防止系统大字号破坏布局
if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
(Text as any).defaultProps.maxFontSizeMultiplier = 1.3;

if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.3;
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { navigationRef } from '@/navigation/navigationRef';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ThemeProvider } from '@/context/ThemeProvider';
import { I18nProvider } from '@/context/I18nProvider';
import { AuthProvider, useAuth } from '@/stores/AuthStore';
import { useTheme } from '@/context/ThemeProvider';
import { getDatabase } from '@/db/DatabaseManager';
import { buildAllRootIndexes } from '@/db/word';
import TabNavigator from '@/navigation/TabNavigator';
import LoginScreen from '@/screens/LoginScreen';
import AppSettingsScreen from '@/screens/AppSettingsScreen';
import ProfileEditScreen from '@/screens/ProfileEditScreen';
import ConversationChatScreen from '@/screens/ConversationChatScreen';
import ConversationSettingsScreen from '@/screens/ConversationSettingsScreen';
import CompanionChatScreen from '@/screens/CompanionChatScreen';
import ConversationSetupScreen from '@/screens/ConversationSetupScreen';
import ConversationLoadingScreen from '@/screens/ConversationLoadingScreen';
import ConversationListScreen from '@/screens/ConversationListScreen';
import PhonemePracticeScreen from '@/screens/PhonemePracticeScreen';
import AccountSecurityScreen from '@/screens/AccountSecurityScreen';
import BindPhoneScreen from '@/screens/BindPhoneScreen';
import SetPasswordScreen from '@/screens/SetPasswordScreen';
import HelpFeedbackScreen from '@/screens/HelpFeedbackScreen';
import StudyStatsScreen from '@/screens/StudyStatsScreen';
import {
  WordBookScreen,
  WordSearchScreen,
  LibrarySelectScreen,
  FavoriteWordsScreen,
  DifficultWordsScreen,
  VocabularyTestScreen,
  LevelSummaryScreen,
  LevelLearnScreen,
  LevelMapScreen,
  RootMapScreen,
  RootDetailScreen,
  SentenceChallengeScreen,
  PracticeScreen,
  LearnScreen,
} from '@/screens/words';
import { TranslationScreen, InterpretationRecordsScreen, InterpretationRecordDetailScreen } from '@/screens/translation';
import PlanSelectScreen from '@/screens/PlanSelectScreen';
import UsageDetailScreen from '@/screens/UsageDetailScreen';
import StoryListScreen from '@/screens/StoryListScreen';
import SpeakingDiaryScreen from '@/screens/SpeakingDiaryScreen';
import AchievementScreen from '@/screens/AchievementScreen';
import InviteScreen from '@/screens/InviteScreen';
import ListeningListScreen from '@/screens/ListeningListScreen';
import ListeningPracticeScreen from '@/screens/ListeningPracticeScreen';
import ReadingListScreen from '@/screens/ReadingListScreen';
import ReadingDetailScreen from '@/screens/ReadingDetailScreen';
import IntensiveReadingScreen from '@/screens/IntensiveReadingScreen';
import ClassicsHomeScreen from '@/screens/ClassicsHomeScreen';
import ClassicsBookshelfScreen from '@/screens/ClassicsBookshelfScreen';
import ClassicsBookDetailScreen from '@/screens/ClassicsBookDetailScreen';
import ClassicsReaderScreen from '@/screens/ClassicsReaderScreen';
import { CLASSICS } from '@/constants/classicsTheme';
import StoryDetailScreen from '@/screens/StoryDetailScreen';
import LeaderboardScreen from '@/screens/LeaderboardScreen';
import LearningPathScreen from '@/screens/LearningPathScreen';
import ExamListScreen from '@/screens/ExamListScreen';
import ExamPracticeScreen from '@/screens/ExamPracticeScreen';
import CommunityScreen from '@/screens/CommunityScreen';
import CommunityDetailScreen from '@/screens/CommunityDetailScreen';
import AssistantChatScreen from '@/screens/AssistantChatScreen';
import DailyChallengeScreen from '@/screens/DailyChallengeScreen';
import DailyTaskScreen from '@/screens/DailyTaskScreen';
import GrammarDetailScreen from '@/screens/grammar/GrammarDetailScreen';
import GrammarPracticeScreen from '@/screens/grammar/GrammarPracticeScreen';
import GrammarLessonScreen from '@/screens/grammar/GrammarLessonScreen';
import ExerciseHomeScreen from '@/screens/exercise/ExerciseHomeScreen';
import ExerciseSessionScreen from '@/screens/exercise/ExerciseSessionScreen';
import UserProfileScreen from '@/screens/UserProfileScreen';
import FollowListScreen from '@/screens/FollowListScreen';
import UserSearchScreen from '@/screens/UserSearchScreen';
import StoryChapterScreen from '@/screens/StoryChapterScreen';
import StoryChatScreen from '@/screens/StoryChatScreen';
import ScenarioPlayScreen from '@/screens/ScenarioPlayScreen';
import { SessionScope, useSession } from '@/session';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProfessionalSplashScreen } from '@/components/ProfessionalSplashScreen';
import { QuotaExceededModal } from '@/components/QuotaExceededModal';
import { TrialWelcomeModal } from '@/components/TrialWelcomeModal';
import { AchievementNotificationModal } from '@/components/AchievementNotificationModal';
import { GlobalToast } from '@/components/GlobalToast';
import { AssistantBubble } from '@/components/AssistantBubble';
import { setupQuotaAppStateListener, removeQuotaAppStateListener } from '@/session/interceptorBridge';
import { useVersionStore } from '@/stores/VersionStore';
import { UpdateModal } from '@/components/UpdateModal';
import { PermissionGuideModal } from '@/components/PermissionGuideModal';
import { initNotifications, restoreReminders } from '@/services/NotificationService';
import * as CarrierLoginService from '@/services/CarrierLoginService';
import '@/locales'; // 初始化i18n

const Stack = createStackNavigator();
const classicsScreenOptions = { cardStyle: { backgroundColor: CLASSICS.colors.paper } };

function AppContent() {
  // 登录态由 session 派生 —— SessionContainer 的存在性即真理之源，无中间状态
  const session = useSession();
  const isAuthenticated = session !== null;
  const { isCheckingAuthStatus } = useAuth();
  const { theme, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);

  // 初始化数据库 + 通知
  useEffect(() => {
    async function initApp() {
      console.log('[App] initApp 开始...');
      try {
        await getDatabase();
        console.log('[App] 数据库初始化成功');

        // 后台构建词根索引（不阻塞主流程）
        buildAllRootIndexes().catch(e => console.warn('[App] 词根索引构建失败:', e));

        initNotifications();
        restoreReminders().catch(e => console.warn('[App] 恢复提醒失败:', e));

        // 注：API 拦截器回调已在各 store 模块顶层注册（AchievementStore / QuotaStore / ToastStore），
        // 不在 useEffect 中注册，避免与启动期 checkAuthStatus 的请求产生时序竞态。

        // 一次性清理历史残留 AsyncStorage key（新设计已不依赖该 key）
        // SessionContainer 销毁机制天然实现跨用户隔离，自愈 key 不再需要
        AsyncStorage.removeItem('@assistant_last_user_id').catch(() => {});

        // 异步检查版本更新（不阻塞启动）
        useVersionStore.getState().checkVersion();

        // 预热 PNVS 一键登录（splash 阶段就开始向运营商网关取号，
        // 进 LoginScreen 时直接命中缓存，省 1-3 秒等候时间）
        CarrierLoginService.prefetch();

        setIsDbReady(true);
      } catch (error) {
        console.error('[App] Initialization failed:', error);
        // 即使失败也继续，让应用可以显示错误
        setIsDbReady(true);
      }
    }
    initApp();
  }, []);

  // 根据主题设置状态栏样式
  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    if (StatusBar.setBackgroundColor) {
      StatusBar.setBackgroundColor(theme.colors.background.primary, true);
    }
  }, [isDark, theme.colors.background.primary]);

  // 设置配额 AppState 监听
  useEffect(() => {
    if (isAuthenticated) {
      setupQuotaAppStateListener();
    }
    return () => removeQuotaAppStateListener();
  }, [isAuthenticated]);

  // 推送 WebSocket 长连接已移入 SessionContainer.pushChannel（不再需要 hook）

  // 显示自定义启动屏幕
  if (showSplash) {
    return (
      <ProfessionalSplashScreen
        onComplete={() => setShowSplash(false)}
        duration={3000}
      />
    );
  }

  // 应用启动时显示loading，避免闪烁
  if (isCheckingAuthStatus || !isDbReady) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.primary,
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // 未登录显示登录页面
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <UpdateModal />
        <GlobalToast />
      </>
    );
  }

  // 已登录显示Stack Navigator
  return (
    <>
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen
          name="AppSettings"
          component={AppSettingsScreen}
        />
        <Stack.Screen
          name="ProfileEdit"
          component={ProfileEditScreen}
        />
        <Stack.Screen
          name="ConversationList"
          component={ConversationListScreen}
        />
        <Stack.Screen
          name="ConversationSetup"
          component={ConversationSetupScreen}
        />
        <Stack.Screen
          name="ConversationLoading"
          component={ConversationLoadingScreen}
        />
        <Stack.Screen
          name="ConversationChat"
          component={ConversationChatScreen}
        />
        <Stack.Screen
          name="CompanionChat"
          component={CompanionChatScreen}
        />
        <Stack.Screen
          name="ConversationSettings"
          component={ConversationSettingsScreen}
        />
        <Stack.Screen
          name="PhonemePractice"
          component={PhonemePracticeScreen}
        />
        <Stack.Screen
          name="GrammarDetail"
          component={GrammarDetailScreen}
        />
        <Stack.Screen
          name="GrammarPractice"
          component={GrammarPracticeScreen}
        />
        <Stack.Screen
          name="GrammarLesson"
          component={GrammarLessonScreen}
        />
        <Stack.Screen
          name="WordBook"
          component={WordBookScreen}
        />
        <Stack.Screen
          name="WordSearch"
          component={WordSearchScreen}
        />
        <Stack.Screen
          name="LibrarySelect"
          component={LibrarySelectScreen}
        />
        <Stack.Screen
          name="FavoriteWords"
          component={FavoriteWordsScreen}
        />
        <Stack.Screen
          name="DifficultWords"
          component={DifficultWordsScreen}
        />
        <Stack.Screen
          name="AccountSecurity"
          component={AccountSecurityScreen}
        />
        <Stack.Screen
          name="BindPhone"
          component={BindPhoneScreen}
        />
        <Stack.Screen
          name="SetPassword"
          component={SetPasswordScreen}
        />
        <Stack.Screen
          name="HelpFeedback"
          component={HelpFeedbackScreen}
        />
        <Stack.Screen
          name="StudyStats"
          component={StudyStatsScreen}
        />
        <Stack.Screen
          name="VocabularyTest"
          component={VocabularyTestScreen}
        />
        <Stack.Screen
          name="Practice"
          component={PracticeScreen}
        />
        <Stack.Screen
          name="Learn"
          component={LearnScreen}
        />
        <Stack.Screen
          name="Translation"
          component={TranslationScreen}
          options={{ title: '实时翻译' }}
        />
        <Stack.Screen
          name="InterpretationRecords"
          component={InterpretationRecordsScreen}
        />
        <Stack.Screen
          name="InterpretationRecordDetail"
          component={InterpretationRecordDetailScreen}
        />
        <Stack.Screen
          name="PlanSelect"
          component={PlanSelectScreen}
        />
        <Stack.Screen
          name="UsageDetail"
          component={UsageDetailScreen}
        />
        <Stack.Screen
          name="StoryList"
          component={StoryListScreen}
        />
        <Stack.Screen
          name="StoryDetail"
          component={StoryDetailScreen}
        />
        <Stack.Screen
          name="SpeakingDiary"
          component={SpeakingDiaryScreen}
        />
        <Stack.Screen
          name="Achievement"
          component={AchievementScreen}
        />
        <Stack.Screen
          name="Invite"
          component={InviteScreen}
        />
        <Stack.Screen
          name="ListeningList"
          component={ListeningListScreen}
        />
        <Stack.Screen
          name="ListeningPractice"
          component={ListeningPracticeScreen}
        />
        <Stack.Screen
          name="ReadingList"
          component={ReadingListScreen}
        />
        <Stack.Screen
          name="ReadingDetail"
          component={ReadingDetailScreen}
        />
        <Stack.Screen
          name="IntensiveReading"
          component={IntensiveReadingScreen}
        />
        <Stack.Screen
          name="ClassicsHome"
          component={ClassicsHomeScreen}
          options={classicsScreenOptions}
        />
        <Stack.Screen
          name="ClassicsBookshelf"
          component={ClassicsBookshelfScreen}
          options={classicsScreenOptions}
        />
        <Stack.Screen
          name="ClassicsBookDetail"
          component={ClassicsBookDetailScreen}
          options={classicsScreenOptions}
        />
        <Stack.Screen
          name="ClassicsReader"
          component={ClassicsReaderScreen}
          options={classicsScreenOptions}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
        />
        <Stack.Screen
          name="LearningPath"
          component={LearningPathScreen}
        />
        <Stack.Screen
          name="ExamList"
          component={ExamListScreen}
        />
        <Stack.Screen
          name="ExamPractice"
          component={ExamPracticeScreen}
        />
        <Stack.Screen
          name="Community"
          component={CommunityScreen}
        />
        <Stack.Screen
          name="CommunityDetail"
          component={CommunityDetailScreen}
        />
        <Stack.Screen
          name="AssistantChat"
          component={AssistantChatScreen}
        />
        <Stack.Screen
          name="LevelSummary"
          component={LevelSummaryScreen}
        />
        <Stack.Screen
          name="LevelLearn"
          component={LevelLearnScreen}
        />
        <Stack.Screen
          name="LevelMap"
          component={LevelMapScreen}
        />
        <Stack.Screen
          name="RootMap"
          component={RootMapScreen}
        />
        <Stack.Screen
          name="RootDetail"
          component={RootDetailScreen}
        />
        <Stack.Screen
          name="SentenceChallenge"
          component={SentenceChallengeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DailyChallenge"
          component={DailyChallengeScreen}
        />
        <Stack.Screen
          name="DailyTask"
          component={DailyTaskScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ExerciseHome"
          component={ExerciseHomeScreen}
        />
        <Stack.Screen
          name="ExerciseSession"
          component={ExerciseSessionScreen}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FollowList"
          component={FollowListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UserSearch"
          component={UserSearchScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StoryChapter"
          component={StoryChapterScreen}
        />
        <Stack.Screen
          name="StoryChat"
          component={StoryChatScreen}
        />
        <Stack.Screen
          name="ScenarioPlay"
          component={ScenarioPlayScreen}
        />
      </Stack.Navigator>
      <QuotaExceededModal />
      <TrialWelcomeModal />
      <AchievementNotificationModal />
      {/* TODO: 学习助手功能暂时不做，下个版本再开启 */}
      {/* <AssistantBubble /> */}
      <UpdateModal />
    </NavigationContainer>
    <GlobalToast />
    <PermissionGuideModal />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <I18nProvider>
          <ThemeProvider>
            <ErrorBoundary>
              <SessionScope>
                <AuthProvider>
                  <AppContent />
                </AuthProvider>
              </SessionScope>
            </ErrorBoundary>
          </ThemeProvider>
        </I18nProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
