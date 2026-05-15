import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Button from './Button';

const EmptyState = ({
  icon = 'file-tray-outline',
  title = 'Aucun élément',
  message,
  actionLabel,
  onAction,
  style = {},
  iconColor = colors.textDisabled,
  iconSize = 64,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {message && (
        <Text style={styles.message}>{message}</Text>
      )}

      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="md"
          style={styles.button}
          fullWidth={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 300,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 32,
  },
});

export default EmptyState;
