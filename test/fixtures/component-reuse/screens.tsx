import { ActionButton, ActionButton as SaveAction, ConfirmAction } from './index'
import type * as React from 'react'

export const ProfileAction: React.FC = () => (
  <form>
    <button type="submit" className="action primary">프로필 저장</button>
  </form>
)

export const ProfileSurface: React.FC = () => (
  <div className="surface"><h2>사용자 정보</h2><p>프로필 정보입니다.</p></div>
)

export const AccountAction: React.FC = () => (
  <form>
    <button type="submit" data-component="ActionButton" className="action primary">
      계정 설정 저장
    </button>
  </form>
)

export const PreferenceAction: React.FC = () => (
  <form><SaveAction variant="primary" type="submit">환경 설정 저장</SaveAction></form>
)

export const ConfirmationAction: React.FC = () => (
  <form><ConfirmAction variant="primary" type="submit">확인 내용 저장</ConfirmAction></form>
)

export const ContentLayout: React.FC = () => (
  <main><section><div><h2>안내</h2><p>설명 문단입니다.</p></div></section></main>
)

export const HelpDisclosure: React.FC = () => (
  <details><summary>도움말</summary><p>추가 설명입니다.</p></details>
)

export const NotificationAction: React.FC = () => (
  <form><ActionButton variant="secondary" type="submit">알림 설정 저장</ActionButton></form>
)
