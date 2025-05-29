export class UIComposite {
  constructor(name) {
    this.name = name;
    this.children = [];
  }

  add(child) {
    this.children.push(child);
  }

  render(indent = 0) {
    const current = `${' '.repeat(indent)}+ ${this.name}`;
    const childrenRendered = this.children
      .map(child => child.render(indent + 2))
      .join('\n');
    return `${current}\n${childrenRendered}`;
  }
}
