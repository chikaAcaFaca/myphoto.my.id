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
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

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
        body: JSON.stringify({ action: 'create', name: 'My Family' }),
      });
      if (res.ok) {
        Alert.alert('Uspesno', 'Porodica je kreirana!');
        fetchFamily();
      } else {
        const err = await res.json();
        Alert.alert('Greska', err.error || 'Nije uspelo');
      }
    } catch {
      Alert.alert('Greska', 'Mrezna greska');
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
        Alert.alert('Uspesno', `${data.memberName} je dodat u porodicu!`);
        setInviteEmail('');
        fetchFamily();
      } else {
        Alert.alert('Greska', data.error || 'Pozivanje nije uspelo');
      }
    } catch {
      Alert.alert('Greska', 'Mrezna greska');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      'Ukloni clana',
      `Da li zelite da uklonite ${member.displayName}?`,
      [
        { text: 'Otkazi', style: 'cancel' },
        {
          text: 'Ukloni',
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: tc.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Porodica</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {!family ? (
              /* No family yet */
              <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
                <Ionicons name="people" size={48} color={tc.textMuted} style={{ alignSelf: 'center' }} />
                <Text style={[styles.emptyTitle, { color: tc.text }]}>Nemate porodicu</Text>
                <Text style={[styles.emptySubtext, { color: tc.textMuted }]}>
                  Kreirajte porodicu da biste delili storage i slike sa clanovima.
                  Svi clanovi koriste isti account za storage.
                </Text>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={18} color="#fff" />
                      <Text style={styles.createBtnText}>Kreiraj porodicu</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Family info */}
                <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
                  <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>PORODICA</Text>
                  <Text style={[styles.familyName, { color: tc.text }]}>{family.name}</Text>
                  <Text style={[styles.familyMeta, { color: tc.textMuted }]}>
                    {family.memberCount} {family.memberCount === 1 ? 'clan' : 'clanova'} · Zajednicki storage: {formatBytes(family.sharedStorageUsed)}
                  </Text>
                </View>

                {/* Members */}
                <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
                  <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>CLANOVI</Text>
                  {members.map(member => (
                    <View key={member.id} style={styles.memberRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: member.role === 'admin' ? colors.primary : '#94a3b8' }]}>
                        <Text style={styles.memberAvatarText}>
                          {(member.displayName || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.memberName, { color: tc.text }]}>{member.displayName}</Text>
                          {member.role === 'admin' && (
                            <View style={styles.adminBadge}>
                              <Text style={styles.adminText}>Admin</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: tc.textMuted }}>
                          {member.email} · {formatBytes(member.storageUsed)}
                        </Text>
                      </View>
                      {isAdmin && member.role !== 'admin' && (
                        <TouchableOpacity onPress={() => handleRemoveMember(member)}>
                          <Ionicons name="close-circle" size={20} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {/* Invite */}
                  {isAdmin && (
                    <View style={styles.inviteRow}>
                      <TextInput
                        style={[styles.inviteInput, { color: tc.text, borderColor: tc.textMuted + '40' }]}
                        placeholder="Email adresa"
                        placeholderTextColor={tc.textMuted}
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.inviteBtn}
                        onPress={handleInvite}
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
                  <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
                    <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>DELJENE SLIKE</Text>
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
                        + jos {sharedFiles.length - 9} slika
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8,
  },
  headerTitle: { fontSize: 18, ...fonts.extrabold, color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    borderRadius: radius.lg, marginBottom: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  sectionLabel: { fontSize: 10, ...fonts.bold, letterSpacing: 1, marginBottom: 10 },
  emptyTitle: { fontSize: 18, ...fonts.bold, textAlign: 'center', marginTop: 12 },
  emptySubtext: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 12 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 14, marginTop: 16,
  },
  createBtnText: { color: '#fff', fontSize: 14, ...fonts.bold },
  familyName: { fontSize: 20, ...fonts.extrabold },
  familyMeta: { fontSize: 12, marginTop: 4 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { color: '#fff', fontSize: 14, ...fonts.bold },
  memberName: { fontSize: 13, ...fonts.semibold },
  adminBadge: {
    backgroundColor: colors.primary + '20', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  adminText: { fontSize: 9, color: colors.primary, ...fonts.bold },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
  },
  inviteInput: {
    flex: 1, borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13,
  },
  inviteBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  thumbCell: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 4, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
});
