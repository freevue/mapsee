# 캡처 준비 상태

정지 화면의 배치·색·이미지를 비교하기 전에 선택한 대상·조상·자산과 상태가 준비됐는지 확인합니다. 애니메이션·로딩 자체가 검사 대상이면 중간 상태를 보존하고 transition 방식으로 구분합니다. 준비 대기 때문에 검사할 오류·로딩을 숨기지 않습니다.

## setup에서 정할 조건

기존 가이드와 화면 전환에서 대상 상태, 필요한 글꼴·이미지, 조상 전환, 기대 불투명도와 허용한 배치 변화를 확인합니다. 알려진 전환 길이·측정 목적에 맞는 관찰 구간과 기하 허용 오차를 정하고 출처를 남깁니다. 아래 예시의 시간·수치를 공통 디자인 규칙으로 채택하지 않습니다.

비활성 요소의 50% 불투명도나 실패 이미지의 대체 화면도 정상 검사 조건일 수 있습니다. 모든 요소의 opacity=1·모든 자산 성공을 강제하지 않습니다. 전환이 끝나는 조건이 없으면 관찰과 필요한 결정을 남깁니다.

## 수집과 실행

1. 실제 URL·상태·요소·화면 조건을 확인합니다. 대상뿐 아니라 화면 전환을 소유한 조상도 포함합니다. 관련 없는 배경의 무한 애니메이션을 전체 대기 조건으로 삼지 않습니다.
2. 선택한 구간에서 실제 시각·경계·불투명도·관련 애니메이션·자산 상태를 반복 수집합니다. 마지막 상태 하나를 복제해 연속 관찰을 만들지 않습니다. getAnimations의 자식 탐색만으로 조상 전환을 확인했다고 하지 않습니다.
3. 글꼴은 실제 필요한 face와 로딩·사용 근거를 확인합니다. document.fonts.status만으로 원하는 글꼴 사용을 보증하지 않습니다. 이미지는 complete와 naturalWidth·실패·대체 표시를 구분하며 complete만으로 성공이라 하지 않습니다.
4. 다음 명령으로 기록을 검사합니다. ready인 구간에 대응하는 화면을 촬영하고, 촬영 시각·조건과 원본을 연결합니다. 촬영 사이에 조건이 바뀌면 다시 확인합니다. 무한 재시도 대신 선택한 제한 안에 준비되지 않으면 이유와 미측정을 남깁니다.

```text
node <lint 스킬 경로>/scripts/check-readiness.mjs <준비기록.json>
```

도구는 브라우저를 실행하지 않습니다. 수행자가 수집한 기록을 읽으며 입력을 수정하지 않습니다. 종료 코드 0은 ready, 2는 pending 또는 transition, 1은 실행·형식 오류입니다. transition은 과정 수집이며 정지 화면 비교의 승인 결과가 아닙니다.

## 기록 version 1

expected는 계획, samples는 실제 관찰입니다. context는 선택한 공통 조건을 같은 구조로 기록합니다. samples의 timeMs는 같은 시계의 실제 증가 시각입니다. opacities의 키는 실제 요소·조상을 다시 찾을 수 있는 식별자입니다.

```json
{
  "version": 1,
  "mode": "settled",
  "expected": {
    "context": { "url": "/", "state": "players", "selector": "#form" },
    "observationMs": 200,
    "maxSampleGapMs": 80,
    "geometryTolerance": 0.5,
    "opacities": { "#form": 1, "#screen": 1 },
    "assets": [{ "id": "wanted-font", "status": "loaded" }]
  },
  "samples": [{
    "timeMs": 0,
    "context": { "url": "/", "state": "players", "selector": "#form" },
    "found": true,
    "rect": { "x": 16, "y": 100, "width": 358, "height": 500 },
    "opacities": { "#form": 1, "#screen": 0.3 },
    "animations": 1,
    "assets": [{ "id": "wanted-font", "status": "pending" }]
  }]
}
```

이 예시는 단일 관찰·진행 중 페이드·대기 자산이 있어 pending입니다. ready에는 2회 이상 실제 관찰과 observationMs 이상의 구간이 필요합니다. 실제 관찰 사이의 간격도 maxSampleGapMs 이하여야 합니다. 이 상한은 양수이며 관찰 구간보다 클 수 없습니다. 탭 지연·수집 중단으로 큰 공백이 생기면 다시 수집하거나 미측정으로 남깁니다. 구간 전체의 문맥·경계·조상 불투명도·관련 애니메이션·선택한 자산을 대조합니다. 자산 상태는 loaded·pending·failed·unknown이며 기대값은 loaded 또는 의도한 failed입니다. 선택하지 않은 자산은 검사했다고 하지 않습니다.

결과의 status·sampleCount·observedMs·reasons·limitations를 원시 기록과 함께 남깁니다. 준비 검사는 제품 적합성 점수가 아닙니다. pending 자료를 정지 비교의 확정 관찰로 사용하지 않고 해당 항목을 재수집하거나 not-measured로 남깁니다. 원본 동일성은 [근거 묶음 검사](evidence.md)로 별도 확인합니다. 기록된 구간의 안정성은 미래의 이동이나 원본 진위를 보증하지 않습니다.
