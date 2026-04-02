import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert,
  ActivityIndicator, Share, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function PhotoViewerScreen() {
  const { id, name, type } = useLocalSearchParams<{ id: string; name: string; type: string }>();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const imageUrl = `${API_URL}/api/stream/${id}`;

  const handleSaveToDevice = async () => {
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status !== 'granted') {
        Alert.alert('Dozvola potrebna', 'Dozvolite pristup galeriji da sacuvate sliku.');
        return;
      }

      const token = await getToken();
      const ext = name?.split('.').pop() || 'jpg';
      const localUri = `${FileSystem.cacheDirectory}download_${id}.${ext}`;

      const download = await FileSystem.downloadAsync(
        `${API_URL}/api/files/${id}/download-url`,
        localUri,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      // The download-url endpoint returns JSON with the actual URL
      // We need to fetch the actual file
      const urlRes = await fetch(`${API_URL}/api/files/${id}/download-url`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!urlRes.ok) throw new Error('Failed to get download URL');
      const { downloadUrl } = await urlRes.json();

      const fileDownload = await FileSystem.downloadAsync(downloadUrl, localUri);

      await MediaLibrary.saveToLibraryAsync(fileDownload.uri);
      Alert.alert('Sacuvano', 'Fajl je sacuvan u galeriju.');
    } catch (e: any) {
      console.error('Save error:', e);
      Alert.alert('Greska', 'Nije moguce sacuvati fajl.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const token = await getToken();
      // Create share link via API
      const res = await fetch(`${API_URL}/api/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fileId: id, permission: 'read' }),
      });

      if (res.ok) {
        const data = await res.json();
        const shareUrl = `${API_URL}${data.shareUrl}`;
        await Share.share({ message: `${name}\n${shareUrl}`, url: shareUrl });
      } else {
        // Fallback: share direct link
        await Share.share({ message: `${name} - ${API_URL}/api/stream/${id}` });
      }
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  const handleDelete = () => {
    Alert.alert('Obrisati?', `Da li zelite da obrisete ${name}?`, [
      { text: 'Otkazi', style: 'cancel' },
      {
        text: 'Obrisi', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await fetch(`${API_URL}/api/files/delete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ fileIds: [id] }),
            });
            router.back();
          } catch (e) {
            Alert.alert('Greska', 'Brisanje nije uspelo.');
          }
        }
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.fileName} numberOfLines={1}>{name || 'Photo'}</Text>
        <TouchableOpacity style={styles.topBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </View>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.action} onPress={handleSaveToDevice} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#fff" />
          )}
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action}>
          <Ionicons name="heart-outline" size={22} color="#fff" />
          <Text style={styles.actionText}>Favorite</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action}>
          <Ionicons name="information-circle-outline" size={22} color="#fff" />
          <Text style={styles.actionText}>Info</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#f87171" />
          <Text style={[styles.actionText, { color: '#f87171' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingHorizontal: 8, paddingBottom: 8,
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fileName: { flex: 1, color: '#fff', fontSize: 14, ...fonts.semibold, textAlign: 'center', marginHorizontal: 8 },
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: width, height: height * 0.65 },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  action: { alignItems: 'center', gap: 4, minWidth: 50 },
  actionText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, ...fonts.medium },
});
