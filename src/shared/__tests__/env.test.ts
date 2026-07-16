import { describe, expect, it } from "vitest";
import { getEnv } from "../env";

const validEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/prumo",
  BETTER_AUTH_SECRET: "a-secret-value",
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("getEnv", () => {
  it("parses successfully when all vars are present and valid (spec AC-4: env completa)", () => {
    const env = getEnv(validEnv);

    expect(env).toEqual(validEnv);
  });

  it("throws naming DATABASE_URL when it is missing (spec AC-4: erro nomeando vars ausentes)", () => {
    const { DATABASE_URL, ...rest } = validEnv;
    void DATABASE_URL;

    expect(() => getEnv(rest)).toThrowError(/DATABASE_URL/);
  });

  it("throws naming BETTER_AUTH_SECRET when it is missing", () => {
    const { BETTER_AUTH_SECRET, ...rest } = validEnv;
    void BETTER_AUTH_SECRET;

    expect(() => getEnv(rest)).toThrowError(/BETTER_AUTH_SECRET/);
  });

  it("throws naming BETTER_AUTH_URL when it is missing", () => {
    const { BETTER_AUTH_URL, ...rest } = validEnv;
    void BETTER_AUTH_URL;

    expect(() => getEnv(rest)).toThrowError(/BETTER_AUTH_URL/);
  });

  it("throws naming DATABASE_URL when it is not a valid URL", () => {
    expect(() =>
      getEnv({ ...validEnv, DATABASE_URL: "not-a-url" }),
    ).toThrowError(/DATABASE_URL/);
  });

  it("throws naming BETTER_AUTH_SECRET when it is an empty string", () => {
    expect(() =>
      getEnv({ ...validEnv, BETTER_AUTH_SECRET: "" }),
    ).toThrowError(/BETTER_AUTH_SECRET/);
  });

  it("produces a readable message listing every missing var at once", () => {
    expect(() => getEnv({})).toThrowError(
      /DATABASE_URL[\s\S]*BETTER_AUTH_SECRET[\s\S]*BETTER_AUTH_URL/,
    );
  });
});
