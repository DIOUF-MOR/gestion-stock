import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const LoadingSpinner = ({
  size = 'large',
  color = colors.primary,
  message,
  fullScreen = false,
  overlay = false,
  style = {},
}) => {
  if (overlay) {
    return (
      <View style={styles.overlay}>
        <View style={styles.overlayContent}>
          <ActivityIndicator size={size} color={color} />
          {message && <Text style={styles.overlayMessage}>{message}</Text>}
        </View>
      </View>
    );
  }

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, style]}>
        <ActivityIndicator size={size} color={color} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  overlayContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 160,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  overlayMessage: {
    marginTop: 16,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LoadingSpinner;
