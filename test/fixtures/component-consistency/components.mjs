const variants = new Set(['primary', 'secondary'])

export const actionButton = ({ label, variant = 'primary' }) => {
  if (!variants.has(variant)) throw new Error('지원하지 않는 버튼 변형')
  return `<button data-component="ActionButton" class="actionButton ${variant}">${label}</button>`
}

export const fieldLabel = (label) => `<label class="fieldLabel">${label}</label>`
