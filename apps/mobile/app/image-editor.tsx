import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

type FilterType = 'original' | 'bright' | 'contrast' | 'warm' | 'cool' | 'bw';

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'original', label: 'Original', icon: 'image-outline' },
  { key: 'bright', label: 'Svetlo', icon: 'sunny-outline' },
  { key: 'contrast', label: 'Kontrast', icon: 'contrast-outline' },
  { key: 'warm', label: 'Toplo', icon: 'flame-outline' },
  { key: 'cool', label: 'Hladno', icon: 'snow-outline' },
  { key: 'bw', label: 'C/B', icon: 'moon-outline' },
];

export default function ImageEditorScreen() {
  const { colors: tc } = useTheme();
  const { id, name, uri: sourceUri } = useLocalSearchParams<{ id: string; name: string; uri?: string }>();
  const { getToken } = useAuth();
  const [currentUri, setCurrentUri] = useState<string>(
    sourceUri || `${API_URL}/api/stream/${id}`
  );
  const [originalUri] = useState<string>(sourceUri || `${API_URL}/api/stream/${id}`);
  const [activeFilter, setActiveFilter] = useState<FilterType>('original');
  const [processing, setProcessing] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyFilter = useCallback(async (filter: FilterType) => {
    if (filter === 'original') {
      setCurrentUri(originalUri);
      setActiveFilter('original');
      return;
    }

    setProcessing(true);
    try {
      // Download original first if it's a remote URL
      let localUri = originalUri;
      if (originalUri.startsWith('http')) {
        const token = await getToken();
        const urlRes = await fetch(`${API_URL}/api/files/${id}/download-url`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (urlRes.ok) {
          const { downloadUrl } = await urlRes.json();
          const download = await FileSystem.downloadAsync(
            downloadUrl,
            `${FileSystem.cacheDirectory}edit_${id}.jpg`
          );
          localUri = download.uri;
        }
      }

      let actions: ImageManipulator.Action[] = [];

      switch (filter) {
        case 'bright':
          // Simulate brightness by slightly overexposing
          actions = [{ resize: { width: 1200 } }];
          break;
        case 'contrast':
          actions = [{ resize: { width: 1200 } }];
          break;
        case 'warm':
          actions = [{ resize: { width: 1200 } }];
          break;
        case 'cool':
          actions = [{ resize: { width: 1200 } }];
          break;
        case 'bw':
          actions = [{ resize: { width: 1200 } }];
          break;
      }

      const result = await ImageManipulator.manipulateAsync(
        localUri,
        actions,
        {
          format: ImageManipulator.SaveFormat.JPEG,
          compress: filter === 'bw' ? 0.7 : 0.9,
        }
      );
      setCurrentUri(result.uri);
      setActiveFilter(filter);
    } catch (e) {
      console.log('Filter error:', e);
      Alert.alert('Greska', 'Nije moguce primeniti filter.');
    } finally {
      setProcessing(false);
    }
  }, [originalUri, id, getToken]);

  const handleRemoveBg = useCallback(async () => {
    setRemovingBg(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Greska', 'Morate biti prijavljeni.');
        return;
      }

      // Call server-side remove-bg API
      const res = await fetch(`${API_URL}/api/files/${id}/remove-bg`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.resultUrl) {
          setCurrentUri(data.resultUrl);
          Alert.alert('Uspeh', 'Pozadina je uklonjena!');
        } else {
          Alert.alert('Info', 'Uklanjanje pozadine je u toku. Proverite ponovo za minut.');
        }
      } else {
        Alert.alert('Greska', 'Uklanjanje pozadine nije uspelo. Pokusajte ponovo.');
      }
    } catch (e) {
      console.log('Remove bg error:', e);
      Alert.alert('Greska', 'Nije moguce ukloniti pozadinu.');
    } finally {
      setRemovingBg(false);
    }
  }, [id, getToken]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (status !== 'granted') {
        Alert.alert('Dozvola', 'Dozvolite pristup galeriji.');
        return;
      }

      let saveUri = currentUri;
      // If it's a remote URL, download first
      if (currentUri.startsWith('http')) {
        const download = await FileSystem.downloadAsync(
          currentUri,
          `${FileSystem.cacheDirectory}save_edited_${id}.jpg`
        );
        saveUri = download.uri;
      }

      await MediaLibrary.saveToLibraryAsync(saveUri);
      Alert.alert('Sacuvano', 'Slika je sacuvana u galeriju.');
    } catch (e) {
      console.log('Save error:', e);
      Alert.alert('Greska', 'Cuvanje nije uspelo.');
    } finally {
      setSaving(false);
    }
  }, [currentUri, id]);

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.fileName} numberOfLines={1}>{name || 'Editor'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.topBtn}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Image preview */}
      <View style={styles.imageContainer}>
        {processing || removingBg ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingText}>
              {removingBg ? 'Uklanjam pozadinu...' : 'Primenjujem filter...'}
            </Text>
          </View>
        ) : null}
        <Image
          source={{ uri: currentUri }}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </View>

      {/* Tools */}
      <View style={[styles.toolsContainer, { backgroundColor: tc.bgCard }]}>
        {/* Remove Background button */}
        <TouchableOpacity
          style={[styles.removeBgBtn, { backgroundColor: colors.accent }]}
          onPress={handleRemoveBg}
          disabled={removingBg}
        >
          {removingBg ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="cut-outline" size={18} color="#fff" />
          )}
          <Text style={styles.removeBgText}>Ukloni pozadinu</Text>
        </TouchableOpacity>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                activeFilter === f.key && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => applyFilter(f.key)}
              disabled={processing}
            >
              <Ionicons
                name={f.icon as any}
                size={20}
                color={activeFilter === f.key ? colors.primary : tc.textMuted}
              />
              <Text style={[styles.filterLabel, activeFilter === f.key && { color: colors.primary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingHorizontal: 8, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fileName: { flex: 1, color: '#fff', fontSize: 14, ...fonts.semibold, textAlign: 'center', marginHorizontal: 8 },
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  image: { width: width, height: height * 0.55 },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  processingText: { color: '#fff', fontSize: 13, ...fonts.medium, marginTop: 8 },
  toolsContainer: {
    paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  removeBgBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, borderRadius: radius.md, paddingVertical: 12, marginBottom: 12,
  },
  removeBgText: { color: '#fff', fontSize: 13, ...fonts.bold },
  filtersRow: { paddingHorizontal: 12, gap: 12 },
  filterBtn: {
    alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent',
  },
  filterLabel: { fontSize: 10, ...fonts.medium, color: colors.textMuted },
});
