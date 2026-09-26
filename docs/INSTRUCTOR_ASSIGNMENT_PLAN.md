# 강사 배정·프로필 (센터 ↔ 강사 앱)

최종 갱신: 2026-09-26  
관련: `docs/DATA_MODEL.md` · `docs/CENTER_ADMIN_PLAN.md` · `runSessions` · `staff`

---

## 1. 목표

- 센터 원장이 **강사(staff/instructor)** 를 보고, **어느 회차·어느 반(섹션)** 에 넣을지 결정한다.
- 강사는 배정된 회차만 강사 앱·출결·리포트에서 본다.
- 로테이션(동시 1~8반)에서는 **회차 문서 1개 = 반 1개**이며, `instructorId`는 회차 단위다.

---

## 2. 데이터

| 필드 | 위치 | 의미 |
|------|------|------|
| `staff/{uid}` | Firestore | `displayName`, `email`, `phone`, `role`, `campusIds`, (선택) `bio`, `photoUrl` |
| `runSessions.instructorId` | 회차 | 담당 강사 Auth uid |
| `runSessions.sectionId` | 회차 | 반(10~20명) |
| `students.photoUrl` | 학생 | 출결 카드용 (Storage URL, import/센터 업로드) |

**배정 규칙 (검증)**

1. 강사 `campusIds`에 운영 건 `campusId` 포함.
2. 동일 `scheduledDate` + `startTime`에 같은 강사 **중복 배정 경고**(겹치면 원장 확인).
3. 휴강(`status: cancelled`) 회차는 배정 불필요.
4. 변경 시 `updatedAt`, `assignedByUid`(센터) 기록 — 감사(Phase C).

**Callable (구현 로드맵)**

| API | 단계 | 동작 |
|-----|------|------|
| `listCenterInstructors` | B+ | 캠퍼스·운영 건 기준 강사 + 이번 주 회차 수 |
| `getInstructorCenterProfile` | B+ | 프로필 + 배정된/미배정 회차 목록 |
| `assignInstructorToSession` | C | `runSessions.instructorId` 설정·해제 |
| `notifyInstructorAssignment` | C | 앱 알림(선택) |

---

## 3. 센터 UX 흐름

### 3.1 진입

- **사람 → 강사** 탭: 이름·이메일·이번 주 회차 수·미배정 회차 힌트.
- **수업 → 로테이션 카드**: “강사 미배정” 뱃지 → 같은 배정 UI로 연결.

### 3.2 강사 프로필 (`/admin/center/instructors/{staffId}`)

1. **헤더**: 사진·이름·연락처·소속 캠퍼스.
2. **이번 주 일정**: 배정된 회차 리스트(날짜·시간·반·주제).
3. **배정하기**: 운영 건·날짜 필터 → **미배정 회차**만 체크 → 저장.
4. **겹침 경고**: 같은 시간대 다른 반에 이미 있으면 모달.
5. 체험판: `sessionStorage`로 배정 상태 유지(Functions 없이 흐름 확인).

### 3.3 출결·학생 카드

- 출결 시트는 **반 단위 10~20명**, **학생 사진 + 이름 카드** 그리드(2열).
- 사진 없으면 이니셜 아바타(`students.photoUrl` 또는 생성 아바타).

---

## 4. 강사 앱 (demo `/demo/instructor`)

- **내 회차**만 목록(`instructorId == me`).
- 회차 상세: 동일 학생 카드 출결·리포트.
- 배정 변경은 센터만(강사는 조회).

---

## 5. 학부모·체험 데이터

- 체험판: 72명 수강생 + 가구별 보호자 이름·연결 상태 더미.
- 실서비스: `guardianLinks` + Auth displayName.

---

## 6. 구현 단계

| 단계 | 내용 |
|------|------|
| **지금** | 학생 사진 카드, 체험 더미 확장, 강사 프로필·배정 UI(체험) |
| **C** | `assignInstructorToSession`, 겹침 검증, 알림 |
| **D** | 강사 가용시간·대체 강사·일괄 배정 |

---

## 7. 화면 와이어 (텍스트)

```
[강사 프로필]
  박강사 · teacher@...
  이번 주 4회차

  [배정된 회차]
  10/03 10:00 3반 창의활동

  [+ 회차 배정]
  ☑ 10/03 11:00 4반 (미배정)
  ☐ 10/03 13:00 1반 (이보조 배정됨 — 변경 시 확인)

  [저장]
```
