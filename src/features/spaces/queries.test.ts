import { beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioSpaces } from "../../../tests/fixtures/spaces";
import { parseFilters } from "./catalog";

const mocks = vi.hoisted(() => ({ getViewer: vi.fn(), createClient: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), ilike: vi.fn(), gte: vi.fn(), contains: vi.fn(), order: vi.fn(), range: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/viewer", () => ({ getViewer: mocks.getViewer }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
import { getCatalog, getSpace } from "./queries";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getViewer.mockResolvedValue({ name: "Verified user" });
  mocks.createClient.mockResolvedValue({ from: mocks.from });
  for (const key of ["from", "select", "eq", "ilike", "gte", "contains", "order"] as const) mocks[key].mockReturnValue(mocks);
  const rows = Promise.resolve({ data: [], error: null });
  mocks.order.mockReturnValue({ ...mocks, then: rows.then.bind(rows) });
  mocks.range.mockResolvedValue({ data: portfolioSpaces, error: null, count: 6 });
  mocks.maybeSingle.mockResolvedValue({ data: portfolioSpaces[0], error: null });
});

describe("session-aware catalog queries (mocked Supabase)", () => {
  it("verifies identity before constructing a database request", async () => {
    mocks.getViewer.mockRejectedValue(new Error("REDIRECT"));
    await expect(getCatalog(parseFilters({}))).rejects.toThrow("REDIRECT");
    await expect(getSpace("atlas-meeting-room")).rejects.toThrow("REDIRECT");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("combines literal search, minimum capacity, type, ALL amenities and stable pagination", async () => {
    const result = await getCatalog(parseFilters({ q: "50%", minCapacity: "8", type: "meeting-room", amenity: ["wi-fi", "display"], page: "2" }));
    expect(result.ok).toBe(true);
    expect(mocks.from).toHaveBeenCalledWith("spaces");
    expect(mocks.eq).toHaveBeenCalledWith("is_active", true);
    expect(mocks.ilike).toHaveBeenCalledWith("search_text", "%50\\%%");
    expect(mocks.gte).toHaveBeenCalledWith("capacity", 8);
    expect(mocks.eq).toHaveBeenCalledWith("type", "meeting-room");
    expect(mocks.contains).toHaveBeenCalledWith("amenities", ["display", "wi-fi"]);
    expect(mocks.order.mock.calls).toEqual([["sort_order"], ["id"]]);
    expect(mocks.range).toHaveBeenCalledWith(12, 23);
  });
  it.each(["42P01", "42501", "PGRST200", "PGRST205"])("reports %s as setup failure instead of an empty catalog", async code => {
    mocks.range.mockResolvedValue({ data: null, error: { code }, count: null });
    expect(await getCatalog(parseFilters({}))).toEqual({ ok: false, kind: "setup" });
  });
  it("distinguishes empty results, read failures and malformed records", async () => {
    mocks.range.mockResolvedValueOnce({ data: [], error: null, count: 0 });
    expect(await getCatalog(parseFilters({}))).toEqual({ ok: true, spaces: [], total: 0 });
    mocks.range.mockRejectedValueOnce(new Error("Provider detail must not be exposed"));
    expect(await getCatalog(parseFilters({}))).toEqual({ ok: false, kind: "load" });
    mocks.range.mockResolvedValueOnce({ data: [{ ...portfolioSpaces[0], capacity: -1 }], error: null, count: 1 });
    expect(await getCatalog(parseFilters({}))).toEqual({ ok: false, kind: "load" });
  });
  it("recovers an out-of-range page's exact count without showing unrelated results", async () => {
    mocks.range.mockResolvedValueOnce({ data: null, error: { code: "PGRST103" }, count: null });
    expect(await getCatalog(parseFilters({ page: "999" }))).toEqual({ ok: true, spaces: [], total: 6 });
  });
  it("uses the same active database record for detail and distinguishes missing from failure", async () => {
    expect(await getSpace("atlas-meeting-room")).toEqual({ ok: true, space: { ...portfolioSpaces[0], openingHours: { ok: true, rows: [] }, rules: { ok: true, rows: [] } } });
    expect(mocks.eq).toHaveBeenCalledWith("slug", "atlas-meeting-room");
    expect(mocks.eq).toHaveBeenCalledWith("is_active", true);
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await getSpace("missing")).toEqual({ ok: true, space: null });
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    expect(await getSpace("atlas-meeting-room")).toEqual({ ok: false, kind: "setup" });
  });
  it("does not query malformed slugs", async () => {
    expect(await getSpace("../bad")).toEqual({ ok: true, space: null });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("retains the catalog record while reporting missing detail tables separately", async () => {
    mocks.order.mockResolvedValueOnce({ data: null, error: { code: "PGRST205" } });
    const result = await getSpace("atlas-meeting-room");
    expect(result.ok && result.space?.name).toBe("Atlas Meeting Room");
    expect(result.ok && result.space?.openingHours).toEqual({ ok: false });
    expect(result.ok && result.space?.rules).toEqual({ ok: true, rows: [] });
    expect(mocks.eq).toHaveBeenCalledWith("space_id", portfolioSpaces[0].id);
  });
});
