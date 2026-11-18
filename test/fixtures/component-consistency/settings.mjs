import { actionButton, fieldLabel } from './components.mjs'

export const settingsPage = () => `
  <main class="settingsPage">
    <h1 class="pageTitle">설정</h1>
    ${fieldLabel('표시 이름')}
    <input aria-label="표시 이름" />
    ${actionButton({ label: '설정 저장', variant: 'primary' })}
  </main>
`
