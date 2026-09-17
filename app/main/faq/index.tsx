/**
 * FAQ + 챗봇 화면
 * - FAQ 탭: 아코디언 (콜센터 카드 없음)
 * - 챗봇 탭: 버튼 가지치기 방식 (답 못 찾을 때만 콜센터 안내)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
  FlatList,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DUMMY_FAQS } from '../../../data/dummyProgram';
import { CALL_CENTER_PHONE, CALL_CENTER_TEL } from '../../../lib/contact';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


// ── 챗봇 트리 정의 ────────────────────────────────────────
//
// 각 노드: { id, text, children?, answer?, showCallCenter? }
// - children 있으면 → 버튼 선택지 표시
// - answer 있으면   → 답변 말풍선 표시
// - showCallCenter  → 콜센터 번호 함께 안내

interface BotNode {
  id: string;
  label: string;           // 버튼에 표시할 짧은 텍스트
  answer?: string;         // 최종 답변
  showCallCenter?: boolean;
  children?: BotNode[];
}

const BOT_TREE: BotNode[] = [
  {
    id: 'register',
    label: '📋 자녀 등록 / 등록코드',
    children: [
      {
        id: 'reg-code',
        label: '등록코드를 못 받았어요',
        answer: '등록코드는 자녀가 등록된 캠퍼스 담당자에게 문의하시면 카카오톡 또는 문자로 발송됩니다. 코드는 1회만 사용 가능하며 30일 후 만료됩니다.',
      },
      {
        id: 'reg-multi',
        label: '자녀를 2명 이상 등록하고 싶어요',
        answer: '한 계정에 여러 자녀를 등록할 수 있습니다. 각 자녀의 등록코드를 순서대로 앱에 입력하면 됩니다. 앱 하단 "내 정보" 탭에서 연결된 자녀를 모두 확인할 수 있어요.',
      },
      {
        id: 'reg-expired',
        label: '등록코드가 만료되었어요',
        answer: '등록코드는 발급일로부터 30일 간 유효합니다. 만료된 경우 캠퍼스 담당자에게 코드 재발급을 요청해주세요.',
      },
    ],
  },
  {
    id: 'guardian',
    label: '👨‍👩‍👧 다른 보호자 초대',
    children: [
      {
        id: 'guardian-invite',
        label: '아빠 / 할머니도 앱을 쓰게 하고 싶어요',
        answer: '"내 정보" 탭의 자녀 카드에서 "보호자 초대" 버튼을 누르세요. 추가할 보호자의 전화번호를 입력하면, 해당 번호로 앱에 로그인했을 때 자동으로 연결됩니다.',
      },
      {
        id: 'guardian-remove',
        label: '보호자 연결을 해제하고 싶어요',
        answer: '현재 앱에서 보호자 연결 해제 기능은 지원하지 않습니다. 콜센터로 문의해주시면 처리해드립니다.',
        showCallCenter: true,
      },
    ],
  },
  {
    id: 'attendance',
    label: '📋 출결 / 피드백 확인',
    children: [
      {
        id: 'att-check',
        label: '자녀 출석 여부를 확인하고 싶어요',
        answer: '앱 하단 "출결·피드백" 탭에서 회차별 출결 상태를 실시간으로 확인하실 수 있습니다. 강사가 수업 시작 시 출결을 입력하면 즉시 반영됩니다.',
      },
      {
        id: 'att-feedback',
        label: '강사 피드백은 어디서 봐요?',
        answer: '"출결·피드백" 탭에서 각 수업 회차를 탭하면 강사 코멘트, 참여도, 잘한 점, 개선사항을 확인하실 수 있습니다. 수업 당일 강사가 입력하면 즉시 반영됩니다.',
      },
      {
        id: 'att-wrong',
        label: '출결이 잘못 기록된 것 같아요',
        answer: '출결 정정은 앱에서 직접 수정이 불가합니다. 담당 캠퍼스 또는 콜센터에 문의해주시면 확인 후 수정해드립니다.',
        showCallCenter: true,
      },
    ],
  },
  {
    id: 'report',
    label: '📊 학습 리포트',
    children: [
      {
        id: 'report-when',
        label: '리포트는 언제 나와요?',
        answer: '학습 리포트는 캠프 전체 프로그램 종료 후 영업일 기준 3~5일 이내에 앱의 "리포트" 탭에 업로드됩니다. 완료 시 푸시 알림으로 안내드립니다.',
      },
      {
        id: 'report-share',
        label: '리포트를 다른 사람과 공유하고 싶어요',
        answer: '"리포트" 탭에서 공유 버튼(🔗)을 탭하면 임시 링크가 생성됩니다. 링크는 7일 후 만료됩니다.',
      },
    ],
  },
  {
    id: 'program',
    label: '📚 프로그램 / 수업 일정',
    children: [
      {
        id: 'prog-schedule',
        label: '전체 수업 일정을 보고 싶어요',
        answer: '"프로그램" 탭에서 전체 회차 일정, 커리큘럼, 강사 정보를 확인하실 수 있습니다.',
      },
      {
        id: 'prog-change',
        label: '일정이 변경되었는데 어떻게 알 수 있나요?',
        answer: '일정 변경은 앱 홈 화면의 "공지사항" 섹션과 푸시 알림으로 즉시 안내드립니다. 중요 변경의 경우 문자로도 발송됩니다.',
      },
    ],
  },
  {
    id: 'login',
    label: '🔑 로그인 / 인증',
    children: [
      {
        id: 'login-otp',
        label: '인증번호가 오지 않아요',
        answer: '1~2분 기다린 후 재발송 버튼을 눌러주세요. 같은 번호로 5회 이상 실패하면 10분간 잠깁니다. 해외 번호는 지원하지 않습니다.',
      },
      {
        id: 'login-change',
        label: '전화번호가 바뀌었어요',
        answer: '전화번호 변경은 앱 내에서 직접 처리가 어렵습니다. 콜센터에 문의해주시면 본인 확인 후 변경해드립니다.',
        showCallCenter: true,
      },
    ],
  },
  {
    id: 'error',
    label: '⚠️ 앱 오류 / 기타 문의',
    answer: '앱을 완전히 종료 후 재시작해보세요. 최신 버전으로 업데이트되어 있는지도 확인해주세요.\n\n문제가 계속된다면 콜센터로 연락해주세요.',
    showCallCenter: true,
  },
];

// ── 타이핑 입력 → 트리 노드 매칭 ────────────────────────────

/** BOT_TREE를 재귀 탐색해 키워드에 맞는 최종 노드를 반환 */
const KEYWORD_MAP: { keywords: string[]; node: BotNode }[] = [
  { keywords: ['등록코드', '코드', '못 받', '발급'], node: BOT_TREE[0].children![0] },
  { keywords: ['자녀 2명', '두 명', '여러 자녀', '추가 등록'], node: BOT_TREE[0].children![1] },
  { keywords: ['코드 만료', '만료', '기간'], node: BOT_TREE[0].children![2] },
  { keywords: ['아빠', '할머니', '보호자 추가', '초대'], node: BOT_TREE[1].children![0] },
  { keywords: ['보호자 해제', '연결 해제'], node: BOT_TREE[1].children![1] },
  { keywords: ['출석', '출결', '결석', '지각', '출결 확인'], node: BOT_TREE[2].children![0] },
  { keywords: ['피드백', '강사 코멘트', '평가'], node: BOT_TREE[2].children![1] },
  { keywords: ['출결 오류', '출결 잘못', '정정'], node: BOT_TREE[2].children![2] },
  { keywords: ['리포트', '보고서', '성적'], node: BOT_TREE[3].children![0] },
  { keywords: ['리포트 공유', '공유'], node: BOT_TREE[3].children![1] },
  { keywords: ['수업 일정', '프로그램', '커리큘럼'], node: BOT_TREE[4].children![0] },
  { keywords: ['일정 변경', '공지', '변경'], node: BOT_TREE[4].children![1] },
  { keywords: ['인증번호', 'otp', '문자 안', '로그인'], node: BOT_TREE[5].children![0] },
  { keywords: ['전화번호 변경', '번호 바뀜', '번호 변경'], node: BOT_TREE[5].children![1] },
  { keywords: ['오류', '버그', '안 돼', '안되', '에러', '문제'], node: BOT_TREE[6] },
];

function findNodeByText(input: string): BotNode | null {
  const lower = input.toLowerCase();
  for (const { keywords, node } of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return node;
  }
  return null;
}

// ── 메시지 타입 ────────────────────────────────────────────

type MsgRole = 'user' | 'bot';

interface ChatMsg {
  id: string;
  role: MsgRole;
  text: string;
  /** bot 메시지에 붙는 선택지 버튼 */
  options?: BotNode[];
  /** 답변 후 선택지 비활성화 여부 */
  optionsUsed?: boolean;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────

type TabType = 'faq' | 'chatbot';

export default function FaqScreen() {
  const insets = useSafeAreaInsets();
  // tab=chatbot 으로 들어오면 챗봇 탭부터 (회차 Q&A 의 "챗봇에게 묻기")
  const params = useLocalSearchParams<{ tab?: string; from?: string }>();
  const [activeTab, setActiveTab] = useState<TabType>(params.tab === 'chatbot' ? 'chatbot' : 'faq');
  // 숨김 탭 화면은 한 번 열리면 유지되므로, 다시 들어올 때 주소의 탭을 반영
  useEffect(() => {
    setActiveTab(params.tab === 'chatbot' ? 'chatbot' : 'faq');
  }, [params.tab]);
  const backLabel = params.from === 'session' ? '← 회차로' : params.from ? '← 이전' : '← 홈';

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/main'))}
          style={styles.backBtn}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>{backLabel}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>고객 지원</Text>
        <Text style={styles.headerSub}>궁금한 내용을 빠르게 해결해드립니다.</Text>

        <View style={styles.tabRow}>
          {(['faq', 'chatbot'] as TabType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'faq' ? '📋  자주 묻는 질문' : '🤖  챗봇 상담'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'faq' ? <FaqTab insets={insets} /> : <ChatbotTab insets={insets} />}
    </View>
  );
}

// ── FAQ 탭 ────────────────────────────────────────────────

function FaqTab({ insets }: { insets: ReturnType<typeof useSafeAreaInsets> }) {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.faqSection}>
        {DUMMY_FAQS.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggle(faq.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqQLeft}>
                  <View style={styles.faqIndex}>
                    <Text style={styles.faqIndexText}>Q</Text>
                  </View>
                  <Text style={[styles.faqQText, isOpen && styles.faqQTextOpen]}>
                    {faq.question}
                  </Text>
                </View>
                <Text style={[styles.faqChevron, isOpen && styles.faqChevronOpen]}>›</Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.faqAnswer}>
                  <View style={styles.faqABadge}>
                    <Text style={styles.faqABadgeText}>A</Text>
                  </View>
                  <Text style={styles.faqAText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── 챗봇 탭 ──────────────────────────────────────────────

const INITIAL_MESSAGES: ChatMsg[] = [
  {
    id: 'bot-welcome',
    role: 'bot',
    text: '안녕하세요! ThinkCampus 챗봇입니다 🎓\n무엇을 도와드릴까요?',
    options: BOT_TREE,
  },
];

function ChatbotTab({ insets }: { insets: ReturnType<typeof useSafeAreaInsets> }) {
  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const flatRef = useRef<FlatList>(null);

  function openCallCenter() {
    const url = CALL_CENTER_TEL;
    Linking.canOpenURL(url).then((can) => {
      if (can) Linking.openURL(url);
      else Alert.alert('콜센터', `${CALL_CENTER_PHONE}\n평일 09:00~18:00`);
    });
  }

  /** 직접 타이핑해서 보낼 때 */
  async function handleSendText() {
    const text = inputText.trim();
    if (!text || isTyping) return;
    setInputText('');

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));
    setIsTyping(false);

    const matched = findNodeByText(text);

    if (matched) {
      if (matched.children) {
        // 중간 카테고리 — 하위 선택지 제공
        const botMsg: ChatMsg = {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: '어떤 내용인지 조금 더 알려주세요.',
          options: matched.children,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        // 최종 답변
        const botMsg: ChatMsg = {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: matched.answer ?? '확인 중입니다.',
        };
        setMessages((prev) => [...prev, botMsg]);

        if (matched.showCallCenter) {
          await new Promise((r) => setTimeout(r, 300));
          setMessages((prev) => [
            ...prev,
            {
              id: `call-${Date.now()}`,
              role: 'bot',
              text: `📞 콜센터: ${CALL_CENTER_PHONE}\n평일 09:00~18:00`,
            },
          ]);
        }

        await new Promise((r) => setTimeout(r, 400));
        setMessages((prev) => [
          ...prev,
          {
            id: `restart-${Date.now()}`,
            role: 'bot',
            text: '다른 궁금한 점이 있으신가요?',
            options: BOT_TREE,
          },
        ]);
      }
    } else {
      // 매칭 실패 → 콜센터 안내 + 메뉴 재표시
      const botMsg: ChatMsg = {
        id: `b-${Date.now()}`,
        role: 'bot',
        text: '죄송합니다, 해당 내용을 찾지 못했습니다.\n아래 항목을 선택하거나 콜센터로 문의해주세요.',
      };
      setMessages((prev) => [...prev, botMsg]);

      await new Promise((r) => setTimeout(r, 300));
      setMessages((prev) => [
        ...prev,
        {
          id: `call-${Date.now()}`,
          role: 'bot',
          text: `📞 콜센터: ${CALL_CENTER_PHONE}\n평일 09:00~18:00`,
        },
        {
          id: `restart-${Date.now()}`,
          role: 'bot',
          text: '아니면 아래 항목에서 선택해주세요.',
          options: BOT_TREE,
        },
      ]);
    }
  }

  async function handleSelect(node: BotNode, parentMsgId: string) {
    // 선택지 비활성화
    setMessages((prev) =>
      prev.map((m) => (m.id === parentMsgId ? { ...m, optionsUsed: true } : m)),
    );

    // 사용자 선택 버블 추가
    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: node.label.replace(/^[\p{Emoji}\s]+/u, '').trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    setIsTyping(false);

    if (node.children) {
      // 하위 선택지 제공
      const botMsg: ChatMsg = {
        id: `b-${Date.now()}`,
        role: 'bot',
        text: '어떤 내용인지 조금 더 알려주세요.',
        options: node.children,
      };
      setMessages((prev) => [...prev, botMsg]);
    } else {
      // 최종 답변
      const botMsg: ChatMsg = {
        id: `b-${Date.now()}`,
        role: 'bot',
        text: node.answer ?? '확인 중입니다.',
        ...(node.showCallCenter && { options: undefined }),
      };
      setMessages((prev) => [...prev, botMsg]);

      // 콜센터 안내 필요한 경우 별도 메시지
      if (node.showCallCenter) {
        await new Promise((r) => setTimeout(r, 300));
        const callMsg: ChatMsg = {
          id: `call-${Date.now()}`,
          role: 'bot',
          text: `📞 콜센터: ${CALL_CENTER_PHONE}\n평일 09:00~18:00`,
          options: undefined,
        };
        setMessages((prev) => [...prev, callMsg]);
      }

      // 처음부터 다시 안내
      await new Promise((r) => setTimeout(r, 400));
      const restartMsg: ChatMsg = {
        id: `restart-${Date.now()}`,
        role: 'bot',
        text: '다른 궁금한 점이 있으신가요?',
        options: BOT_TREE,
      };
      setMessages((prev) => [...prev, restartMsg]);
    }
  }

  // 새 메시지 추가될 때 스크롤
  useEffect(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, isTyping]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[
          styles.chatContent,
          { paddingBottom: 16, flexGrow: 1, justifyContent: 'flex-end' },
        ]}
        onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <ChatBubble
            msg={item}
            onSelect={(node) => handleSelect(node, item.id)}
            onCall={openCallCenter}
          />
        )}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.botRow}>
              <View style={styles.botAvatar}>
                <Text style={styles.botAvatarText}>TC</Text>
              </View>
              <View style={styles.typingBubble}>
                <Text style={styles.typingDot}>●  ●  ●</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* 텍스트 입력창 */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder="직접 입력하세요…"
          placeholderTextColor="#9ca3af"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendText}
          returnKeyType="send"
          multiline={false}
          editable={!isTyping}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
          onPress={handleSendText}
          disabled={!inputText.trim() || isTyping}
        >
          <Text style={styles.sendBtnText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── 채팅 버블 ─────────────────────────────────────────────

function ChatBubble({
  msg,
  onSelect,
  onCall,
}: {
  msg: ChatMsg;
  onSelect: (node: BotNode) => void;
  onCall: () => void;
}) {
  const isBot = msg.role === 'bot';
  const isCallMsg = msg.text.startsWith('📞 콜센터');

  if (isBot) {
    return (
      <View style={styles.botRow}>
        <View style={[styles.botAvatar, isCallMsg && styles.botAvatarCall]}>
          <Text style={styles.botAvatarText}>{isCallMsg ? '📞' : 'TC'}</Text>
        </View>
        <View style={styles.botBubbleWrap}>
          {/* 텍스트 말풍선 */}
          <TouchableOpacity
            activeOpacity={isCallMsg ? 0.7 : 1}
            onPress={isCallMsg ? onCall : undefined}
          >
            <View style={[styles.botBubble, isCallMsg && styles.botBubbleCall]}>
              <Text style={[styles.botText, isCallMsg && styles.botTextCall]}>
                {msg.text}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 선택지 버튼들 */}
          {msg.options && !msg.optionsUsed && (
            <View style={styles.optionsWrap}>
              {msg.options.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.optionBtn}
                  onPress={() => onSelect(opt)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 사용된 선택지 — 흐리게 표시 */}
          {msg.options && msg.optionsUsed && (
            <View style={styles.optionsWrapUsed}>
              {msg.options.map((opt) => (
                <View key={opt.id} style={styles.optionBtnUsed}>
                  <Text style={styles.optionTextUsed}>{opt.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // 사용자 버블
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{msg.text}</Text>
      </View>
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { marginBottom: 10 },
  backText: { fontSize: 16, color: '#1d4ed8', fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 2 },
  headerSub: { fontSize: 15, color: '#6b7280', marginBottom: 14 },

  tabRow: { flexDirection: 'row' },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#1d4ed8' },
  tabText: { fontSize: 15, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#1d4ed8' },

  tabContent: { paddingTop: 16 },

  // FAQ
  faqSection: {
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 14,
  },
  faqItem: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  faqQuestion: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  faqQLeft: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, flex: 1, paddingRight: 8,
  },
  faqIndex: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  faqIndexText: { fontSize: 14, fontWeight: '800', color: '#1d4ed8' },
  faqQText: { flex: 1, fontSize: 16, color: '#374151', lineHeight: 25, fontWeight: '500' },
  faqQTextOpen: { color: '#1d4ed8', fontWeight: '700' },
  faqChevron: { fontSize: 22, color: '#6b7280' },
  faqChevronOpen: { transform: [{ rotate: '90deg' }], color: '#1d4ed8' },
  faqAnswer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4,
    backgroundColor: '#f8fafc',
  },
  faqABadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  faqABadgeText: { fontSize: 14, fontWeight: '800', color: '#16a34a' },
  faqAText: { flex: 1, fontSize: 16, color: '#374151', lineHeight: 25 },

  // 챗봇
  chatContent: { paddingTop: 16, paddingHorizontal: 14 },

  botRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, marginBottom: 14,
  },
  botAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1d4ed8',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  botAvatarCall: { backgroundColor: '#16a34a' },
  botAvatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  botBubbleWrap: { flex: 1, maxWidth: '90%' },
  botBubble: {
    backgroundColor: '#ffffff', borderRadius: 16, borderTopLeftRadius: 4,
    padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8,
  },
  botBubbleCall: {
    backgroundColor: '#f0fdf4', borderColor: '#bbf7d0',
  },
  botText: { fontSize: 16, color: '#111827', lineHeight: 24 },
  botTextCall: { color: '#15803d', fontWeight: '600' },

  // 선택지 버튼 (활성)
  optionsWrap: { gap: 6 },
  optionBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  optionText: { fontSize: 15, color: '#1d4ed8', fontWeight: '600' },

  // 선택지 버튼 (비활성 — 사용 후)
  optionsWrapUsed: { gap: 4 },
  optionBtnUsed: {
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  optionTextUsed: { fontSize: 14, color: '#d1d5db' },

  // 사용자 버블
  userRow: { alignItems: 'flex-end', marginBottom: 14 },
  userBubble: {
    backgroundColor: '#1d4ed8', borderRadius: 16, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    maxWidth: '75%',
  },
  userText: { fontSize: 16, color: '#ffffff', lineHeight: 24 },

  // 입력창
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  inputField: {
    flex: 1, backgroundColor: '#f9fafb',
    borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 16, color: '#111827',
    borderWidth: 1, borderColor: '#e5e7eb',
    maxHeight: 44,
  },
  sendBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  sendBtnDisabled: { backgroundColor: '#bfdbfe' },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // 타이핑 인디케이터
  typingBubble: {
    backgroundColor: '#ffffff', borderRadius: 16, borderTopLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  typingDot: { fontSize: 14, color: '#6b7280', letterSpacing: 2 },
});
