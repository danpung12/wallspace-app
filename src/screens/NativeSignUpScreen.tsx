import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  checkEmailExists,
  registerUser,
  validateEmail,
  NativeUserType,
} from '../lib/api/auth';

const BRAND_BROWN = '#A89587';
const BRAND_CREAM = '#F5F3F0';
const BRAND_DARK = '#3E352F';
const PRIMARY = '#B07A4B';
const PRIMARY_LIGHT = '#F7F5F2';
const TEXT_SECONDARY = '#8F7965';
const CARD = '#FFFFFF';
const BORDER = '#E6DDD3';
const INPUT_BORDER = '#E5E0DC';
const ACCENT = '#B07A4B';
const ERROR = '#D84D4D';
const SUCCESS = '#2F9E44';

type NativeSignUpScreenProps = {
  onBack: () => void;
  onComplete: () => void;
};

type HelperType = 'success' | 'error' | 'info';
type IconName = string;

type FormField = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'date' | 'tel' | 'radio';
  value: string;
  placeholder?: string;
  icon?: IconName;
  optional?: boolean;
  helperText?: string;
  helperType?: HelperType;
  validator?: (value: string) => string | null;
  onChange: (value: string) => void;
  actionButton?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
  options?: Array<{ value: string; label: string; icon: IconName }>;
};

export default function NativeSignUpScreen({ onBack, onComplete }: NativeSignUpScreenProps) {
  const [selectedType, setSelectedType] = useState<NativeUserType | null>(null);

  if (!selectedType) {
    return <SignUpTypeSelect onBack={onBack} onSelect={setSelectedType} />;
  }

  return (
    <SignUpForm
      userType={selectedType}
      onBack={() => setSelectedType(null)}
      onSwitchType={() => setSelectedType(selectedType === 'artist' ? 'guest' : 'artist')}
      onComplete={onComplete}
    />
  );
}

function SignUpTypeSelect({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (type: NativeUserType) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const tall = height >= 860;

  return (
    <View style={styles.typePage}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.typeContent,
          {
            paddingTop: insets.top + (compact ? 16 : 24),
            paddingBottom: Math.max(insets.bottom + (compact ? 18 : 24), 28),
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.typeHeader}>
          <Pressable
            style={({ pressed }) => [styles.headerBackButton, pressed && styles.pressed]}
            onPress={onBack}
            hitSlop={10}
            accessibilityLabel="뒤로 가기"
          >
            <NativeIcon name="chevron-back" size={26} color={BRAND_DARK} />
          </Pressable>
          <Text style={styles.typeTitle}>가입 유형 선택</Text>
          <Text style={styles.typeSubtitle}>어떤 목적으로 Withart를 이용하시나요?</Text>
        </View>

        <View
          style={[
            styles.typeCards,
            compact && styles.typeCardsCompact,
            tall && styles.typeCardsTall,
          ]}
        >
          <TypeCard
            title="예술가 / 사장님"
            description="공간을 등록하고 작품을 알려보세요"
            icon="color-palette-outline"
            variant="filled"
            compact={compact}
            tall={tall}
            onPress={() => onSelect('artist')}
          />
          <TypeCard
            title="손님"
            description="예술 작품을 둘러보고 카페를 즐겨보세요"
            icon="person-outline"
            variant="light"
            compact={compact}
            tall={tall}
            onPress={() => onSelect('guest')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function TypeCard({
  title,
  description,
  icon,
  variant,
  compact,
  tall,
  onPress,
}: {
  title: string;
  description: string;
  icon: IconName;
  variant: 'filled' | 'light';
  compact: boolean;
  tall: boolean;
  onPress: () => void;
}) {
  const filled = variant === 'filled';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.typeCard,
        compact && styles.typeCardCompact,
        tall && styles.typeCardTall,
        filled ? styles.typeCardFilled : styles.typeCardLight,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.typeIconCircle,
          compact && styles.typeIconCircleCompact,
          filled ? styles.typeIconCircleFilled : styles.typeIconCircleLight,
        ]}
      >
        <NativeIcon name={icon} size={compact ? 50 : 60} color={filled ? '#FFFFFF' : BRAND_DARK} />
      </View>
      <Text style={[styles.typeCardTitle, filled && styles.typeCardTitleFilled]}>{title}</Text>
      <Text style={[styles.typeCardDescription, filled && styles.typeCardDescriptionFilled]}>
        {description}
      </Text>
    </Pressable>
  );
}

function SignUpForm({
  userType,
  onBack,
  onSwitchType,
  onComplete,
}: {
  userType: NativeUserType;
  onBack: () => void;
  onSwitchType: () => void;
  onComplete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailAvailability, setEmailAvailability] = useState<{
    type: HelperType;
    text: string;
  } | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('male');
  const [dob, setDob] = useState('');

  const checkDuplicate = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('이메일을 입력해주세요.');
      return;
    }
    if (!validateEmail(trimmed)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setCheckingEmail(true);
    setError(null);
    const result = await checkEmailExists(trimmed);
    if (result.error) {
      setEmailAvailability({ type: 'error', text: '이메일 확인 중 오류가 발생했습니다.' });
    } else if (result.exists) {
      setEmailAvailability({ type: 'error', text: '이미 사용 중인 이메일입니다.' });
    } else {
      setEmailAvailability({ type: 'success', text: '사용 가능한 이메일입니다.' });
    }
    setCheckingEmail(false);
  };

  const onEmailChange = (value: string) => {
    setEmail(value);
    setEmailAvailability(null);
  };

  const passwordValidator = (value: string) => {
    if (!value || value.length < 8 || value.length > 16) {
      return '8~16자 사이여야 합니다.';
    }
    const count = [
      /[A-Z]/.test(value),
      /[a-z]/.test(value),
      /[0-9]/.test(value),
      /[^A-Za-z0-9]/.test(value),
    ].filter(Boolean).length;
    if (count < 3) {
      return '영문 대소문자, 숫자, 특수문자 중 3가지 조합이어야 합니다.';
    }
    return null;
  };

  const fields = useMemo<FormField[]>(() => {
    const emailField: FormField = {
      key: 'email',
      label: '이메일',
      type: 'email',
      value: email,
      icon: 'mail-outline',
      onChange: onEmailChange,
      helperText: emailAvailability?.text,
      helperType: emailAvailability?.type,
      actionButton: {
        label: checkingEmail ? '확인중...' : '중복확인',
        onPress: checkDuplicate,
        disabled: checkingEmail || emailAvailability?.type === 'success' || !email.trim(),
      },
    };

    const commonPasswordFields: FormField[] = [
      {
        key: 'password',
        label: '비밀번호',
        type: 'password',
        value: password,
        icon: 'lock-closed-outline',
        onChange: setPassword,
        validator: passwordValidator,
        helperText: '비밀번호 규칙: 8~16자, 영문 대소문자/숫자/특수문자 중 3가지 조합',
        helperType: 'info',
      },
      {
        key: 'confirmPassword',
        label: '비밀번호 확인',
        type: 'password',
        value: confirmPassword,
        icon: 'lock-closed-outline',
        onChange: setConfirmPassword,
        validator: (value) => (value !== password ? '비밀번호가 일치하지 않습니다.' : null),
      },
    ];

    const genderField: FormField = {
      key: 'gender',
      label: '성별',
      type: 'radio',
      value: gender,
      onChange: setGender,
      options: [
        { value: 'male', label: '남성', icon: 'male-outline' },
        { value: 'female', label: '여성', icon: 'female-outline' },
      ],
    };

    if (userType === 'guest') {
      return [
        {
          key: 'name',
          label: '이름',
          type: 'text',
          value: name,
          icon: 'person-outline',
          onChange: setName,
        },
        emailField,
        ...commonPasswordFields,
        {
          key: 'dob',
          label: '생년월일',
          type: 'date',
          value: dob,
          icon: 'calendar-outline',
          placeholder: 'YYYY-MM-DD',
          onChange: setDob,
          optional: true,
        },
        genderField,
      ];
    }

    return [
      emailField,
      {
        key: 'name',
        label: '이름',
        type: 'text',
        value: name,
        icon: 'person-outline',
        onChange: setName,
      },
      {
        key: 'nickname',
        label: '닉네임',
        type: 'text',
        value: nickname,
        icon: 'id-card-outline',
        placeholder: '닉네임을 입력해주세요 (선택)',
        onChange: setNickname,
        optional: true,
      },
      ...commonPasswordFields,
      {
        key: 'phone',
        label: '전화번호',
        type: 'tel',
        value: phone,
        icon: 'call-outline',
        placeholder: '010-1234-5678',
        onChange: (value) => setPhone(formatPhone(value)),
        optional: true,
      },
      genderField,
    ];
  }, [
    checkingEmail,
    confirmPassword,
    dob,
    email,
    emailAvailability,
    gender,
    name,
    nickname,
    password,
    phone,
    userType,
  ]);

  const current = fields[index];
  const completed = fields.slice(0, index).reverse();
  const title = userType === 'artist' ? '예술가/사장님 회원가입' : '손님 회원가입';
  const switchText =
    userType === 'artist' ? '손님으로 가입하시나요?' : '예술가/사장님으로 가입하시나요?';

  useEffect(() => {
    setShowPassword(false);
  }, [current?.key]);

  const currentValidationError = (field: FormField) => {
    const value = field.value.trim();
    if (!field.optional && field.type !== 'radio' && value.length === 0) {
      return '값을 입력해 주세요.';
    }
    if (field.key === 'email' && !validateEmail(value)) {
      return '올바른 이메일을 입력해주세요.';
    }
    if (field.validator) {
      return field.validator(field.value);
    }
    return null;
  };

  const isCurrentReady = () => {
    if (!current) return false;
    if (current.optional && current.value.trim().length === 0) return true;
    if (current.actionButton && current.helperType !== 'success') return false;
    return !currentValidationError(current);
  };

  const handleNext = () => {
    if (!current) return;
    const validationError = currentValidationError(current);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (current.actionButton && current.helperType !== 'success') {
      setError('이메일 중복 확인을 완료해주세요.');
      return;
    }
    setError(null);
    if (index < fields.length - 1) {
      setIndex((value) => value + 1);
      return;
    }
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    const result = await registerUser(email, password, {
      full_name: name.trim(),
      nickname: userType === 'artist' ? nickname.trim() || '무명' : name.trim(),
      user_type: userType,
      phone: userType === 'artist' ? phone.trim() || undefined : undefined,
      dob: userType === 'guest' ? dob.trim() || undefined : undefined,
      gender: gender || undefined,
    });
    setSubmitting(false);

    if (result.error || !result.user) {
      setError('회원가입에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    Alert.alert('회원가입 완료', '회원가입이 완료되었습니다.\n로그인하여 서비스를 이용해주세요.', [
      { text: '확인', onPress: onComplete },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.formPage}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.formHeader, { paddingTop: insets.top + 10 }]}>
        <Pressable
          style={({ pressed }) => [styles.formBackButton, pressed && styles.pressed]}
          onPress={onBack}
          hitSlop={10}
          accessibilityLabel="뒤로 가기"
        >
          <NativeIcon name="arrow-back" size={25} color={BRAND_DARK} />
        </Pressable>
        <Text style={styles.formHeaderTitle}>{title}</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.formContent,
          { paddingBottom: Math.max(insets.bottom + 26, 34) },
        ]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressiveHeader}>
          <Text style={styles.progressiveTitle}>{getPromptLabel(current?.label ?? '')}</Text>
          <Text style={styles.progressiveCount}>
            {index + 1} / {fields.length}
          </Text>
        </View>

        <View style={styles.currentFieldWrap}>
          {current?.type === 'radio' ? (
            <View style={styles.radioGrid}>
              {current.options?.map((option) => {
                const active = current.value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.radioButton,
                      active && styles.radioButtonActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => current.onChange(option.value)}
                  >
                    <NativeIcon
                      name={option.icon}
                      size={20}
                      color={active ? '#FFFFFF' : BRAND_DARK}
                    />
                    <Text style={[styles.radioText, active && styles.radioTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <InputPanel
              key={current.key}
              field={current}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((value) => !value)}
              onSubmit={handleNext}
            />
          )}

          {current?.helperText ? (
            <Text
              style={[
                styles.helperText,
                current.helperType === 'success' && styles.helperSuccess,
                current.helperType === 'error' && styles.helperError,
              ]}
            >
              {current.helperText}
            </Text>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {completed.length > 0 ? (
            <View style={styles.completedList}>
              {completed.map((field) => (
                <View key={field.key} style={styles.completedItem}>
                  <Text style={styles.completedLabel}>{field.label}</Text>
                  <Text style={styles.completedValue}>
                    {field.type === 'password'
                      ? '••••••••'
                      : field.value.trim() || (field.optional ? '선택 안 함' : '입력 필요')}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.navButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.prevButton,
              index === 0 && styles.disabledButton,
              pressed && index > 0 && styles.pressed,
            ]}
            onPress={() => {
              if (index > 0) {
                setIndex((value) => value - 1);
                setError(null);
              }
            }}
            disabled={index === 0}
          >
            <Text style={styles.prevButtonText}>이전</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              !isCurrentReady() && styles.nextButtonDisabled,
              pressed && isCurrentReady() && styles.nextButtonPressed,
            ]}
            onPress={handleNext}
            disabled={!isCurrentReady() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.nextButtonText, !isCurrentReady() && styles.nextButtonTextDisabled]}>
                {index === fields.length - 1 ? '완료' : '다음'}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.switchTypeButton, pressed && styles.pressed]}
          onPress={() => {
            setError(null);
            setIndex(0);
            onSwitchType();
          }}
          disabled={submitting}
        >
          <Text style={styles.switchTypeText}>{switchText}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputPanel({
  field,
  showPassword,
  onTogglePassword,
  onSubmit,
}: {
  field: FormField;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: () => void;
}) {
  const secure = field.type === 'password' && !showPassword;
  const hasAction = !!field.actionButton;

  return (
    <View style={styles.inputOuter}>
      <View style={styles.floatingLabelWrap}>
        <Text style={styles.floatingLabel}>{field.label}</Text>
      </View>

      <View style={hasAction ? styles.inputActionRow : styles.inputSingleRow}>
        <View style={styles.inputInner}>
          {field.icon ? (
            <View style={styles.inputIcon}>
              <NativeIcon name={field.icon} size={21} color={TEXT_SECONDARY} />
            </View>
          ) : null}
          <TextInput
            key={field.key}
            style={[styles.textInput, field.type === 'password' && styles.passwordInput]}
            value={field.value}
            onChangeText={field.onChange}
            placeholder={field.placeholder ?? ''}
            placeholderTextColor="#887563"
            keyboardType={
              field.type === 'email' ? 'email-address' : field.type === 'tel' ? 'phone-pad' : 'default'
            }
            autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
            autoCorrect={false}
            secureTextEntry={secure}
            textContentType={field.type === 'password' ? 'password' : field.type === 'email' ? 'emailAddress' : 'none'}
            autoComplete={field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : 'off'}
            returnKeyType={hasAction ? 'done' : 'next'}
            onSubmitEditing={onSubmit}
          />
          {field.type === 'password' ? (
            <Pressable
              style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
              onPress={onTogglePassword}
              hitSlop={8}
            >
              <NativeIcon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={TEXT_SECONDARY}
              />
            </Pressable>
          ) : null}
        </View>

        {field.actionButton ? (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              field.actionButton?.disabled && styles.actionButtonDisabled,
              pressed && !field.actionButton?.disabled && styles.pressed,
            ]}
            onPress={field.actionButton.onPress}
            disabled={field.actionButton.disabled}
          >
            <Text style={styles.actionButtonText}>{field.actionButton.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function getPromptLabel(label: string) {
  if (!label) return '';
  if (/입력|선택|성별|확인/.test(label)) return label;
  const code = label.charCodeAt(label.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return `${label}을 입력해주세요`;
  const hasFinal = (code - 0xac00) % 28 !== 0;
  return `${label}${hasFinal ? '을' : '를'} 입력해주세요`;
}

function NativeIcon({
  name,
  size,
  color,
}: {
  name: IconName;
  size: number;
  color: string;
}) {
  const strokeWidth = 2;
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  if (name === 'chevron-back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M15 18l-6-6 6-6" {...common} />
      </Svg>
    );
  }

  if (name === 'arrow-back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M19 12H5" {...common} />
        <Path d="M12 19l-7-7 7-7" {...common} />
      </Svg>
    );
  }

  if (name === 'color-palette-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 3C7 3 3 6.7 3 11.3 3 15.6 6.4 19 10.8 19h1.1c.9 0 1.4.8 1.2 1.5-.2.8.4 1.5 1.2 1.5 3.8-.5 6.7-3.8 6.7-7.8C21 8 17 3 12 3z"
          {...common}
        />
        <Circle cx="8" cy="10" r="1.2" fill={color} />
        <Circle cx="11.5" cy="7.7" r="1.2" fill={color} />
        <Circle cx="15.7" cy="10" r="1.2" fill={color} />
        <Circle cx="9.8" cy="14" r="1.2" fill={color} />
      </Svg>
    );
  }

  if (name === 'person-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="8" r="4" {...common} />
        <Path d="M4.5 20c1.4-4 4.1-6 7.5-6s6.1 2 7.5 6" {...common} />
      </Svg>
    );
  }

  if (name === 'mail-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="3" y="5" width="18" height="14" rx="3" {...common} />
        <Path d="M5 8l7 5 7-5" {...common} />
      </Svg>
    );
  }

  if (name === 'lock-closed-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="5" y="10" width="14" height="10" rx="2" {...common} />
        <Path d="M8 10V7a4 4 0 018 0v3" {...common} />
      </Svg>
    );
  }

  if (name === 'id-card-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="3" y="5" width="18" height="14" rx="2.5" {...common} />
        <Circle cx="9" cy="11" r="2" {...common} />
        <Path d="M6.5 16c.6-1.4 1.5-2 2.5-2s1.9.6 2.5 2M14 10h4M14 14h4" {...common} />
      </Svg>
    );
  }

  if (name === 'call-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M7.5 4.5l2 4-2 1.5c1.4 2.7 3.3 4.6 6 6l1.5-2 4 2c.5.2.8.8.6 1.3-.6 1.8-2 2.9-3.8 2.9C9.2 20.2 3.8 14.8 3.8 8.2c0-1.8 1.1-3.2 2.9-3.8.5-.2 1.1.1 1.3.6z"
          {...common}
        />
      </Svg>
    );
  }

  if (name === 'calendar-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="4" y="5" width="16" height="15" rx="2.5" {...common} />
        <Path d="M8 3v4M16 3v4M4 10h16" {...common} />
      </Svg>
    );
  }

  if (name === 'male-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="9" cy="15" r="5" {...common} />
        <Path d="M13 11l6-6M15 5h4v4" {...common} />
      </Svg>
    );
  }

  if (name === 'female-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="8" r="5" {...common} />
        <Path d="M12 13v8M8.5 17h7" {...common} />
      </Svg>
    );
  }

  if (name === 'link-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M10 13a5 5 0 007.1 0l2-2a5 5 0 00-7.1-7.1l-1.1 1.1" {...common} />
        <Path d="M14 11a5 5 0 00-7.1 0l-2 2A5 5 0 0012 20.1l1.1-1.1" {...common} />
      </Svg>
    );
  }

  if (name === 'eye-off-outline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 3l18 18" {...common} />
        <Path d="M10.6 10.6a2 2 0 002.8 2.8" {...common} />
        <Path d="M7.5 7.8C5.6 8.8 4.1 10.2 3 12c2.1 3.5 5.1 5.3 9 5.3 1.2 0 2.4-.2 3.4-.6" {...common} />
        <Path d="M13.8 6.9c3 .5 5.4 2.2 7.2 5.1-.6 1-1.4 1.9-2.2 2.6" {...common} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" {...common} />
      <Circle cx="12" cy="12" r="3" {...common} />
    </Svg>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  typePage: {
    flex: 1,
    backgroundColor: BRAND_CREAM,
  },
  typeContent: {
    minHeight: '100%',
    paddingHorizontal: 18,
  },
  typeHeader: {
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackButton: {
    position: 'absolute',
    left: 0,
    top: 34,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTitle: {
    color: BRAND_DARK,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  typeSubtitle: {
    marginTop: 8,
    color: '#666666',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
  typeCards: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  typeCardsCompact: {
    gap: 14,
    paddingTop: 10,
  },
  typeCardsTall: {
    gap: 24,
    paddingTop: 30,
    paddingBottom: 18,
  },
  typeCard: {
    minHeight: 270,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 34,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  typeCardCompact: {
    minHeight: 230,
    borderRadius: 26,
    paddingVertical: 24,
  },
  typeCardTall: {
    minHeight: 310,
  },
  typeCardFilled: {
    backgroundColor: BRAND_BROWN,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  typeCardLight: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(168,149,135,0.22)',
  },
  typeIconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  typeIconCircleCompact: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 18,
  },
  typeIconCircleFilled: {
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  typeIconCircleLight: {
    backgroundColor: BRAND_CREAM,
  },
  typeCardTitle: {
    color: BRAND_DARK,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  typeCardTitleFilled: {
    color: '#FFFFFF',
  },
  typeCardDescription: {
    marginTop: 9,
    color: 'rgba(62,53,47,0.70)',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
  typeCardDescriptionFilled: {
    color: 'rgba(255,255,255,0.82)',
  },
  formPage: {
    flex: 1,
    backgroundColor: CARD,
  },
  formHeader: {
    minHeight: 62,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 56,
    paddingBottom: 13,
    zIndex: 5,
  },
  formBackButton: {
    position: 'absolute',
    left: 16,
    bottom: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeaderTitle: {
    color: '#1F1F1F',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  formContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  progressiveHeader: {
    marginBottom: 24,
  },
  progressiveTitle: {
    color: '#1F1F1F',
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: 0,
  },
  progressiveCount: {
    marginTop: 8,
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 0,
  },
  currentFieldWrap: {
    marginBottom: 20,
  },
  inputOuter: {
    position: 'relative',
    minHeight: 58,
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 12,
    backgroundColor: CARD,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  floatingLabelWrap: {
    position: 'absolute',
    left: 14,
    top: -11,
    backgroundColor: CARD,
    paddingHorizontal: 8,
    zIndex: 3,
  },
  floatingLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0,
  },
  inputActionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 0,
  },
  inputSingleRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputInner: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 13,
  },
  textInput: {
    flex: 1,
    minHeight: 58,
    color: '#2C2C2C',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: 0,
    padding: 0,
    paddingRight: 12,
  },
  passwordInput: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: 'absolute',
    right: 8,
    top: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    alignSelf: 'stretch',
    minWidth: 90,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  helperText: {
    marginTop: 9,
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
  },
  helperSuccess: {
    color: SUCCESS,
  },
  helperError: {
    color: ERROR,
  },
  errorText: {
    marginTop: 9,
    color: ERROR,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  radioGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  radioButtonActive: {
    backgroundColor: '#D2B48C',
    borderColor: '#D2B48C',
  },
  radioText: {
    color: BRAND_DARK,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  radioTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  completedList: {
    marginTop: 16,
    gap: 8,
  },
  completedItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F6F2EE',
    padding: 12,
  },
  completedLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0,
  },
  completedValue: {
    marginTop: 4,
    color: '#1F1F1F',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: 0,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  prevButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButtonText: {
    color: BRAND_DARK,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 0,
  },
  nextButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  nextButtonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.45,
  },
  nextButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  nextButtonTextDisabled: {
    color: TEXT_SECONDARY,
  },
  disabledButton: {
    opacity: 0.5,
  },
  switchTypeButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  switchTypeText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
