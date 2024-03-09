const TaskQueue = require("./TaskQueue");

describe("TaskQueue", () => {
  let taskQueue;

  beforeEach(() => {
    taskQueue = new TaskQueue();
  });

  test("should process tasks in the order they were enqueued", async () => {
    const results = [];
    const task1 = () =>
      new Promise((resolve) => setTimeout(() => resolve("task1"), 10));
    const task2 = () =>
      new Promise((resolve) => setTimeout(() => resolve("task2"), 5));
    const task3 = () =>
      new Promise((resolve) => setTimeout(() => resolve("task3"), 1));

    await Promise.all([
      taskQueue.enqueue(task1).then((result) => results.push(result)),
      taskQueue.enqueue(task2).then((result) => results.push(result)),
      taskQueue.enqueue(task3).then((result) => results.push(result)),
    ]);

    expect(results).toEqual(["task1", "task2", "task3"]);
  });

  test("should handle task rejection", async () => {
    const errorTask = () =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Task failed")), 10)
      );

    await expect(taskQueue.enqueue(errorTask)).rejects.toThrow("Task failed");
  });
});
