# 분기·전달·복합 구성 대조용 가상 프로젝트

소스 분석용 자료입니다. React 빌드나 실제 브라우저 동작을 검증한 프로젝트는 아닙니다. 검사 계획은 [cases.json](cases.json)입니다. 기본 버튼은 [ActionButton](../component-reuse/ui.tsx)을 사용합니다.

## 상태별 행동

[actions.tsx](actions.tsx)의 저장 행동은 기본·처리 중 상태 모두 공용 `ActionButton`을 사용합니다. 처리 중에는 비활성으로 표시합니다. 주요 제출은 `variant="primary"`, `type="submit"`이어야 합니다.

## 래퍼의 공개 계약

`DisabledAction`은 받은 `disabled` 값을 실제 버튼에 전달합니다. `EventAction`은 받은 `onClick`을 실제 버튼에 전달합니다. 이 두 래퍼의 공개 입력과 실제 전달을 검사합니다.

`GuardedAction`은 `busy`와 `disabled` 중 하나라도 참이면 비활성으로 표시합니다. 이벤트는 실제 버튼에 전달합니다. `busy`로 표시 문구를 바꾸어도 같은 공용 컴포넌트를 사용합니다.

`SubmitOnlyAction`은 form 제출 전용입니다. 공개 입력에 `onClick`을 제공하지 않는 의도적인 제한을 허용합니다. 기본 컴포넌트의 모든 속성을 래퍼에 노출할 의무는 없습니다.

## 입력과 오류의 연결

[fields.tsx](fields.tsx)의 `FormField`·`Input`은 [공용 구현](field-ui.tsx)으로 구성합니다. `inputId`와 Input의 `id`가 같아야 label이 연결됩니다. 설명이나 오류가 있으면 실제 존재하는 그 요소의 ID를 `aria-describedby`로 참조합니다.

오류가 있으면 `aria-invalid`를 표시하고 오류 문구를 `role="alert"`로 제공합니다. 이 자료는 참조의 정적 연결만 검사합니다. 스크린리더의 실제 알림·키보드 조작·오류 복구는 별도 화면 검증 대상입니다.

## 검사 경계

일반 DOM은 공용 구현 내부에서 허용합니다. 각 대상의 렌더 분기와 전달 경로를 보고 판정합니다. 컴포넌트를 import하거나 기본 분기 하나에서 사용했다는 사실만으로 전체를 정상 판정하지 않습니다. 입력과 기준 문서는 검사 중 수정하지 않습니다.
