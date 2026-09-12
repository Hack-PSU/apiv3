/**
 * Generates the typed client from the API's own OpenAPI document.
 *
 * The spec at ../../openapi.json is a committed build artifact produced by
 * `yarn openapi` in the repo root. Regenerating the client never requires a
 * running API or a database.
 */
module.exports = {
  hackpsu: {
    input: {
      target: "../../openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/generated/endpoints.ts",
      schemas: "./src/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      prettier: false,
      indexFiles: true,
      override: {
        mutator: {
          path: "./src/fetcher.ts",
          name: "customFetch",
        },
        query: {
          version: 5,
        },
        fetch: {
          // Return the parsed body rather than a { data, status, headers }
          // wrapper, matching what src/fetcher.ts actually resolves to and
          // keeping `const { data: events } = useEventGetAll()` ergonomic.
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
};
