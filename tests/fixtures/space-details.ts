// Isolated fixtures matching observed Atlas detail content. Never used by app routes.
import type { DetailedSpace } from "../../src/features/spaces/details";
import { portfolioSpaces } from "./spaces";

export const portfolioDetails: DetailedSpace[] = portfolioSpaces.map(space => ({ ...space, openingHours: { ok: true, rows: [] }, rules: { ok: true, rows: [] } }));
portfolioDetails[0] = {
  ...portfolioDetails[0],
  description: "A bright, polished meeting room designed for focused team conversations, client presentations, and collaborative working sessions.",
  images: [...portfolioSpaces[0].images.map(image => ({ ...image, source_credit: "Unsplash" })), ...[2, 3].map((number, index) => ({ image_url: `/images/spaces/atlas-meeting-room-${number}.jpg`, alt_text: `Atlas Meeting Room gallery photo ${number}`, sort_order: index + 1, source_credit: "Unsplash" }))],
  openingHours: { ok: true, rows: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, is_closed: false, opens_at: weekday === 0 || weekday === 6 ? "10:00:00" : "08:00:00", closes_at: weekday === 0 || weekday === 6 ? "16:00:00" : weekday === 5 ? "18:00:00" : "20:00:00" })) },
  rules: { ok: true, rows: ["Respect the 8-person capacity.", "Leave the space tidy and reset furniture.", "Finish on time for the next member.", "Keep noise at a considerate level."].map((rule_text, sort_order) => ({ rule_text, sort_order })) },
};
