import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  AppState,
  Animated,
} from 'react-native';
import * as Updates from 'expo-updates';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';

export const UpdatePromptModal: React.FC = () => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const checkForAppUpdate = async () => {
    // Check for updates in production or preview builds
    if (__DEV__) {
      return;
    }

    try {
      const checkResult = await Updates.checkForUpdateAsync();
      if (checkResult.isAvailable) {
        showUpdateModal();
      }
    } catch {
      // Silent error: do not disrupt user if network or service fails
    }
  };

  const showUpdateModal = () => {
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    // Check for update on mount
    checkForAppUpdate();

    // Re-check when app comes to foreground from background
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkForAppUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleCancel = () => {
    // User selected cancel: exit the app as per requirement
    setModalVisible(false);
    BackHandler.exitApp();
  };

  const handleUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const fetchResult = await Updates.fetchUpdateAsync();
      if (fetchResult.isNew) {
        await Updates.reloadAsync();
      } else {
        await Updates.reloadAsync();
      }
    } catch (err: any) {
      setIsUpdating(false);
      setUpdateError('Update download fail ho gaya. Kripya dobara koshish karein.');
    }
  };

  if (!modalVisible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header Icon Badge */}
          <View style={styles.iconCircle}>
            <View style={styles.innerIconCircle}>
              <Feather name="download-cloud" size={32} color={Colors.primary} />
            </View>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>Naya Update Uplabdh Hai</Text>
          <Text style={styles.description}>
            Behtar anubhav, naye features aur fast delivery ke liye R2Cart ka naya version install karein.
          </Text>

          {updateError ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={Colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{updateError}</Text>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isUpdating}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
              onPress={handleUpdate}
              disabled={isUpdating}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.updateButtonText}>Updating...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Feather name="refresh-cw" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.updateButtonText}>Update Karein</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  innerIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    flex: 1,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  updateButton: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
