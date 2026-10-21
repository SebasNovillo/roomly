import { describe, expect, it } from "vitest";
import { catalogHref, detailHref, escapeLike, filterQuery, parseFilters, spaceSchema } from "./catalog";
import { portfolioSpaces } from "../../../tests/fixtures/spaces";

describe("URL filters", () => {
  it("canonicalizes, deduplicates and preserves combined filters for detail/back links", () => {
    const filters = parseFilters({ q: "  Atlas & team  ", minCapacity: "8", type: "meeting-room", amenity: ["wi-fi", "display", "wi-fi"], page: "2" });
    const query = filterQuery(filters);
    expect(query).toBe("q=Atlas+%26+team&minCapacity=8&type=meeting-room&amenity=display&amenity=wi-fi&page=2");
    expect(detailHref("atlas-meeting-room", filters)).toBe(`/dashboard/spaces/atlas-meeting-room?${query}`);
    expect(catalogHref(filters)).toBe(`/dashboard/spaces?${query}`);
    const params = new URLSearchParams(query);
    expect(parseFilters({ ...Object.fromEntries(params), amenity: params.getAll("amenity") })).toEqual(filters);
  });
  it("ignores unsupported and malformed values, including availability controls", () => {
    expect(parseFilters({ minCapacity: "-1", type: "__proto__", amenity: ["bad", "wi-fi"], page: "1e4", date: "2026-10-20", start: "09:00" }))
      .toEqual({ q: "", minCapacity: null, type: "", amenities: ["wi-fi"], page: 1 });
    expect(parseFilters({ minCapacity: "10001", q: "x".repeat(200), page: "0" }).q).toHaveLength(120);
    expect(parseFilters({ minCapacity: "6" }).minCapacity).toBe(6);
  });
  it("escapes SQL pattern metacharacters without building an OR expression", () => {
    expect(escapeLike("50%_\\" )).toBe("50\\%\\_\\\\");
  });
});

it("validates records and rejects unsafe image sources", () => {
  expect(spaceSchema.safeParse(portfolioSpaces[0]).success).toBe(true);
  for (const image_url of ["javascript:alert(1)", "//outside.example/photo.jpg", "/images/spaces/../secret.jpg", "https://user:password@example.com/photo.jpg"]) {
    expect(spaceSchema.safeParse({ ...portfolioSpaces[0], images: [{ ...portfolioSpaces[0].images[0], image_url }] }).success).toBe(false);
  }
  expect(spaceSchema.safeParse({ ...portfolioSpaces[0], capacity: 0 }).success).toBe(false);
});
