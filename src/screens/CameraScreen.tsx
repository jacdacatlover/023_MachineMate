// Camera screen: Capture a photo of a gym machine

import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types/navigation';
import { useMachines } from '../../App';
import { identifyMachine } from '../logic/identifyMachine';
import PrimaryButton from '../components/PrimaryButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type CameraScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Camera'>;

export default function CameraScreen() {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const machines = useMachines();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [mountKey, setMountKey] = useState(0);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Force fresh state when screen gains focus to fix stale permission handler
  useFocusEffect(
    React.useCallback(() => {
      setMountKey(prev => prev + 1);
    }, [])
  );

  // Handle permission not granted
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleRequestPermission = async () => {
    try {
      setIsRequestingPermission(true);
      await requestPermission();
    } catch (error) {
      Alert.alert(
        'Permission Error',
        'We could not request camera access. Please try again.'
      );
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const openSystemSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        'Unable to Open Settings',
        'Please open the system Settings app and enable camera access for MachineMate.'
      );
    });
  };

  if (!permission.granted) {
    const isPermanentlyDenied = permission.status === 'denied' && !permission.canAskAgain;

    return (
      <View key={mountKey} style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#666" />
        <Text variant="titleLarge" style={styles.permissionTitle}>
          Camera Permission Required
        </Text>
        <Text variant="bodyMedium" style={styles.permissionText}>
          MachineMate needs camera access to identify gym machines.
        </Text>
        {isPermanentlyDenied ? (
          <>
            <Text variant="bodyMedium" style={styles.permissionText}>
              It looks like camera access is blocked. You can enable it from your device settings.
            </Text>
            <PrimaryButton
              label="Open Settings"
              icon="cog"
              onPress={openSystemSettings}
            />
          </>
        ) : (
          <PrimaryButton
            label="Grant Permission"
            icon="camera"
            onPress={handleRequestPermission}
            loading={isRequestingPermission}
            disabled={isRequestingPermission}
          />
        )}
        <PrimaryButton
          label="Go Back"
          mode="outlined"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);

      // Capture the photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });

      if (!photo) {
        setIsProcessing(false);
        return;
      }

      // Identify the machine (stub logic)
      const result = await identifyMachine(photo.uri, machines);

      // Navigate to result screen
      navigation.replace('MachineResult', {
        photoUri: photo.uri,
        primaryMachineId: result.primary.id,
        candidateIds: result.candidates.map(c => c.id),
        confidence: result.confidence,
        lowConfidence: result.lowConfidence,
        source: result.source,
      });
    } catch (error) {
      console.error('Error capturing photo:', error);
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.overlay}>
          <Text variant="titleMedium" style={styles.instructionText}>
            Center the machine in the frame
          </Text>
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialCommunityIcons name="camera" size={40} color="#fff" />
            )}
          </TouchableOpacity>

          <View style={styles.cancelButton} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  permissionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  permissionText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 48,
  },
  instructionText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  cancelButton: {
    width: 80,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
});
