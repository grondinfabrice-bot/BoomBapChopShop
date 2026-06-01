import { customerFaq } from "../data/faq.js?v=1";
import { licenseOptions } from "../data/licenses.js?v=3";
import { serviceOffers } from "../data/content.js?v=5";
import { beats, featuredBeat, filters } from "../data/beats.js?v=1";

const businessFacts = {
  email: "contact@boombapchopshop.art",
  exclusiveRemoval: "12 hours",
  essentialDelay: "5 days",
  premiumDelay: "5 days",
  expressDelay: "2 days",
  essentialDelayFr: "5 jours",
  premiumDelayFr: "5 jours",
  expressDelayFr: "2 jours",
  producerName: "El padre ultra instinct",
};

const licenseFr = {
  "mp3-basic": {
    short: "Licence non exclusive d'entree pour demos, freestyles, sessions d'ecriture et petites sorties independantes.",
    includes: ["Livraison MP3", "Contrat de licence non exclusive", "Telechargement instantane apres paiement"],
    limits: ["Pas de WAV ni stems inclus", "Pas de claim Content ID sur le beat", "Le beat reste disponible pour d'autres artistes"],
  },
  wav: {
    short: "Licence non exclusive en meilleure qualite pour preparer une sortie plus propre sans stems.",
    includes: ["WAV master non tague", "Reference MP3", "Contrat de licence standard"],
    limits: ["Pas de stems separes", "Pas de claim Content ID sur le beat", "Credit producteur demande quand c'est possible"],
  },
  "wav-stems": {
    short: "Licence non exclusive professionnelle avec stems pour une sortie serieuse et plus de controle au mix.",
    includes: ["WAV et MP3 non tagues", "Stems / trackouts separes", "Contrat de licence professionnel"],
    limits: ["Les stems ne peuvent pas etre partages, revendus ou reutilises", "Pas de claim Content ID sur le beat", "Sync, IA, NFT et sample packs demandent un accord separe"],
  },
  exclusive: {
    short: "Usage exclusif pour un morceau final. Le beat est retire des futures ventes apres achat.",
    includes: ["WAV et MP3", "Stems disponibles", "Contrat de licence exclusive", "Beat marque comme vendu"],
    limits: ["Les licences non exclusives precedentes restent valables", "Ce n'est pas un full buyout de l'auteur ou du publishing", "Content ID ne doit pas bloquer les anciens licencies"],
  },
};

const keywordMap = [
  { id: "delivery", words: ["delivery", "deliver", "download", "instant", "receive", "mail", "email", "livraison", "telechargement", "recevoir", "instantanee"] },
  { id: "license-choice", words: ["which license", "choose", "release", "sortir", "choisir", "quelle licence", "licence choisir", "sortie", "single"] },
  { id: "one-song", words: ["one song", "multiple", "combien", "plusieurs", "morceaux", "songs", "un seul"] },
  { id: "stems", words: ["stems", "trackout", "pistes", "separees", "separated"] },
  { id: "exclusive", words: ["exclusive", "exclusif", "remove", "retire", "sold", "vente", "future"] },
  { id: "content-id", words: ["content id", "claim", "youtube claim", "revendication", "monetiser", "monetize"] },
  { id: "ownership", words: ["own", "owner", "proprietaire", "propriete", "buyout", "publishing", "auteur"] },
  { id: "refunds", words: ["refund", "rembourse", "remboursement", "retract", "annuler", "cancel"] },
  { id: "mix-delays", words: ["delay", "turnaround", "delai", "delais", "jours", "days", "express", "premium", "essential"] },
  { id: "mix-files", words: ["files", "fichiers", "send", "envoyer", "vocal", "rough", "reference", "mix master"] },
  { id: "sync-ai-nft", words: ["sync", "pub", "film", "serie", "game", "jeu", "ai", "ia", "nft", "sample pack", "dataset"] },
  { id: "contact", words: ["contact", "email", "support", "help", "aide", "instagram", "youtube"] },
  { id: "producer", words: ["producer", "produces", "beatmaker", "produit", "producteur", "qui fait", "qui compose"] },
];

export const chatSuggestions = [
  { fr: "Quelle licence choisir ?", en: "Which license should I choose?" },
  { fr: "Quels sont les prix ?", en: "What are the prices?" },
  { fr: "Quand vais-je recevoir les fichiers ?", en: "When do I receive the files?" },
  { fr: "Quels delais pour le mix/master ?", en: "Mix/master turnaround times?" },
];

export function buildChatReply(message, state = {}) {
  const text = normalize(message);
  const language = detectLanguage(message, state.chatLanguage);

  if (isSampleQuestion(text)) return sampleReply(language);
  if (isProducerQuestion(text)) return producerReply(language);
  if (isFileSendingQuestion(text)) return fileSendingReply(language);
  const serviceOffer = findSpecificService(text);
  if (isDeliveryQuestion(text)) return faqReply(customerFaq.find((item) => item.id === "delivery"), language);
  if (serviceOffer) return specificServiceReply(serviceOffer, language);
  if (isPriceQuestion(text)) return priceReply(language);
  if (isServiceQuestion(text)) return serviceReply(language);
  if (isGuideQuestion(text)) return guideReply(text, language);

  const faq = findBestFaq(text);
  if (faq) return faqReply(faq, language);

  return fallbackReply(language);
}

export function buildCatalogSearchReply(message, state = {}) {
  const text = normalize(message);
  const language = detectLanguage(message, state.chatLanguage);
  if (!isCatalogQuestion(text)) return null;

  const criteria = getCatalogCriteria(text);
  if (!criteria.length) return null;

  const catalog = getCatalog();
  const matches = catalog.filter((beat) => criteria.every((criterion) => criterion.match(beat)));
  if (matches.length) {
    const shown = matches.slice(0, 5).map(formatBeatLine).join("\n");
    const more = matches.length > 5
      ? language === "en" ? `\n\n${matches.length - 5} more result(s) are also in the catalogue.` : `\n\n${matches.length - 5} autre(s) resultat(s) sont aussi dans le catalogue.`
      : "";
    return {
      text: language === "en"
        ? `I found ${matches.length} matching beat(s):\n\n${shown}${more}`
        : `J'ai trouve ${matches.length} instru(s) qui correspondent :\n\n${shown}${more}`,
      actions: [{ label: language === "en" ? "Browse beats" : "Voir les beats", scroll: "#catalogue" }],
    };
  }

  return {
    text: noCatalogMatchReply(criteria, catalog, language),
    actions: [{ label: language === "en" ? "Browse beats" : "Voir les beats", scroll: "#catalogue" }],
  };
}

export function detectLanguage(message = "", preferred = "auto") {
  if (preferred === "fr" || preferred === "en") return preferred;
  const text = normalize(message);
  const frSignals = ["bonjour", "salut", "licence", "delai", "delais", "rembourse", "combien", "quand", "je", "mon", "mes", "achat", "fichiers", "stems"];
  const enSignals = ["hello", "hi", "license", "delivery", "refund", "how", "when", "what", "can", "should", "my", "files", "purchase"];
  const frScore = frSignals.filter((word) => text.includes(word)).length;
  const enScore = enSignals.filter((word) => text.includes(word)).length;
  return enScore > frScore ? "en" : "fr";
}

function priceReply(language) {
  const licenses = licenseOptions.map((license) => `- ${license.name}: ${formatMoney(license.price)}`).join("\n");
  const services = serviceOffers.map((offer) => `- ${offer.name}: ${formatMoney(offer.price)}`).join("\n");

  if (language === "en") {
    return {
      text: `Here are the current prices:\n\nBeat licenses:\n${licenses}\n\nMix + mastering:\n${services}\n\nFor most serious releases, I would point you toward WAV + Stems. For a full campaign around one beat, Exclusive is the cleanest option.`,
      actions: [{ label: "View licenses", route: "licensing" }, { label: "Browse beats", scroll: "#catalogue" }],
    };
  }

  return {
    text: `Voici les prix actuels :\n\nLicences beats :\n${licenses}\n\nMix + mastering :\n${services}\n\nPour une sortie serieuse, je conseillerais souvent WAV + Stems. Pour bloquer un beat pour une campagne, l'Exclusive est l'option la plus claire.`,
    actions: [{ label: "Voir les licences", route: "licensing" }, { label: "Voir les beats", scroll: "#catalogue" }],
  };
}

function serviceReply(language) {
  if (language === "en") {
    return {
      text: `Mix + Master Essential and Premium are delivered within ${businessFacts.essentialDelay}. Mix + Master Express is priority and delivered within ${businessFacts.expressDelay}.\n\nFor the session, send vocal WAV stems, the beat WAV or trackouts, a rough mix, 1 or 2 references, artist name, song title, notes, and any deadline.`,
      actions: [{ label: "View services", scroll: "#services" }, { label: "Contact", route: "contact" }],
    };
  }

  return {
    text: `Mix + Master Essential et Premium sont livres sous ${businessFacts.essentialDelayFr}. Mix + Master Express est prioritaire et livre sous ${businessFacts.expressDelayFr}.\n\nPour la session, il faut envoyer les pistes vocales WAV, le beat WAV ou les trackouts, un rough mix, 1 ou 2 references, le nom d'artiste, le titre du morceau, les notes et la deadline si besoin.`,
    actions: [{ label: "Voir les services", scroll: "#services" }, { label: "Contact", route: "contact" }],
  };
}

function specificServiceReply(offer, language) {
  const details = serviceDetails(offer.name);
  if (language === "en") {
    return {
      text: `${offer.name}\n\n- Price: ${formatMoney(offer.price)}\n- Turnaround: ${details.delayEn}\n- Includes: ${details.includesEn.join(", ")}`,
      actions: [{ label: "View services", scroll: "#services" }, { label: "Contact", route: "contact" }],
    };
  }

  return {
    text: `${offer.name}\n\n- Prix : ${formatMoney(offer.price)}\n- Delai : ${details.delayFr}\n- Inclus : ${details.includesFr.join(", ")}`,
    actions: [{ label: "Voir les services", scroll: "#services" }, { label: "Contact", route: "contact" }],
  };
}

function fileSendingReply(language) {
  if (language === "en") {
    return {
      text: `For mix/mastering, send a private download link.\n\n- Recommended: SwissTransfer (free)\n- Also accepted: WeTransfer, Google Drive, or Dropbox\n- Send the link by replying to the order email or to ${businessFacts.email}\n\nPut in the folder:\n- vocal WAV stems\n- beat WAV or trackouts if available\n- rough mix\n- 1 or 2 references\n- artist name + song title\n- notes + deadline if needed\n\nImportant: all WAV files must start at 00:00 / bar 1. The turnaround starts after BOOM BAP CHOP SHOP receives and validates all usable files.`,
      actions: [{ label: "View services", scroll: "#services" }, { label: "Contact", route: "contact" }],
    };
  }

  return {
    text: `Pour le mix/mastering, envoie un lien prive de telechargement.\n\n- Recommande : SwissTransfer (gratuit)\n- Accepte aussi : WeTransfer, Google Drive ou Dropbox\n- Envoie le lien en repondant a l'email de commande ou a ${businessFacts.email}\n\nA mettre dans le dossier :\n- pistes vocales WAV\n- beat WAV ou trackouts si disponibles\n- rough mix\n- 1 ou 2 references\n- nom d'artiste + titre du morceau\n- notes + deadline si besoin\n\nImportant : tous les WAV doivent commencer a 00:00 / bar 1. Le delai commence apres reception et validation de tous les fichiers exploitables.`,
    actions: [{ label: "Voir les services", scroll: "#services" }, { label: "Contact", route: "contact" }],
  };
}

function producerReply(language) {
  if (language === "en") {
    return {
      text: `The beats are produced by ${businessFacts.producerName}. He brings 30 years of practice and strong command of audio techniques, from beatmaking to mix/mastering workflow.`,
      actions: [{ label: "Browse beats", scroll: "#catalogue" }, { label: "Contact", route: "contact" }],
    };
  }

  return {
    text: `Les beats sont produits par ${businessFacts.producerName}. Il apporte 30 ans de pratique et une vraie maitrise des techniques audio, du beatmaking au travail de mix/mastering.`,
    actions: [{ label: "Voir les beats", scroll: "#catalogue" }, { label: "Contact", route: "contact" }],
  };
}

function sampleReply(language) {
  if (language === "en") {
    return {
      text: "BOOM BAP CHOP SHOP licenses the elements the producer controls or can license. Some instrumentals may contain samples, loops, or third-party elements.\n\nFor standard independent use, you can choose a license under the displayed terms. For major label release, radio, advertising, film, TV, sync, or larger commercial exploitation, separate clearance or written confirmation may be needed.\n\nFor a specific project, contact contact@boombapchopshop.art.",
      actions: [{ label: "Contact", route: "contact" }, { label: "View licenses", route: "licensing" }],
    };
  }

  return {
    text: "BOOM BAP CHOP SHOP accorde les licences sur les elements que le producteur controle ou peut licencier. Certaines instrumentales peuvent contenir des samples, boucles ou elements tiers.\n\nPour un usage independant standard, tu peux choisir une licence selon les conditions affichees. Pour label, radio, pub, film, TV, synchro ou exploitation importante, une clearance separee ou une confirmation ecrite peut etre necessaire.\n\nPour verifier un projet precis, contacte contact@boombapchopshop.art.",
    actions: [{ label: "Contact", route: "contact" }, { label: "Voir les licences", route: "licensing" }],
  };
}

function guideReply(text, language) {
  const wantsExclusive = includesAny(text, ["exclusive", "exclusif", "buyout", "campagne", "campaign", "single officiel", "official"]);
  const wantsStems = includesAny(text, ["stems", "trackout", "mix", "engineer", "ingenieur", "studio"]);
  const smallRelease = includesAny(text, ["demo", "freestyle", "small", "petite", "budget", "pas cher"]);
  const hasProjectSignal = wantsExclusive || wantsStems || smallRelease || includesAny(text, ["serious", "serieus", "sortie", "release", "clip", "video"]);

  if (!hasProjectSignal) return licenseGuideReply(language);

  const license = wantsExclusive
    ? licenseOptions.find((item) => item.id === "exclusive")
    : wantsStems
      ? licenseOptions.find((item) => item.id === "wav-stems")
      : smallRelease
        ? licenseOptions.find((item) => item.id === "mp3-basic")
        : licenseOptions.find((item) => item.id === "wav");

  if (language === "en") {
    return {
      text: `Based on that, I would start with ${license.name} (${formatMoney(license.price)}).\n\n${license.short}\n\nIncluded: ${license.includes.join(", ")}.\nMain limits: ${license.limits.join(", ")}.`,
      actions: [{ label: "View licenses", route: "licensing" }, { label: "Browse beats", scroll: "#catalogue" }],
    };
  }

  const copy = licenseFr[license.id] || {
    short: license.short,
    includes: license.includes,
    limits: license.limits,
  };

  return {
    text: `D'apres ce besoin, je partirais sur ${license.name} (${formatMoney(license.price)}).\n\n${copy.short}\n\nInclus : ${copy.includes.join(", ")}.\nLimites principales : ${copy.limits.join(", ")}.`,
    actions: [{ label: "Voir les licences", route: "licensing" }, { label: "Voir les beats", scroll: "#catalogue" }],
  };
}

function licenseGuideReply(language) {
  if (language === "en") {
    return {
      text: "It depends on the release plan:\n\n- MP3 Basic: demos, freestyles, writing sessions, or small releases up to 100,000 streams.\n- WAV Lease: cleaner audio quality when you do not need stems.\n- WAV + Stems: best choice for a serious release, engineer mix, or full control over the session.\n- Exclusive: best if you want to reserve the beat and stop future licenses from being sold.\n\nIf you tell me your project type, I can point you to the best option.",
      actions: [{ label: "View licenses", route: "licensing" }, { label: "Browse beats", scroll: "#catalogue" }],
    };
  }

  return {
    text: "Ca depend du projet :\n\n- MP3 Basic : demos, freestyles, sessions d'ecriture ou petite sortie jusqu'a 100 000 streams.\n- WAV Lease : meilleure qualite audio si tu n'as pas besoin des stems.\n- WAV + Stems : meilleur choix pour une sortie serieuse, un mix par ingenieur ou un controle complet de la session.\n- Exclusive : meilleur choix si tu veux reserver le beat et bloquer les futures ventes.\n\nSi tu me dis ton type de projet, je peux te guider vers l'option la plus adaptee.",
    actions: [{ label: "Voir les licences", route: "licensing" }, { label: "Voir les beats", scroll: "#catalogue" }],
  };
}

function faqReply(faq, language) {
  return {
    text: language === "en" ? faq.answerEn : faq.answerFr,
    actions: actionsForFaq(faq.id, language),
  };
}

function actionsForFaq(id, language) {
  if (["license-choice", "one-song", "exclusive", "ownership", "content-id", "stems"].includes(id)) {
    return [{ label: language === "en" ? "View licenses" : "Voir les licences", route: "licensing" }];
  }
  if (["mix-delays", "mix-files"].includes(id)) {
    return [{ label: language === "en" ? "View services" : "Voir les services", scroll: "#services" }];
  }
  if (id === "contact") return [{ label: "Contact", route: "contact" }];
  return [{ label: language === "en" ? "Browse beats" : "Voir les beats", scroll: "#catalogue" }];
}

function fallbackReply(language) {
  if (language === "en") {
    return {
      text: `I can help with licenses, prices, delivery, refunds, Content ID, stems, exclusives, and mix/mastering. If the question needs a human answer, contact ${businessFacts.email}.`,
      actions: [{ label: "Licenses", route: "licensing" }, { label: "Contact", route: "contact" }],
    };
  }

  return {
    text: `Je peux aider sur les licences, prix, livraison, remboursements, Content ID, stems, exclusives et mix/mastering. Si la question demande une reponse humaine, le contact officiel est ${businessFacts.email}.`,
    actions: [{ label: "Licences", route: "licensing" }, { label: "Contact", route: "contact" }],
  };
}

function findBestFaq(text) {
  const scored = keywordMap.map((entry) => ({
    id: entry.id,
    score: entry.words.filter((word) => text.includes(word)).length,
  })).sort((a, b) => b.score - a.score);

  if (!scored[0]?.score) return null;
  return customerFaq.find((item) => item.id === scored[0].id) || null;
}

function isPriceQuestion(text) {
  return includesAny(text, ["price", "prices", "pricing", "cost", "how much", "tarif", "prix", "combien", "coute"]);
}

function isSampleQuestion(text) {
  return includesAny(text, ["sample", "samples", "cleared", "clearance", "legal", "legaux", "legalite", "droit tiers", "droits tiers", "illegaux", "illegale", "autorisation"]);
}

function isProducerQuestion(text) {
  const producerIntent = includesAny(text, ["producer", "produces", "producteur", "produit", "compose", "beatmaker", "qui fait", "qui a fait", "qui compose", "qui produit"]);
  const beatIntent = includesAny(text, ["beat", "beats", "instrumentale", "instrumentales", "instru", "instrus", "prod", "prods"]);
  return producerIntent && beatIntent;
}

function isCatalogQuestion(text) {
  const catalogIntent = includesAny(text, ["beat", "beats", "instru", "instrus", "instrumentale", "instrumentales", "prod", "prods", "catalogue", "acheter"]);
  const criteriaIntent = includesAny(text, ["tonalite", "key", "mineur", "majeur", "min", "maj", "bpm", "tempo", "duree", "duration", "minutes", "minute", "tag", "tags", "boom bap", "soul", "jazzy", "drums", "chopped", "freestyle", "guitare", "swing", "90s"]);
  return catalogIntent && criteriaIntent;
}

function getCatalogCriteria(text) {
  return [
    getKeyCriterion(text),
    getDurationCriterion(text),
    getBpmCriterion(text),
    getTagCriterion(text),
  ].filter(Boolean);
}

function getKeyCriterion(text) {
  const hasKeyContext = includesAny(text, ["tonalite", "key", "tonality"]);
  const mode = includesAny(text, ["mineur", "minor", " min"]) ? "min" : includesAny(text, ["majeur", "major", " maj"]) ? "maj" : "";
  if (!hasKeyContext && !mode) return null;

  const notes = [
    ["ab", "ab"], ["bb", "bb"], ["db", "db"], ["eb", "eb"], ["gb", "gb"],
    ["a#", "bb"], ["c#", "db"], ["d#", "eb"], ["f#", "gb"], ["g#", "ab"],
    ["do", "c"], ["re", "d"], ["mi", "e"], ["fa", "f"], ["sol", "g"], ["la", "a"], ["si", "b"],
    ["c", "c"], ["d", "d"], ["e", "e"], ["f", "f"], ["g", "g"], ["a", "a"], ["b", "b"],
  ];
  for (const [label, value] of notes) {
    if (new RegExp(`\\b${escapeRegex(label)}\\b`).test(text)) {
      const wanted = mode ? `${value} ${mode}` : value;
      return {
        label: `tonalite ${displayKey(wanted)}`,
        match: (beat) => normalizeKey(beat.key).startsWith(wanted),
      };
    }
  }
  return null;
}

function getDurationCriterion(text) {
  const match = text.match(/(?:(?:\+|>)\s*(?:de\s*)?|plus de|superieur a|over|longer than|(?:<)\s*(?:de\s*)?|moins de|inferieur a|under)?\s*(\d+(?:[,.]\d+)?)\s*(?:min|minute|minutes|m)\b/);
  if (!match) return null;
  const seconds = Math.round(Number(match[1].replace(",", ".")) * 60);
  const isUnder = includesAny(text, ["moins de", "inferieur a", "under", "<"]);
  const isOver = includesAny(text, ["plus de", "superieur a", "over", "longer than", ">", "+"]);
  return {
    label: isUnder ? `duree < ${formatDuration(seconds)}` : isOver ? `duree > ${formatDuration(seconds)}` : `duree autour de ${formatDuration(seconds)}`,
    match: (beat) => isUnder
      ? beat.durationSeconds < seconds
      : isOver
        ? beat.durationSeconds > seconds
        : Math.abs(beat.durationSeconds - seconds) <= 20,
  };
}

function getBpmCriterion(text) {
  const match = text.match(/(?:>|plus de|superieur a|over|moins de|inferieur a|under|<)?\s*(\d{2,3})\s*bpm\b/);
  if (!match) return null;
  const bpm = Number(match[1]);
  const isUnder = includesAny(text, ["moins de", "inferieur a", "under", "<"]);
  const isOver = includesAny(text, ["plus de", "superieur a", "over", ">"]);
  return {
    label: isUnder ? `BPM < ${bpm}` : isOver ? `BPM > ${bpm}` : `BPM autour de ${bpm}`,
    match: (beat) => isUnder ? beat.bpm < bpm : isOver ? beat.bpm > bpm : Math.abs(beat.bpm - bpm) <= 3,
  };
}

function getTagCriterion(text) {
  const tag = filters.filter((item) => item !== "all").find((item) => text.includes(normalize(item)));
  if (!tag) return null;
  return {
    label: `tag ${tag}`,
    match: (beat) => (beat.tags || []).some((beatTag) => normalize(beatTag) === normalize(tag)),
  };
}

function getCatalog() {
  const byName = new Map();
  [featuredBeat, ...beats].forEach((beat) => {
    if (beat?.name && !byName.has(beat.name)) byName.set(beat.name, beat);
  });
  return [...byName.values()];
}

function formatBeatLine(beat) {
  const tags = (beat.tags || []).slice(0, 3).join(", ");
  return `- ${beat.name} — ${beat.key}, ${beat.duration}, ${beat.bpm} BPM${tags ? `, ${tags}` : ""}`;
}

function noCatalogMatchReply(criteria, catalog, language) {
  const criteriaLabel = criteria.map((item) => item.label).join(" + ");
  const longest = [...catalog].sort((a, b) => b.durationSeconds - a.durationSeconds).slice(0, 3).map(formatBeatLine).join("\n");
  const keys = [...new Set(catalog.map((beat) => beat.key).filter(Boolean))].join(", ");

  if (language === "en") {
    return `I did not find an exact beat for: ${criteriaLabel}.\n\nClosest useful info:\n${longest}\n\nAvailable keys right now: ${keys}.`;
  }
  return `Je n'ai pas trouve d'instru exacte pour : ${criteriaLabel}.\n\nInfos utiles les plus proches :\n${longest}\n\nTonalites disponibles actuellement : ${keys}.`;
}

function normalizeKey(value) {
  return normalize(value)
    .replace("minor", "min")
    .replace("major", "maj")
    .replace(/\s+/g, " ")
    .trim();
}

function displayKey(value) {
  return value.split(" ").map((part) => part.length === 1 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSpecificService(text) {
  if (!includesAny(text, ["mix", "master", "mastering", "service", "essential", "premium", "express"])) return null;
  if (text.includes("express")) return serviceOffers.find((offer) => normalize(offer.name).includes("express"));
  if (text.includes("premium")) return serviceOffers.find((offer) => normalize(offer.name).includes("premium"));
  if (text.includes("essential") || text.includes("essentiel")) return serviceOffers.find((offer) => normalize(offer.name).includes("essential"));
  return null;
}

function serviceDetails(name) {
  const normalized = normalize(name);
  if (normalized.includes("express")) {
    return {
      delayFr: "2 jours",
      delayEn: "2 days",
      includesFr: ["mix + mastering complet", "traitement prioritaire", "release export check", "2 rounds de revision"],
      includesEn: ["full mix + master", "priority turnaround", "release export check", "2 revision rounds"],
    };
  }
  if (normalized.includes("premium")) {
    return {
      delayFr: "5 jours",
      delayEn: "5 days",
      includesFr: ["mix vocal complet", "master pret pour le streaming", "version clean + version performance", "2 rounds de revision"],
      includesEn: ["full vocal mix", "streaming-ready master", "clean + performance versions", "2 revision rounds"],
    };
  }
  return {
    delayFr: "5 jours",
    delayEn: "5 days",
    includesFr: ["mix vocal", "EQ / compression / espace", "master final WAV + MP3", "1 round de revision"],
    includesEn: ["vocal mix", "EQ / compression / space", "final master WAV + MP3", "1 revision round"],
  };
}

function isDeliveryQuestion(text) {
  const deliveryIntent = includesAny(text, ["receive", "delivery", "deliver", "download", "get my files", "recois", "recevoir", "livraison", "telechargement", "fichiers", "temps pour recevoir", "delai pour recevoir"]);
  const serviceFilePrep = includesAny(text, ["envoyer", "send", "vocal", "rough", "reference", "mix master", "mix/master"]);
  return deliveryIntent && !serviceFilePrep;
}

function isFileSendingQuestion(text) {
  const sendIntent = includesAny(text, ["envoyer", "envoie", "send", "upload", "uploader", "transfer", "transferer", "wetransfer", "swisstransfer", "dropbox", "drive", "lien"]);
  const fileIntent = includesAny(text, ["fichier", "fichiers", "files", "stems", "pistes", "vocals", "vocal", "wav", "rough", "reference", "trackout", "trackouts", "dossier"]);
  const locationIntent = /\b(ou|where|comment|how)\b/.test(text);
  return fileIntent && (sendIntent || locationIntent);
}

function isServiceQuestion(text) {
  return includesAny(text, ["mix", "master", "mastering", "service", "essential", "premium", "express"]);
}

function isGuideQuestion(text) {
  return includesAny(text, ["which", "choose", "recommend", "best", "quelle", "choisir", "conseille", "recommande", "besoin"]);
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
