"use client";

/**
 * FAQ + 챗봇 화면 (모바일 app/main/faq/index.tsx)
 * - FAQ 탭: 아코디언 (콜센터 카드 없음)
 * - 챗봇 탭: 버튼 가지치기 방식 (답 못 찾을 때만 콜센터 안내)
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBack } from "@/hooks/useBack";
import { Collapse } from "@/components/ui/Collapse";
import { DUMMY_FAQS } from "@/data/dummyProgram";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CALL_CENTER_PHONE, CALL_CENTER_TEL } from "@/lib/contact";

// ── 챗봇 트리 정의 ────────────────────────────────────────
//
// 각 노드: { id, text, children?, answer?, showCallCenter? }
// - children 있으면 → 버튼 선택지 표시
// - answer 있으면   → 답변 말풍선 표시
// - showCallCenter  → 콜센터 번호 함께 안내

interface BotNode {
  id: string;
  label: string; // 버튼에 표시할 짧은 텍스트
  answer?: string; // 최종 답변
  showCallCenter?: boolean;
  children?: BotNode[];
}

const BOT_TREE: BotNode[] = [
  {
    id: "register",
    label: "📋 자녀 등록 / 등록코드",
    children: [
      {
        id: "reg-code",
        label: "등록코드를 못 받았어요",
        answer:
          "등록코드는 자녀가 등록된 캠퍼스 담당자에게 문의하시면 카카오톡 또는 문자로 발송됩니다. 코드는 1회만 사용 가능하며 30일 후 만료됩니다.",
      },
      {
        id: "reg-multi",
        label: "자녀를 2명 이상 등록하고 싶어요",
        answer:
          '한 계정에 여러 자녀를 등록할 수 있습니다. 각 자녀의 등록코드를 순서대로 앱에 입력하면 됩니다. 앱 하단 "내 정보" 탭에서 연결된 자녀를 모두 확인할 수 있어요.',
      },
      {
        id: "reg-expired",
        label: "등록코드가 만료되었어요",
        answer:
          "등록코드는 발급일로부터 30일 간 유효합니다. 만료된 경우 캠퍼스 담당자에게 코드 재발급을 요청해주세요.",
      },
    ],
  },
  {
    id: "guardian",
    label: "👨‍👩‍👧 다른 보호자 초대",
    children: [
      {
        id: "guardian-invite",
        label: "아빠 / 할머니도 앱을 쓰게 하고 싶어요",
        answer:
          '"내 정보" 탭의 자녀 카드에서 "보호자 초대" 버튼을 누르세요. 추가할 보호자의 전화번호를 입력하면, 해당 번호로 앱에 로그인했을 때 자동으로 연결됩니다.',
      },
      {
        id: "guardian-remove",
        label: "보호자 연결을 해제하고 싶어요",
        answer:
          "현재 앱에서 보호자 연결 해제 기능은 지원하지 않습니다. 콜센터로 문의해주시면 처리해드립니다.",
        showCallCenter: true,
      },
    ],
  },
  {
    id: "attendance",
    label: "📋 출결 / 피드백 확인",
    children: [
      {
        id: "att-check",
        label: "자녀 출석 여부를 확인하고 싶어요",
        answer:
          '앱 하단 "출결·피드백" 탭에서 회차별 출결 상태를 실시간으로 확인하실 수 있습니다. 강사가 수업 시작 시 출결을 입력하면 즉시 반영됩니다.',
      },
      {
        id: "att-feedback",
        label: "강사 피드백은 어디서 봐요?",
        answer:
          '"출결·피드백" 탭에서 각 수업 회차를 탭하면 강사 코멘트, 참여도, 잘한 점, 개선사항을 확인하실 수 있습니다. 수업 당일 강사가 입력하면 즉시 반영됩니다.',
      },
      {
        id: "att-wrong",
        label: "출결이 잘못 기록된 것 같아요",
        answer:
          "출결 정정은 앱에서 직접 수정이 불가합니다. 담당 캠퍼스 또는 콜센터에 문의해주시면 확인 후 수정해드립니다.",
        showCallCenter: true,
      },
    ],
  },
  {
    id: "report",
    label: "📊 학습 리포트",
    children: [
      {
        id: "report-when",
        label: "리포트는 언제 나와요?",
        answer:
          '학습 리포트는 캠프 전체 프로그램 종료 후 영업일 기준 3~5일 이내에 앱의 "리포트" 탭에 업로드됩니다. 완료 시 푸시 알림으로 안내드립니다.',
      },
      {
        id: "report-share",
        label: "리포트를 다른 사람과 공유하고 싶어요",
        answer:
          '"리포트" 탭에서 공유 버튼(🔗)을 탭하면 임시 링크가 생성됩니다. 링크는 7일 후 만료됩니다.',
      },
    ],
  },
  {
    id: "program",
    label: "📚 프로그램 / 수업 일정",
    children: [
      {
        id: "prog-schedule",
        label: "전체 수업 일정을 보고 싶어요",
        answer: '"프로그램" 탭에서 전체 회차 일정, 커리큘럼, 강사 정보를 확인하실 수 있습니다.',
      },
      {
        id: "prog-change",
        label: "일정이 변경되었는데 어떻게 알 수 있나요?",
        answer:
          '일정 변경은 앱 홈 화면의 "공지사항" 섹션과 푸시 알림으로 즉시 안내드립니다. 중요 변경의 경우 문자로도 발송됩니다.',
      },
    ],
  },
  {
    id: "login",
    label: "🔑 로그인 / 인증",
    children: [
      {
        id: "login-otp",
        label: "인증번호가 오지 않아요",
        answer:
          "1~2분 기다린 후 재발송 버튼을 눌러주세요. 같은 번호로 5회 이상 실패하면 10분간 잠깁니다. 해외 번호는 지원하지 않습니다.",
      },
      {
        id: "login-change",
        label: "전화번호가 바뀌었어요",
        answer:
          "전화번호 변경은 앱 내에서 직접 처리가 어렵습니다. 콜센터에 문의해주시면 본인 확인 후 변경해드립니다.",
        showCallCenter: true,
      },
    ],
  },
  {
    id: "error",
    label: "⚠️ 앱 오류 / 기타 문의",
    answer:
      "앱을 완전히 종료 후 재시작해보세요. 최신 버전으로 업데이트되어 있는지도 확인해주세요.\n\n문제가 계속된다면 콜센터로 연락해주세요.",
    showCallCenter: true,
  },
];

// ── 타이핑 입력 → 트리 노드 매칭 ────────────────────────────

/** BOT_TREE를 재귀 탐색해 키워드에 맞는 최종 노드를 반환 */
const KEYWORD_MAP: { keywords: string[]; node: BotNode }[] = [
  { keywords: ["등록코드", "코드", "못 받", "발급"], node: BOT_TREE[0].children![0] },
  { keywords: ["자녀 2명", "두 명", "여러 자녀", "추가 등록"], node: BOT_TREE[0].children![1] },
  { keywords: ["코드 만료", "만료", "기간"], node: BOT_TREE[0].children![2] },
  { keywords: ["아빠", "할머니", "보호자 추가", "초대"], node: BOT_TREE[1].children![0] },
  { keywords: ["보호자 해제", "연결 해제"], node: BOT_TREE[1].children![1] },
  { keywords: ["출석", "출결", "결석", "지각", "출결 확인"], node: BOT_TREE[2].children![0] },
  { keywords: ["피드백", "강사 코멘트", "평가"], node: BOT_TREE[2].children![1] },
  { keywords: ["출결 오류", "출결 잘못", "정정"], node: BOT_TREE[2].children![2] },
  { keywords: ["리포트", "보고서", "성적"], node: BOT_TREE[3].children![0] },
  { keywords: ["리포트 공유", "공유"], node: BOT_TREE[3].children![1] },
  { keywords: ["수업 일정", "프로그램", "커리큘럼"], node: BOT_TREE[4].children![0] },
  { keywords: ["일정 변경", "공지", "변경"], node: BOT_TREE[4].children![1] },
  { keywords: ["인증번호", "otp", "문자 안", "로그인"], node: BOT_TREE[5].children![0] },
  { keywords: ["전화번호 변경", "번호 바뀜", "번호 변경"], node: BOT_TREE[5].children![1] },
  { keywords: ["오류", "버그", "안 돼", "안되", "에러", "문제"], node: BOT_TREE[6] },
];

function findNodeByText(input: string): BotNode | null {
  const lower = input.toLowerCase();
  for (const { keywords, node } of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return node;
  }
  return null;
}

// ── 메시지 타입 ────────────────────────────────────────────

/** 메시지 id — `${prefix}-${Date.now()}` (원본과 동일한 형식) */
function msgId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

type MsgRole = "user" | "bot";

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

type TabType = "faq" | "chatbot";

export default function FaqScreen() {
  usePageTitle("FAQ");
  const goBack = useBack("/main");
  // ?tab=chatbot 으로 들어오면 챗봇 탭부터 (회차 Q&A 의 "챗봇에게 묻기")
  const sp = useSearchParams();
  const initialTab: TabType = sp.get("tab") === "chatbot" ? "chatbot" : "faq";
  const backLabel = sp.get("from") === "session" ? "← 회차로" : "← 홈";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc]">
      {/* 헤더 */}
      <div
        className="sticky top-0 z-10 flex flex-col border-b border-gray-100 bg-white px-5 pb-0"
        style={{ paddingTop: "calc(var(--sat) + 12px)" }}
      >
        <button type="button" onClick={goBack} className="tap mb-[10px] self-start">
          <span className="text-[16px] font-medium text-brand">{backLabel}</span>
        </button>
        <h1 className="mb-[2px] text-[24px] font-bold text-gray-900">고객 지원</h1>
        <p className="mb-[14px] text-[15px] text-gray-500">궁금한 내용을 빠르게 해결해드립니다.</p>

        <div role="tablist" className="flex">
          {(["faq", "chatbot"] as TabType[]).map((t) => {
            const active = activeTab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t)}
                className={`tap flex flex-1 items-center justify-center border-b-2 py-3 ${
                  active ? "border-brand" : "border-transparent"
                }`}
              >
                <span
                  className={`whitespace-pre text-[15px] font-semibold ${
                    active ? "text-brand" : "text-gray-500"
                  }`}
                >
                  {t === "faq" ? "📋  자주 묻는 질문" : "🤖  챗봇 상담"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "faq" ? <FaqTab /> : <ChatbotTab />}
    </div>
  );
}

// ── FAQ 탭 ────────────────────────────────────────────────

function FaqTab() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col pt-4 pb-8">
      <div className="mx-5 mb-[14px] overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {DUMMY_FAQS.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div key={faq.id} className="border-b border-gray-100">
              <button
                type="button"
                onClick={() => toggle(faq.id)}
                aria-expanded={isOpen}
                className="tap flex w-full items-center justify-between p-4 text-left"
              >
                <span className="flex min-w-0 flex-1 items-start gap-[10px] pr-2">
                  <span className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[11px] bg-blue-50">
                    <span className="text-[14px] font-extrabold text-brand">Q</span>
                  </span>
                  <span
                    className={`flex-1 text-[16px] leading-[25px] ${
                      isOpen ? "font-bold text-brand" : "font-medium text-gray-700"
                    }`}
                  >
                    {faq.question}
                  </span>
                </span>
                <span
                  className={`inline-block text-[22px] ${
                    isOpen ? "rotate-90 text-brand" : "text-gray-500"
                  }`}
                >
                  ›
                </span>
              </button>

              <Collapse open={isOpen}>
                <div className="flex items-start gap-[10px] bg-[#f8fafc] px-4 pt-1 pb-4">
                  <span className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[11px] bg-[#dcfce7]">
                    <span className="text-[14px] font-extrabold text-green-600">A</span>
                  </span>
                  <p className="flex-1 text-[16px] leading-[25px] text-gray-700">{faq.answer}</p>
                </div>
              </Collapse>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 챗봇 탭 ──────────────────────────────────────────────

const INITIAL_MESSAGES: ChatMsg[] = [
  {
    id: "bot-welcome",
    role: "bot",
    text: "안녕하세요! ThinkCampus 챗봇입니다 🎓\n무엇을 도와드릴까요?",
    options: BOT_TREE,
  },
];

/** 하단 탭바(메인 레이아웃) 높이 — 입력창은 그 바로 위에 고정된다 */
const TABBAR_OFFSET = "calc(var(--tabbar-h) + var(--sab))";

function ChatbotTab() {
  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  function openCallCenter() {
    window.location.href = CALL_CENTER_TEL;
  }

  /** 직접 타이핑해서 보낼 때 */
  async function handleSendText() {
    const text = inputText.trim();
    if (!text || isTyping) return;
    setInputText("");

    const userMsg: ChatMsg = { id: msgId("u"), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));
    setIsTyping(false);

    const matched = findNodeByText(text);

    if (matched) {
      if (matched.children) {
        // 중간 카테고리 — 하위 선택지 제공
        const botMsg: ChatMsg = {
          id: msgId("b"),
          role: "bot",
          text: "어떤 내용인지 조금 더 알려주세요.",
          options: matched.children,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        // 최종 답변
        const botMsg: ChatMsg = {
          id: msgId("b"),
          role: "bot",
          text: matched.answer ?? "확인 중입니다.",
        };
        setMessages((prev) => [...prev, botMsg]);

        if (matched.showCallCenter) {
          await new Promise((r) => setTimeout(r, 300));
          setMessages((prev) => [
            ...prev,
            {
              id: msgId("call"),
              role: "bot",
              text: `📞 콜센터: ${CALL_CENTER_PHONE}\n평일 09:00~18:00`,
            },
          ]);
        }

        await new Promise((r) => setTimeout(r, 400));
        setMessages((prev) => [
          ...prev,
          {
            id: msgId("restart"),
            role: "bot",
            text: "다른 궁금한 점이 있으신가요?",
            options: BOT_TREE,
          },
        ]);
      }
    } else {
      // 매칭 실패 → 콜센터 안내 + 메뉴 재표시
      const botMsg: ChatMsg = {
        id: msgId("b"),
        role: "bot",
        text: "죄송합니다, 해당 내용을 찾지 못했습니다.\n아래 항목을 선택하거나 콜센터로 문의해주세요.",
      };
      setMessages((prev) => [...prev, botMsg]);

      await new Promise((r) => setTimeout(r, 300));
      setMessages((prev) => [
        ...prev,
        {
          id: msgId("call"),
          role: "bot",
          text: `📞 콜센터: ${CALL_CENTER_PHONE}\n평일 09:00~18:00`,
        },
        {
          id: msgId("restart"),
          role: "bot",
          text: "아니면 아래 항목에서 선택해주세요.",
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
      id: msgId("u"),
      role: "user",
      text: node.label.replace(/^[\p{Emoji}\s]+/u, "").trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    setIsTyping(false);

    if (node.children) {
      // 하위 선택지 제공
      const botMsg: ChatMsg = {
        id: msgId("b"),
        role: "bot",
        text: "어떤 내용인지 조금 더 알려주세요.",
        options: node.children,
      };
      setMessages((prev) => [...prev, botMsg]);
    } else {
      // 최종 답변
      const botMsg: ChatMsg = {
        id: msgId("b"),
        role: "bot",
        text: node.answer ?? "확인 중입니다.",
        ...(node.showCallCenter && { options: undefined }),
      };
      setMessages((prev) => [...prev, botMsg]);

      // 콜센터 안내 필요한 경우 별도 메시지
      if (node.showCallCenter) {
        await new Promise((r) => setTimeout(r, 300));
        const callMsg: ChatMsg = {
          id: msgId("call"),
          role: "bot",
          text: `📞 콜센터: ${CALL_CENTER_PHONE}\n평일 09:00~18:00`,
          options: undefined,
        };
        setMessages((prev) => [...prev, callMsg]);
      }

      // 처음부터 다시 안내
      await new Promise((r) => setTimeout(r, 400));
      const restartMsg: ChatMsg = {
        id: msgId("restart"),
        role: "bot",
        text: "다른 궁금한 점이 있으신가요?",
        options: BOT_TREE,
      };
      setMessages((prev) => [...prev, restartMsg]);
    }
  }

  // 새 메시지 추가될 때 스크롤
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const sendDisabled = !inputText.trim() || isTyping;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-end px-[14px] pt-4 pb-4">
        {messages.map((item) => (
          <ChatBubble
            key={item.id}
            msg={item}
            onSelect={(node) => void handleSelect(node, item.id)}
            onCall={openCallCenter}
          />
        ))}

        {isTyping && (
          <div className="mb-[14px] flex items-start gap-2">
            <div className="mt-[2px] flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand">
              <span className="text-[14px] font-extrabold text-white">TC</span>
            </div>
            <div className="rounded-2xl rounded-tl-[4px] border border-gray-200 bg-white px-[14px] py-3">
              <span className="whitespace-pre text-[14px] tracking-[2px] text-gray-500">
                ●  ●  ●
              </span>
            </div>
          </div>
        )}

        {/* 스크롤 기준점 — 하단 입력창 + 탭바에 가리지 않도록 여백 */}
        <div
          ref={endRef}
          aria-hidden="true"
          style={{ scrollMarginBottom: `calc(${TABBAR_OFFSET} + 64px)` }}
        />
      </div>

      {/* 텍스트 입력창 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendText();
        }}
        className="sticky z-10 flex items-center gap-2 border-t border-gray-100 bg-white px-[14px] py-[10px]"
        style={{ bottom: TABBAR_OFFSET }}
      >
        <input
          type="text"
          placeholder="직접 입력하세요…"
          aria-label="질문 입력"
          enterKeyHint="send"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isTyping}
          className="max-h-[44px] min-w-0 flex-1 rounded-[22px] border border-gray-200 bg-gray-50 px-[14px] py-[9px] text-[16px] text-gray-900"
        />
        <button
          type="submit"
          disabled={sendDisabled}
          className={`tap shrink-0 rounded-[20px] px-4 py-[9px] ${
            sendDisabled ? "bg-blue-200" : "bg-brand"
          }`}
        >
          <span className="text-[16px] font-bold text-white">전송</span>
        </button>
      </form>
    </div>
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
  const isBot = msg.role === "bot";
  const isCallMsg = msg.text.startsWith("📞 콜센터");

  if (isBot) {
    const bubble = (
      <div
        className={`mb-2 rounded-2xl rounded-tl-[4px] border p-3 ${
          isCallMsg ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
        }`}
      >
        <p
          className={`whitespace-pre-line break-words text-[16px] leading-[24px] ${
            isCallMsg ? "font-semibold text-[#15803d]" : "text-gray-900"
          }`}
        >
          {msg.text}
        </p>
      </div>
    );

    return (
      <div className="mb-[14px] flex items-start gap-2">
        <div
          className={`mt-[2px] flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ${
            isCallMsg ? "bg-green-600" : "bg-brand"
          }`}
        >
          <span className="text-[14px] font-extrabold text-white">{isCallMsg ? "📞" : "TC"}</span>
        </div>
        <div className="min-w-0 max-w-[90%] flex-1">
          {/* 텍스트 말풍선 */}
          {isCallMsg ? (
            <button type="button" onClick={onCall} className="tap block w-full text-left">
              {bubble}
            </button>
          ) : (
            bubble
          )}

          {/* 선택지 버튼들 */}
          {msg.options && !msg.optionsUsed && (
            <div className="flex flex-col gap-[6px]">
              {msg.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelect(opt)}
                  className="tap rounded-[10px] border border-blue-200 bg-blue-50 px-[14px] py-[10px] text-left"
                >
                  <span className="text-[15px] font-semibold text-brand">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 사용된 선택지 — 흐리게 표시 */}
          {msg.options && msg.optionsUsed && (
            <div className="flex flex-col gap-1">
              {msg.options.map((opt) => (
                <div key={opt.id} className="rounded-[10px] px-[14px] py-2">
                  <span className="text-[14px] text-gray-300">{opt.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 사용자 버블
  return (
    <div className="mb-[14px] flex flex-col items-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-[4px] bg-brand px-[14px] py-[10px]">
        <p className="whitespace-pre-line break-words text-[16px] leading-[24px] text-white">
          {msg.text}
        </p>
      </div>
    </div>
  );
}
