type FieldProps = { inputId: string; label: string; children: React.ReactNode }

export const FormField: React.FC<FieldProps> = (props) => (
  <div>
    <label htmlFor={props.inputId}>{props.label}</label>
    {props.children}
  </div>
)

type InputProps = React.ComponentPropsWithoutRef<'input'>

export const Input: React.FC<InputProps> = (props) => <input {...props} />
