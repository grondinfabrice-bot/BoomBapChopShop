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
  previewUrl: "./audio/previews/ghost-of-good-times.mp3",
  coverUrl: "./images/covers/shadow-of-the-sp.jpg",
  catalog: "BBCS-001",
  year: "2026",
  mood: "Dusty Soul",
  type: "Boom Bap",
  description:
    "Authentic Boom Bap instrumentals built from rare samples, heavy drums, and classic sounds. Mixed with grit, space, and enough headroom for sharp verses.",
  licenses: licenseOptions,
};

export const beats = [
  { id: 1, name: "STAIRCASE SWAGGER", subtitle: "boom bap instrumental", bpm: 90, key: "Unknown", duration: "3:15", durationSeconds: 195, previewUrl: "./audio/previews/staircase-swagger.mp3", coverUrl: "./images/covers/staircase-swagger.jpg", price: 29.99, tags: ["boom bap", "jazzy", "guitare", "swing", "freestyle"] },
  { id: 2, name: "MIDTOWN STORIES", subtitle: "soul sample / subway drums", bpm: 90, key: "Eb Min", duration: "3:16", durationSeconds: 196, previewUrl: "./audio/previews/golden-haze.mp3", coverUrl: "./images/covers/midtown-stories.jpg", price: 29.99, tags: ["boom bap", "soul", "chopped", "90s"] },
  { id: 3, name: "CONCRETE JUNGLE", subtitle: "gritty horns / hard snare", bpm: 88, key: "C Min", duration: "3:36", durationSeconds: 216, previewUrl: "./audio/previews/dans-le-mur.mp3", coverUrl: "./images/covers/concrete-jungle.jpg", price: 19.99, tags: ["boom bap", "drums", "90s"] },
  { id: 4, name: "CRATE DIGGER'S CODE", subtitle: "jazz loop / SP-1200 swing", bpm: 92, key: "D Min", duration: "3:04", durationSeconds: 184, previewUrl: "./audio/previews/wu-orguee-sortie-mesure.mp3", coverUrl: "./images/covers/crate-diggers-code.jpg", price: 24.99, tags: ["boom bap", "chopped", "drums"] },
  { id: 5, name: "SOUL RESURRECTION", subtitle: "dusty vocal chop / warm bass", bpm: 84, key: "Ab Maj", duration: "3:27", durationSeconds: 207, previewUrl: "./audio/previews/middle-east-2-sortie-mesure.mp3", coverUrl: "./images/covers/soul-resurrection.jpg", price: 19.99, tags: ["soul", "chopped"] },
  { id: 6, name: "BRICK CITY LOOP", subtitle: "deep keys / basement texture", bpm: 96, key: "B Min", duration: "3:03", durationSeconds: 183, previewUrl: "./audio/previews/silence.mp3", coverUrl: "./images/covers/brick-city-loop.jpg", price: 24.99, tags: ["boom bap", "90s"] },
  { id: 7, name: "MPC DREAMS", subtitle: "loose hats / dusty pads", bpm: 78, key: "E Min", duration: "3:15", durationSeconds: 195, previewUrl: "./audio/previews/lofi2-sortie-mesure.mp3", coverUrl: "./images/covers/mpc-dreams.jpg", price: 14.99, tags: ["soul", "drums"] },
  { id: 8, name: "HARLEM NIGHTS", subtitle: "piano soul / classic bounce", bpm: 90, key: "F Maj", duration: "3:21", durationSeconds: 201, previewUrl: "./audio/previews/wutang-type-beat-90s-hiphop.mp3", coverUrl: "./images/covers/harlem-nights.jpg", price: 29.99, tags: ["soul", "90s"] },
  { id: 9, name: "RAW MECHANICS", subtitle: "bass heavy / drum workout", bpm: 102, key: "G Min", duration: "2:55", durationSeconds: 175, previewUrl: "./audio/previews/chapter-two.mp3", coverUrl: "./images/covers/raw-mechanics.jpg", price: 19.99, tags: ["boom bap", "drums", "chopped"] },
];

export const filters = ["all", "boom bap", "jazzy", "guitare", "swing", "freestyle", "soul", "chopped", "drums", "90s"];
