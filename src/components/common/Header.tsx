import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RightAction {
  icon: string;
  onPress: () => void;
  badge?: number;          // red dot with count
  color?: string;          // icon color override
  variant?: 'default' | 'filled'; // filled = colored background
}

interface HeaderProps {
  title: string;
  subtitle?: string;

  // Back button
  onBack?: () => void;

  // Single right icon (legacy API — still supported)
  rightIcon?: string;
  onRightPress?: () => void;

  // Rich right element (legacy API — still supported)
  rightAction?: React.ReactNode;

  // Multiple right actions (new API)
  rightActions?: RightAction[];

  // Styling
  backgroundColor?: string;
  titleColor?: string;
  accentColor?: string;    // draws a colored stripe at the bottom
  showBorder?: boolean;
  showShadow?: boolean;
  transparent?: boolean;

  // Title alignment ('center' | 'left')
  titleAlign?: 'center' | 'left';
}

// ─── Component ────────────────────────────────────────────────────────────────

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  rightAction,
  rightActions,
  backgroundColor = colors.surface,
  titleColor = colors.textPrimary,
  accentColor,
  showBorder = true,
  showShadow = false,
  transparent = false,
  titleAlign = 'center',
}) => {
  const insets = useSafeAreaInsets();

  const effectiveBg  = transparent ? 'transparent' : backgroundColor;
  const iconColor    = transparent ? colors.textInverse : titleColor;
  const isLeftTitle  = titleAlign === 'left';

  // Build the right-side elements
  // Priority: rightActions > rightAction > rightIcon
  const buildRightIcons = () => {
    if (rightActions && rightActions.length > 0) {
      return (
        <View style={styles.rightActions}>
          {rightActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.iconBtn,
                action.variant === 'filled' && {
                  backgroundColor: action.color || colors.primary,
                },
              ]}
              onPress={action.onPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={action.icon as any}
                size={20}
                color={
                  action.variant === 'filled'
                    ? colors.textInverse
                    : action.color || iconColor
                }
              />
              {action.badge != null && action.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (rightAction) {
      return <View style={styles.rightActions}>{rightAction}</View>;
    }
    if (rightIcon) {
      return (
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRightPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rightIcon as any} size={20} color={iconColor} />
          </TouchableOpacity>
        </View>
      );
    }
    return <View style={styles.rightPlaceholder} />;
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 2, backgroundColor: effectiveBg },
        transparent && styles.transparent,
        showBorder && !transparent && !showShadow && styles.border,
        showShadow && !transparent && styles.shadow,
      ]}
    >
      <StatusBar
        barStyle={
          transparent || backgroundColor === colors.primary
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={transparent ? 'transparent' : backgroundColor}
        translucent={transparent}
      />

      <View style={[styles.content, isLeftTitle && styles.contentLeft]}>

        {/* ── Back button ── */}
        {onBack ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.leftPlaceholder} />
        )}

        {/* ── Title ── */}
        <View style={[styles.titleWrap, isLeftTitle && styles.titleWrapLeft]}>
          <Text
            style={[
              styles.title,
              { color: transparent ? colors.textInverse : titleColor },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: transparent ? 'rgba(255,255,255,0.75)' : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* ── Right area ── */}
        {buildRightIcons()}
      </View>

      {/* ── Accent stripe ── */}
      {accentColor && (
        <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingBottom: 6,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  transparent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  shadow: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
    gap: 8,
  },
  contentLeft: {
    justifyContent: 'flex-start',
  },

  // Back button / left placeholder
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  leftPlaceholder: {
    width: 36,
  },

  // Title
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  titleWrapLeft: {
    alignItems: 'flex-start',
    marginLeft: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    fontWeight: '500',
  },

  // Right actions
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  rightPlaceholder: {
    width: 36,
  },

  // Badge on right icon
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textInverse,
  },

  // Accent stripe
  accentStripe: {
    height: 2,
    borderRadius: 2,
    marginTop: 5,
    marginHorizontal: 4,
  },
});

export default Header;
