class Header {
  #header = {};

  constructor(initial = "") {
    try {
      this.#header = JSON.parse(initial);
    } catch (e) {
      this.#header = {};
    }
  }

  GetField(key) {
    return this.#header[key];
  }

  WriteField(key, value) {
    this.#header[key] = value;
  }

  toString() {
    return JSON.stringify(this.#header);
  }

  toJSON() {
    return JSON.stringify(this.#header);
  }
}

module.exports = Header;
