import { expect, test } from "bun:test";
import { Semaphore, sleep } from "../services/concurrency";

test("Semaphore limits concurrency", async () => {
  const sem = new Semaphore(2);
  let active = 0;
  let maxActive = 0;

  const task = async () => {
    await sem.acquire();
    active++;
    if (active > maxActive) maxActive = active;
    await sleep(50);
    active--;
    sem.release();
  };

  await Promise.all([task(), task(), task(), task(), task()]);

  // Even though we fired 5 tasks, max active at any time should be 2
  expect(maxActive).toBe(2);
});
