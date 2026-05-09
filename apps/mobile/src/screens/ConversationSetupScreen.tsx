/**
 * 对话设置主流程
 * 3步引导用户完成对话配置
 * 新流程：语言设置 -> 声音偏好 -> 模式选择
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ModeSelectionStep from '@/components/conversation/ModeSelectionStep';
import LanguageSettingsStep from '@/components/conversation/LanguageSettingsStep';
import VoicePreferencesStep from '@/components/conversation/VoicePreferencesStep';
import {
  ConversationMode,
  ConversationConfig,
  DifficultyLevel,
  EnglishVariant,
  ConversationStyle,
  FREE_CONVERSATION_SCENARIO_ID,
} from '@/types/conversation';

export default function ConversationSetupScreen() {
  const navigation = useNavigation();

  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<Partial<ConversationConfig>>({
    difficulty: 'cet4',
    englishVariant: 'american',
    conversationStyle: 'casual',
    enableTips: true,
  });

  const handleBack = () => {
    if (currentStep === 1) {
      navigation.goBack();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step 1: 语言设置
  const handleLanguageSettings = (settings: {
    difficulty: DifficultyLevel;
    variant: EnglishVariant;
    style: ConversationStyle;
  }) => {
    setConfig({
      ...config,
      difficulty: settings.difficulty,
      englishVariant: settings.variant,
      conversationStyle: settings.style,
    });
    setCurrentStep(2); // 进入声音偏好
  };

  // Step 2: 声音偏好
  const handleVoiceSettings = (voiceSettings: { voiceId: string; voiceName: string; voiceGender: 'male' | 'female'; enableTips: boolean }) => {
    setConfig({
      ...config,
      voiceId: voiceSettings.voiceId,
      voiceName: voiceSettings.voiceName,
      voiceGender: voiceSettings.voiceGender,
      enableTips: voiceSettings.enableTips,
    });
    setCurrentStep(3); // 进入模式选择
  };

  // Step 3: 模式选择（最后一步）- 导航到加载页面
  const handleModeSelection = (data: {
    mode: ConversationMode;
    scenarioType?: 'predefined' | 'custom';
    scenario?: any;
    aiRole?: string;
    scenarioDesc?: string;
  }) => {
    const finalConfig: ConversationConfig = {
      mode: data.mode,
      difficulty: config.difficulty!,
      englishVariant: config.englishVariant!,
      conversationStyle: config.conversationStyle!,
      enableTips: config.enableTips!,
      voiceId: config.voiceId!,
      voiceName: config.voiceName,
      voiceGender: config.voiceGender,
      scenarioType: data.mode === 'free' ? 'predefined' : data.scenarioType,
      selectedScenario: data.mode === 'free'
        ? { id: FREE_CONVERSATION_SCENARIO_ID } as any
        : data.scenario,
      customRole: data.aiRole,
      customScenario: data.scenarioDesc,
    };

    // 导航到加载页面，由加载页面完成 API 调用
    (navigation as any).replace('ConversationLoading', {
      config: finalConfig,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Step 1: 语言设置 */}
      {currentStep === 1 && (
        <LanguageSettingsStep
          initialSettings={{
            difficulty: config.difficulty!,
            variant: config.englishVariant!,
            style: config.conversationStyle!,
          }}
          onNext={handleLanguageSettings}
          onBack={handleBack}
        />
      )}

      {/* Step 2: 声音偏好 */}
      {currentStep === 2 && (
        <VoicePreferencesStep
          variant={config.englishVariant!}
          initialVoiceId={config.voiceId}
          initialEnableTips={config.enableTips!}
          onComplete={handleVoiceSettings}
          onBack={handleBack}
        />
      )}

      {/* Step 3: 模式选择 */}
      {currentStep === 3 && (
        <ModeSelectionStep onNext={handleModeSelection} onBack={handleBack} />
      )}
    </View>
  );
}
