export const catalogSortOptions = [
  { value: "recent", label: "Most Recent" },
  { value: "bpm-desc", label: "Highest BPM" },
  { value: "price-asc", label: "Lowest Price" },
];

export function getVisibleBeats(beats = [], state = {}) {
  const query = normalizeSearch(state.catalogQuery);
  const filter = state.filter || "all";
  const sort = state.catalogSort || "recent";

  return beats
    .map((beat, index) => ({ beat, index }))
    .filter(({ beat }) => filter === "all" || (beat.tags || []).includes(filter))
    .filter(({ beat }) => !query || getSearchText(beat).includes(query))
    .sort((left, right) => compareBeats(left, right, sort))
    .map(({ beat }) => beat);
}

function compareBeats(left, right, sort) {
  if (sort === "bpm-desc") {
    return Number(right.beat.bpm || 0) - Number(left.beat.bpm || 0) || left.index - right.index;
  }

  if (sort === "price-asc") {
    return Number(left.beat.price || 0) - Number(right.beat.price || 0) || left.index - right.index;
  }

  const rightDate = Date.parse(right.beat.createdAt || "");
  const leftDate = Date.parse(left.beat.createdAt || "");
  if (Number.isFinite(rightDate) && Number.isFinite(leftDate) && rightDate !== leftDate) {
    return rightDate - leftDate;
  }

  return left.index - right.index;
}

function getSearchText(beat) {
  return normalizeSearch([
    beat.name,
    beat.subtitle,
    beat.description,
    beat.key,
    beat.bpm,
    beat.duration,
    ...(beat.tags || []),
  ].filter(Boolean).join(" "));
}

function normalizeSearch(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
