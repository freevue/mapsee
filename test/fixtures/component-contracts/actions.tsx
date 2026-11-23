import type { ActionButtonProps } from '../component-reuse/ui'
import { ActionButton } from '../component-reuse/ui'

type LoadingProps = { busy: boolean }

export const LoadingAction: React.FC<LoadingProps> = (props) =>
  props.busy ? (
    <button type="submit" disabled>저장 중</button>
  ) : (
    <ActionButton variant="primary" type="submit">저장</ActionButton>
  )

export const DisabledAction: React.FC<ActionButtonProps> = (props) => (
  <ActionButton type="submit" onClick={props.onClick}>{props.children}</ActionButton>
)

export const EventAction: React.FC<ActionButtonProps> = (props) => (
  <ActionButton type="submit" disabled={props.disabled}>{props.children}</ActionButton>
)

type GuardedProps = ActionButtonProps & { busy: boolean }

export const GuardedAction: React.FC<GuardedProps> = (props) => (
  <ActionButton
    type="submit"
    variant="primary"
    disabled={props.busy || props.disabled}
    onClick={props.onClick}
  >
    {props.busy ? '저장 중' : props.children}
  </ActionButton>
)

type SubmitOnlyProps = { children: React.ReactNode; disabled?: boolean }

export const SubmitOnlyAction: React.FC<SubmitOnlyProps> = (props) => (
  <ActionButton type="submit" variant="primary" disabled={props.disabled}>
    {props.children}
  </ActionButton>
)
