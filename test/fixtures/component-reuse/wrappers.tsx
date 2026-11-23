import { ActionButton, type ActionButtonProps } from './ui'
import type * as React from 'react'

export const ConfirmAction: React.FC<ActionButtonProps> = (props) => (
  <ActionButton {...props} />
)
