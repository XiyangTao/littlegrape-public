/**
 * 可复制文本组件
 * 使用系统原生 selectable Text，支持自由选择文本
 */
import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface CopyableTextProps {
  /** 文本内容 */
  text: string;
  /** 文本样式 */
  style?: StyleProp<TextStyle>;
}

export const CopyableText: React.FC<CopyableTextProps> = ({
  text,
  style,
}) => {
  return (
    <Text style={style} selectable>
      {text}
    </Text>
  );
};

export default CopyableText;
