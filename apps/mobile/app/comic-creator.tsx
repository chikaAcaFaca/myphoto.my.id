import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, Share, ScrollView, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { radius, fonts } from '@/lib/theme';
import { StackHeader } from '@/components/StackHeader';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { useTheme } from '@/lib/theme-context';
import { useT, type TKey } from '@/lib/i18n';

const { width } = Dimensions.get('window');

interface ComicPanel {
  id: string;
  imageUri: string;
  bubbleText: string;
  bubblePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// Label = photo count (cols * rows), rendered via the common.photos plural.
const LAYOUTS = [
  { id: '2x1', cols: 1, rows: 2 },
  { id: '2x2', cols: 2, rows: 2 },
  { id: '3x2', cols: 2, rows: 3 },
  { id: '3x1', cols: 1, rows: 3 },
];

const BUBBLE_POSITIONS: { key: ComicPanel['bubblePosition']; labelKey: TKey }[] = [
  { key: 'top-left', labelKey: 'comic.posTopLeft' },
  { key: 'top-right', labelKey: 'comic.posTopRight' },
  { key: 'bottom-left', labelKey: 'comic.posBottomLeft' },
  { key: 'bottom-right', labelKey: 'comic.posBottomRight' },
];

export default function ComicCreatorScreen() {
  const { colors: tc } = useTheme();
  const { t, tp } = useT();
  const [panels, setPanels] = useState<ComicPanel[]>([]);
  const [layout, setLayout] = useState(LAYOUTS[0]);
  const [editingPanel, setEditingPanel] = useState<ComicPanel | null>(null);
  const [bubbleText, setBubbleText] = useState('');
  const [bubblePos, setBubblePos] = useState<ComicPanel['bubblePosition']>('top-right');
  const [title, setTitle] = useState('');

  const maxPanels = layout.cols * layout.rows;

  const addPanel = useCallback(async () => {
    if (panels.length >= maxPanels) {
      Alert.alert(t('comic.maxTitle'), t('comic.maxMessage', { photos: tp('common.photos', maxPanels) }));
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
  }, [panels.length, maxPanels, t, tp]);

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
      message: `${title ? title + '\n' : ''}${t('comic.shareMessage')}\nhttps://myphotomy.space`,
    });
  }, [title, t]);

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
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('comic.bubbleTitle')}
          onPress={() => { setEditingPanel(item); setBubbleText(item.bubbleText); setBubblePos(item.bubblePosition); }}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.panelActionBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('common.remove')}
          onPress={() => removePanel(item.id)}
        >
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader
        title={t('comic.title')}
        actions={<HeaderIconButton icon="share-outline" label={t('common.share')} onPress={handleShare} />}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Title input */}
        <TextInput
          style={[styles.titleInput, { backgroundColor: tc.bgCard, color: tc.text, borderColor: tc.border }]}
          placeholder={t('comic.titlePlaceholder')}
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
              style={[styles.layoutBtn, { borderColor: tc.border }, layout.id === l.id && { backgroundColor: tc.primaryLight, borderColor: tc.primary }]}
              onPress={() => { setLayout(l); setPanels((prev) => prev.slice(0, l.cols * l.rows)); }}
            >
              <Text style={[styles.layoutText, { color: tc.textSecondary }, layout.id === l.id && { color: tc.primary }]}>{tp('common.photos', l.cols * l.rows)}</Text>
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
                <Text style={[styles.addPanelText, { color: tc.textSecondary }]}>{t('comic.addImage')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Watermark */}
          <Text style={[styles.watermark, { color: tc.textMuted }]}>{t('comic.watermark')}</Text>
        </View>
      </ScrollView>

      {/* Bubble edit modal */}
      <Modal visible={!!editingPanel} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tc.bgCard }]}>
            <Text style={[styles.modalTitle, { color: tc.text }]}>{t('comic.bubbleTitle')}</Text>

            <TextInput
              style={[styles.bubbleInput, { backgroundColor: tc.bgInput, color: tc.text, borderColor: tc.border }]}
              placeholder={t('comic.bubblePlaceholder')}
              placeholderTextColor={tc.textMuted}
              value={bubbleText}
              onChangeText={setBubbleText}
              multiline
              maxLength={120}
              autoFocus
            />

            <Text style={[styles.controlLabel, { color: tc.textSecondary }]}>{t('comic.position')}</Text>
            <View style={styles.posRow}>
              {BUBBLE_POSITIONS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.posBtn, { borderColor: tc.border }, bubblePos === p.key && { backgroundColor: tc.primaryLight, borderColor: tc.primary }]}
                  onPress={() => setBubblePos(p.key)}
                >
                  <Text style={[styles.posText, { color: tc.textSecondary }, bubblePos === p.key && { color: tc.primary }]}>{t(p.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setEditingPanel(null)} style={[styles.cancelBtn, { backgroundColor: tc.bgInput }]}>
                <Text style={{ color: tc.text, ...fonts.semibold }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={updateBubble} style={[styles.saveBtn, { backgroundColor: tc.primary }]}>
                <Text style={{ color: '#fff', ...fonts.bold }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleInput: {
    marginHorizontal: 12, marginTop: 4, borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 10, minHeight: 48, fontSize: 15, ...fonts.bold,
  },
  layoutRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
  layoutBtn: {
    borderWidth: 1, borderRadius: radius.full,
    paddingHorizontal: 16, minHeight: 44, justifyContent: 'center',
  },
  layoutText: { fontSize: 13, ...fonts.semibold },
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
    width: 32, height: 32, backgroundColor: 'rgba(17,18,20,0.65)',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    position: 'absolute', backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, maxWidth: '70%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  bubbleText: { fontSize: 11, ...fonts.bold, color: '#16181D' },
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
  modalContent: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, letterSpacing: -0.3, ...fonts.display, marginBottom: 12 },
  bubbleInput: {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, minHeight: 60, textAlignVertical: 'top',
  },
  controlLabel: { fontSize: 12, ...fonts.semibold, letterSpacing: 0.3, marginTop: 12, marginBottom: 6 },
  posRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  posBtn: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  posText: { fontSize: 13, ...fonts.semibold },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { borderRadius: radius.full, minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
  saveBtn: { borderRadius: radius.full, minHeight: 44, justifyContent: 'center', paddingHorizontal: 22 },
});
