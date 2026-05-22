import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

type Props = BottomTabBarProps & {
  isVisible?: boolean;
  activeRouteName?: string;
};

export default function AnimatedTabBar({ state, descriptors, navigation, isVisible = true, activeRouteName }: Props) {
  const [width, setWidth] = useState(0);
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(0)).current;
  const indicatorScale = useRef(new Animated.Value(1)).current;
  const iconScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const visibilityAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

  const visualIndex = React.useMemo(() => {
    if (!activeRouteName) return state.index;
    const idx = state.routes.findIndex((r) => r.name === activeRouteName);
    return idx >= 0 ? idx : state.index;
  }, [activeRouteName, state.index, state.routes]);

  useEffect(() => {
    const index = visualIndex;
    if (width === 0) return;
    const itemWidth = width / state.routes.length;
    Animated.spring(translateX, {
      toValue: index * itemWidth + itemWidth / 2 - (itemWidth * 0.6) / 2,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();

    // icon scale animations
    iconScales.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === index ? 1.15 : 1,
        useNativeDriver: true,
      }).start();
    });
  }, [visualIndex, width]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    Animated.timing(visibilityAnim, {
      toValue: isVisible ? 1 : 0,
      duration: isVisible ? 180 : 140,
      useNativeDriver: true,
    }).start();
  }, [isVisible, visibilityAnim]);

  const itemWidth = width && state.routes.length ? width / state.routes.length : 64;
  const bottomInset = Math.max(insets.bottom, 0);
  const baseBottomPadding = Platform.OS === 'ios' ? 12 : 8;
  const translateY = visibilityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 0],
  });

  return (
    <Animated.View
      pointerEvents={isVisible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          opacity: visibilityAnim,
          paddingBottom: baseBottomPadding + bottomInset,
          transform: [{ translateY }],
        },
      ]}
      onLayout={onLayout}
    >
      <View style={styles.inner}>
        {state.routes.map((route, idx) => {
          const { options } = descriptors[route.key];
          const label =
            options.title !== undefined ? options.title : route.name;
          const focused = visualIndex === idx;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const color = focused ? '#D2B48C' : '#8C7853';

          return (
            <TouchableWithoutFeedback key={route.key} onPress={onPress} onLongPress={onLongPress}>
              <View style={[styles.tabItem, { width: itemWidth }]}>
                <Animated.View style={{ transform: [{ scale: iconScales[idx] }] }}>
                  <TabIcon index={idx} color={color} focused={focused} />
                </Animated.View>
                <Text style={[styles.label, { color }]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            </TouchableWithoutFeedback>
          );
        })}
      </View>

      {/* indicator */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            bottom: (Platform.OS === 'ios' ? 6 : 4) + bottomInset,
            width: itemWidth ? itemWidth * 0.6 : 40,
            transform: [{ translateX }],
          },
        ]}
      />
    </Animated.View>
  );
}

function TabIcon({ index, color, focused }: { index: number; color: string; focused: boolean }) {
  const opacity = focused ? 1 : 0.95;

  if (index === 0) {
    return (
      <Svg width={24} height={24} viewBox="0 0 256 256" opacity={opacity}>
        <Path
          fill={color}
          d="M218.83,103.77l-80-75.48a1.14,1.14,0,0,1-.11-.11,16,16,0,0,0-21.53,0l-.11.11L37.17,103.77A16,16,0,0,0,32,115.55V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V160h32v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V115.55A16,16,0,0,0,218.83,103.77ZM208,208H160V160a16,16,0,0,0-16-16H112a16,16,0,0,0-16,16v48H48V115.55l.11-.1L128,40l79.9,75.43.11.1Z"
        />
      </Svg>
    );
  }

  if (index === 1) {
    return (
      <Svg width={24} height={24} viewBox="0 0 256 256" opacity={opacity}>
        <Path
          fill={color}
          d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"
        />
      </Svg>
    );
  }

  if (index === 2) {
    return (
      <Svg width={24} height={24} viewBox="0 0 256 256" opacity={opacity}>
        <Path
          fill={color}
          d="M216,56v60a4,4,0,0,1-4,4H136V44a4,4,0,0,1,4-4h60A16,16,0,0,1,216,56ZM116,40H56A16,16,0,0,0,40,56v60a4,4,0,0,0,4,4h76V44A4,4,0,0,0,116,40Zm96,96H136v76a4,4,0,0,0,4,4h60a16,16,0,0,0,16-16V140A4,4,0,0,0,212,136ZM40,140v60a16,16,0,0,0,16,16h60a4,4,0,0,0,4-4V136H44A4,4,0,0,0,40,140Z"
        />
      </Svg>
    );
  }

  return (
    <Svg width={24} height={24} viewBox="0 0 256 256" opacity={opacity}>
      <Path
        fill={color}
        d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5F1EC',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E2E2',
    paddingTop: 6,
    zIndex: 999,
    elevation: 999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  indicator: {
    height: 3,
    backgroundColor: '#A3834C',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
});
