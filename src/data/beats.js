export const featuredBeat = {
  id: "featured-shadow-sp",
  name: "SHADOW OF THE SP",
  subtitle: "rare soul chop / SP-1200 drums",
  bpm: 94,
  key: "F Min",
  duration: "2:47",
  durationSeconds: 167,
  catalog: "BBCS-001",
  year: "2026",
  mood: "Dusty Soul",
  type: "Boom Bap",
  description:
    "Authentic Boom Bap instrumentals built from rare samples, heavy drums, and classic sounds. Mixed with grit, space, and enough headroom for sharp verses.",
  licenses: [
    { label: "MP3", name: "MP3 Basic", price: 14.99, tone: "basic" },
    { label: "WAV + STEMS", name: "WAV + Stems", price: 29.99, tone: "wav" },
    { label: "EXCLUSIF", name: "Exclusif", price: 199, tone: "exclusive" },
  ],
};

export const beats = [
  { id: 1, name: "MIDTOWN STORIES", subtitle: "soul sample / subway drums", bpm: 90, key: "Eb Min", duration: "2:46", durationSeconds: 166, price: 29.99, tags: ["boom bap", "soul", "chopped", "90s"] },
  { id: 2, name: "CONCRETE JUNGLE", subtitle: "gritty horns / hard snare", bpm: 88, key: "C Min", duration: "2:54", durationSeconds: 174, price: 19.99, tags: ["boom bap", "drums", "90s"] },
  { id: 3, name: "CRATE DIGGER'S CODE", subtitle: "jazz loop / SP-1200 swing", bpm: 92, key: "D Min", duration: "3:12", durationSeconds: 192, price: 24.99, tags: ["boom bap", "chopped", "drums"] },
  { id: 4, name: "SOUL RESURRECTION", subtitle: "dusty vocal chop / warm bass", bpm: 84, key: "Ab Maj", duration: "2:38", durationSeconds: 158, price: 19.99, tags: ["soul", "chopped"] },
  { id: 5, name: "BRICK CITY LOOP", subtitle: "deep keys / basement texture", bpm: 96, key: "B Min", duration: "3:05", durationSeconds: 185, price: 24.99, tags: ["boom bap", "90s"] },
  { id: 6, name: "MPC DREAMS", subtitle: "loose hats / dusty pads", bpm: 78, key: "E Min", duration: "2:20", durationSeconds: 140, price: 14.99, tags: ["soul", "drums"] },
  { id: 7, name: "HARLEM NIGHTS", subtitle: "piano soul / classic bounce", bpm: 90, key: "F Maj", duration: "3:30", durationSeconds: 210, price: 29.99, tags: ["soul", "90s"] },
  { id: 8, name: "RAW MECHANICS", subtitle: "bass heavy / drum workout", bpm: 102, key: "G Min", duration: "2:45", durationSeconds: 165, price: 19.99, tags: ["boom bap", "drums", "chopped"] },
];

export const filters = ["all", "boom bap", "soul", "chopped", "drums", "90s"];
