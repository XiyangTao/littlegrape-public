/**
 * 高亮已学单词文本组件
 * 在 AI 对话和阅读页面中，高亮用户学过的单词
 * 点击高亮词显示迷你卡片，包含学习时间提示
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  TextStyle,
  StyleProp,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';

// ==================== 类型定义 ====================

export interface LearnedWord {
  wordId: string;
  word: string;
  learnedDaysAgo?: number;
}

export interface HighlightedTextProps {
  /** 需要渲染的文本 */
  text: string;
  /** 已学单词列表 */
  learnedWords: LearnedWord[];
  /** 文本样式 */
  style?: StyleProp<TextStyle>;
  /** 是否支持长按选择文本 */
  selectable?: boolean;
  /** 点击高亮词的回调 */
  onWordPress?: (word: LearnedWord) => void;
}

interface TextSegment {
  text: string;
  matchedWord: LearnedWord | null;
}

// ==================== 工具函数 ====================

/**
 * 清除单词周围的标点符号，提取纯单词
 */
function stripPunctuation(token: string): string {
  return token.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
}

/**
 * 检查 token 是否匹配已学单词（支持词形变化）
 * 例如 reluctantly 匹配 reluctant，dogs 匹配 dog
 */
function findMatchedWord(
  cleanWord: string,
  wordMap: Map<string, LearnedWord>
): LearnedWord | null {
  if (!cleanWord) return null;

  const lower = cleanWord.toLowerCase();

  // 1. 精确匹配
  const exact = wordMap.get(lower);
  if (exact) return exact;

  // 2. 词形变化匹配：检查已学单词是否是当前词的前缀（词根匹配）
  //    例如 reluctantly -> reluctant, running -> run
  for (const [learned, wordObj] of wordMap) {
    // 当前文本词以已学词开头，且已学词长度 >= 3（避免过短误匹配）
    if (learned.length >= 3 && lower.startsWith(learned)) {
      const suffix = lower.slice(learned.length);
      // 允许的后缀：常见英语词形变化
      if (/^(s|es|ed|ing|ly|er|est|ness|ment|tion|sion|able|ible|ful|less|ous|ive|al|ity|ize|ise)?$/.test(suffix)) {
        return wordObj;
      }
    }
    // 反向：已学词以当前文本词开头（如学了 reluctantly，文本中出现 reluctant）
    if (lower.length >= 3 && learned.startsWith(lower)) {
      const suffix = learned.slice(lower.length);
      if (/^(s|es|ed|ing|ly|er|est|ness|ment|tion|sion|able|ible|ful|less|ous|ive|al|ity|ize|ise)?$/.test(suffix)) {
        return wordObj;
      }
    }
  }

  return null;
}

/**
 * 将文本拆分为段（高亮 / 非高亮）
 */
function parseTextSegments(
  text: string,
  wordMap: Map<string, LearnedWord>
): TextSegment[] {
  // 按单词边界分割，保留所有字符（包括空格和标点）
  const tokens = text.split(/(\b)/);
  const segments: TextSegment[] = [];

  for (const token of tokens) {
    const cleanWord = stripPunctuation(token);
    const matched = findMatchedWord(cleanWord, wordMap);

    if (matched && cleanWord.length > 0) {
      // 处理前缀标点
      const prefixMatch = token.match(/^([^a-zA-Z]*)/);
      const suffixMatch = token.match(/([^a-zA-Z]*)$/);
      const prefix = prefixMatch ? prefixMatch[1] : '';
      const suffix = suffixMatch ? suffixMatch[1] : '';
      const wordPart = token.slice(prefix.length, token.length - (suffix.length || 0));

      if (prefix) {
        segments.push({ text: prefix, matchedWord: null });
      }
      if (wordPart) {
        segments.push({ text: wordPart, matchedWord: matched });
      }
      if (suffix) {
        segments.push({ text: suffix, matchedWord: null });
      }
    } else {
      segments.push({ text: token, matchedWord: null });
    }
  }

  // 合并相邻的非高亮段
  const merged: TextSegment[] = [];
  for (const seg of segments) {
    if (
      merged.length > 0 &&
      !seg.matchedWord &&
      !merged[merged.length - 1].matchedWord
    ) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}

// ==================== 迷你卡片组件 ====================

interface MiniCardProps {
  word: LearnedWord;
  visible: boolean;
  onDismiss: () => void;
}

const MiniCard: React.FC<MiniCardProps> = ({ word, visible, onDismiss }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      // 3 秒后自动消失
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, 3000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, onDismiss]);

  if (!visible) return null;

  const daysText =
    word.learnedDaysAgo !== undefined
      ? word.learnedDaysAgo === 0
        ? '今天学过'
        : `${word.learnedDaysAgo} 天前学过`
      : '已学过';

  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniCardWord}>{word.word}</Text>
      <Text style={styles.miniCardHint}>{daysText}</Text>
    </View>
  );
};

// ==================== 主组件 ====================

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  learnedWords,
  style,
  selectable = false,
  onWordPress,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [activeWord, setActiveWord] = useState<LearnedWord | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const wordRefs = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(
    new Map()
  );
  const containerRef = useRef<View>(null);

  // 将 learnedWords 转为 Map，O(1) 查找
  const wordMap = useMemo(() => {
    const map = new Map<string, LearnedWord>();
    for (const w of learnedWords) {
      map.set(w.word.toLowerCase(), w);
    }
    return map;
  }, [learnedWords]);

  // 解析文本段
  const segments = useMemo(() => parseTextSegments(text, wordMap), [text, wordMap]);

  // 点击高亮词
  const handleWordPress = useCallback(
    (word: LearnedWord, event: { nativeEvent: { locationX: number; locationY: number } }) => {
      // 如果已经在显示同一个词，则关闭
      if (activeWord?.wordId === word.wordId) {
        setActiveWord(null);
        return;
      }

      setActiveWord(word);
      onWordPress?.(word);
    },
    [activeWord, onWordPress]
  );

  // 关闭迷你卡片
  const handleDismiss = useCallback(() => {
    setActiveWord(null);
  }, []);

  // 记录高亮词的布局信息
  const handleWordLayout = useCallback(
    (wordId: string, event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      wordRefs.current.set(wordId, { x, y, width, height });

      // 如果当前正在展示这个词的卡片，更新位置
      if (activeWord?.wordId === wordId) {
        setCardPosition({
          top: y - 40,
          left: x,
        });
      }
    },
    [activeWord]
  );

  // 点击高亮词时使用已缓存的布局来定位卡片
  const handleHighlightPress = useCallback(
    (word: LearnedWord) => {
      if (activeWord?.wordId === word.wordId) {
        setActiveWord(null);
        return;
      }

      const layout = wordRefs.current.get(word.wordId);
      if (layout) {
        setCardPosition({
          top: layout.y - 40,
          left: layout.x,
        });
      }

      setActiveWord(word);
      onWordPress?.(word);
    },
    [activeWord, onWordPress]
  );

  return (
    <View ref={containerRef} style={styles.container}>
      {/* 迷你卡片 */}
      {activeWord && (
        <View
          style={[
            styles.miniCardContainer,
            { top: cardPosition.top, left: cardPosition.left },
          ]}
        >
          <MiniCard
            word={activeWord}
            visible={true}
            onDismiss={handleDismiss}
          />
        </View>
      )}

      {/* 文本内容 */}
      <Text style={style} selectable={selectable}>
        {segments.map((segment, index) => {
          if (segment.matchedWord) {
            return (
              <Text
                key={`${index}-${segment.text}`}
                style={styles.highlightedWord}
                onLayout={(e) => handleWordLayout(segment.matchedWord!.wordId, e)}
                onPress={() => handleHighlightPress(segment.matchedWord!)}
              >
                {segment.text}
              </Text>
            );
          }
          return (
            <Text key={`${index}-${segment.text}`}>
              {segment.text}
            </Text>
          );
        })}
      </Text>

      {/* 全局点击区域，用于关闭迷你卡片 */}
      {activeWord && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
        />
      )}
    </View>
  );
};

// ==================== 样式 ====================

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'relative',
    },
    highlightedWord: {
      color: theme.colors.primary,
      textDecorationLine: 'underline',
      textDecorationColor: theme.colors.primary,
    },
    miniCardContainer: {
      position: 'absolute',
      zIndex: 100,
    },
    miniCard: {
      backgroundColor: theme.colors.background.primary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
      minWidth: 80,
    },
    miniCardWord: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      marginBottom: 2,
    },
    miniCardHint: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
  });

export default HighlightedText;
