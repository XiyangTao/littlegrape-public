import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useSessionPreparation } from './useSessionPreparation';
import LoadingAnimation from './LoadingAnimation';
import { createStyles } from './styles';

export default function ConversationLoadingScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const {
    config,
    currentMessageIndex,
    isComplete,
    loadingStage,
    errorInfo,
    scaleValue,
    spin,
    progressWidth,
    scenarioTitle,
    t,
  } = useSessionPreparation();

  // 如果 config 不存在，显示空白（会被 useEffect 处理跳转）
  if (!config) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <LoadingAnimation
          theme={theme}
          styles={styles}
          currentMessageIndex={currentMessageIndex}
          isComplete={isComplete}
          loadingStage={loadingStage}
          errorInfo={errorInfo}
          scaleValue={scaleValue}
          spin={spin}
          progressWidth={progressWidth}
          scenarioTitle={scenarioTitle}
          config={config}
          t={t}
        />
      </View>
    </SafeAreaView>
  );
}
