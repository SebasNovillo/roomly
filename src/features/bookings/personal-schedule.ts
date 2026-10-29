import { z } from "zod";
import { selectionSchema, wallInstant, type Selection } from "./model";

export const personalConflictsSchema = z.object({ conflicts: z.array(z.object({
  id: z.uuid(), startsAt: z.iso.datetime({offset:true}), endsAt: z.iso.datetime({offset:true}),
  spaceName: z.string().trim().min(1).max(200).nullable(),
})) });
export type PersonalConflicts = z.infer<typeof personalConflictsSchema>;
export function selectionInterval(selection: Selection) {
  if (!selectionSchema.safeParse(selection).success) return null;
  const start = wallInstant(selection.date,selection.start), end = wallInstant(selection.date,selection.end);
  return start !== null && end !== null && end - start >= 30 * 60_000 && selection.end > selection.start ? {start,end} : null;
}
