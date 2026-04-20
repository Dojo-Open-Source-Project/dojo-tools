import { assert, describe, it } from "vitest";
import { validateChallenge } from "../src/decoders.js";
import {
  INVALID_AUTH47_CHALLENGES,
  VALID_AUTH47_CHALLENGES,
} from "./test-vectors.js";

describe("Auth47Challenge", () => {
  it("should successfully parse valid challenges", () => {
    for (const uri of VALID_AUTH47_CHALLENGES) {
      assert.doesNotThrow(() => validateChallenge(uri));
    }
  });

  it("should detect invalid challenges", () => {
    for (const uri of INVALID_AUTH47_CHALLENGES) {
      assert.throws(() => validateChallenge(uri[0]), uri[1]);
    }
  });
});
