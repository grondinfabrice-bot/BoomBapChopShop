export const licenseOptions = [
  {
    id: "mp3-basic",
    label: "MP3",
    name: "MP3 Basic",
    price: 14.99,
    tone: "basic",
    short: "Entry license for writing, demos, and small independent releases.",
    includes: ["Tagged MP3 preview-quality file", "Basic license PDF", "Instant delivery"],
    allowed: ["Streaming release", "YouTube / social content", "Non-exclusive use"],
    limits: ["No stems included", "Beat remains available to other artists", "Upgrade recommended before serious release"],
  },
  {
    id: "wav",
    label: "WAV",
    name: "WAV Lease",
    price: 29.99,
    tone: "wav",
    short: "Higher-quality audio for artists preparing a real release.",
    includes: ["Untagged WAV file", "MP3 reference", "Standard license PDF"],
    allowed: ["Streaming platforms", "Music videos", "Better mix/mastering workflow"],
    limits: ["No separated stems", "Non-exclusive use", "Credit required where possible"],
  },
  {
    id: "wav-stems",
    label: "WAV + STEMS",
    name: "WAV + Stems",
    price: 49.99,
    tone: "stems",
    short: "Best non-exclusive option when you want full control in the mix.",
    includes: ["Untagged WAV", "Separated stems", "Extended license PDF"],
    allowed: ["Professional mix", "Vocal arrangement flexibility", "Streaming and video release"],
    limits: ["Non-exclusive use", "Beat can still be licensed by others", "Exclusive upgrade possible if available"],
  },
  {
    id: "exclusive",
    label: "EXCLUSIVE",
    name: "Exclusive",
    price: 199,
    tone: "exclusive",
    short: "Locks the beat for your project and removes it from future licensing.",
    includes: ["WAV", "Stems", "Exclusive license agreement", "Beat marked as sold"],
    allowed: ["Commercial release", "Videos and campaigns", "Exclusive artist use"],
    limits: ["Subject to availability", "Past non-exclusive licenses may still exist", "Contract details to confirm before delivery"],
  },
];

export function getLicenseById(id) {
  return licenseOptions.find((license) => license.id === id) || licenseOptions[0];
}
