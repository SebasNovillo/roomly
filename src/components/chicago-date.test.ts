import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ChicagoDate } from "./chicago-date";

it.each([
  ["2026-10-17T02:00:00.000Z", "2026-10-16", "Friday, October 16, 2026"],
  ["2026-12-01T05:30:00.000Z", "2026-11-30", "Monday, November 30, 2026"],
])("formats the Chicago calendar day across UTC midnight and DST (%s)", (initialTime, date, label) => {
  const markup = renderToStaticMarkup(createElement(ChicagoDate, { initialTime }));
  expect(markup).toContain(`dateTime="${date}"`);
  expect(markup).toContain(label);
  expect(markup).toContain("America/Chicago");
});
