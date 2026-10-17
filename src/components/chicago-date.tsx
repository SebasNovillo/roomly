"use client";

import { useEffect, useState } from "react";

export function ChicagoDate({ initialTime }: { initialTime: string }) {
  const [time, setTime] = useState(initialTime);
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toISOString()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const date = new Date(time);
  const options = { timeZone: "America/Chicago", year: "numeric", month: "long", day: "numeric", weekday: "long" } as const;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return <div className="dashboard-date"><time dateTime={`${part("year")}-${part("month")}-${part("day")}`}>{new Intl.DateTimeFormat("en-US", options).format(date)}</time><span aria-hidden="true">·</span><span>All times in America/Chicago</span></div>;
}
