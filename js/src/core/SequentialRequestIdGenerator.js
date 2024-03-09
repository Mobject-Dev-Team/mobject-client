class SequentialRequestIdGenerator {
  #current = 0;

  constructor(seed = 0) {
    this.#current = seed;
  }

  generate() {
    this.#current++;
    return this.#current.toString();
  }
}
module.exports = SequentialRequestIdGenerator;
