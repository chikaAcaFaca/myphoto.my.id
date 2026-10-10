import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator, TextInput, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { formatBytes } from '@myphoto/shared';
import { radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
const { width } = Dimensions.get('window');
const THUMB_SIZE = (width - 36) / 3;

interface FamilyMember {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'member';
  storageUsed: number;
}

interface FamilyData {
  id: string;
  name: string;
  adminId: string;
  memberCount: number;
  sharedStorageUsed: number;
}

interface SharedFile {
  id: string;
  name: string;
  type: string;
  smallThumbUrl?: string;
  thumbnailUrl?: string;
  userId: string;
}

export default function FamilyScreen() {
  const { colors: tc } = useTheme();
  const { t, tp } = useT();
  const { getToken, appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchFamily = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/family`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFamily(data.family);
      setMembers(data.members || []);
      setSharedFiles(data.sharedFiles || []);
    } catch (e) {
      console.error('Error fetching family:', e);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/family`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'create', name: t('family.defaultName') }),
      });
      if (res.ok) {
        Alert.alert(t('common.success'), t('family.created'));
        fetchFamily();
      } else {
        const err = await res.json();
        Alert.alert(t('common.error'), err.error || t('family.failed'));
      }
    } catch {
      Alert.alert(t('common.error'), t('family.networkError'));
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/family`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'invite', email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert(t('common.success'), t('family.memberAdded', { name: data.memberName }));
        setInviteEmail('');
        fetchFamily();
      } else {
        Alert.alert(t('common.error'), data.error || t('family.inviteFailed'));
      }
    } catch {
      Alert.alert(t('common.error'), t('family.networkError'));
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      t('family.removeTitle'),
      t('family.removeConfirm', { name: member.displayName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            if (!token) return;
            const res = await fetch(`${API_URL}/api/family`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action: 'remove', memberId: member.id }),
            });
            if (res.ok) fetchFamily();
          },
        },
      ]
    );
  };

  const isAdmin = family?.adminId === appUser?.id;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
        <StackHeader title={t('family.title')} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={t('family.title')} />

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {!family ? (
              /* No family yet */
              <View style={[styles.card, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
                <Ionicons name="people" size={48} color={tc.textMuted} style={{ alignSelf: 'center' }} />
                <Text style={[styles.emptyTitle, { color: tc.text }]}>{t('family.emptyTitle')}</Text>
                <Text style={[styles.emptySubtext, { color: tc.textSecondary }]}>
                  {t('family.emptySubtitle')}
                </Text>
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: tc.primary }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={18} color="#fff" />
                      <Text style={styles.createBtnText}>{t('family.create')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Family info */}
                <View style={[styles.card, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
                  <Text style={[styles.sectionLabel, { color: tc.textSecondary }]}>{t('family.sectionFamily')}</Text>
                  <Text style={[styles.familyName, { color: tc.text }]}>{family.name}</Text>
                  <Text style={[styles.familyMeta, { color: tc.textSecondary }]}>
                    {tp('family.members', family.memberCount)} · {t('family.sharedStorage', { size: formatBytes(family.sharedStorageUsed) })}
                  </Text>
                </View>

                {/* Members */}
                <View style={[styles.card, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
                  <Text style={[styles.sectionLabel, { color: tc.textSecondary }]}>{t('family.sectionMembers')}</Text>
                  {members.map(member => (
                    <View key={member.id} style={[styles.memberRow, { borderBottomColor: tc.border }]}>
                      <View style={[styles.memberAvatar, { backgroundColor: member.role === 'admin' ? tc.primary : tc.textMuted }]}>
                        <Text style={styles.memberAvatarText}>
                          {(member.displayName || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.memberName, { color: tc.text }]}>{member.displayName}</Text>
                          {member.role === 'admin' && (
                            <View style={[styles.adminBadge, { backgroundColor: tc.primaryLight }]}>
                              <Text style={[styles.adminText, { color: tc.primary }]}>{t('family.admin')}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: tc.textSecondary }}>
                          {member.email} · {formatBytes(member.storageUsed)}
                        </Text>
                      </View>
                      {isAdmin && member.role !== 'admin' && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member)}
                          style={styles.removeBtn}
                          accessibilityRole="button"
                          accessibilityLabel={t('common.remove')}
                        >
                          <Ionicons name="close-circle" size={20} color={tc.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {/* Invite */}
                  {isAdmin && (
                    <View style={styles.inviteRow}>
                      <TextInput
                        style={[styles.inviteInput, { color: tc.text, backgroundColor: tc.bgInput }]}
                        placeholder={t('family.emailPlaceholder')}
                        placeholderTextColor={tc.textMuted}
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={[styles.inviteBtn, { backgroundColor: tc.primary }]}
                        onPress={handleInvite}
                        accessibilityRole="button"
                        accessibilityLabel={t('family.emailPlaceholder')}
                        disabled={inviting}
                      >
                        {inviting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons name="person-add" size={18} color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Shared Files */}
                {sharedFiles.length > 0 && (
                  <View style={[styles.card, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
                    <Text style={[styles.sectionLabel, { color: tc.textSecondary }]}>{t('family.sectionShared')}</Text>
                    <View style={styles.thumbGrid}>
                      {sharedFiles.slice(0, 9).map(file => (
                        <TouchableOpacity
                          key={file.id}
                          style={styles.thumbCell}
                          onPress={() => router.push({
                            pathname: '/photo-viewer',
                            params: { id: file.id, name: file.name, type: file.type, isFavorite: '0' },
                          })}
                        >
                          <Image
                            source={{ uri: file.smallThumbUrl || file.thumbnailUrl }}
                            style={styles.thumbImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {sharedFiles.length > 9 && (
                      <Text style={{ fontSize: 11, color: tc.textMuted, textAlign: 'center', marginTop: 8 }}>
                        {t('family.morePhotos', { count: sharedFiles.length - 9 })}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        }
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    borderRadius: radius.xl, marginBottom: 12, padding: 16, borderWidth: 1,
  },
  sectionLabel: { fontSize: 10, ...fonts.bold, letterSpacing: 1, marginBottom: 10 },
  emptyTitle: { fontSize: 18, ...fonts.bold, textAlign: 'center', marginTop: 12 },
  emptySubtext: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 12 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 24, minHeight: 48, paddingVertical: 12, marginTop: 16,
  },
  createBtnText: { color: '#fff', fontSize: 14, ...fonts.bold },
  familyName: { fontSize: 20, ...fonts.extrabold },
  familyMeta: { fontSize: 12, marginTop: 4 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { color: '#fff', fontSize: 14, ...fonts.bold },
  memberName: { fontSize: 13, ...fonts.semibold },
  adminBadge: {
    borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  adminText: { fontSize: 10, ...fonts.bold },
  removeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
  },
  inviteInput: {
    flex: 1, borderRadius: 22, minHeight: 44,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
  },
  inviteBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  thumbCell: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 4, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
});
