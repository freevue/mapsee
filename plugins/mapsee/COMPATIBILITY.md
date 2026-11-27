# 맵시 1.x 호환성 계약

1.0.0부터 아래 이름·입출력·의미를 공개 계약으로 유지합니다. 세부 필드와 사용 조건의 정본은 연결한 스킬 자료입니다. 프로젝트의 디자인 규칙·검사 대상·브라우저 도구는 사용 환경이 소유합니다.

## 스킬과 변경 권한

플러그인·마켓플레이스 이름은 mapsee이며 setup·document·lint 세 스킬을 제공합니다. lint는 보고 전용입니다. 제품 코드·디자인 문서·wiki를 자동 수정하지 않습니다. setup과 document는 요청한 디자인 문서만 구성·보완하며 wiki·인덱스를 수정하지 않습니다. bab·pstack 설치는 필요하지 않습니다.

## 보고서

[결과 형식](skills/lint/references/report.md)의 schemaVersion 1, producer mapsee, mode report-only를 유지합니다. 실행 상태와 판정은 별개입니다.

| 계약 | 유지하는 값·의미 |
| --- | --- |
| 실행 상태 | complete·incomplete·blocked. complete는 선택한 수집 범위 완료이며 제품 수용이 아님 |
| 검사 축 | component-usage·page-consistency |
| 수집 방법 | static·measurement·review |
| 판정 | match·mismatch·review·not-measured·not-applicable |
| 확정 판정 | 기준 경로·문단, 기대값·관찰값, 근거 출처가 필요함 |
| 미측정 | 이유를 보존하며 complete로 처리하지 않음 |
| 비율 | 일치 ÷ (일치 + 불일치). 두 축을 각각 계산함 |
| 커버리지 | (일치 + 불일치) ÷ 적용 항목. review·미측정도 적용 항목에 포함함 |
| 예외·빈 분모 | 근거 있는 적용 제외는 두 분모에서 제외. 분모 0은 null |

비율은 백분율로 소수 둘째 자리까지 반올림합니다. summary는 입력 수치를 신뢰하지 않고 재계산합니다. inventorySummary·problemSummary는 해당 선택 정보가 있을 때 추가합니다. 소비자는 알 수 없는 추가 필드를 무시하고 필요한 필드의 타입·값을 확인해야 합니다.

inventory·강화 연결·문제 분류가 없는 기존 schemaVersion 1 보고서도 읽습니다. 새 선택 기능은 [scope](skills/lint/references/scope.md)와 [quality](skills/lint/references/quality.md)를 따르며 bindingVersion·triageVersion은 각각 1입니다. 선택 정보를 생략한 과거 결과에 새 검증을 통과했다고 표시하지 않습니다.

## 읽기 전용 CLI

Node.js 20 이상에서 lint 스킬의 scripts 경로로 실행합니다. 모두 입력 파일을 보존하며 결과 JSON을 stdout으로, 실행·형식 오류를 stderr로 출력합니다. 종료 코드 0은 명령별 성공이며 제품의 위반 0개나 운영 수용을 뜻하지 않습니다.

| 명령과 위치 인자 | 종료 코드 |
| --- | --- |
| summarize.mjs 보고서.json | 0: 검증·집계 성공, 1: 입력·실행 오류 |
| compare.mjs 이전.json 현재.json | 0: 이력 분류 성공, 1: 입력·실행 오류 |
| retest.mjs 보고서.json 변경파일배열.json | 0: 제안 생성, 1: 입력·실행 오류 |
| verify-evidence.mjs 보고서.json 근거묶음.json | 0: 원본·연결 verified, 2: issues, 1: 입력·실행 오류 |
| check-readiness.mjs 준비기록.json | 0: ready, 2: pending 또는 transition, 1: 입력·실행 오류 |
| render-grid.mjs 측정.json 새결과.svg | 0: 산술 차이 없음, 2: 배수·정렬 차이, 1: 입력·실행 오류. 새 SVG만 생성하며 기존 파일은 보존 |

1.1.0의 [격자 입력·SVG 도구](skills/lint/references/grid.md)는 측정 근거 version 1을 사용합니다. 미채택 기준은 review이고 종료 코드 2가 제품 오류를 뜻하지 않을 수 있습니다. 최종 보고서 schemaVersion 1과 기존 두 축은 유지합니다.

[이력](skills/lint/references/history.md)은 누락·미측정을 해결로 만들지 않습니다. [재검사 제안](skills/lint/references/quality.md)은 검사 실행이나 기존 필수 검사 축소를 승인하지 않습니다. [근거 묶음](skills/lint/references/evidence.md)과 [준비 기록](skills/lint/references/capture.md)은 각각 version 1을 유지합니다. 파일 동일성·선택한 관찰 기록의 정합성과 판정 타당성·실제 화면의 진실성은 구분합니다.

스크립트 내부 함수·파일 구성, 오류 문장의 표현, JSON 객체의 키 순서는 공개 계약에 포함하지 않습니다. test/check-audit-report.mjs는 저장소의 가상 보고서 평가 도구이며 플러그인 소비자용 CLI가 아닙니다.

## 버전과 검증 범위

호환 수정은 패치, 기존 입력·의미를 유지하는 기능 추가는 마이너, 필수 필드·허용 값·산식·종료 코드·스킬의 변경 권한 등 호환되지 않는 변경은 메이저 버전으로 배포합니다. 이미 배포한 버전의 내용을 덮어쓰지 않습니다. 새 검사 주제를 적용할 때는 프로젝트의 채택 근거와 해당 실행의 계획·표본을 따로 기록합니다.

1.0.0부터 Codex를 우선 지원합니다. 1.1.0의 실제 설치·갱신·도구 검증은 저장소의 `docs/verification/1.1.0.md`에 구분합니다. Claude 패키지 구성은 정적 검사 대상이며 실제 Claude 실행은 미검증입니다. 브라우저·디바이스·전체 프로젝트의 적합성은 개별 검증 범위를 확인합니다.
