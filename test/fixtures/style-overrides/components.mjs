export const actionButton = (props) => {
  const className = props.plain ? 'plain' : 'action'
  return `<button id="${props.id}" class="${className} ${props.className ?? ''}"${props.disabled ? ' disabled' : ''}>${props.label}</button>`
}
