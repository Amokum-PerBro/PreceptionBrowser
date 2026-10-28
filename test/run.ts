/**
 * Test entrypoint: `npm test`.
 *
 * Every test file is imported here so the suite runs in a single process.
 * Node runs the TypeScript sources directly (type stripping), so the suite has
 * no build step and no dependencies.
 */

import "./snapshot.test.ts";
import "./validate.test.ts";
import "./loop.test.ts";
import "./eval.test.ts";
