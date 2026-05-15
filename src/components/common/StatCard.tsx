import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Card from './Card';

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = colors.primary,
  iconBackground,
  trend,
  trendValue,
  color = colors.primary,
  style = {},
  onPress,
  size = 'md', // 'sm' | 'md' | 'lg'
}) => {
  const iconBg = iconBackground || `${iconColor}20`;

  const getTrendColor = () => {
    if (trend === 'up') return colors.success;
    if (trend === 'down') return colors.error;
    return colors.textSecondary;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return 'trending-up';
    if (trend === 'down') return 'trending-down';
    return 'remove';
  };

  return (
    <Card style={[styles.card, styles[`card_${size}`], style]} onPress={onPress}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={size === 'sm' ? 18 : 22} color={iconColor} />
        </View>
        {trend && trendValue !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor()}15` }]}>
            <Ionicons name={getTrendIcon()} size={12} color={getTrendColor()} />
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>

      {/* Value */}
      <Text
        style={[
          styles.value,
          styles[`value_${size}`],
          { color },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      {/* Title */}
      <Text style={[styles.title, styles[`title_${size}`]]} numberOfLines={1}>
        {title}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  card_sm: {
    padding: 12,
    minHeight: 100,
  },
  card_md: {
    padding: 16,
    minHeight: 120,
  },
  card_lg: {
    padding: 20,
    minHeight: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  value: {
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  value_sm: {
    fontSize: 20,
  },
  value_md: {
    fontSize: 24,
  },
  value_lg: {
    fontSize: 28,
  },
  title: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  title_sm: {
    fontSize: 12,
  },
  title_md: {
    fontSize: 13,
  },
  title_lg: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 4,
  },
});

export default StatCard;
