import assert from "node:assert/strict";
import { test } from "node:test";
import { ResourcePool } from "./resource-pool.ts";

const signal = () => new AbortController().signal;
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture(capacity = 2) {
  const loads = [],
    destroyed = [];
  const pool = new ResourcePool(
    capacity,
    async (key) => {
      loads.push(key);
      return key;
    },
    async (key) => {
      destroyed.push(key);
    },
  );
  return { pool, loads, destroyed };
}

test("concurrent consumers share one source and release is idempotent", async () => {
  const { pool, loads } = fixture();
  const [first, second] = await Promise.all([
    pool.acquire("a", signal()),
    pool.acquire("a", signal()),
  ]);
  assert.deepEqual(loads, ["a"]);
  assert.equal(first.value, second.value);
  first.release();
  first.release();
  second.release();
  pool.dispose();
});

test("busy sources are never evicted and capacity stays bounded", async () => {
  const { pool, loads, destroyed } = fixture();
  const a = await pool.acquire("a", signal());
  const b = await pool.acquire("b", signal());
  let completed = false;
  const third = pool.acquire("c", signal()).then((lease) => {
    completed = true;
    return lease;
  });
  await tick();
  assert.equal(completed, false);
  assert.deepEqual(loads, ["a", "b"]);
  a.release();
  const c = await third;
  assert.deepEqual(destroyed, ["a"]);
  b.release();
  c.release();
  pool.dispose();
});

test("least recently used idle source is destroyed before its replacement loads", async () => {
  const events = [];
  const pool = new ResourcePool(
    2,
    async (key) => {
      events.push(`load:${key}`);
      return key;
    },
    async (key) => {
      await tick();
      events.push(`destroy:${key}`);
    },
  );
  const a = await pool.acquire("a", signal());
  a.release();
  const b = await pool.acquire("b", signal());
  b.release();
  const aAgain = await pool.acquire("a", signal());
  aAgain.release();
  const c = await pool.acquire("c", signal());
  c.release();
  assert.deepEqual(events, ["load:a", "load:b", "destroy:b", "load:c"]);
  pool.dispose();
});

test("aborted queued pages do not load or consume capacity", async () => {
  const { pool, loads } = fixture(1);
  const a = await pool.acquire("a", signal());
  const controller = new AbortController();
  const result = pool.acquire("b", controller.signal);
  controller.abort();
  await assert.rejects(result, { name: "AbortError" });
  a.release();
  await tick();
  assert.deepEqual(loads, ["a"]);
  pool.dispose();
});

test("failed source can be retried after an aborted first consumer", async () => {
  let rejectLoad;
  let calls = 0;
  const pool = new ResourcePool(
    1,
    () =>
      ++calls === 1
        ? new Promise((_, reject) => {
            rejectLoad = reject;
          })
        : Promise.resolve("ok"),
    async () => {},
  );
  const controller = new AbortController();
  const first = pool.acquire("a", controller.signal);
  controller.abort();
  rejectLoad(new Error("offline"));
  await assert.rejects(first, /offline/);
  const retried = await pool.acquire("a", signal());
  assert.equal(retried.value, "ok");
  retried.release();
  pool.dispose();
});

test("closing the pool wakes waiting consumers and destroys sources only once", async () => {
  const { pool, destroyed } = fixture(1);
  const a = await pool.acquire("a", signal());
  const queued = pool.acquire("b", signal());
  pool.dispose();
  pool.dispose();
  await assert.rejects(queued, /closed/);
  await assert.rejects(pool.acquire("a", signal()), /closed/);
  a.release();
  await tick();
  assert.deepEqual(destroyed, ["a"]);
});

test("concurrent eviction and re-request never acquires a destroyed source", async () => {
  const events = [];
  const pool = new ResourcePool(
    1,
    async (key) => {
      events.push(`load:${key}`);
      return key;
    },
    async (key) => {
      await tick();
      events.push(`destroy:${key}`);
    },
  );
  const a = await pool.acquire("a", signal());
  a.release();
  const bPromise = pool.acquire("b", signal());
  const againPromise = pool.acquire("a", signal());
  const b = await bPromise;
  b.release();
  const again = await againPromise;
  again.release();
  assert.deepEqual(events, [
    "load:a",
    "destroy:a",
    "load:b",
    "destroy:b",
    "load:a",
  ]);
  pool.dispose();
});
