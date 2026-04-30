/**
 * Device Registry — registers this device with the user's account
 * so they can see all syncing devices and manage them.
 */
import * as Application from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'myphoto_device_id';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

function generateDeviceId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${Platform.OS}-${id}`;
}

export async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export async function registerDevice(token: string): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    const deviceName = `${Platform.OS === 'android' ? 'Android' : 'iOS'} phone`;

    await fetch(`${API_URL}/api/devices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        deviceName,
        platform: Platform.OS,
        appVersion: '1.0.0',
      }),
    });
  } catch (e) {
    console.error('Device registration error:', e);
  }
}

export async function heartbeat(token: string): Promise<void> {
  // Same as register — POST updates lastSeen if already registered
  await registerDevice(token);
}

export interface DeviceInfo {
  id: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  appVersion?: string;
  lastSeen: string;
  createdAt: string;
}

export async function listDevices(token: string): Promise<DeviceInfo[]> {
  try {
    const res = await fetch(`${API_URL}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.devices || [];
  } catch {
    return [];
  }
}

export async function removeDevice(token: string, deviceId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/devices?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
