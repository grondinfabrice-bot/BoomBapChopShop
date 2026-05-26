export const licenseOptions = [
  {
    id: "mp3-basic",
    label: "MP3",
    name: "MP3 Basic",
    price: 14.99,
    tone: "basic",
    contractUrl: "./documents/licenses/licence-non-exclusive-mp3-100k-streams.pdf",
    short: "Entry non-exclusive license for demos, freestyles, writing sessions, and small independent releases.",
    includes: ["MP3 delivery", "Non-exclusive license agreement", "Instant download after payment"],
    allowed: ["One final song only", "Up to 100,000 cumulative streams", "YouTube, social, and DSP release"],
    limits: ["No WAV or stems included", "No Content ID claim on the beat", "Beat remains available to other artists"],
  },
  {
    id: "wav",
    label: "WAV",
    name: "WAV Lease",
    price: 29.99,
    tone: "wav",
    contractUrl: "./documents/licenses/licence-non-exclusive-wav-lease.pdf",
    short: "Higher-quality non-exclusive license for artists preparing a cleaner release without stems.",
    includes: ["Untagged WAV master", "MP3 reference", "Standard license agreement"],
    allowed: ["One final song only", "Streaming and video release", "Better mix and mastering workflow"],
    limits: ["No separated stems", "No Content ID claim on the beat", "Producer credit required where possible"],
  },
  {
    id: "wav-stems",
    label: "WAV + STEMS",
    name: "WAV + Stems",
    price: 49.99,
    tone: "stems",
    contractUrl: "./documents/licenses/licence-non-exclusive-trackout-stems.pdf",
    short: "Professional non-exclusive license with stems for a serious release and full mix control.",
    includes: ["Untagged WAV and MP3", "Separated stems / trackouts", "Professional license agreement"],
    allowed: ["One final song only", "Unlimited streams", "Stems may be sent to your engineer for this song"],
    limits: ["Stems cannot be shared, resold, or reused", "No Content ID claim on the beat", "Sync, AI, NFT, and sample-pack uses need separate approval"],
  },
  {
    id: "exclusive",
    label: "EXCLUSIVE",
    name: "Exclusive",
    price: 199,
    tone: "exclusive",
    contractUrl: "./documents/licenses/licence-exclusive-instrumentale.pdf",
    short: "Exclusive use for one final song. The beat is removed from future public licensing after purchase.",
    includes: ["WAV and MP3", "Stems if available", "Exclusive license agreement", "Beat marked as sold"],
    allowed: ["One final song only", "Unlimited streams and digital sales", "No new licenses sold after purchase"],
    limits: ["Previous non-exclusive licenses stay valid", "Not a full buyout of authorship or publishing", "Content ID must not block prior licensees"],
  },
];

export function getLicenseById(id) {
  return licenseOptions.find((license) => license.id === id) || licenseOptions[0];
}
