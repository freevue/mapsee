import { actionButton } from './components.mjs'

export const searchPage = () => `
<main class="search">
  <h1 class="title">검색</h1>
  <p>검색에만 필요한 소개입니다.</p>
  ${actionButton({ id: 'compact', label: '검색', className: 'compact' })}
  ${actionButton({ id: 'pending', label: '처리 중', disabled: true, className: 'pending' })}
  ${actionButton({ id: 'spacing', label: '빠른 검색', className: 'spacing' })}
  ${actionButton({ id: 'wide', label: '전체 검색', className: 'wide' })}
  ${actionButton({ id: 'plain', label: '도움말', plain: true })}
  ${actionButton({ id: 'recolored', label: '고급 검색', className: 'recolored' })}
</main>
<style>
.search .compact { height: 32px; }
.search .pending:disabled { opacity: 1; cursor: pointer; }
.search .spacing { padding: 0 6px; }
.search .wide { width: 240px; margin-top: 16px; }
.search .plain { height: 28px; padding: 0 6px; background: transparent; }
.search .recolored { background: #000000; }
</style>
`
