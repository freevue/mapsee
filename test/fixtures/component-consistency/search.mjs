import { actionButton, fieldLabel } from './components.mjs'

export const searchPage = () => `
  <main class="searchPage">
    <h1 class="pageTitle">검색</h1>
    <aside>원하는 자료를 찾아보세요.</aside>
    ${fieldLabel('검색어')}
    <input aria-label="검색어" />
    ${actionButton({ label: '검색', variant: 'secondary' })}
  </main>
  <style>.searchPage .actionButton { height: 36px; }</style>
`
