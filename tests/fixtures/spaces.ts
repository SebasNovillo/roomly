// Isolated test data, never imported by application routes or queries.
import type { Space } from "../../src/features/spaces/catalog";

export const portfolioSpaces: Space[] = [
  { slug: "atlas-meeting-room", name: "Atlas Meeting Room", type: "meeting-room", floor: "2", capacity: 8, amenities: ["wi-fi", "whiteboard", "display"] },
  { slug: "willow-study-room", name: "Willow Study Room", type: "study-room", floor: "1", capacity: 4, amenities: ["wi-fi", "whiteboard", "power-outlets"] },
  { slug: "horizon-conference-room", name: "Horizon Conference Room", type: "conference-room", floor: "3", capacity: 16, amenities: ["display", "video-conferencing", "wi-fi"] },
  { slug: "focus-office", name: "Focus Office", type: "private-office", floor: "2", capacity: 2, amenities: ["wi-fi", "power-outlets"] },
  { slug: "studio-collaboration-room", name: "Studio Collaboration Room", type: "collaboration-room", floor: "1", capacity: 10, amenities: ["whiteboard", "display", "wi-fi"] },
  { slug: "commons-coworking-area", name: "Commons Coworking Area", type: "coworking-area", floor: "1", capacity: 12, amenities: ["wi-fi", "power-outlets", "display"] },
].map((space, index) => ({ ...space, id: `a7100000-0000-4000-8000-00000000000${index + 1}`, description: `Fictional portfolio fixture: ${space.name}, floor ${space.floor}, for up to ${space.capacity} people.`, is_demo: true, images: [{ image_url: `/images/spaces/${space.slug}.jpg`, alt_text: `${space.name} interior`, sort_order: 0, source_credit: "Original Unsplash photo used in the Figma reference" }] })) as Space[];
