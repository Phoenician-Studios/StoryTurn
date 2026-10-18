import { describe, expect, it } from "vitest";
import {
  childRelationLabel,
  isChildRelation,
  parseChildRelation,
} from "@/lib/domain/relations";

describe("child relations", () => {
  it("parses known relations", () => {
    expect(parseChildRelation("grandparent")).toBe("grandparent");
    expect(parseChildRelation("Aunt_Uncle")).toBe("aunt_uncle");
  });

  it("falls back for unknown values", () => {
    expect(parseChildRelation("cousin")).toBe("other");
    expect(parseChildRelation(null, "parent")).toBe("parent");
  });

  it("labels relations for UI", () => {
    expect(childRelationLabel("parent")).toBe("Parent");
    expect(childRelationLabel("aunt_uncle")).toBe("Aunt / Uncle");
    expect(isChildRelation("caregiver")).toBe(true);
    expect(isChildRelation("neighbor")).toBe(false);
  });
});
