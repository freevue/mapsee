# 맵시 (mapsee)

<img src="plugins/mapsee/assets/icon.png" alt="웹페이지가 셔츠를 입은 맵시 아이콘" width="128" />

공용 컴포넌트를 올바르게 사용하는지, 현재 페이지의 UI가 다른 페이지와 일관되는지 검사하는 Claude Code·Codex용 플러그인입니다. 문제의 위치와 근거, 두 검사 축의 일치율과 검사 커버리지를 보고합니다.

현재 버전은 1.1.0이며 Codex를 우선 지원합니다. Claude 패키지 형식은 검사하며 실제 Claude 실행은 미검증입니다. 보고서·CLI의 유지 범위와 버전 정책은 [호환성 계약](plugins/mapsee/COMPATIBILITY.md)을 따릅니다.

핵심 스킬은 `mapsee:lint`입니다. wiki·디자인 문서·제품 코드를 수정하지 않습니다. bab·pstack이나 사용자가 결과를 받아 후속 작업을 결정합니다. 맵시를 쓰기 위해 다른 개발 방법론이나 플러그인을 설치할 필요는 없습니다.

## 두 가지 핵심 검사

| 검사 축 | 확인하는 내용 | 문제 예시 |
| --- | --- | --- |
| 컴포넌트 사용 적합성 | 선택 이유와 배치, 공용 컴포넌트 재사용, 용도에 맞는 props·variant·상태·조합, 스타일과 토큰 적용 | 화면 목적과 다른 컴포넌트 선택, 관련 정보와 분리된 배치, 임의 CSS로 공통 표현 변경 |
| 페이지 간 일관성 | 동등한 역할의 제목·버튼·입력·카드·배치·간격·여백·중첩 라운드·색·글꼴·상태를 비교 페이지와 대조 | 같은 그룹의 여백 단계 불일치, 중첩 카드의 곡선 관계 차이, 페이지마다 다른 입력 오류 표현 |

비교 페이지는 요청한 대상이나 같은 레이아웃·컴포넌트·역할을 공유하는 페이지에서 선택하고 이유를 밝힙니다. 다른 역할의 화면에 같은 배치를 강요하지 않습니다. 원본 DESIGN과 사용 가이드·컴포넌트 계약을 읽고, 기준이 없는 차이는 판단 필요로 남깁니다.

간격·여백은 역할과 정보 위계에 따른 관계로, 중첩된 카드의 라운드는 부모 반경과 실제 안쪽 거리에 따른 관계로 검사합니다. 배치와 컴포넌트를 사용한 이유도 화면 목적·사용 가이드에 비춰 확인합니다. 구체적인 적용 조건·예외와 보고 예는 [구성과 관계 검사](plugins/mapsee/skills/lint/references/composition.md)에 있습니다.

1.1.0에는 [연속된 의미 중복·반응형 줄바꿈](plugins/mapsee/skills/lint/references/resilience.md), [검사용 문구·로그 잔여물](plugins/mapsee/skills/lint/references/debug-residue.md) 검사를 추가했습니다. 필요한 반복·자연스러운 줄바꿈·정상 안내와 운영 로그는 구분합니다. [격자·측정선 SVG 도구](plugins/mapsee/skills/lint/references/grid.md)는 캡처와 실제 경계로 간격 배수·정렬을 시각화하고, [다이얼로그 등 영역별 검사](plugins/mapsee/skills/lint/references/surfaces.md)는 기본·처리 중·오류·완료 상태와 전환을 연결합니다. [가상 화면 검증과 시각 예시](docs/verification/grid-surfaces.md)를 제공합니다. 검사 중 제품에 문구·로그·격자를 심지 않습니다. 기준·적용 조건·검증 범위는 [1.1.0 배포 노트](docs/releases/1.1.0.md)를 따릅니다.

## 어떻게 검사하나요?

| 구분 | 확인하는 내용 | 한계 |
| --- | --- | --- |
| 정적 검사 | 컴포넌트 import·호출·props·variant, 스타일·토큰과 레이아웃 | 실제 배치·가림·조작은 확인하지 못합니다. |
| 브라우저 측정 | 명시한 요소의 간격·정렬·잘림·색, 스크롤·변환 상태와 스크린샷 | 수집한 상태만으로 실제 조작이나 접근성 전체를 통과시키지 않습니다. |
| 이미지·동작 검토 | 시각적 위계·구성·조작 편의성을 디자인 기준과 대조 | 관찰과 해석을 구분하고 추상적 기준은 판단 필요나 제안으로 남깁니다. |

현재 환경의 도구와 프로젝트의 기존 검사 명령을 사용합니다. 사용할 수 없는 검사와 실제로 확인하지 못한 화면은 미검증으로 보고합니다. 근거 수집·판정은 에이전트가 수행하고, 포함된 집계 스크립트는 판정 결과의 수치를 계산합니다.

검사 주제는 [상태 완전성·오류 복구·키보드/레이어·클릭/터치·확대 대응](plugins/mapsee/skills/lint/references/interaction.md)을 우선하고, 요청 범위에 맞춰 [긴 콘텐츠·언어·테마·움직임·로딩 중 배치 안정성·정보와 행동의 명확성](plugins/mapsee/skills/lint/references/resilience.md)을 확인합니다. 기존 두 축 안에서 적용 항목을 정하며 주제마다 별도 점수를 만들지 않습니다.

각 항목은 적용 근거 → 재현 조건 → 기대 결과 → 관찰 → 판정 → 개선 제안으로 연결합니다. 외부 표준의 버전·조항·등급과 프로젝트 채택 여부를 확인하고, 다른 디자인 시스템의 사례와 사용성 휴리스틱은 검토 후보로 구분합니다. 기준 화면·브라우저·글꼴·테마·가상 자료 등의 실제 출처와 조건을 기록해 비교를 재현합니다. 이 주제는 에이전트의 검사 지침이며 범용 브라우저 검사기가 내장된 것은 아닙니다.

## 일치율과 검사 커버리지

두 검사 축을 별도로 집계하며, 각 비율의 항목 수를 함께 보여 줍니다.

| 값 | 산식 |
| --- | --- |
| 컴포넌트 적합률·페이지 일치율 | 일치 ÷ (일치 + 불일치) × 100 |
| 검사 커버리지 | (일치 + 불일치) ÷ 적용 항목 × 100 |

판단 필요와 미측정은 일치율 분모에서 제외하고 커버리지에는 남깁니다. 근거가 있는 적용 제외 항목은 두 분모에서 제외합니다. 분모가 0이면 `null`입니다. 예를 들어 일치 8·불일치 2·판단 필요 1·미측정 2·예외 1이면 `80%, 커버리지 76.92%`입니다.

같은 문제의 코드·DOM·이미지 근거는 한 항목에 모읍니다. 비율은 정해진 표본과 검사 항목의 결과입니다. 모든 페이지가 같은 방식으로 기준을 어긴 문제도 별도로 지적하며, 높은 페이지 일치율로 컴포넌트의 올바른 사용을 보증하지 않습니다.

## 기준은 프로젝트가 정합니다

기준 문서는 사용자가 소유합니다. 맵시는 자체 색상·간격·금지 클래스를 배포하지 않습니다. `text-base` 금지처럼 특정 프로젝트의 규칙을 다른 프로젝트에 자동 적용하지 않습니다.

확정된 디자인 규칙과 공개 컴포넌트 계약을 판정에 사용합니다. 예를 들어 주요 버튼 높이가 `40px`로 정해졌고 검색 화면은 `36px`, 설정 화면은 `40px`라면 양쪽 위치와 값을 보고합니다. DESIGN이 없어도 확인 가능한 계약과 페이지 비교는 진행하며, 관찰값을 새 규칙으로 만들지 않습니다. 기준이 없거나 충돌하면 필요한 결정을 남깁니다.

실행용 검사 계획에는 DESIGN의 기준 문단과 대상·상태·화면 조건을 연결합니다. 이 계획과 결과 보고서는 파생 자료입니다. wiki에 정본을 추가하거나 props·타입·함수 계약을 복사하지 않습니다.

## 사용 예시

```text
mapsee:lint로 검색 화면의 공용 컴포넌트 사용을 검사해줘.
설정 화면의 같은 역할 UI와 비교하고,
문제 위치와 근거, 컴포넌트 적합률·페이지 일치율·커버리지를 보고해줘.
wiki와 제품 코드는 수정하지 말고 결과를 대화에 보고해줘.
```

```text
mapsee:lint 결과를 bab 또는 pstack에 전달할 수 있게 JSON으로도 보여줘.
기준 문단·대상·기대값·관찰·근거·제안·미검증 범위를 포함해줘.
```

검사 실행 상태와 항목별 판정은 별개입니다. 실행이 끝나도 불일치나 판단 필요가 남을 수 있습니다. [보고 형식](plugins/mapsee/skills/lint/references/report.md)과 [JSON 예시](plugins/mapsee/skills/lint/references/report.example.json)를 확인할 수 있습니다. 예시는 가상 자료이며 실제 검사 결과가 아닙니다.

결과는 수정 지시나 승인을 대신하지 않습니다. 후속 도구는 자신의 작업 절차에 따라 원래 디자인 기준과 근거를 확인합니다.

## 디자인 기준 작성 지원

기준 문서 작성·정비가 필요할 때 별도로 요청합니다. lint는 이 스킬들을 자동으로 실행하지 않습니다.

| 스킬 | 역할 |
| --- | --- |
| [mapsee:setup](plugins/mapsee/skills/setup/SKILL.md) | DESIGN·컴포넌트 설명 문서의 유무·누락·최신성·충돌을 점검하고 기준을 구성·보완합니다. |
| [mapsee:document](plugins/mapsee/skills/document/SKILL.md) | 요청받은 디자인 결정을 기존 기준 문서에 반영합니다. |
| [mapsee:lint](plugins/mapsee/skills/lint/SKILL.md) | 기존 기준과 구현을 검사하고 결과를 보고합니다. |

작성 지원도 wiki와 인덱스를 수정하지 않습니다. 기존 구현 계약은 출처로 연결합니다. 필요한 디자인 기준과 시각적 사용 원칙만 정리합니다.

setup은 문서가 이미 있어도 실제 토큰·컴포넌트·대표 사용처와 대조해 문서별 상태와 보완할 내용을 보고합니다. 근거가 명확한 링크·설명은 기존 문서에 보완하고, 새 디자인 결정과 출처 충돌은 미결정으로 남깁니다. 문서 보완 완료와 실제 화면 검사 통과는 구분합니다.

역할별 사용 기준은 필수·권장·허용·미결정으로 구분하고 공개 경로·조건·예외·원본 근거를 연결합니다. 같은 입력과 결정으로 setup을 다시 실행할 때 중복 문서나 불필요한 변경을 만들지 않고, 코드 관찰을 확정 규칙으로 승격하지 않습니다.

여백 단계의 통일성, 여백 변경에 따른 안쪽 라운드의 의존 관계, 배치와 컴포넌트 선택 이유가 설명되어 있는지도 점검합니다. 수치만 나열하지 않고 채택한 관계식·적용 조건·예외와 사용 예를 함께 정리합니다.

상태·조작·콘텐츠·환경 변화의 기준도 같은 방식으로 점검합니다. 재현할 상태·입력·화면 조건과 기대 결과를 문서에 연결하고, 표준의 채택 여부와 관찰·미결정을 구분해 보완합니다.

```text
mapsee:setup으로 DESIGN과 컴포넌트 설명 문서 상태를 확인해줘.
누락·오래된 설명·끊긴 링크를 찾아 기존 문서에 보완하고,
디자인 결정이 필요한 충돌과 미검증 범위를 보고해줘.
```

## 설치

저장소·마켓플레이스·플러그인의 영문 이름은 `mapsee`입니다. 저장소는 [freevue/mapsee](https://github.com/freevue/mapsee)입니다.

Claude Code:

```bash
claude plugin marketplace add freevue/mapsee
claude plugin install mapsee@mapsee
```

Codex:

```bash
codex plugin marketplace add freevue/mapsee
codex plugin add mapsee@mapsee
```

기존 Codex 설치는 `codex plugin marketplace upgrade mapsee` 후 `codex plugin add mapsee@mapsee`로 갱신합니다. Node.js 20 이상이 집계 도구 실행에 필요합니다. [1.1.0 배포 노트](docs/releases/1.1.0.md)에서 검증 범위와 남은 제한을 확인합니다.

로컬 개발 패키지를 설치할 때는 저장소 루트에서 마켓플레이스 주소 대신 `.`을 사용합니다. 기존 `maepsi`·`bab-lint` 설치는 자동으로 이름이 바뀌지 않습니다. 전환할 때 이전 설치와 호출 이름을 확인합니다.

## 개발 확인

Node.js 20 이상에서 저장소 루트의 `node --test test/*.test.mjs`를 실행합니다. 테스트는 집계 산식·미측정·예외·중복·근거와 비교 대상 검증, CLI의 입력 보존, 두 플랫폼의 패키지·아이콘·스킬 자료를 확인합니다. 가상 적용 프로젝트는 [검증 자료](test/fixtures/component-consistency/DESIGN.md)에 있습니다. 스킬 지침의 형식 검사와 실제 클라이언트에서의 수행 검증은 구분합니다.

확장 항목은 [재현용 화면과 기준](test/fixtures/design-audit/DESIGN.md), [17개 검사 시나리오](test/fixtures/design-audit/cases.json), [검증 실행 절차](docs/verification-plan.md)로 확인합니다. `node test/check-audit-report.mjs <보고서.json>`은 기대 판정과 근거 종류를 확인하며 미측정은 종료 코드 2로 남깁니다. 이 명령은 브라우저나 에이전트를 실행하지 않으며 실제 수집 근거는 별도로 검토합니다.

공용 컴포넌트의 일반 DOM 대체와 허용된 사용을 대조하는 [정적 회귀 10개](test/fixtures/component-reuse/DESIGN.md)도 제공합니다. 해당 보고서는 `node test/check-audit-report.mjs <보고서.json> component-reuse`로 확인합니다. 별칭·래퍼·컴포넌트 내부 DOM과 재사용 기준의 적용 범위를 구분하며, 이 검증기도 범용 JSX 분석기를 대신하지 않습니다.

분기별 렌더·속성 전달·FormField와 Input의 연결을 대조하는 [정적 회귀 8개](test/fixtures/component-contracts/DESIGN.md)는 `node test/check-audit-report.mjs <보고서.json> component-contracts`로 확인합니다. 실제 Dialog·폼 조작 검증은 따로 수행합니다.

[스타일 재정의 회귀 8개](test/fixtures/style-overrides/DESIGN.md)는 `style-overrides`로 확인합니다. 허용된 너비·plain과 고정 높이·여백·색·비활성 계약의 위반을 구분합니다. [대상 목록](plugins/mapsee/skills/lint/references/scope.md)은 발견한 페이지·사용처·상태와 검사 ID를 연결해 검사 누락과 범위 밖을 보여 줍니다. 같은 URL의 스텝과 실제 다른 URL의 비교도 구분합니다.

버전별 재검사에서는 [결과 이력 비교](plugins/mapsee/skills/lint/references/history.md)로 새 불일치·해결·남은 문제·미재검사·기준 변경을 확인합니다. `node <lint 스킬 경로>/scripts/compare.mjs <이전.json> <현재.json>`은 입력을 보존합니다. 검사하지 않은 항목이 사라졌다는 이유로 해결 처리하지 않습니다.

새 수집에서는 [대상·상태·근거 연결](plugins/mapsee/skills/lint/references/quality.md)을 검증합니다. 다른 페이지·기본 상태의 근거로 처리 중·오류까지 완료 처리하지 않습니다. 문제는 과업 영향·공통 원인·소유 위치로 묶고, 변경 파일은 확인한 사용처 관계에서 재검사 대상을 제안합니다. `node <lint 스킬 경로>/scripts/retest.mjs <보고서.json> <변경파일배열.json>`은 미연결 변경과 표본 밖 영향도 남깁니다. 이 제안은 검사 실행이나 기존 필수 검사 축소를 승인하지 않습니다.

좁은 카드·모달·사이드바에서는 [실제 부모 영역별 크기·변형·배치](plugins/mapsee/skills/lint/references/placement.md)를 확인합니다. [연속 상태 전환](plugins/mapsee/skills/lint/references/transitions.md)은 실패→수정→재시도→성공, 대기 중 닫기와 이탈 뒤 늦은 응답을 실제 조작·응답 순서로 검사합니다. setup도 같은 조건과 기대 결과가 기존 가이드에 설명되어 있는지 점검합니다.

`node <lint 스킬 경로>/scripts/verify-evidence.mjs <보고서.json> <근거묶음.json>`은 [보존한 원본](plugins/mapsee/skills/lint/references/evidence.md)의 파일 해시·JSON 내부 위치·기준과 보고서 연결을 대조합니다. 입력을 보존하며 연결 문제는 종료 코드 2로 표시합니다. 파일 동일성과 판정의 타당성은 구분합니다.

정지 비교는 [캡처 준비 조건](plugins/mapsee/skills/lint/references/capture.md)의 대상·조상·선택 자산과 연속 구간을 먼저 확인합니다. `node <lint>/scripts/check-readiness.mjs <준비기록.json>`은 ready·pending·transition을 구분하고 큰 관찰 공백을 준비 완료로 세지 않습니다. [실제 모바일 키보드](plugins/mapsee/skills/lint/references/mobile-viewport.md)와 합성 표시 영역, [툴팁·메뉴의 연결·가림·유지](plugins/mapsee/skills/lint/references/floating.md)도 재현 수준에 맞춰 검사합니다. [가상 검증 화면](test/fixtures/capture-and-floating/DESIGN.md)은 제품 결과와 구분합니다.

[토큰 역할·별칭·활성 fallback](plugins/mapsee/skills/lint/references/token-meaning.md), [표시·선택 값·활성 콘텐츠](plugins/mapsee/skills/lint/references/state-meaning.md), [강제 색상의 상태·포커스](plugins/mapsee/skills/lint/references/forced-colors.md)도 원본 계약과 대조합니다. 같은 색을 역할 준수로 보증하거나 native radio에 탭의 ARIA를 강제하지 않습니다. [가상 시나리오 10개](test/fixtures/semantic-contracts/DESIGN.md)의 보고서는 `node test/check-audit-report.mjs <보고서.json> semantic-contracts`로 대조합니다. 이 명령은 소스 분석·브라우저 실행을 대신하지 않습니다.

현재 1.1.0의 [배포 노트](docs/releases/1.1.0.md)·[검증 결과](docs/verification/1.1.0.md)와 [버전별 적용 절차](docs/version-validation.md)를 확인합니다. 이전 [0.12.0 실제 화면](docs/verification/0.12.0.md)·[0.11.0](docs/verification/0.11.0.md)·[0.10.0](docs/verification/0.10.0.md)·[0.9.0](docs/verification/0.9.0.md)·[0.8.0](docs/verification/0.8.0.md)·[0.7.0](docs/verification/0.7.0.md) 자료는 보존합니다. 이전 검증은 [검증 기록](docs/verification.md), 확정 아이콘은 [브랜딩 기록](docs/branding.md)에 있습니다. 이 저장소는 [MIT 라이선스](LICENSE)로 배포합니다.
