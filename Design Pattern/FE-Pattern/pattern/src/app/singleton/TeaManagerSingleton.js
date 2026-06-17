class TeaManager {
  static instance = null;

  constructor() {
    if (TeaManager.instance) {
      return TeaManager.instance;  // remove this line to allow multiple instances
    }

    this.cupCount = 0;
    TeaManager.instance = this;
  }

  serveTea(name) {
    this.cupCount++;
    return `${name} is served tea #${this.cupCount}`;
  }
}

export default TeaManager;
