function TextInput(props) { /* ... */ }
function SelectInput(props) { /* ... */ }
function CheckboxInput(props) { /* ... */ }

function FormFieldFactory(type) {
  switch(type) {
    case 'text': return TextInput;
    case 'select': return SelectInput;
    case 'checkbox': return CheckboxInput;
    default: return () => <div>Unsupported field type</div>;
  }
}

// Usage
const FieldComponent = FormFieldFactory(field.type);
return <FieldComponent {...fieldProps} />;
