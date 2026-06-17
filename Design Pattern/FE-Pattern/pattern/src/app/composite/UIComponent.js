export class UIComponent {
  // 'indent' is provided for subclasses to use for
  //  pretty-printing or formatting output.
  // Suppress unused warning as this is an interface method.
  // eslint-disable-next-line no-unused-vars
  render(indent = 0) {
    // Reference 'indent' to avoid unused parameter warning
    void indent;
    throw new Error('render() must be implemented.');
  }
}
