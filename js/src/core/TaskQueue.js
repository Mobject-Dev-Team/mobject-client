class TaskQueue {
  #taskQueue = [];
  #isProcessing = false;

  enqueue(task) {
    return new Promise((resolve, reject) => {
      const wrappedTask = async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.#taskQueue.push(wrappedTask);
      this.#processTasks();
    });
  }

  async #processTasks() {
    if (this.#isProcessing) return;

    this.#isProcessing = true;
    try {
      while (this.#taskQueue.length > 0) {
        const queuedTask = this.#taskQueue.shift();
        await queuedTask();
      }
    } finally {
      this.#isProcessing = false;
    }
  }
}

module.exports = TaskQueue;
