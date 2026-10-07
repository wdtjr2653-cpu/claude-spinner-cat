# 작업 고양이 (spinner-cat)

Claude Code 터미널의 작업 표시 줄(`✻ Cooking…`)을 상태별로 움직이는 ASCII 고양이로 바꾸고, 쉬는 동안에는 입력창 바로 위에서 식빵을 굽다가 잠드는 고양이를 띄우는 Mod입니다.

## 모습

작업 중에는 하는 일에 따라 고양이가 바뀝니다.

```
  /\_/\ ?
 ( o.o )    흠… 생각 중
  (   )
```

```
  /\_/\
 ( o.o )    타닥타닥 Bash 실행 중
_(v)_(_)_
```

```
  /\_/\
 ( ^.^ )    슥슥 답 쓰는 중
  (   )_/
```

작업이 끝나면 하품을 하고 식빵 자세로 엎드립니다. 입력 없이 3분이 지나면 꾸벅꾸벅하다 잠듭니다(흐리게 표시).

```
  /\_/\
 ( o.o )    식빵 굽는 중
 (_____)~
```

```
  /\_/\   Z
 ( -.- ) z  쿨쿨 자는 중
 (_____)
```

쉬는 동안에는 5초마다 잔동작을 합니다.

- 식빵 굽는 중: 꼬리 살랑, 두리번, 천천히 눈 깜빡, 귀 쫑긋
- 쿨쿨 자는 중: z 피어오르기, 코골이, 자다가 귀 쫑긋, 꼬리 까딱

## 필요한 것

- Claude Code **2.1.292 이상**, 터미널에서 실행 (`claude --version`으로 확인)
- Mod(함수 훅 플러그인)는 아직 미리보기(early access) 기능이라, Claude Code 버전이 바뀌면 동작이 달라질 수 있습니다.

## 설치

Claude Code 입력창에 아래 한 줄을 입력합니다.

```
/plugin install spinner-cat --marketplace wdtjr2653-cpu/claude-spinner-cat
```

1. `Add marketplace?`라고 물으면 `y`를 누릅니다.
2. 설치 범위는 맨 위의 **사용자(user)** 를 고른 채 Enter를 누릅니다. 사용자 범위여야 어느 폴더에서 연 세션에서나 나옵니다.
3. `Installed spinner-cat. Plugin is now active.`가 나오면 끝입니다. 지금 세션부터 바로 적용됩니다.

터미널 명령으로 설치해도 됩니다.

```
claude plugin marketplace add wdtjr2653-cpu/claude-spinner-cat
claude plugin install spinner-cat@cat-mods
```

## 업데이트·끄기·지우기

```
claude plugin marketplace update cat-mods     # 새 판 목록 받기
claude plugin update spinner-cat@cat-mods     # 새 판으로 바꾸기 (Claude Code 를 다시 시작하면 적용)
claude plugin disable spinner-cat@cat-mods    # 잠시 끄기 (enable 로 다시 켜기)
claude plugin uninstall spinner-cat@cat-mods  # 지우기
```

입력창 위의 고양이 띠는 오른쪽 `[-]` 또는 `ctrl+x ctrl+a`로 접을 수 있습니다.

## 바꿔 보기

| 바꿀 것 | 파일 | 이름 |
|---|---|---|
| 잠드는 시간 (3분) | `hooks/register.tsx` | `SLEEP_AFTER_MS` |
| 잔동작 간격 (5초) | `hooks/register.tsx` | `GAP_MS` |
| 그림·문구 | `hooks/cat.ts` | `POSES`, `CLIPS`, `label`, `idleLabel` |

직접 고친 판을 쓰려면 이 저장소를 내려받아 고친 뒤 `claude --plugin-dir <폴더>`로 실행하세요. 그 폴더에서 `claude plugin validate .`로 검증하고 `claude plugin test .`로 시험을 돌릴 수 있습니다.

## 쉬는 동안 왜 계속 움직이지 않나요

Orca 같은 터미널 관리 도구는 출력이 몇 초 멈춰야 그 창을 '대기 중'으로 판단합니다. 고양이가 쉬지 않고 움직이면 그 판단이 깨지므로, 잔동작은 1~4초만 그리고 그 사이 5초는 화면을 다시 그리지 않습니다.
