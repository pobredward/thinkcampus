/**
 * 홈 — 보호자 이름이 없는 계정에 한 번 묻는 카드 (예전에 가입했거나 초대받아 로그인한 보호자)
 *
 *   학부모님 성함을 알려 주세요
 *   [보호자 이름 ____________]
 *   [나중에]  [저장]
 *
 * 저장하면 인사말이 바로 "환영합니다, OOO 학부모님" 으로 바뀐다.
 * [나중에]를 누르면 앱이 켜져 있는 동안 다시 묻지 않는다 (내 정보에서 언제든 입력).
 * (웹 web/src/components/GuardianNamePrompt.tsx 와 같은 구성)
 */

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { guardianNameSaveError } from '../hooks/useGuardianName';
import { GUARDIAN_NAME_MAX, guardianNameError } from '../lib/guardianName';
import { C } from '../lib/theme';

export function GuardianNamePrompt({
  onSave,
  onLater,
}: {
  onSave: (name: string) => Promise<unknown>;
  onLater: () => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const empty = !value.trim();

  async function submit() {
    const invalid = guardianNameError(value);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
    } catch (e) {
      setError(guardianNameSaveError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card} accessibilityLabel="보호자 이름 입력">
      <Text style={styles.title} accessibilityRole="header">
        학부모님 성함을 알려 주세요
      </Text>
      <Text style={styles.desc} lineBreakStrategyIOS="hangul-word">
        홈에서 이름으로 인사드려요. 내 정보에서 언제든 바꿀 수 있어요.
      </Text>

      <Text style={styles.label} nativeID="guardianNameLabel">
        보호자 이름
      </Text>
      <TextInput
        style={[styles.input, !!error && styles.inputError]}
        placeholder="예: 홍길동"
        placeholderTextColor={C.faint}
        value={value}
        onChangeText={(t) => {
          setValue(t);
          if (error) setError(null);
        }}
        maxLength={GUARDIAN_NAME_MAX}
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        accessibilityLabel="보호자 이름"
        aria-labelledby="guardianNameLabel"
      />
      {!!error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <View style={styles.row}>
        <TouchableOpacity style={styles.later} onPress={onLater} accessibilityRole="button" activeOpacity={0.7}>
          <Text style={styles.laterText}>나중에</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.save, (empty || saving) && styles.saveDisabled]}
          onPress={() => void submit()}
          disabled={empty || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: empty || saving }}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={C.onGold} />
          ) : (
            <Text style={[styles.saveText, empty && styles.saveTextDisabled]}>저장</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.goldDim,
    backgroundColor: C.card,
  },
  title: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: C.text },
  desc: { marginTop: 4, fontSize: 15, lineHeight: 22, color: C.sub },
  label: { marginTop: 16, marginBottom: 8, fontSize: 15, fontWeight: '600', color: C.text2 },
  input: {
    borderWidth: 1.5,
    borderColor: C.line2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 17,
    color: C.text,
    backgroundColor: C.elev,
  },
  inputError: { borderColor: C.danger },
  error: { marginTop: 8, fontSize: 15, color: C.danger },
  row: { marginTop: 16, flexDirection: 'row', gap: 8 },
  later: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line2,
    backgroundColor: C.elev,
  },
  laterText: { fontSize: 17, fontWeight: '600', color: C.text2 },
  save: { flex: 2, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: C.gold },
  saveDisabled: { backgroundColor: C.line2 },
  saveText: { fontSize: 17, fontWeight: '700', color: C.onGold },
  saveTextDisabled: { color: C.faint },
});
