import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type AppLocation } from '../../lib/api/locations';

type Props = {
  place: AppLocation;
  height: number;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: (locationId: string, current: boolean) => void;
};

export default function PlaceCard({ place, height, onPress, isFavorite, onToggleFavorite }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const cardWidthRef = useRef(0);
  const images = place.images;
  const imageHeight = Math.round((height - 16) * 0.58);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (cardWidthRef.current === 0) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidthRef.current);
    setActiveIndex(idx);
  }, []);

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * cardWidthRef.current, animated: true });
  };

  const shortAddress = place.address
    ? place.address.split(' ').slice(0, 2).join(' ')
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      style={[styles.card, { height }]}
      onLayout={(e) => { cardWidthRef.current = e.nativeEvent.layout.width; }}
    >
      {/* 이미지 캐러셀 */}
      <View style={[styles.imageWrap, { height: imageHeight }]}>
        {images.length > 0 ? (
          <>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={{ flex: 1 }}
            >
              {images.map((uri, i) => (
                <View key={i} style={{ width: cardWidthRef.current || 400, height: imageHeight }}>
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>

            {/* 좌 화살표 */}
            {activeIndex > 0 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navLeft]}
                onPress={() => goTo(activeIndex - 1)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </TouchableOpacity>
            )}
            {/* 우 화살표 */}
            {activeIndex < images.length - 1 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navRight]}
                onPress={() => goTo(activeIndex + 1)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            {/* 이미지 도트 */}
            {images.length > 1 && (
              <View style={styles.dotsRow}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={32} color="#A89587" />
          </View>
        )}

        {/* 태그 배지 */}
        {place.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {place.tags.slice(0, 2).map((tag, i) => (
              <View key={i} style={styles.tagBadge}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 카드 하단 정보 */}
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
            {place.category ? (
              <Text style={styles.category} numberOfLines={1}>{place.category}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => onToggleFavorite(place.id, isFavorite)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFavorite ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isFavorite ? '#D2B48C' : '#A89587'}
            />
          </TouchableOpacity>
        </View>
        {shortAddress ? (
          <Text style={styles.address} numberOfLines={1}>{shortAddress}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#3E352F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  imageWrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#D4CEC8',
    borderRadius: 18,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D4CEC8',
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -16,
    zIndex: 10,
  },
  navLeft: { left: 10 },
  navRight: { right: 10 },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 14,
  },
  tagsRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginRight: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C2C2C',
    flexShrink: 1,
  },
  category: {
    fontSize: 13,
    color: '#887563',
    flexShrink: 0,
  },
  address: {
    fontSize: 12,
    color: '#A89587',
    marginTop: 4,
  },
});
