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

const Header = ({
  title,
  subtitle,
  onBack,
  rightAction,
  rightIcon,
  onRightPress,
  backgroundColor = colors.surface,
  titleColor = colors.textPrimary,
  showBorder = true,
  transparent = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
        transparent
          ? styles.transparent
          : { backgroundColor },
        showBorder && !transparent && styles.border,
      ]}
    >
      <StatusBar
        barStyle={transparent || backgroundColor === colors.primary ? 'light-content' : 'dark-content'}
        backgroundColor={transparent ? 'transparent' : backgroundColor}
      />

      <View style={styles.content}>
        {/* Left: Back button */}
        <View style={styles.leftSection}>
          {onBack && (
            <TouchableOpacity style={styles.iconButton} onPress={onBack}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={transparent ? colors.textInverse : titleColor}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Title */}
        <View style={styles.centerSection}>
          <Text
            style={[
              styles.title,
              {
                color: transparent ? colors.textInverse : titleColor,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  color: transparent
                    ? 'rgba(255,255,255,0.8)'
                    : colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right: Action */}
        <View style={styles.rightSection}>
          {rightAction ? (
            rightAction
          ) : rightIcon ? (
            <TouchableOpacity style={styles.iconButton} onPress={onRightPress}>
              <Ionicons
                name={rightIcon}
                size={24}
                color={transparent ? colors.textInverse : titleColor}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    paddingHorizontal: 8,
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftSection: {
    width: 48,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 48,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default Header;
