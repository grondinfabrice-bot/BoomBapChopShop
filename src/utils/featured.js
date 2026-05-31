import { featuredBeat as fallbackFeaturedBeat } from "../data/beats.js?v=9";

export function getFeaturedBeat(state) {
  const beat = (state.beats || []).find((item) => (item.tags || []).includes("featured"));
  if (!beat) return fallbackFeaturedBeat;

  return {
    ...fallbackFeaturedBeat,
    ...beat,
    storeBeatId: beat.id,
    catalog: beat.catalog || fallbackFeaturedBeat.catalog,
    year: beat.year || fallbackFeaturedBeat.year,
    mood: beat.mood || inferMood(beat) || fallbackFeaturedBeat.mood,
    type: beat.type || fallbackFeaturedBeat.type,
    description: beat.description || fallbackFeaturedBeat.description,
    licenses: fallbackFeaturedBeat.licenses,
  };
}

function inferMood(beat) {
  const tags = (beat.tags || []).filter((tag) => tag !== "featured");
  if (!tags.length) return "";
  return tags.slice(0, 2).map(capitalize).join(" ");
}

function capitalize(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}
