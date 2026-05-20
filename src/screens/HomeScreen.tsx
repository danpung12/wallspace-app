import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../contexts/AuthContext';
import { getCurrentUserCached } from '../lib/authCache';
import {
  getLocations,
  getUserFavoriteLocations,
  addFavorite,
  removeFavorite,
  type AppLocation,
} from '../lib/api/locations';
import PlaceCard from '../components/home/PlaceCard';

const WITHART_URL = 'https://withart.vercel.app';

export default function HomeScreen() {
  const { isLoggedIn } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const isLoggedInRef = useRef(isLoggedIn);
  const hasLoadedRef = useRef(false);
  const lastFocusLoadAtRef = useRef(0);
  isLoggedInRef.current = isLoggedIn;

  const [locations, setLocations] = useState<AppLocation[]>([]);
  const [favorites, setFavorites] = useState<AppLocation[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [detailUrl, setDetailUrl] = useState<string | null>(null);

  const [favSectionHeight, setFavSectionHeight] = useState(0);
  const [cardSectionHeight, setCardSectionHeight] = useState(0);

  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 59 + insets.bottom : 55 + insets.bottom;

  const loadData = useCallback(async (options?: { force?: boolean }) => {
    const shouldShowSpinner = !hasLoadedRef.current || options?.force;
    if (shouldShowSpinner) {
      setLoading(true);
    }
    hasLoadedRef.current = true;
    try {
      const [locs, user] = await Promise.all([
        getLocations(options),
        isLoggedInRef.current ? getCurrentUserCached(options) : Promise.resolve(null),
      ]);
      const favLocs = user ? await getUserFavoriteLocations(user.id, options) : [];
      setLocations(locs);
      setFavorites(favLocs);
      setFavoriteIds(new Set(favLocs.map((f) => f.id)));
    } catch (e) {
      console.warn('HomeScreen: failed to load data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    loadData({ force: true });
  }, [isLoggedIn, loadData]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (!hasLoadedRef.current || now - lastFocusLoadAtRef.current > 30_000) {
        lastFocusLoadAtRef.current = now;
        loadData();
      }
      try {
        RNStatusBar.setBarStyle('dark-content', true);
        if (Platform.OS === 'android') {
          RNStatusBar.setTranslucent(true);
          RNStatusBar.setBackgroundColor('transparent', true);
        }
      } catch (_) {}
    }, [loadData])
  );

  const handleToggleFavorite = useCallback(async (locationId: string, current: boolean) => {
    if (!isLoggedIn) return;
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (current) next.delete(locationId);
      else next.add(locationId);
      return next;
    });
    try {
      if (current) {
        await removeFavorite(locationId);
        setFavorites((prev) => prev.filter((f) => f.id !== locationId));
      } else {
        await addFavorite(locationId);
        const added = locations.find((l) => l.id === locationId);
        if (added) setFavorites((prev) => [...prev, added]);
      }
    } catch (_) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (current) next.add(locationId);
        else next.delete(locationId);
        return next;
      });
    }
  }, [isLoggedIn, locations]);

  const openDetail = useCallback((locationId: string) => {
    setDetailUrl(`${WITHART_URL}/location-detail?id=${locationId}`);
  }, []);

  // 즐겨찾기 카드 크기
  const favCardHeight = favSectionHeight > 0 ? Math.round(favSectionHeight * 0.82) : 160;
  const favCardWidth = Math.round(favCardHeight * 1.35); // ~220px 비율

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>Withart</Text>
      </View>

      <View style={[styles.content, { paddingBottom: TAB_BAR_HEIGHT }]}>

        {/* 즐겨찾기 섹션 */}
        {isLoggedIn && (
          <View
            style={styles.favSection}
            onLayout={(e) => setFavSectionHeight(e.nativeEvent.layout.height)}
          >
            {/* 섹션 헤더 */}
            <View style={styles.favHeader}>
              <Text style={styles.favTitle}>즐겨찾기</Text>
              <TouchableOpacity
                onPress={() => setDetailUrl(`${WITHART_URL}/profile`)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="notifications-circle" size={28} color="#3D2C1D" />
              </TouchableOpacity>
            </View>

            {favorites.length > 0 ? (
              <FlatList
                data={favorites}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                snapToInterval={favCardWidth + 12}
                decelerationRate="fast"
                renderItem={({ item }) => (
                  <FavCard
                    place={item}
                    cardWidth={favCardWidth}
                    cardHeight={favCardHeight}
                    onPress={() => openDetail(item.id)}
                  />
                )}
              />
            ) : (
              /* 빈 즐겨찾기 카드 */
              <View style={styles.favEmptyOuter}>
                <View style={styles.favEmptyCard}>
                  <View style={styles.favEmptyIconWrap}>
                    <Ionicons name="bookmark" size={32} color="#C19A6B" />
                  </View>
                  <Text style={styles.favEmptyTitle}>즐겨찾기한 장소가 없습니다</Text>
                  <Text style={styles.favEmptyDesc}>마음에 드는 장소를 저장해보세요</Text>
                  <TouchableOpacity
                    style={styles.favEmptyBtn}
                    onPress={() => setDetailUrl(`${WITHART_URL}/map`)}
                  >
                    <Text style={styles.favEmptyBtnText}>장소 둘러보기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* PlaceCard 섹션 */}
        <View
          style={styles.cardSection}
          onLayout={(e) => setCardSectionHeight(e.nativeEvent.layout.height)}
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#A89587" />
            </View>
          ) : (
            <FlatList
              data={locations}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              snapToInterval={cardSectionHeight > 0 ? cardSectionHeight : undefined}
              decelerationRate="fast"
              getItemLayout={
                cardSectionHeight > 0
                  ? (_, index) => ({
                      length: cardSectionHeight,
                      offset: cardSectionHeight * index,
                      index,
                    })
                  : undefined
              }
              renderItem={({ item }) => (
                <PlaceCard
                  place={item}
                  height={cardSectionHeight}
                  onPress={() => openDetail(item.id)}
                  isFavorite={favoriteIds.has(item.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
            />
          )}
        </View>
      </View>

      {/* 공간 상세 모달 */}
      <Modal visible={!!detailUrl} animationType="slide" onRequestClose={() => setDetailUrl(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EC' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailUrl(null)} style={styles.modalCloseBtn}>
              <Ionicons name="chevron-down" size={24} color="#3E352F" />
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
          {detailUrl && (
            <WebView
              source={{ uri: detailUrl }}
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

// ─── 즐겨찾기 카드 ────────────────────────────────────────────────────────────
function FavCard({
  place,
  cardWidth,
  cardHeight,
  onPress,
}: {
  place: AppLocation;
  cardWidth: number;
  cardHeight: number;
  onPress: () => void;
}) {
  const imageHeight = Math.round(cardHeight * 0.62);
  const shortAddress = place.address
    ? place.address.split(' ').slice(0, 2).join(' ')
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[favStyles.card, { width: cardWidth, height: cardHeight }]}
    >
      <View style={[favStyles.imageWrap, { height: imageHeight }]}>
        {place.images[0] ? (
          <Image
            source={{ uri: place.images[0] }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={favStyles.imagePlaceholder}>
            <Ionicons name="image-outline" size={22} color="#A89587" />
          </View>
        )}
      </View>
      <View style={favStyles.info}>
        <Text style={favStyles.name} numberOfLines={1}>{place.name}</Text>
        {shortAddress ? (
          <Text style={favStyles.address} numberOfLines={1}>{shortAddress}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const favStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3E352F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(100,70,40,0.07)',
  },
  imageWrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#D4CEC8',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D4CEC8',
  },
  info: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  address: {
    fontSize: 11,
    color: '#887563',
    marginTop: 2,
  },
});

// ─── 메인 스타일 ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8e3da',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#e8e3da',
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3E352F',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  favSection: {
    flex: 1,
  },
  favHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  favTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  favEmptyOuter: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  favEmptyCard: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#3E352F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  favEmptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(210,180,140,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  favEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  favEmptyDesc: {
    fontSize: 12,
    color: '#887563',
    marginBottom: 14,
  },
  favEmptyBtn: {
    backgroundColor: '#D2B48C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  favEmptyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cardSection: {
    flex: 2,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E2E2',
  },
  modalCloseBtn: {
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
