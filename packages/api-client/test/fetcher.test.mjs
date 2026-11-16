import assert from "node:assert";
import { test } from "node:test";
// Deliberately exercises the built bundle rather than src: these checks guard
// the behaviour consumers actually install.
import {
  configureApiClient,
  resetApiClient,
  ApiError,
  customFetch,
} from "../dist/index.mjs";

const calls = [];
const mockFetch = async (url, init) => {
  calls.push({ url, init });
  const h = init.headers;
  if (url.endsWith("/204")) return new Response(null, { status: 204 });
  if (url.endsWith("/401")) return new Response("nope", { status: 401 });
  if (url.endsWith("/pdf"))
    return new Response(new Blob([new Uint8Array([1, 2])]), {
      status: 200, headers: { "Content-Type": "application/pdf" },
    });
  return new Response(
    JSON.stringify({ ok: true, auth: h.get("Authorization"), ct: h.get("Content-Type") }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

let unauthorizedCalls = 0;
configureApiClient({
  baseUrl: "https://api.example.com/",       // trailing slash on purpose
  getToken: async () => "ID_TOKEN_123",
  fetch: mockFetch,
  onUnauthorized: () => { unauthorizedCalls++; },
});

await test("attaches bearer ID token and normalises base URL", async () => {
// 1. bearer token from getToken, base URL normalised
const r1 = await customFetch("/events", { method: "GET" });
assert.equal(r1.auth, "Bearer ID_TOKEN_123", "sends Firebase ID token as bearer");
assert.equal(calls[0].url, "https://api.example.com/events", "strips trailing slash");
});

await test("sets application/json for string bodies", async () => {
// 2. JSON content-type set for string bodies
const r2 = await customFetch("/events", { method: "POST", body: JSON.stringify({ a: 1 }) });
assert.equal(r2.ct, "application/json");
});

await test("leaves Content-Type unset for FormData uploads", async () => {
// 3. FormData must NOT get an explicit Content-Type (boundary comes from browser)
const fd = new FormData();
fd.append("icon", new Blob(["x"]), "i.png");
const r3 = await customFetch("/events", { method: "POST", body: fd });
assert.equal(r3.ct, null, "leaves multipart boundary to the runtime");
});

await test("204 resolves to undefined", async () => {
// 4. 204 returns undefined rather than throwing on empty JSON parse
assert.equal(await customFetch("/204", { method: "DELETE" }), undefined);
});

await test("binary responses resolve to Blob", async () => {
// 5. binary responses come back as Blob (PDF/CSV/wallet passes)
assert.ok((await customFetch("/pdf", { method: "GET" })) instanceof Blob);
});

await test("401 triggers onUnauthorized and throws ApiError", async () => {
// 6. 401 fires onUnauthorized and throws a typed ApiError
await assert.rejects(
  () => customFetch("/401", { method: "GET" }),
  (e) => e instanceof ApiError && e.status === 401,
);
assert.equal(unauthorizedCalls, 1, "onUnauthorized invoked once");
});

await test("unconfigured client throws an actionable error", async () => {
// 7. unconfigured client fails loudly instead of silently hitting undefined
resetApiClient();
await assert.rejects(() => customFetch("/events", {}), /has not been configured/);
});
