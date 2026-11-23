import { actionButton } from './components.mjs'

export const settingsPage = () => `
<main class="settings">
  <h1 class="title">설정</h1>
  ${actionButton({ id: 'save', label: '설정 저장' })}
</main>
`
