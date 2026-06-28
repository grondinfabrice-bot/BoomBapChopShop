import { licenseOptions } from "./licenses.js";

export const featuredBeat = {
  id: "featured-shadow-sp",
  storeBeatId: 1,
  name: "SHADOW OF THE SP",
  subtitle: "rare soul chop / SP-1200 drums",
  bpm: 94,
  key: "F Min",
  duration: "3:30",
  durationSeconds: 210,
  previewUrl: "",
  coverUrl: "",
  catalog: "BBCS-001",
  year: "2026",
  mood: "Dusty Soul",
  type: "Boom Bap",
  description:
    "Authentic Boom Bap instrumentals built from rare samples, heavy drums, and classic sounds. Mixed with grit, space, and enough headroom for sharp verses.",
  licenses: licenseOptions,
  stemsAvailable: true,
};

export const beats = [
  { id: 1, name: "STAIRCASE SWAGGER", subtitle: "boom bap instrumental", bpm: 90, key: "Unknown", duration: "3:15", durationSeconds: 195, previewUrl: "", coverUrl: "", price: 29.99, tags: ["boom bap", "jazzy", "guitare", "swing", "freestyle"], stemsAvailable: true },
  { id: 2, name: "MIDTOWN STORIES", subtitle: "soul sample / subway drums", bpm: 90, key: "Eb Min", duration: "3:16", durationSeconds: 196, previewUrl: "", coverUrl: "", price: 29.99, tags: ["boom bap", "soul", "chopped", "90s"], stemsAvailable: true },
  { id: 3, name: "CONCRETE JUNGLE", subtitle: "gritty horns / hard snare", bpm: 88, key: "C Min", duration: "3:36", durationSeconds: 216, previewUrl: "", coverUrl: "", price: 19.99, tags: ["boom bap", "drums", "90s"], stemsAvailable: true },
  { id: 4, name: "CRATE DIGGER'S CODE", subtitle: "jazz loop / SP-1200 swing", bpm: 92, key: "D Min", duration: "3:04", durationSeconds: 184, previewUrl: "", coverUrl: "", price: 24.99, tags: ["boom bap", "chopped", "drums"], stemsAvailable: true },
  { id: 5, name: "SOUL RESURRECTION", subtitle: "dusty vocal chop / warm bass", bpm: 84, key: "Ab Maj", duration: "3:27", durationSeconds: 207, previewUrl: "", coverUrl: "", price: 19.99, tags: ["soul", "chopped"], stemsAvailable: true },
  { id: 6, name: "BRICK CITY LOOP", subtitle: "deep keys / basement texture", bpm: 96, key: "B Min", duration: "3:03", durationSeconds: 183, previewUrl: "", coverUrl: "", price: 24.99, tags: ["boom bap", "90s"], stemsAvailable: true },
  { id: 7, name: "MPC DREAMS", subtitle: "loose hats / dusty pads", bpm: 78, key: "E Min", duration: "3:15", durationSeconds: 195, previewUrl: "", coverUrl: "", price: 14.99, tags: ["soul", "drums"], stemsAvailable: true },
  { id: 8, name: "HARLEM NIGHTS", subtitle: "piano soul / classic bounce", bpm: 90, key: "F Maj", duration: "3:21", durationSeconds: 201, previewUrl: "", coverUrl: "", price: 29.99, tags: ["soul", "90s"], stemsAvailable: true },
  { id: 9, name: "RAW MECHANICS", subtitle: "bass heavy / drum workout", bpm: 102, key: "G Min", duration: "2:55", durationSeconds: 175, previewUrl: "", coverUrl: "", price: 19.99, tags: ["boom bap", "drums", "chopped"], stemsAvailable: true },
];

export const filters = ["all", "boom bap", "jazzy", "guitare", "swing", "freestyle", "soul", "chopped", "drums", "90s"];
