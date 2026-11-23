import { FormField, Input } from './field-ui'

export const NameField: React.FC = () => (
  <FormField inputId="display-name" label="이름">
    <Input id="profile-name" name="displayName" />
  </FormField>
)

export const ErrorField: React.FC = () => (
  <FormField inputId="contact" label="연락처">
    <Input id="contact" aria-invalid="true" aria-describedby="contact-help" />
    <p id="contact-error" role="alert">연락처를 확인하세요.</p>
  </FormField>
)

export const ConnectedField: React.FC = () => (
  <FormField inputId="email" label="이메일">
    <Input id="email" aria-invalid="true" aria-describedby="email-error" />
    <p id="email-error" role="alert">이메일을 확인하세요.</p>
  </FormField>
)
