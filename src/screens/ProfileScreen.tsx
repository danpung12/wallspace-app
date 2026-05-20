import React, { useContext, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import WebView from 'react-native-webview';
import { AuthContext } from '../contexts/AuthContext';
import { getNativeProfile, type NativeProfile } from '../lib/api/profile';

const BASE_WEB_URL = 'https://withart.vercel.app';

const USER_TYPE_LABEL: Record<string, string> = {
  artist: '작가',
  manager: '사장님',
  guest: '게스트',
};

export default function ProfileScreen() {
  const { onLogout } = useContext(AuthContext);
  const hasLoadedRef = useRef(false);
  const lastFocusLoadAtRef = useRef(0);
  const [profile, setProfile] = useState<NativeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [webUrl, setWebUrl] = useState<string | null>(null);

  const loadProfile = useCallback(async (options?: { force?: boolean }) => {
    const shouldShowSpinner = !hasLoadedRef.current || options?.force;
    if (shouldShowSpinner) {
      setLoading(true);
    }
    hasLoadedRef.current = true;
    try {
      setProfile(await getNativeProfile(options));
    } catch (e) {
      console.warn('ProfileScreen: load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const now = Date.now();
    if (!hasLoadedRef.current || now - lastFocusLoadAtRef.current > 30_000) {
      lastFocusLoadAtRef.current = now;
      loadProfile();
    }
  }, [loadProfile]));

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: onLogout },
    ]);
  };

  const displayName = profile?.user_type === 'manager'
    ? (profile?.name ?? '이름 없음')
    : (profile?.nickname ?? profile?.name ?? '이름 없음');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 정보</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#A89587" />
          </View>
        ) : (
          <>
            {/* 프로필 카드 */}
            <View style={styles.profileCard}>
              {/* 장식 그라데이션 */}
              <View style={styles.decorCircle} pointerEvents="none" />

              <View style={styles.profileRow}>
                {/* 아바타 */}
                <TouchableOpacity onPress={() => setWebUrl(`${BASE_WEB_URL}/profile`)} style={styles.avatarWrap}>
                  <View style={styles.avatarGradientBorder}>
                    <View style={styles.avatarInner}>
                      {profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={28} color="#A89587" />
                        </View>
                      )}
                    </View>
                  </View>
                  {/* 카메라 버튼 */}
                  <View style={styles.cameraBtn}>
                    <Ionicons name="camera" size={10} color="#fff" />
                  </View>
                </TouchableOpacity>

                {/* 이름 & 타입 */}
                <View style={styles.profileMeta}>
                  {profile?.user_type && (
                    <View style={styles.typeBadge}>
                      <Ionicons
                        name={profile.user_type === 'manager' ? 'storefront-outline' : 'color-palette-outline'}
                        size={10}
                        color="#C19A6B"
                      />
                      <Text style={styles.typeText}>
                        {USER_TYPE_LABEL[profile.user_type] ?? profile.user_type}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
                  {profile?.user_type !== 'manager' && profile?.name && (
                    <Text style={styles.realName} numberOfLines={1}>{profile.name}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* 사용자 정보 섹션 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name="person-outline" size={16} color="#C19A6B" />
                </View>
                <Text style={styles.sectionTitle}>사용자 정보</Text>
                <TouchableOpacity
                  onPress={() => setWebUrl(`${BASE_WEB_URL}/profile`)}
                  style={styles.editBtn}
                >
                  <Text style={styles.editBtnText}>수정</Text>
                </TouchableOpacity>
              </View>

              {profile?.user_type !== 'manager' && profile?.nickname && (
                <InfoRow icon="id-card-outline" label="필명" value={profile.nickname} />
              )}
              <InfoRow icon="person-outline" label="이름" value={profile?.name ?? '이름 없음'} />
              <InfoRow icon="mail-outline" label="이메일" value={profile?.email ?? ''} />
              <InfoRow icon="call-outline" label="전화번호" value={profile?.phone ?? '전화번호 없음'} />
            </View>

            {/* 계정 관리 섹션 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name="settings-outline" size={16} color="#C19A6B" />
                </View>
                <Text style={styles.sectionTitle}>계정 관리</Text>
              </View>

              <AccountRow
                icon="lock-closed-outline"
                label="비밀번호 변경"
                onPress={() => setWebUrl(`${BASE_WEB_URL}/find-password`)}
              />
              <AccountRow
                icon="settings-outline"
                label="사용자 설정"
                onPress={() => setWebUrl(`${BASE_WEB_URL}/profile`)}
              />
              <AccountRow
                icon="chatbubble-outline"
                label="문의하기"
                onPress={() => setWebUrl(`${BASE_WEB_URL}/chat`)}
              />
              <AccountRow
                icon="document-text-outline"
                label="개인정보처리방침"
                onPress={() => setWebUrl(`${BASE_WEB_URL}/privacy`)}
              />
              <AccountRow
                icon="log-out-outline"
                label="로그아웃"
                onPress={handleLogout}
                danger
                showChevron={false}
              />
            </View>

            <Text style={styles.version}>Withart v1.0.5</Text>
          </>
        )}
      </ScrollView>

      {/* 웹 모달 */}
      <Modal visible={!!webUrl} animationType="slide" onRequestClose={() => setWebUrl(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EC' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setWebUrl(null)} style={styles.modalClose}>
              <Ionicons name="chevron-down" size={24} color="#3E352F" />
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
          {webUrl && (
            <WebView
              source={{ uri: webUrl }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── 정보 행 ───────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconBox}>
        <Ionicons name={icon as any} size={16} color="#C19A6B" />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(193,154,107,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#887563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4D4337',
  },
});

// ─── 계정 행 ───────────────────────────────────────────────────────────────────
function AccountRow({
  icon,
  label,
  onPress,
  danger,
  showChevron = true,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  showChevron?: boolean;
}) {
  return (
    <TouchableOpacity
      style={accStyles.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[accStyles.iconBox, danger && accStyles.iconBoxDanger]}>
        <Ionicons
          name={icon as any}
          size={18}
          color={danger ? '#DC2626' : '#D2B48C'}
        />
      </View>
      <Text style={[accStyles.label, danger && accStyles.labelDanger]}>{label}</Text>
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color="#887563" style={{ marginLeft: 'auto' }} />
      )}
    </TouchableOpacity>
  );
}

const accStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(210,180,140,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxDanger: {
    backgroundColor: 'rgba(220,38,38,0.1)',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4D4337',
  },
  labelDanger: {
    color: '#DC2626',
  },
});

// ─── 메인 스타일 ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8e3da' },
  header: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(250,248,245,0.98)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4D4337',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingBox: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 프로필 카드
  profileCard: {
    margin: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#4D4337',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(193,154,107,0.15)',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(193,154,107,0.12)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarGradientBorder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    backgroundColor: '#C19A6B',
  },
  avatarInner: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E3DA',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4D4337',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileMeta: {
    flex: 1,
    gap: 3,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(193,154,107,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C19A6B',
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4D4337',
    letterSpacing: -0.3,
  },
  realName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8B7355',
  },
  // 섹션
  section: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4D4337',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(193,154,107,0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(193,154,107,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4D4337',
    flex: 1,
  },
  editBtn: {
    backgroundColor: 'rgba(193,154,107,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C19A6B',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#C4B9B0',
    marginVertical: 20,
  },
  // 모달
  modalHeader: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E2E2',
  },
  modalClose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E352F',
  },
});
