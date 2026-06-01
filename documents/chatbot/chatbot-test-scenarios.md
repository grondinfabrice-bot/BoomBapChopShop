# BOOM BAP CHOP SHOP - Chatbot Test Scenarios

Use these tests before connecting the chatbot to OpenAI and after every prompt update.

The bot does not need to answer word-for-word, but it must keep the same meaning and respect the guardrails.

## 1. Delivery

Customer:
Quand je recois les fichiers ?

Expected:
The bot says beats/licenses are delivered instantly after payment confirmation. The customer receives an email with download links, receipt, and license agreement.

Must not say:
The customer needs to send vocal stems.

## 2. License Choice Without Context

Customer:
Quelle licence choisir ?

Expected:
The bot does not pick one license immediately. It gives a short guide:
MP3 Basic for demos/small release, WAV Lease for cleaner WAV without stems, WAV + Stems for serious release/engineer mix, Exclusive to reserve the beat. It asks for project details.

Must not say:
"Take WAV Lease" as a default.

## 3. License Choice With Stems

Customer:
Je veux sortir un single et envoyer les stems a mon ingenieur. Quelle licence ?

Expected:
Recommend WAV + Stems. Mention it includes WAV, MP3, separated stems/trackouts, and is designed for serious release and engineer mix. Mention one final song only and no Content ID claim on the beat.

## 4. Lowest Budget

Customer:
Je veux juste faire une demo pas chere.

Expected:
Recommend MP3 Basic. Mention price 14.99 EUR, MP3 delivery, non-exclusive, one final song only, up to 100,000 streams.

## 5. Exclusive

Customer:
Si j'achete l'exclu, est-ce que le beat disparait du site ?

Expected:
Say the beat is removed from future public licensing within 12 hours after purchase, and instantly if the app allows it. Previous non-exclusive licenses remain valid.

Must not say:
Previous licensees lose their rights.

## 6. Ownership

Customer:
Si j'achete l'exclusive, je deviens proprietaire du beat ?

Expected:
No. Exclusive gives exclusive use for one final song and stops future licenses, but it is not a full buyout of authorship, publishing, or the original instrumental master unless a separate written agreement says so.

## 7. Content ID

Customer:
Est-ce que je peux mettre mon morceau dans Content ID ?

Expected:
The customer can monetize the final song, but must not claim the beat alone, stems alone, original instrumental master, or anything that blocks BOOM BAP CHOP SHOP or valid license holders.

## 8. Refund

Customer:
Je peux etre rembourse ?

Expected:
Digital files are delivered after payment. After delivery/download/access/license generation, refunds are not guaranteed except for BOOM BAP CHOP SHOP error, confirmed technical issue, confirmed fraudulent payment, or legal obligation. For disputes, contact email.

Must not say:
Refunds are always available.

## 9. Mix/Master Turnaround

Customer:
C'est quoi les delais pour mix master ?

Expected:
Essential and Premium: 5 days. Express: 2 days.

## 10. Mix/Master Files

Customer:
Qu'est-ce que je dois envoyer pour le mix ?

Expected:
Vocal WAV stems, beat WAV or trackouts if available, rough mix, 1 or 2 references, artist name, song title, notes, deadline if needed. WAV files must start at bar 1 / 00:00.

## 11. Advertising

Customer:
Je peux utiliser le beat dans une pub Instagram pour une marque ?

Expected:
Advertising/brand use requires separate written approval. Redirect to contact@boombapchopshop.art with project details.

Must not say:
Yes, the current license allows it.

## 12. Film / Game / Sync

Customer:
Can I use the beat in a short film or video game?

Expected:
Answer in English. Film, game, and professional sync use require separate written approval. Redirect to contact@boombapchopshop.art.

## 13. AI / Dataset

Customer:
Can I use the stems to train an AI model?

Expected:
No. AI training, datasets, and generative AI uses require separate written approval and are not allowed by normal licenses.

## 14. Sample Clearance

Customer:
Are all samples cleared for major label release?

Expected:
Do not guarantee clearance. Say some major exploitation may require separate clearance. Redirect to contact@boombapchopshop.art.

## 15. Multiple Songs

Customer:
Can I use the same beat for two songs?

Expected:
No, one license covers one final song only. For multiple songs, the customer needs additional licenses or written approval.

## 16. English Delivery

Customer:
When do I receive the files?

Expected:
Answer in English. Beats and licenses are delivered instantly after payment confirmation. Email includes download links, receipt, and license agreement.

## 17. English License Choice

Customer:
Which license should I choose?

Expected:
Answer in English. Do not choose immediately. Give the four-option guide and ask about the project plan.

## 18. Human Contact

Customer:
I have a label contract and need custom publishing splits.

Expected:
Redirect to contact@boombapchopshop.art. Do not negotiate or approve publishing terms.

## 19. Stems Included

Customer:
Les stems sont inclus dans quelle licence ?

Expected:
Stems are included with WAV + Stems and Exclusive. Not included with MP3 Basic or WAV Lease.

## 20. Prices

Customer:
Quels sont les prix ?

Expected:
List current prices:
MP3 Basic 14.99 EUR, WAV Lease 29.99 EUR, WAV + Stems 49.99 EUR, Exclusive 199 EUR, Mix + Master Essential 99 EUR, Premium 149 EUR, Express 199 EUR.

## 21. Specific Express Price

Customer:
combien coute un mastering express

Expected:
Answer only about Mix + Master Express in a short list:
- price 199 EUR;
- turnaround 2 days;
- includes full mix + master, priority turnaround, release export check, 2 revision rounds.

Must not say:
All license prices or all service prices.

## 22. Samples / Legality

Customer:
les samples de vos instrus sont ils legaux

Expected:
Answer cautiously. Say BOOM BAP CHOP SHOP licenses the elements the producer controls or can license. Some instrumentals may contain samples, loops, or third-party elements. For standard independent use, the customer can choose a license under displayed terms. For label, radio, advertising, film, TV, sync, or larger commercial use, separate clearance or written confirmation may be needed. Redirect to contact@boombapchopshop.art for a specific project.

Must not say:
All samples are 100% cleared.
Must not say:
The instrumentals are illegal.

## 23. Numbered Menu Follow-Up

Context:
The bot asks:
"Tu cherches plutôt :
1) une licence de beat,
2) du mix & mastering,
3) des infos sur stems / Content ID / exclusivité,
4) livraison / remboursement ?"

Customer:
2

Expected:
The bot understands the customer chose mix & mastering. It should answer about Mix + Mastering services or ask which service they want: Essential, Premium, or Express.

Must not say:
Generic fallback.

## 24. Delivery Time Not Price

Customer:
combien de temps pour recevoir mes fichiers

Expected:
The bot answers delivery time: files are delivered instantly after payment confirmation by email with download links, receipt, and license agreement.

Must not say:
All prices.

## 25. Mix/Master File Sending Process

Customer:
dis moi ou et comment j'envoie mes fichiers

Expected:
The bot says to send a private download link. It recommends SwissTransfer as the free option and also accepts WeTransfer, Google Drive, or Dropbox. It says to send the link by replying to the order email or to contact@boombapchopshop.art. It includes the file checklist and says the turnaround starts only after all usable files are received and validated.

Must not say:
The process is unknown.
