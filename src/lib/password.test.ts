import { describe, expect, it } from "vitest";
import { passwordMeetsAllRules } from "./password";

describe("passwordMeetsAllRules", () => {
  it("rechaza una contraseña corta", () => {
    expect(passwordMeetsAllRules("Ab1!")).toBe(false);
  });

  it("rechaza sin mayúscula", () => {
    expect(passwordMeetsAllRules("abcdefg1!")).toBe(false);
  });

  it("rechaza sin número", () => {
    expect(passwordMeetsAllRules("Abcdefgh!")).toBe(false);
  });

  it("rechaza sin carácter especial", () => {
    expect(passwordMeetsAllRules("Abcdefg1")).toBe(false);
  });

  it("acepta una contraseña que cumple todo", () => {
    expect(passwordMeetsAllRules("Abcdefg1!")).toBe(true);
  });
});
