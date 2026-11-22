const target = new URLSearchParams(window.location.search).get('view') === 'target'
const find = (selector) => document.querySelector(selector)
document.body.dataset.view = target ? 'target' : 'reference'
find('#view-label').textContent = target ? '대상 화면' : '비교 화면'

if (target) {
  find('#unrelated-group').append(find('#field-error'))
  find('#name').setAttribute('aria-describedby', 'field-help')
  find('#status-message').removeAttribute('role')
  const action = document.createElement('button')
  action.id = 'help-action'
  action.type = 'button'
  action.textContent = '도움말로 이동'
  action.addEventListener('click', () => { window.location.hash = 'help' })
  find('#help-action').replaceWith(action)
}

const showError = () => {
  find('#field-error').hidden = false
  find('#error-summary').hidden = false
  if (target) {
    find('#name').value = ''
    find('#note').value = ''
    return
  }
  find('#name').setAttribute('aria-invalid', 'true')
  find('#error-summary').focus()
}

const changeState = (state) => {
  find('#field-error').hidden = true
  find('#error-summary').hidden = true
  find('#name').removeAttribute('aria-invalid')
  find('#submit-action').disabled = !target && state === 'loading'
  const messages = {
    default: '입력할 준비가 되었습니다.',
    loading: target ? '검색 결과가 없습니다.' : '불러오는 중입니다.',
    empty: '검색 결과가 없습니다. 다른 이름을 확인해 보세요.',
    error: '입력에 문제가 있습니다.',
    success: '이름 확인이 완료되었습니다.',
  }
  find('#status-message').textContent = messages[state]
  if (state === 'error') showError()
}

find('#state-control').addEventListener('change', (event) => changeState(event.target.value))
find('#theme-control').addEventListener('change', (event) => {
  document.body.dataset.theme = event.target.value
})
find('#form').addEventListener('submit', (event) => {
  event.preventDefault()
  const state = find('#name').value.trim() ? 'success' : 'error'
  find('#state-control').value = state
  changeState(state)
})
find('#error-summary a').addEventListener('click', (event) => {
  event.preventDefault()
  find('#name').focus()
})
find('#modal-open').addEventListener('click', () => {
  if (target) {
    find('#bad-modal').hidden = false
    return
  }
  find('#good-modal').showModal()
})
find('#good-close').addEventListener('click', () => find('#good-modal').close())
find('#good-modal').addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return
  event.preventDefault()
  find('#good-close').focus()
})
find('#bad-close').addEventListener('click', () => { find('#bad-modal').hidden = true })
find('#long-control').addEventListener('click', () => {
  find('#long-text').textContent = '번역되거나 사용자가 입력해서 매우 길어진 이름과 설명을 끝까지 확인할 수 있어야 합니다.'.repeat(4)
})
find('#delay-control').addEventListener('click', () => {
  find('#delayed-content').hidden = true
  window.setTimeout(() => { find('#delayed-content').hidden = false }, 300)
})
