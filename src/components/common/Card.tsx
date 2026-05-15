import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';

const Card = ({
  children,
  style = {},
  onPress,
  padding = 'md', // 'sm' | 'md' | 'lg' | 'none'
  elevation = 'md', // 'none' | 'sm' | 'md' | 'lg'
  borderRadius = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  borderColor,
  backgroundColor = colors.surface,
}) => {
  const paddingMap = {
    none: 0,
    sm: 12,
    md: 16,
    lg: 24,
  };

  const borderRadiusMap = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  };

  const elevationStyles = {
    none: {},
    sm: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  };

  const cardStyle = [
    styles.card,
    {
      padding: paddingMap[padding],
      borderRadius: borderRadiusMap[borderRadius],
      backgroundColor,
      ...elevationStyles[elevation],
    },
    borderColor && { borderWidth: 1, borderColor },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
});

export default Card;
