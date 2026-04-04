import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, Share, Platform, ScrollView, FlatList, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width } = Dimensions.get('window');

interface ComicPanel {
  id: string;
  imageUri: string;
  bubbleText: string;
  bubblePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const LAYOUTS = [
  { id: '2x1', label: '2 slike', cols: 1, rows: 2 },
  { id: '2x2', label: '4 slike', cols: 2, rows: 2 },
  { id: '3x2', label: '6 slika', cols: 2, rows: 3 },
  { id: '3x1', label: '3 slike', cols: 1, rows: 3 },
];

const BUBBLE_POSITIONS = [
  { key: 'top-left' as const, label: 'Gore levo' },
  { key: 'top-right' as const, label: 'Gore desno' },
  { key: 'bottom-left' as const, label: 'Dole levo' },
  { key: 'bottom-right' as const, label: 'Dole desno' },
];

export default function ComicCreatorScreen() {
  const { colors: tc } = useTheme();
  const [panels, setPanels] = useState<ComicPanel[]>([]);
  const [layout, setLayout] = useState(LAYOUTS[0]);
  const [editingPanel, setEditingPanel] = useState<ComicPanel | null>(null);
  const [bubbleText, setBubbleText] = useState('');
  const [bubblePos, setBubblePos] = useState<ComicPanel['bubblePosition']>('top-right');
  const [title, setTitle] = useState('');

  const maxPanels = layout.cols * layout.rows;

  const addPanel = useCallback(async () => {
    if (panels.length >= maxPanels) {
      Alert.alert('Maksimum', `Ovaj raspored podrzava ${maxPanels} slika.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: maxPanels - panels.length,
    });

    if (!result.canceled) {
      const newPanels = result.assets.map((asset, i) => ({
        id: `panel_${Date.now()}_${i}`,
        imageUri: asset.uri,
        bubbleText: '',
        bubblePosition: 'top-right' as const,
      }));
      setPanels((prev) => [...prev, ...newPanels].slice(0, maxPanels));
    }
  }, [panels.length, maxPanels]);

  const updateBubble = useCallback(() => {
    if (!editingPanel) return;
    setPanels((prev) =>
      prev.map((p) =>
        p.id === editingPanel.id
          ? { ...p, bubbleText: bubbleText, bubblePosition: bubblePos }
          : p
      )
    );
    setEditingPanel(null);
    setBubbleText('');
  }, [editingPanel, bubbleText, bubblePos]);

  const removePanel = useCallback((panelId: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== panelId));
  }, []);

  const handleShare = useCallback(async () => {
    await Share.share({
      message: `${title ? title + '\n' : ''}Strip napravljen u MyPhoto app!\nPreuzmite: https://myphotomy.space`,
    });
  }, [title]);

  const panelSize = layout.cols === 1
    ? { w: width - 32, h: 200 }
    : { w: (width - 40) / 2, h: 180 };

  const renderPanel = ({ item, index }: { item: ComicPanel; index: number }) => (
    <View style={[styles.panel, { width: panelSize.w, height: panelSize.h, backgroundColor: tc.bgInput }]}>
      <Image source={{ uri: item.imageUri }} style={styles.panelImage} contentFit="cover" />

      {/* Speech bubble */}
      {item.bubbleText ? (
        <View style={[
          styles.bubble,
          item.bubblePosition.includes('top') ? { top: 8 } : { bottom: 8 },
          item.bubblePosition.includes('left') ? { left: 8 } : { right: 8 },
        ]}>
          <Text style={styles.bubbleText}>{item.bubbleText}</Text>
          <View style={[
            styles.bubbleTail,
            item.bubblePosition.includes('bottom') ? { top: -6 } : { bottom: -6 },
            item.bubblePosition.includes('left') ? { left: 16 } : { right: 16 },
          ]} />
        </View>
      ) : null}

      {/* Panel number */}
      <View style={styles.panelNumber}>
        <Text style={styles.panelNumberText}>{index + 1}</Text>
      </View>

      {/* Edit/Remove buttons */}
      <View style={styles.panelActions}>
        <TouchableOpacity
          style={styles.panelActionBtn}
          onPress={() => { setEditingPanel(item); setBubbleText(item.bubbleText); setBubblePos(item.bubblePosition); }}
        >
          <Ionicons name="chatbubble-outline" size={14} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelActionBtn} onPress={() => removePanel(item.id)}>
          <Ionicons name="close" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      {/* Header */}
      <View style={[styles.topBar, { backgroundColor: '#8b5cf6' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Strip Kreator</Text>
        <TouchableOpacity onPress={handleShare} style={styles.topBtn}>
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Title input */}
        <TextInput
          style={[styles.titleInput, { backgroundColor: tc.bgCard, color: tc.text, borderColor: tc.border }]}
          placeholder="Naslov stripa..."
          placeholderTextColor={tc.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />

        {/* Layout selector */}
        <View style={styles.layoutRow}>
          {LAYOUTS.map((l) => (
            <TouchableOpacity
              key={l.id}
              style={[styles.layoutBtn, layout.id === l.id && { backgroundColor: '#8b5cf6' + '20', borderColor: '#8b5cf6' }]}
              onPress={() => { setLayout(l); setPanels((prev) => prev.slice(0, l.cols * l.rows)); }}
            >
              <Text style={[styles.layoutText, layout.id === l.id && { color: '#8b5cf6' }]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comic strip preview */}
        <View style={[styles.comicFrame, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
          {/* Title bar */}
          {title ? (
            <View style={styles.comicTitle}>
              <Text style={[styles.comicTitleText, { color: tc.text }]}>{title}</Text>
            </View>
          ) : null}

          {/* Panels grid */}
          <View style={[styles.panelsGrid, { flexWrap: 'wrap' }]}>
            {panels.map((panel, index) => (
              <View key={panel.id}>
                {renderPanel({ item: panel, index })}
              </View>
            ))}

            {/* Add panel button */}
            {panels.length < maxPanels && (
              <TouchableOpacity
                style={[styles.addPanel, { width: panelSize.w, height: panelSize.h, borderColor: tc.border }]}
                onPress={addPanel}
              >
                <Ionicons name="add-circle-outline" size={32} color={tc.textMuted} />
                <Text style={[styles.addPanelText, { color: tc.textMuted }]}>Dodaj sliku</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Watermark */}
          <Text style={[styles.watermark, { color: tc.textMuted }]}>Made with MyPhoto</Text>
        </View>
      </ScrollView>

      {/* Bubble edit modal */}
      <Modal visible={!!editingPanel} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tc.bgCard }]}>
            <Text style={[styles.modalTitle, { color: tc.text }]}>Oblacic za panel</Text>

            <TextInput
              style={[styles.bubbleInput, { backgroundColor: tc.bgInput, color: tc.text, borderColor: tc.border }]}
              placeholder="Sta kaze lik na slici?"
              placeholderTextColor={tc.textMuted}
              value={bubbleText}
              onChangeText={setBubbleText}
              multiline
              maxLength={120}
              autoFocus
            />

            <Text style={[styles.controlLabel, { color: tc.textMuted }]}>POZICIJA</Text>
            <View style={styles.posRow}>
              {BUBBLE_POSITIONS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.posBtn, bubblePos === p.key && { backgroundColor: '#8b5cf6' + '20', borderColor: '#8b5cf6' }]}
                  onPress={() => setBubblePos(p.key)}
                >
                  <Text style={[styles.posText, bubblePos === p.key && { color: '#8b5cf6' }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setEditingPanel(null)} style={styles.cancelBtn}>
                <Text style={{ color: tc.textMuted, ...fonts.semibold }}>Otkazi</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={updateBubble} style={[styles.saveBtn, { backgroundColor: '#8b5cf6' }]}>
                <Text style={{ color: '#fff', ...fonts.bold }}>Sacuvaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, paddingTop: Platform.OS === 'ios' ? 50 : 8,
  },
  topBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, ...fonts.extrabold, color: '#fff' },
  titleInput: {
    marginHorizontal: 12, marginTop: 12, borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, ...fonts.bold,
  },
  layoutRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
  layoutBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  layoutText: { fontSize: 12, ...fonts.semibold, color: colors.textSecondary },
  comicFrame: {
    marginHorizontal: 12, borderRadius: radius.lg, borderWidth: 3,
    padding: 8, overflow: 'hidden',
  },
  comicTitle: { alignItems: 'center', paddingVertical: 8 },
  comicTitleText: { fontSize: 18, ...fonts.extrabold, textTransform: 'uppercase' },
  panelsGrid: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  panel: { borderRadius: 4, overflow: 'hidden', position: 'relative', borderWidth: 2, borderColor: '#333' },
  panelImage: { width: '100%', height: '100%' },
  panelNumber: {
    position: 'absolute', top: 4, left: 4, width: 20, height: 20,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  panelNumberText: { color: '#fff', fontSize: 10, ...fonts.bold },
  panelActions: {
    position: 'absolute', top: 4, right: 4, flexDirection: 'row', gap: 4,
  },
  panelActionBtn: {
    width: 24, height: 24, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    position: 'absolute', backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, maxWidth: '70%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  bubbleText: { fontSize: 11, ...fonts.bold, color: '#1e293b' },
  bubbleTail: {
    position: 'absolute', width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff',
  },
  addPanel: {
    borderRadius: 4, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addPanelText: { fontSize: 11, ...fonts.medium, marginTop: 4 },
  watermark: { textAlign: 'center', fontSize: 9, paddingVertical: 6 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 16, ...fonts.bold, marginBottom: 12 },
  bubbleInput: {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, minHeight: 60, textAlignVertical: 'top',
  },
  controlLabel: { fontSize: 10, ...fonts.bold, letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  posRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  posBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  posText: { fontSize: 11, ...fonts.semibold, color: colors.textSecondary },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  saveBtn: { borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 20 },
});
