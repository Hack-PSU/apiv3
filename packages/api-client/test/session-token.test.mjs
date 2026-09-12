/**
 * Session token capture for destinations that cannot read the auth cookie.
 *
 * Exercises the source module directly rather than the bundle, because this
 * lives in react-sdk and only api-client has a test harness. Kept here so it
 * runs in CI alongside the fetcher checks.
 */
import assert from "node:assert";
import { test } from "node:test";
import {
  captureSessionToken,
  getSessionToken,
  clearSessionToken,
  withSessionAuth,
} from "../../react-sdk/src/session-token.ts";

function fakeWindow(href) {
  const store = new Map();
  let current = href;
  globalThis.window = {
    location: {
      get href() {
        return current;
      },
    },
    history: {
      replaceState(_state, _title, url) {
        current = url;
      },
    },
    sessionStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
  };
  return () => current;
}

test.beforeEach(() => {
  clearSessionToken();
  delete globalThis.window;
});

await test("captures the token the auth service appended", () => {
  fakeWindow("http://localhost:3000/dashboard?authToken=TKN123");
  assert.equal(captureSessionToken(), "TKN123");
  assert.equal(getSessionToken(), "TKN123");
});

await test("strips the token from the address bar", () => {
  const href = fakeWindow("http://localhost:3000/dash?authToken=TKN&keep=1");
  captureSessionToken();
  assert.ok(!href().includes("authToken"), "token must not linger in the URL");
  assert.ok(href().includes("keep=1"), "other params are preserved");
});

await test("survives a later navigation via sessionStorage", () => {
  fakeWindow("http://localhost:3000/a?authToken=TKN");
  captureSessionToken();

  // New page, no query parameter, in-memory copy gone.
  clearSessionToken();
  const store = globalThis.window.sessionStorage;
  store.setItem("hackpsu.sessionToken", "TKN");
  fakeWindow("http://localhost:3000/b");
  globalThis.window.sessionStorage = store;

  assert.equal(captureSessionToken(), "TKN");
});

await test("sends the bearer header only when a token is held", () => {
  fakeWindow("http://localhost:3000/a");
  assert.deepEqual(withSessionAuth({ "Content-Type": "application/json" }), {
    "Content-Type": "application/json",
  });

  fakeWindow("http://localhost:3000/a?authToken=TKN");
  captureSessionToken();
  assert.equal(withSessionAuth().Authorization, "Bearer TKN");
});

await test("logout drops the token", () => {
  fakeWindow("http://localhost:3000/a?authToken=TKN");
  captureSessionToken();
  clearSessionToken();
  assert.equal(getSessionToken(), undefined);
  assert.equal(withSessionAuth().Authorization, undefined);
});

await test("does nothing during server rendering", () => {
  delete globalThis.window;
  assert.equal(captureSessionToken(), undefined);
  assert.equal(getSessionToken(), undefined);
  assert.deepEqual(withSessionAuth({ a: "b" }), { a: "b" });
});
