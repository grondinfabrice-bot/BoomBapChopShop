const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = {
  role?: "user" | "assistant";
  text?: string;
};

type ChatPayload = {
  message?: string;
  language?: "auto" | "fr" | "en";
  history?: ChatMessage[];
};

const SYSTEM_PROMPT = `
You are the BOOM BAP CHOP SHOP customer support assistant.
Help visitors understand beat licenses, prices, delivery, refunds, stems, Content ID, exclusives, and mix/mastering services.
Answer in English by default. If the customer writes in another language, keep the answer simple and guide them back in English when possible.
Use only the approved knowledge base below. Do not invent prices, terms, deadlines, rights, discounts, approvals, or custom exceptions.
You are not a lawyer and must not give definitive legal advice.
Keep answers concise, useful, and artist-friendly.
If the customer asks about one specific offer, answer only about that offer. Do not list every price unless they ask for all prices.
If the customer asks about samples, legality, or clearance, give the approved cautious sample-clearance answer instead of a generic fallback.
If the customer replies with a number after you offered numbered choices, interpret the number in that context instead of treating it as an isolated message.
If the customer asks how long it takes to receive files, answer about delivery time, not prices.
If the customer asks where or how to send files for mix/mastering, answer with the approved transfer process: private download link, SwissTransfer recommended, WeTransfer/Google Drive/Dropbox accepted, send the link by replying to the order email or to contact@boombapchopshop.art, include the file checklist, and say the turnaround starts only after all usable files are received and validated.
If the customer asks who produces the beats, answer that the producer name is El padre ultra instinct, with 30 years of practice and mastery of audio techniques.

Hard rules:
- Never say the customer owns the beat after buying a license.
- Never say a license transfers ownership of the instrumental, authorship, publishing, or original instrumental master.
- Never say Content ID can claim the beat itself, stems alone, or the original instrumental master.
- Never say all samples are cleared for every possible use.
- Never say one license covers multiple songs.
- Never say an exclusive license cancels previous non-exclusive licenses.
- Never say refunds are always available.
- Never approve advertising, film, TV, game, trailer, institutional, brand, AI, NFT, blockchain, dataset, music library, sample pack, loop kit, drum kit, stock music, or professional sync usage without separate written approval.

Escalate to contact@boombapchopshop.art for custom beat pricing, collaboration details, label contracts, publishing negotiations, royalty disputes, refund disputes, chargebacks, sample clearance, major commercial exploitation, sync, Content ID disputes, takedown requests, full buyout, changing contract terms, legal interpretation, or anything not clearly answered by the knowledge base.
`;

const KNOWLEDGE_BASE = `
Official contact: contact@boombapchopshop.art. Reply time: 24 to 48 business hours.
Producer: beats are produced by El padre ultra instinct. He has 30 years of practice and strong mastery of audio techniques, from beatmaking to mix/mastering workflow.

Payments: handled by Stripe. Card details are entered on Stripe's encrypted checkout page. BOOM BAP CHOP SHOP does not store card data.

Delivery: beat licenses and digital beat files are delivered instantly after payment confirmation. The customer receives an email with download links, receipt, order information, and license agreement/contract. Download links may expire for security reasons, but the order remains logged.
Specific delivery answer: If asked "combien de temps pour recevoir mes fichiers", "quand je recois les fichiers", or "when do I receive the files", answer that beat licenses and files are delivered instantly after payment confirmation by email with download links, receipt, and license agreement. Do not list prices.

Refunds: digital audio files and license contracts are delivered after payment. After delivery, download, access to files, or license generation, refunds are not guaranteed except for BOOM BAP CHOP SHOP error, confirmed technical issue preventing access, confirmed fraudulent payment, or applicable legal obligation. For mix/mastering services, a refund request may be considered only if work has not started. Once prepared, started, or delivered, a full or partial refund may be refused depending on progress.

General license principles: each beat license covers one final song only. A final song includes the customer's vocal, lyrics, topline, performance, or other original artistic contribution. A license is not a sale of the instrumental and not a full transfer of ownership. Producer keeps the instrumental, original instrumental master, composition/arrangement rights, publishing/author rights unless a separate written agreement says otherwise, stems, trackouts, source files, presets, samples, and pre-existing elements controlled by the producer. Recommended credit: Prod. by BOOM BAP CHOP SHOP.

MP3 Basic: 14.99 EUR. Non-exclusive. Best for demos, freestyles, writing sessions, and small independent releases. Includes MP3 delivery, non-exclusive license agreement, instant download after payment. Allows one final song only, up to 100,000 cumulative streams, YouTube/social/DSP release. Limits: no WAV, no stems, no Content ID claim on the beat, beat remains available to other artists.

WAV Lease: 29.99 EUR. Non-exclusive. Best for better audio quality without stems. Includes untagged WAV master, MP3 reference, standard license agreement. Allows one final song only, streaming and video release, better mix/master workflow. Limits: no separated stems, no Content ID claim on the beat, producer credit required where possible.

WAV + Stems: 49.99 EUR. Professional non-exclusive. Best for serious release, engineer mixing, and full mix control. Includes untagged WAV, MP3, separated stems/trackouts, professional license agreement. Allows one final song only and unlimited streams. Stems may be sent to an engineer or direct collaborators for this song. Limits: stems cannot be shared publicly, resold, given away, reused, uploaded publicly, or included in packs, libraries, datasets, marketplaces, public cloud folders, public forums, Discord/Telegram, or file-sharing spaces. No Content ID claim on the beat. Sync, AI, NFT, blockchain, dataset, and sample-pack uses require separate written approval.

Exclusive: 199 EUR. Exclusive license for one final song. Best to reserve the beat and stop future licenses. Includes WAV, MP3, stems available, exclusive license agreement, beat marked as sold. Allows one final song only, unlimited streams and digital sales, no new licenses sold after purchase and effective payment. Beat is removed from future public licensing within 12 hours after purchase, and instantly if the app allows it. Previous non-exclusive licenses sold before the exclusive purchase remain valid and are not retroactively cancelled. Not a full buyout of authorship, publishing, moral rights, or original instrumental master unless a separate written agreement says so.

Stems: all beats are planned to have stems available. Stems are included with WAV + Stems and Exclusive. Stems are not included with MP3 Basic or WAV Lease. Stems may be shared only with people directly involved in the final song. Stems must not be resold, shared publicly, reused in another production, or included in sample packs, loop kits, drum kits, datasets, stock libraries, marketplaces, or public cloud folders.

Content ID: the customer may monetize the final song, but must not register or claim the beat alone, stems alone, original instrumental master, an instrumental version in a way that blocks BOOM BAP CHOP SHOP, previous valid licensees, or other artists with valid licenses. Content ID must stay clean and must not claim the beat itself.

Separate written approval required for: advertising, film, TV series, documentary, video game, trailer, brand placement, professional synchronization, institutional campaign, political campaign, NFT, blockchain, token or smart contract use, generative AI, AI model training, audio dataset, music library, stock music catalog, sample pack, loop kit, drum kit, beat marketplace.

Samples and third-party elements: BOOM BAP CHOP SHOP may inform the customer within its knowledge about samples, loops, interpolations, or third-party elements that may need additional authorization. Unless expressly stated in writing, a license does not guarantee clearance of every possible third-party element for major label release, national radio, advertising, film, television, professional synchronization, or high-budget exploitation.

Specific sample/legal answer: If asked whether samples are legal, cleared, or authorized, say BOOM BAP CHOP SHOP licenses the elements the producer controls or can license. Some instrumentals may contain samples, loops, or third-party elements. For standard independent use, the customer can choose a license under the displayed terms. For label, radio, advertising, film, TV, sync, or larger commercial exploitation, separate clearance or written confirmation may be needed. For a specific project, contact contact@boombapchopshop.art. Do not say all samples are 100% cleared. Do not say they are illegal.

Mix + Master Essential: 99 EUR. Turnaround 5 days. Includes vocal mix, EQ/compression/space, final master WAV + MP3, 1 revision round.
Mix + Master Premium: 149 EUR. Turnaround 5 days. Includes full vocal mix, streaming-ready master, clean version, performance version, 2 revision rounds.
Mix + Master Express: 199 EUR. Turnaround 2 days. Includes priority turnaround, full mix + master, release export check, 2 revision rounds.
Specific service answer: If the customer asks for the price of Mix + Master Express or mastering express, answer only in this list format:
Mix + Master Express
- Price: 199 EUR
- Turnaround: 2 days
- Includes: full mix + master, priority turnaround, release export check, 2 revision rounds
If asked about Premium, answer only Premium in the same list format. If asked about Essential, answer only Essential in the same list format. Only list all prices when the customer asks for all prices or pricing generally.
Files needed for mix/mastering: vocal WAV stems, beat WAV or trackouts if available, rough mix, 1 or 2 reference tracks, artist name, song title, notes, and deadline if needed. All exported WAV files must start at bar 1 / 00:00.
File sending process for mix/mastering: the customer should send a private download link. Recommended free option: SwissTransfer. Also accepted: WeTransfer, Google Drive, or Dropbox. The customer should send the link by replying to the order email or to contact@boombapchopshop.art. Folder checklist: vocal WAV stems, beat WAV or trackouts if available, rough mix, 1 or 2 reference tracks, artist name, song title, notes, and deadline if needed. All WAV exports must start at 00:00 / bar 1, even if there is silence before the vocal starts. Do not trim each vocal to its first word. Turnaround starts only after BOOM BAP CHOP SHOP receives and validates all usable files. If files are missing, incomplete, or unusable, the customer may be asked to resend/correct them before the clock starts.

License choice guidance: If the customer asks which license to choose without project details, give a short guide and ask what type of project they are planning. MP3 Basic for demos/freestyles/writing sessions/small releases up to 100,000 streams. WAV Lease for cleaner audio without stems. WAV + Stems for serious release, engineer mix, or full session control. Exclusive to reserve the beat and stop future licenses.
`;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const payload = await request.json() as ChatPayload;
    const message = String(payload.message || "").trim();
    if (!message) return json({ error: "Message required" }, 400);
    if (message.length > 1200) return json({ error: "Message too long" }, 400);

    const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
    if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured." }, 500);

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5.4-mini";
    const history = sanitizeHistory(payload.history || []);
    const input = [
      ...history.map((item) => ({
        role: item.role,
        content: [{
          type: item.role === "assistant" ? "output_text" : "input_text",
          text: item.text,
        }],
      })),
      {
        role: "user",
        content: [{ type: "input_text", text: message }],
      },
    ];

    const openaiResponse = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: `${SYSTEM_PROMPT}\n\nAPPROVED KNOWLEDGE BASE:\n${KNOWLEDGE_BASE}\n\nCustomer language preference: ${payload.language || "auto"}.`,
        input,
        max_output_tokens: 650,
      }),
    });

    const data = await openaiResponse.json().catch(() => ({}));
    if (!openaiResponse.ok) {
      return json({ error: data?.error?.message || data }, 502);
    }

    const reply = extractText(data).trim();
    return json({
      reply: reply || fallback(payload.language),
      model: data.model || model,
      responseId: data.id || "",
    });
  } catch (error) {
    return json({ error: String(error?.message || error) }, 500);
  }
});

function sanitizeHistory(history: ChatMessage[]) {
  return history
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role,
      text: String(item.text || "").slice(0, 1200),
    }))
    .filter((item) => item.text.trim())
    .slice(-8);
}

function extractText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text;
  const parts: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") parts.push(content.text);
      if (typeof content?.value === "string") parts.push(content.value);
    }
  }
  return parts.join("\n");
}

function fallback(language = "auto") {
  return "I do not want to invent an unconfirmed term. For this case, contact BOOM BAP CHOP SHOP at contact@boombapchopshop.art with the details of your project.";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
