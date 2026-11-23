# 근거 원본 묶음 검증

보고서의 수집 ID·원본 위치·문맥·기준 해시를 색인과 대조하고, 실제 파일의 SHA-256과 JSON Pointer가 가리키는 내용을 검사합니다. 입력을 수정하거나 판정을 자동 교정하지 않습니다.

```text
node <lint 스킬 경로>/scripts/verify-evidence.mjs <보고서.json> <근거묶음.json>
```

종료 코드는 0(선언된 원본 연결 검사 통과), 2(원본·연결 문제), 1(인자·JSON·보고서 형식 오류)입니다. stdout은 결과 JSON, 실행 오류는 stderr입니다. 원본 문제를 발견하면 해당 근거를 보존하고 실제 자료를 다시 수집하거나 영향받은 검사를 미측정으로 남긴 뒤 재집계합니다. 기존 complete를 그대로 전달하지 않습니다.

## 묶음 구성

근거묶음 JSON은 version 1과 captures·criteria 배열을 갖습니다. 경로는 묶음 파일이 있는 디렉터리 기준입니다. 외부 URL·절대 경로·묶음 밖 파일과 이를 가리키는 심볼릭 링크는 허용하지 않습니다. 외부 원본은 필요한 범위의 고정 복사본을 묶음 안에 보존하고 실제 출처·커밋·복사 범위를 별도로 밝힙니다.

| 색인 | 필드 |
| --- | --- |
| captures[] | 고유 captureId, source, rawDigest, context. JSON 내부 내용을 대조할 때 data도 포함 |
| criteria[] | 고유 path(보고서 criterion.path), source(보존한 기준 파일), rawDigest |

rawDigest는 파일 전체 바이트의 SHA-256을 소문자 64자리로 적습니다. criterion.digest와 evidence.basisDigest도 보존한 기준 파일의 같은 해시입니다. 일부 계약의 별도 식별자를 쓰던 보고서는 원본을 바꾸지 않고 파생 복사본에서 파일 해시와 연결한 범위를 밝힙니다.

source가 `raw.json#/records/0`이면 `/records/0`을 JSON Pointer로 해석해 data와 구조적으로 대조합니다. 빈 Pointer `raw.json#`는 문서 전체입니다. `/`는 빈 이름의 속성이므로 문서 전체와 다릅니다. 키의 `/`는 `~1`, `~`는 `~0`으로 적습니다. URI 퍼센트 인코딩은 해석하지 않습니다. 배열은 0부터 시작하는 정규 인덱스만 허용합니다.

Pointer 없는 source는 PNG 등 파일 바이트의 해시만 대조합니다. 이때 data를 적지 않습니다. 이미지의 실제 내용·요소·상태를 판정하는 기능은 아닙니다. 이미지와 조작·측정 JSON의 대응은 수행자가 따로 확인합니다.

```json
{
  "version": 1,
  "criteria": [{ "path": "DESIGN.md", "source": "basis/DESIGN.md", "rawDigest": "실제 파일의 SHA-256" }],
  "captures": [{
    "captureId": "save-default",
    "source": "raw.json#/records/0",
    "rawDigest": "실제 파일의 SHA-256",
    "context": { "url": "/settings", "selector": "#save", "state": "default" },
    "data": { "disabled": false }
  }]
}
```

위 해시 문자열은 형식 설명용입니다. 실제 파일에서 계산해야 합니다. 보고서 evidence의 captureId·source·context는 해당 색인과 같아야 합니다. 다른 대상이나 기본 상태 자료를 잘못 연결한 문제는 [강화 연결](quality.md) 검사도 함께 사용합니다.

## 결과의 의미와 한계

결과는 status·capturesChecked·criteriaChecked·references·issues·limitations를 포함합니다. 모든 색인 파일과 미측정을 제외한 판정의 기준·근거 연결을 검사합니다. 미측정 항목의 첨부 자료는 색인에 있으면 파일만 검사하며 그 항목을 측정 완료로 바꾸지 않습니다. 연결 정보가 없는 예전 보고서는 자동으로 보증하지 않습니다.

verified는 제공한 파일과 선언된 연결의 동일성입니다. 수집 시각의 진실성, context의 실제 발생, 이미지 해석, 관찰에서 판정으로 이어지는 논리나 제품 전체의 통과는 수행자의 검토 범위입니다. 해시를 새로 계산해 바꿔 적는 것만으로 과거 자료의 진위를 보증하지 않습니다.

근거 묶음은 로컬 검증·인계용 파생 자료입니다. 민감한 원본을 자동 공개하거나 wiki·제품 코드·기준 문서를 수정하지 않습니다. bab·pstack은 결과와 원래 기준을 읽어 후속 작업을 결정합니다.
