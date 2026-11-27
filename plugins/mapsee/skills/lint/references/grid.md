# 캡처 위의 간격 격자와 측정선

원본 PNG와 같은 상태에서 읽은 요소 경계로 별도 SVG를 만듭니다. 제품 DOM에 격자·문구·로그를 삽입하지 않습니다. 이 도구는 브라우저 수집이나 디자인 판단을 대신하지 않습니다.

## 기준과 수집

1. 프로젝트의 간격 기준과 적용 대상을 확인합니다. `step` 기본값은 `4` CSS px이며 다른 양수도 허용합니다. 기준 미채택은 `adopted: false`로 두고 산술 일치도 `review`로 남깁니다. `basis`에는 원본 문단·적용 조건 또는 미채택 사유를 적습니다.
2. [캡처 준비](capture.md)에 따라 상태·글꼴·애니메이션을 확인합니다. 같은 뷰포트·상태에서 PNG와 실제 경계를 수집합니다. 중간에 리사이즈·스크롤·상태 변화가 생기면 다시 수집합니다. 준비 기록·시각·스크롤·브라우저 조건은 원본 근거 묶음에 보존합니다.
3. 좌표는 모두 표시 뷰포트 기준 CSS px입니다. `capture.clip`은 PNG에 담긴 영역의 x·y·width·height입니다. 전체 뷰포트 또는 내부 영역 캡처를 사용하며 전체 문서 스크롤 캡처는 먼저 표시 영역별로 나눕니다. 요소 경계는 `getBoundingClientRect()` 등으로 실제 값을 읽습니다. 그림자·글자 잉크 경계를 CSS 상자 경계와 혼동하지 않습니다.
4. `grid.origin`은 화면 또는 컨테이너의 지정 경계입니다. 중앙 배치된 다이얼로그에 화면 원점을 강제하지 않습니다. 컨테이너의 content box를 원점으로 쓰면 border·padding을 포함한 실제 좌표를 계산해 출처를 남깁니다. `tolerance`는 프로젝트·수집 조건에 맞게 명시하며 공통 합격값으로 정하지 않습니다.
5. 검사할 관계를 `checks`에 정합니다. 모든 요소의 위치·너비·테두리에 배수 규칙을 강요하지 않습니다. 글꼴·아이콘의 광학 보정·1px 테두리·유동 너비·변환의 허용 차이는 원본 기준에서 확인하고 해당 검사를 제외하거나 미채택 검토로 분리합니다.

## 입력 version 1

```json
{
  "version": 1,
  "context": {"url": "/settings", "selector": "#profile-dialog", "state": "error", "viewport": {"width": 800, "height": 600}},
  "capture": {"path": "dialog.png", "clip": {"x": 160, "y": 100, "width": 480, "height": 320}},
  "grid": {"step": 4, "origin": {"x": 184, "y": 124}, "tolerance": 0.25, "adopted": true, "basis": "가상 DESIGN: 내부 간격 4px 배수·본문 왼쪽 정렬"},
  "elements": [
    {"id": "title", "rect": {"x": 184, "y": 124, "width": 432, "height": 28}},
    {"id": "body", "rect": {"x": 184, "y": 166, "width": 432, "height": 80}}
  ],
  "checks": [
    {"id": "title-body-gap", "kind": "gap", "axis": "y", "from": {"element": "title", "edge": "bottom"}, "to": {"element": "body", "edge": "top"}},
    {"id": "left-alignment", "kind": "alignment", "axis": "x", "from": {"element": "title", "edge": "left"}, "to": {"element": "body", "edge": "left"}},
    {"id": "body-grid", "kind": "grid", "axis": "x", "from": {"element": "body", "edge": "left"}}
  ]
}
```

수치는 가상 예입니다. 제목 아래 실제 간격은 `14px`로 `4px` 배수에서 `2px` 벗어나며 정렬·원점 검사는 일치합니다. PNG는 입력 JSON 폴더 내부의 상대 경로여야 합니다. 해상도 배율은 PNG 픽셀 수와 CSS 캡처 크기에서 계산하며 종횡비가 다르면 거부합니다. 파일 해시는 기록하지만 PNG와 DOM이 같은 순간이라는 사실까지 보증하지 않습니다.

| kind | 계산 |
| --- | --- |
| gap | 지정 축의 `to` 경계 − `from` 경계. 음수 간격은 오류이며 양수는 간격 배수와 대조 |
| alignment | 지정한 두 경계의 차이를 `0`과 대조 |
| grid | 지정 경계와 원점의 차이를 격자 배수와 대조 |

`x`축 경계는 left·right, `y`축 경계는 top·bottom입니다. gap·alignment에는 from·to가, grid에는 from만 필요합니다. 입력은 캡처 안의 양수 크기 요소와 고유 ID를 사용합니다.

## 실행과 결과

```sh
node <lint 스킬 경로>/scripts/render-grid.mjs 측정.json 새결과.svg
```

기존 SVG는 덮어쓰지 않습니다. SVG는 PNG를 포함하므로 원본과 같은 공유·보관 범위를 적용합니다. 결과 JSON은 stdout으로 나오며 URL·영역·상태·격자 기준, 체크별 actual·expected·deviation·withinTolerance·status, 입력·PNG의 SHA-256과 SVG 경로를 담습니다. 오류는 stderr로 출력합니다.

- **종료 코드:** `0`은 선택한 관계의 산술 차이 없음, `2`는 배수·정렬 차이 있음, `1`은 입력·실행 오류입니다. 미채택 기준의 차이도 `2`이지만 판정은 `review`입니다.
- **시각화:** 캡처 위의 옅은 격자·요소 경계·번호·측정선과 옆의 수치 목록을 함께 표시합니다. 색 외에 번호·수치·판정 문자열을 제공합니다. SVG의 격자와 캡처는 CSS 좌표로 맞추며 제품 원본을 변경하지 않습니다.
- **해석:** `expected`는 가장 가까운 배수 또는 정렬값 `0`입니다. 프로젝트가 특정 간격 `16px`를 요구할 때 다른 배수 `12px`의 계약 위반은 원본과 별도로 대조합니다. 배수 일치만으로 정보 위계·시각적 균형·접근성·조작을 통과시키지 않습니다.
- **보고 연결:** 이는 최종 보고서가 아닌 측정 근거입니다. 원본 기준·영역·상태·실제 수집 조건과 JSON 내부 위치·SVG를 기존 보고 필드에 연결합니다. 개별 사용은 component-usage이며 같은 URL의 여러 상태를 page-consistency로 세지 않습니다. 미수집 상태는 이 도구로 채울 수 없으며 `not-measured`로 남깁니다.
