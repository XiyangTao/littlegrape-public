import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useScenarios } from '@/stores';
import Icon, { IconNames } from '@/components/Icon';
import SetupHeader from '../SetupHeader';
import ProgressIndicator from '../ProgressIndicator';
import { ConversationMode, PredefinedScenario, ScenarioType, ScenarioCategory } from '@/types/conversation';
import FreeModeCard from './FreeModeCard';
import ScenarioModeCard from './ScenarioModeCard';
import ScenarioSelector from './ScenarioSelector';
import { createStyles } from './styles';

interface ModeSelectionStepProps {
  onNext: (data: {
    mode: ConversationMode;
    scenarioType?: ScenarioType;
    scenario?: PredefinedScenario;
    aiRole?: string;
    scenarioDesc?: string;
  }) => void;
  onBack: () => void;
}

export default function ModeSelectionStep({ onNext, onBack }: ModeSelectionStepProps) {
  const { theme } = useTheme();
  const { t, effectiveLanguage } = useI18n();
  const { scenarios: allScenarios, isScenariosLoaded, getScenariosByCategory } = useScenarios();
  const styles = createStyles(theme);

  const [selectedMode, setSelectedMode] = useState<ConversationMode | null>(null);
  const [scenarioType, setScenarioType] = useState<ScenarioType>('predefined');
  const [selectedCategory, setSelectedCategory] = useState<ScenarioCategory>('travel');
  const [selectedScenario, setSelectedScenario] = useState<PredefinedScenario | null>(null);
  const [customRole, setCustomRole] = useState('');
  const [customScenario, setCustomScenario] = useState('');

  // 从全局 Context 获取场景列表，根据分类过滤
  const filteredScenarios = getScenariosByCategory(selectedCategory);
  const loading = !isScenariosLoaded;

  const handleModeSelect = (mode: ConversationMode) => {
    setSelectedMode(mode);
    // 不立即跳转，等待用户确认
  };

  const handleScenarioTypeChange = (type: ScenarioType) => {
    setScenarioType(type);
    setSelectedScenario(null);
  };

  const handleCategoryChange = (category: ScenarioCategory) => {
    setSelectedCategory(category);
    setSelectedScenario(null);
  };

  const handleNext = () => {
    if (selectedMode === 'free') {
      onNext({ mode: 'free' });
    } else if (selectedMode === 'scenario') {
      if (scenarioType === 'predefined') {
        if (!selectedScenario) return;
        onNext({
          mode: 'scenario',
          scenarioType: 'predefined',
          scenario: selectedScenario,
        });
      } else {
        if (!customRole.trim() || !customScenario.trim() || customScenario.length < 10) return;
        onNext({
          mode: 'scenario',
          scenarioType: 'custom',
          aiRole: customRole,
          scenarioDesc: customScenario,
        });
      }
    }
  };

  const canProceed = () => {
    if (selectedMode === 'free') {
      return true;
    }
    if (selectedMode === 'scenario') {
      if (scenarioType === 'predefined') {
        return !!selectedScenario;
      } else {
        return customRole.trim() && customScenario.trim() && customScenario.length >= 10;
      }
    }
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <SetupHeader title={t('conversation.setup.selectMode')} onBack={onBack} />
      <ProgressIndicator currentStep={3} totalSteps={3} />

      <KeyboardAwareScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={100}
      >
        {/* 模式选择卡片 */}
        <View style={styles.modeSection}>
          <FreeModeCard
            isSelected={selectedMode === 'free'}
            theme={theme}
            t={t}
            onPress={() => handleModeSelect('free')}
          />
          <ScenarioModeCard
            isSelected={selectedMode === 'scenario'}
            theme={theme}
            t={t}
            onPress={() => handleModeSelect('scenario')}
          />
        </View>

        {/* 场景选择区域（仅在选择场景模式时显示） */}
        {selectedMode === 'scenario' && (
          <ScenarioSelector
            theme={theme}
            t={t}
            effectiveLanguage={effectiveLanguage}
            scenarioType={scenarioType}
            selectedCategory={selectedCategory}
            selectedScenario={selectedScenario}
            customRole={customRole}
            customScenario={customScenario}
            filteredScenarios={filteredScenarios}
            loading={loading}
            onScenarioTypeChange={handleScenarioTypeChange}
            onCategoryChange={handleCategoryChange}
            onScenarioSelect={setSelectedScenario}
            onCustomRoleChange={setCustomRole}
            onCustomScenarioChange={setCustomScenario}
          />
        )}

        {/* 开始对话按钮 */}
        <View style={styles.nextButtonContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !canProceed() && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Icon name={IconNames.play} size={20} color={theme.colors.text.inverse} />
            <Text style={styles.nextButtonText}>{t('conversation.setup.start')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
