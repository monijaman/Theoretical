class TeaMaker {
  constructor(sweetenerStrategy) {
    this.sweetenerStrategy = sweetenerStrategy;
  }

  setStrategy(sweetenerStrategy) {
    this.sweetenerStrategy = sweetenerStrategy;
  }

  serve(name) {
    const tea = `Tea for ${name}`;
    if (typeof this.sweetenerStrategy !== 'function') {
      throw new Error('sweetenerStrategy must be a function');
    }
    return this.sweetenerStrategy(tea);
  }
}

export default TeaMaker;
