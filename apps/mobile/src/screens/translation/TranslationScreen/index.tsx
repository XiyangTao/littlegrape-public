import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';
import SegmentedControl from '@/components/common/SegmentedControl';
import { VoiceRecordingModal } from '@/components/VoiceRecordingModal';
import { useI18n } from '@/context/I18nProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useTranslationState } from './useTranslationState';
import LanguageSelector from './LanguageSelector';
import TranslationHistory from './TranslationHistory';
import InputArea from './InputArea';
import SettingsModal from './SettingsModal';
import InterpretationView from './InterpretationView';
import { createStyles } from './styles';

export default function TranslationScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert, AlertComponent } = useCustomAlert();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  // 翻译状态
  const state = useTranslationState();

  // Tab 切换
  const [activeTab, setActiveTab] = useState(0);
  const [isInterpretationActive, setIsInterpretationActive] = useState(false);

  const TAB_SEGMENTS = [
    t('translation.tabTranslate'),
    t('translation.tabInterpretation'),
  ] as const;

  const handleTabChange = useCallback((index: number) => {
    if (isInterpretationActive && index !== 1) {
      alert(
        t('translation.tabSwitchWarningTitle'),
        t('translation.tabSwitchWarningMessage'),
      );
      return;
    }
    setActiveTab(index);
  }, [isInterpretationActive, t]);

  const isDisabled = state.isRecording || isInterpretationActive;

  // 同传进行中拦截返回
  const handleGoBack = useCallback(() => {
    if (isInterpretationActive) {
      alert(
        t('translation.tabSwitchWarningTitle'),
        t('translation.tabSwitchWarningMessage'),
      );
      return;
    }
    navigation.goBack();
  }, [isInterpretationActive, alert, t, navigation]);

  // 拦截系统返回手势/物理返回键
  useEffect(() => {
    if (!isInterpretationActive) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault();
      alert(
        t('translation.tabSwitchWarningTitle'),
        t('translation.tabSwitchWarningMessage'),
      );
    });
    return unsubscribe;
  }, [navigation, isInterpretationActive, alert, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior="padding" keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('translation.title')}</Text>
          <View style={styles.headerRight}>
            <LanguageSelector
              sourceLanguage={state.sourceLanguage}
              targetLanguage={state.targetLanguage}
              disabled={isDisabled}
              onSwitch={state.handleSwitchLanguage}
            />
            <TouchableOpacity style={styles.headerSettingsButton} onPress={state.openSettings}>
              <Icon name="settings" size={22} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab 切换 */}
        <SegmentedControl
          segments={TAB_SEGMENTS}
          activeIndex={activeTab}
          onChange={handleTabChange}
          theme={theme}
        />

        {/* Tab 内容 */}
        {activeTab === 0 ? (
          <>
            {/* 翻译 Tab */}
            <View style={styles.mainContent}>
              <TranslationHistory
                results={state.results}
                isVoiceMode={state.isVoiceMode}
                onPlayTTS={state.playHistoryTTS}
                playingVoiceId={state.playingVoiceId}
                playingTTSId={state.playingTTSId}
                onPlayVoice={state.handlePlayVoice}
              />
            </View>
            <InputArea
              isVoiceMode={state.isVoiceMode}
              isRecording={state.isRecording}
              inputText={state.inputText}
              sourceLanguage={state.sourceLanguage}
              voicePanResponder={state.voicePanResponder}
              onToggleVoiceMode={state.toggleVoiceMode}
              onChangeText={state.setInputText}
              onTextTranslate={state.handleTextTranslate}
            />
            <VoiceRecordingModal
              visible={state.showVoiceModal}
              durationShared={state.durationShared}
              isInCancelZone={state.isInCancelZone}
              isInitializing={state.isInitializing}
              volumeHistoryShared={state.volumeHistoryShared}
              onExitComplete={() => {}}
            />
          </>
        ) : (
          /* 同声传译 Tab */
          <InterpretationView
            theme={theme}
            sourceLanguage={state.sourceLanguage}
            targetLanguage={state.targetLanguage}
            onActiveChange={setIsInterpretationActive}
          />
        )}
      </KeyboardAvoidingView>

      {/* 设置弹窗 */}
      <SettingsModal
        visible={state.showSettingsModal}
        autoPlay={state.autoPlay}
        voiceZh={state.voiceZh}
        voiceEn={state.voiceEn}
        onClose={state.closeSettings}
        onSetAutoPlay={state.setAutoPlay}
        onSetVoiceZh={state.setVoiceZh}
        onSetVoiceEn={state.setVoiceEn}
      />
      {AlertComponent}
    </SafeAreaView>
  );
}
