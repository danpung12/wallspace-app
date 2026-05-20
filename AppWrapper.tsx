import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text, Animated, Easing, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import App from './App';
import { WebviewReadyProvider, useWebviewReady } from './src/contexts/WebviewReadyContext';

const APP_BACKGROUND = '#F5F1EC';

// App.tsx에서 로그인 상태를 받아오는 핸들
export type AppWrapperHandle = {
  setLoggedIn: (v: boolean) => void ;
};

function SplashIcon() {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.7)).current;
  const opacity2 = useRef(new Animated.Value(0.4)).current;
  const opacity3 = useRef(new Animated.Value(0.15)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 아이콘 페이드인 + 스케일업
    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 펄스 링 애니메이션 (순차적으로)
    const createPulse = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.4,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(scale, {
              toValue: 1,
              friction: 1,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: delay === 0 ? 0.7 : delay === 150 ? 0.4 : 0.15,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    Animated.parallel([
      createPulse(scale1, opacity1, 0),
      createPulse(scale2, opacity2, 150),
      createPulse(scale3, opacity3, 300),
    ]).start();
  }, [scale1, scale2, scale3, opacity1, opacity2, opacity3, iconScale, iconOpacity]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        style={[
          styles.pulseRing,
          styles.pulseRing1,
          {
            transform: [{ scale: scale1 }],
            opacity: opacity1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          styles.pulseRing2,
          {
            transform: [{ scale: scale2 }],
            opacity: opacity2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          styles.pulseRing3,
          {
            transform: [{ scale: scale3 }],
            opacity: opacity3,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.iconCircle,
          {
            transform: [{ scale: iconScale }],
            opacity: iconOpacity,
          },
        ]}
      >
        <Text style={styles.iconText}>W</Text>
      </Animated.View>
    </View>
  );
}

function WebviewReadyOverlay(_props: { isLoggedIn: boolean }) {
  // 로그인 후 로딩이 길게 남는 현상 방지를 위해 App.tsx의 가드/오버레이만 사용
  return null;
}

const AppWrapper = forwardRef<AppWrapperHandle>((_props, _ref) => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  useImperativeHandle(_ref, () => ({
    setLoggedIn: (v: boolean) => setIsLoggedIn(v),
  }));

  useEffect(() => {
    let mounted = true;

    const loadIconFonts = async () => {
      if (typeof (Ionicons as any).loadFont === 'function') {
        await (Ionicons as any).loadFont();
        return;
      }

      await Font.loadAsync((Ionicons as any).font ?? {});
    };

    loadIconFonts()
      .catch((error) => {
        console.warn('[AppWrapper] Ionicons font load failed', error);
      })
      .finally(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />
      {/* Edge-to-edge: 상단은 각 화면 배경이 상태바 뒤까지 깔리게 두고,
          좌우/하단만 safe area 적용 */}
        <WebviewReadyProvider>
          <App onLoggedInChange={setIsLoggedIn} />
          <WebviewReadyOverlay isLoggedIn={isLoggedIn} />
        </WebviewReadyProvider>
      </View>
    </SafeAreaProvider>
  );
});

export default AppWrapper;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
  },
  splashFallback: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F1EC',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 900,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#C19A6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C19A6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  iconText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#C19A6B',
  },
  pulseRing1: {
    // initial opacity set in animation
  },
  pulseRing2: {
    width: 100,
    height: 100,
    borderRadius: 28,
  },
  pulseRing3: {
    width: 120,
    height: 120,
    borderRadius: 32,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3D2C1D',
    marginBottom: 6,
  },
  subText: {
    fontSize: 13,
    color: '#8B7355',
    letterSpacing: 0.3,
  },
});
