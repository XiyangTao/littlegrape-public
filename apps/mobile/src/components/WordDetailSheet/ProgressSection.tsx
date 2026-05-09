/**
 * 学习进度区（预留）
 *
 * 当前进度状态已在 TagsSection 中以状态标签形式显示。
 * 后续如需展示更详细的学习进度信息（如复习次数、正确率等），
 * 可在此组件中扩展。
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import type { LocalProgress } from '@/types/word';
import { createStyles } from './styles';

interface ProgressSectionProps {
  progress?: LocalProgress | null;
  bottomInset: number;
}

export default function ProgressSection({
  progress,
  bottomInset,
}: ProgressSectionProps) {
  // 当前进度信息已在 TagsSection 中显示
  // 后续可在此扩展更详细的进度展示
  return null;
}
