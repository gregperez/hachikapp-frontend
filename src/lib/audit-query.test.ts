import { describe, expect, it } from "vitest";
import { buildAuditQuery } from "@/lib/audit-query";

const empty = { action: "", outcome: "", actorId: "", subjectId: "", from: "", to: "" };

describe("buildAuditQuery", () => {
  it("ignores SQL-like action values and keeps the allowlist", () => {
    expect(buildAuditQuery({ ...empty, action: "drop table audit_events" }, 20)).toBe("v1/audit-events?limit=20");
    expect(buildAuditQuery({ ...empty, action: "assign_roles", outcome: "success" }, 10)).toBe(
      "v1/audit-events?limit=10&action=assign_roles&outcome=success",
    );
  });

  it("forwards identity filters without interpolating expressions", () => {
    const path = buildAuditQuery({
      ...empty,
      actorId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      subjectId: "11111111-1111-1111-1111-111111111111",
    }, 10, "cursor-1");
    expect(path).toContain("actorId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(path).toContain("cursor=cursor-1");
    expect(path).not.toContain(";");
  });
});
