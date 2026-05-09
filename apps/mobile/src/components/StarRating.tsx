import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon, { IconNames } from './Icon';

interface StarRatingProps {
  /** 分数 1-10 */
  score: number;
  /** 星星大小 */
  size?: number;
  /** 星星颜色 */
  color?: string;
  /** 间距 */
  spacing?: number;
}

/**
 * 星星评分组件
 *
 * 将 1-10 分转换为 0.5-5 颗星显示
 * - 10分 = 5颗满星
 * - 9分 = 4.5颗星
 * - 8分 = 4颗星
 * - ...
 * - 1分 = 0.5颗星
 */
export const StarRating: React.FC<StarRatingProps> = ({
  score,
  size = 14,
  color,
  spacing = 1,
}) => {
  // 将 1-10 分转换为 0.5-5 星
  const stars = score / 2;
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 >= 0.5;

  return (
    <View style={[styles.container, { gap: spacing }]}>
      {/* 满星 */}
      {Array.from({ length: fullStars }).map((_, index) => (
        <Icon
          key={`full-${index}`}
          name={IconNames.star}
          size={size}
          color={color}
        />
      ))}
      {/* 半星 - 使用 starHalf 图标 */}
      {hasHalfStar && (
        <Icon
          name="star-half"
          size={size}
          color={color}
        />
      )}
      {/* 空星 */}
      {Array.from({ length: 5 - fullStars - (hasHalfStar ? 1 : 0) }).map((_, index) => (
        <Icon
          key={`empty-${index}`}
          name={IconNames.starBorder}
          size={size}
          color={color}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default StarRating;
