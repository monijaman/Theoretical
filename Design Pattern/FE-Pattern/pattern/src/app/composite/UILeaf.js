export class UILeaf {
  constructor(name) {
    this.name = name;
  }

  render(indent = 0) {
    return `${' '.repeat(indent)}- ${this.name}`;
  }
}
