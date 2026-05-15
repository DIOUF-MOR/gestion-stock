import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  style = {},
  textStyle = {},
  fullWidth = true,
}) => {
  const getContainerStyle = () => {
    const base = [styles.base, styles[`size_${size}`]];

    if (fullWidth) base.push(styles.fullWidth);

    switch (variant) {
      case 'primary':
        base.push(styles.primary);
        break;
      case 'secondary':
        base.push(styles.secondary);
        break;
      case 'outline':
        base.push(styles.outline);
        break;
      case 'ghost':
        base.push(styles.ghost);
        break;
      case 'danger':
        base.push(styles.danger);
        break;
      default:
        base.push(styles.primary);
    }

    if (disabled || loading) base.push(styles.disabled);
    base.push(style);
    return base;
  };

  const getTextStyle = () => {
    const base = [styles.text, styles[`text_${size}`]];

    switch (variant) {
      case 'outline':
        base.push(styles.textOutline);
        break;
      case 'ghost':
        base.push(styles.textGhost);
        break;
      default:
        base.push(styles.textDefault);
    }

    base.push(textStyle);
    return base;
  };

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textInverse}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={getTextStyle()}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  // Sizes
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  size_lg: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 60,
  },
  // Variants
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondary: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabled: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  },
  // Text
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  textDefault: {
    color: colors.textInverse,
  },
  textOutline: {
    color: colors.primary,
  },
  textGhost: {
    color: colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;
