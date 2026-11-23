import { forwardRef, memo } from 'react'
import type * as React from 'react'
import './styles.css'

export type ActionButtonProps = {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export const ActionButton: React.FC<ActionButtonProps & React.RefAttributes<HTMLButtonElement>> =
  memo(forwardRef<HTMLButtonElement, ActionButtonProps>((props, ref) => (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={props.disabled}
      onClick={props.onClick}
      className={`action ${props.variant ?? 'primary'}`}
    >
      {props.children}
    </button>
  )))

ActionButton.displayName = 'ActionButton'

type SurfaceProps = { children: React.ReactNode }

export const Surface: React.FC<SurfaceProps & React.RefAttributes<HTMLElement>> =
  memo(forwardRef<HTMLElement, SurfaceProps>((props, ref) => (
    <section ref={ref} className="surface">{props.children}</section>
  )))

Surface.displayName = 'Surface'
