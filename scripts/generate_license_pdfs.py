from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)


OUTPUT_DIR = Path("documents/licenses")
BRAND = "BOOM BAP CHOP SHOP"
LAW_NOTE = "Modele de contrat soumis au droit francais - a faire relire par un professionnel du droit avant mise en ligne definitive."


def clean(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ContractTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=21,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#1E1E1E"),
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "ContractSubtitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#8E3B2E"),
            spaceAfter=16,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#333333"),
            leftIndent=8,
            rightIndent=8,
            borderColor=colors.HexColor("#D5C8B2"),
            borderWidth=0.6,
            borderPadding=8,
            backColor=colors.HexColor("#F3EEE6"),
            spaceAfter=12,
        ),
        "h1": ParagraphStyle(
            "ArticleHeading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=10.8,
            leading=14,
            textColor=colors.HexColor("#8E3B2E"),
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "ContractBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#222222"),
            spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#555555"),
        ),
        "signature": ParagraphStyle(
            "Signature",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=15,
            textColor=colors.HexColor("#222222"),
            spaceBefore=4,
            spaceAfter=4,
        ),
    }


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(colors.HexColor("#1E1E1E"))
    canvas.drawString(18 * mm, 286 * mm, BRAND)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#777777"))
    canvas.drawRightString(192 * mm, 286 * mm, doc.title_text)
    canvas.line(18 * mm, 282 * mm, 192 * mm, 282 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(18 * mm, 11 * mm, LAW_NOTE)
    canvas.drawRightString(192 * mm, 11 * mm, f"Page {doc.page}")
    canvas.restoreState()


def para(text, style):
    return Paragraph(clean(text), style)


def build_pdf(filename, title, subtitle, meta_lines, sections):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / filename
    doc = BaseDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=21 * mm,
        bottomMargin=18 * mm,
        title=title,
        author=BRAND,
        subject=subtitle,
    )
    doc.title_text = title
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="contract", frames=[frame], onPage=on_page)])
    s = styles()
    story = [
        Spacer(1, 8),
        para(title, s["title"]),
        para(subtitle, s["subtitle"]),
        para("<br/>".join(meta_lines), s["meta"]),
    ]

    for heading, paragraphs in sections:
        story.append(para(heading, s["h1"]))
        for item in paragraphs:
            story.append(para(item, s["body"]))

    story.extend([
        Spacer(1, 12),
        para("Signature / acceptation electronique", s["h1"]),
        para("Pour le Producteur : [NOM PRODUCTEUR] / [NOM DE MARQUE] / [EMAIL] / Signature : ______________________________", s["signature"]),
        para("Pour l'Artiste / Acheteur : [NOM LEGAL] / [NOM ARTISTE] / [EMAIL ACHETEUR] / Acceptation : case cochee, paiement, signature electronique ou signature manuscrite.", s["signature"]),
    ])
    doc.build(story)
    return path


COMMON_PARTIES = [
    "<b>Producteur / Licenciant :</b> [NOM PRODUCTEUR], [NOM DE MARQUE], [ADRESSE / PAYS], [EMAIL]",
    "<b>Artiste / Licencie / Acheteur :</b> [NOM ARTISTE], [NOM LEGAL], [EMAIL ACHETEUR]",
    "<b>Commande :</b> [NUMERO COMMANDE] - [DATE] - [PRIX] - Beat : [TITRE DU BEAT]",
]


mp3_sections = [
    ("Preambule", [
        "Le Producteur declare etre auteur, compositeur, producteur et/ou titulaire des droits necessaires sur l'instrumentale intitulee [TITRE DU BEAT]. L'Artiste souhaite obtenir une licence non exclusive lui permettant de creer une nouvelle oeuvre musicale finale integrant sa voix, ses paroles, sa topline, son interpretation ou tout autre apport artistique original.",
        "La presente licence est une autorisation d'utilisation limitee. Elle ne constitue ni une vente definitive de l'instrumentale, ni une cession totale de droits, ni un transfert de propriete intellectuelle.",
    ]),
    ("Article 1 - Objet de la licence", [
        "Le Producteur accorde a l'Artiste une licence non exclusive, personnelle, limitee, mondiale et non transferable d'utilisation de l'instrumentale [TITRE DU BEAT]. Cette licence permet la creation et l'exploitation d'une seule oeuvre finale.",
        "Toute utilisation de l'instrumentale seule, sans contribution artistique substantielle de l'Artiste, est interdite.",
    ]),
    ("Article 2 - Fichiers fournis", [
        "La licence MP3 comprend uniquement la livraison d'un fichier audio MP3. Elle ne comprend pas le fichier WAV, les stems, trackouts, pistes separees, fichiers MIDI, presets, samples isoles, fichiers sources ou projets de session.",
    ]),
    ("Article 3 - Droits accordes", [
        "Sous reserve du paiement complet et du respect du contrat, l'Artiste peut enregistrer sa voix, mixer et masteriser l'oeuvre finale, distribuer l'oeuvre finale sur plateformes numeriques, publier sur les reseaux sociaux, vendre l'oeuvre finale sous forme numerique et la monetiser dans les limites autorisees.",
        "Ces droits concernent exclusivement l'oeuvre finale creee a partir de l'instrumentale et ne s'appliquent pas a l'instrumentale seule.",
    ]),
    ("Article 4 - Limite de streams", [
        "La presente licence autorise l'exploitation de l'oeuvre finale dans la limite de 100 000 streams, vues, lectures ou diffusions cumules, toutes plateformes confondues.",
        "Lorsque ce seuil est atteint, l'Artiste devra acheter une licence superieure, obtenir un accord ecrit du Producteur ou conclure un nouveau contrat adapte avant toute poursuite d'exploitation.",
    ]),
    ("Article 5 - Nature non exclusive", [
        "La licence est strictement non exclusive. Le Producteur conserve le droit de continuer a vendre, louer, conceder, promouvoir ou exploiter la meme instrumentale, y compris par une eventuelle licence exclusive future.",
        "Les licences accordees avant une vente exclusive restent valables selon leurs conditions initiales.",
    ]),
    ("Article 6 - Propriete et droits du Producteur", [
        "Le Producteur conserve la propriete de l'instrumentale, de la composition musicale, de l'arrangement, du master instrumental original, des fichiers sources, stems, samples isoles, presets et de tous elements preexistants crees ou controles par lui.",
        "L'Artiste s'interdit de revendiquer la propriete de l'instrumentale ou de se presenter comme producteur, compositeur unique ou titulaire exclusif de l'instrumentale.",
    ]),
    ("Article 7 - Revenus, composition et publishing", [
        "Sous reserve du respect du contrat, l'Artiste conserve les revenus issus de l'exploitation de son master final dans les limites de la licence.",
        "Le Producteur conserve ses droits d'auteur, droits de composition, droits d'edition, publishing, droits SACEM ou equivalents. Sauf accord ecrit different, la repartition recommandee de la composition est Producteur 50% minimum et Artiste/auteurs/topliners 50% maximum a repartir entre eux.",
    ]),
    ("Article 8 - Credit obligatoire", [
        "L'Artiste s'engage a crediter le Producteur lorsque cela est techniquement possible, selon la mention recommandee : Prod. by [NOM DE MARQUE].",
        "Ce credit devra figurer dans les metadonnees, descriptions YouTube, credits DSP, SoundCloud, Bandcamp, clips, visualizers et supports promotionnels lorsque les supports le permettent.",
    ]),
    ("Article 9 - Content ID", [
        "L'Artiste peut monetiser l'oeuvre finale sur YouTube et plateformes similaires uniquement si cette monetisation ne bloque pas, ne revendique pas et ne limite pas les droits du Producteur ou des autres licencies legitimes.",
        "L'Artiste s'interdit d'enregistrer l'instrumentale seule dans Content ID ou tout systeme equivalent, et s'interdit toute configuration qui revendiquerait automatiquement l'instrumentale elle-meme.",
        "Toute revendication abusive devra etre retiree dans un delai de 7 jours calendaires apres notification ecrite du Producteur.",
    ]),
    ("Article 10 - Interdictions", [
        "Sont interdits : revente de l'instrumentale seule, redistribution, partage, pret, location, sous-licence, integration dans un sample pack, drum kit, loop kit, banque de sons, bibliotheque musicale, dataset, outil IA ou marketplace.",
        "Il est interdit d'utiliser l'instrumentale pour plusieurs chansons distinctes, de modifier l'instrumentale pour la revendre comme nouvelle production ou de l'utiliser dans une oeuvre illicite, diffamatoire, haineuse ou portant atteinte aux droits de tiers.",
    ]),
    ("Article 11 - Usages soumis a accord separe", [
        "Les usages suivants necessitent un accord ecrit separe : publicite, film, serie, documentaire, jeu video, bande-annonce, campagne politique ou institutionnelle, synchronisation professionnelle, NFT, blockchain, IA generative, entrainement de modeles, dataset audio, bibliotheque musicale ou toute exploitation non expressement autorisee.",
    ]),
    ("Article 12 - Samples et elements tiers", [
        "Le Producteur signale a l'Artiste, dans la mesure de ses connaissances, les samples, boucles, interpolations ou elements tiers necessitant eventuellement une autorisation complementaire.",
        "Sauf mention ecrite contraire, la licence ne garantit pas la clearance de samples tiers pour les exploitations majeures, labels, radio nationale, synchronisation, publicite, television, cinema ou exploitations a grande echelle.",
    ]),
    ("Article 13 - Paiement et livraison", [
        "Aucune licence n'est valablement accordee tant que le paiement complet n'a pas ete recu ou valide. En cas de paiement frauduleux, annule, conteste, rejete, rembourse ou chargeback, la licence est suspendue jusqu'a regularisation.",
        "Apres validation du paiement, le fichier MP3 est mis a disposition par telechargement, email, espace client ou tout autre moyen numerique choisi par le Producteur.",
    ]),
    ("Article 14 - Retraction et remboursement", [
        "Compte tenu de la nature numerique du fichier fourni, l'acces immediat au contenu peut entrainer la perte du droit de retractation lorsque la loi applicable le permet et sous reserve d'une acceptation specifique par case a cocher.",
    ]),
    ("Article 15 - Duree, territoire et resiliation", [
        "La licence est accordee pour le monde entier et pour la duree legale de protection des droits concernes, sous reserve du respect des limites de streams et obligations contractuelles.",
        "Le Producteur peut suspendre ou resilier la licence en cas de manquement grave : absence de paiement, depassement non regularise, Content ID abusif, revente, usage interdit, fausse declaration ou atteinte aux droits du Producteur.",
    ]),
    ("Article 16 - Preuve electronique et droit applicable", [
        "Les confirmations de commande, factures, emails, preuves de paiement, logs de telechargement, cases a cocher, historiques de compte et echanges electroniques pourront servir de preuve de conclusion, contenu et execution du contrat.",
        "Le present contrat est soumis au droit francais. En cas de litige, les Parties rechercheront d'abord une solution amiable, puis les tribunaux francais competents pourront etre saisis sous reserve des regles imperatives applicables aux consommateurs.",
    ]),
]

wav_sections = [
    (heading, list(paragraphs)) for heading, paragraphs in mp3_sections
]
wav_sections[2] = ("Article 2 - Fichiers fournis", [
    "La licence WAV comprend la livraison d'un fichier WAV master et d'un fichier MP3 de reference. Elle ne comprend pas les stems, trackouts, pistes separees, fichiers MIDI, presets, samples isoles, fichiers sources ou projets de session.",
    "Toute demande de stems, trackouts ou fichiers additionnels devra faire l'objet d'une licence superieure ou d'un accord ecrit separe.",
])
wav_sections[4] = ("Article 4 - Limite de streams", [
    "La presente licence autorise l'exploitation de l'oeuvre finale dans la limite indiquee sur la page produit ou la confirmation de commande. A defaut de mention specifique, la limite applicable est de 100 000 streams, vues, lectures ou diffusions cumules, toutes plateformes confondues.",
    "Lorsque ce seuil est atteint, l'Artiste devra acheter une licence superieure, obtenir un accord ecrit du Producteur ou conclure un nouveau contrat adapte avant toute poursuite d'exploitation.",
])


stems_sections = [
    ("Preambule", [
        "Le Producteur declare controler les droits necessaires sur l'instrumentale [TITRE DU BEAT]. Le Licencie souhaite obtenir une licence non exclusive incluant la mise a disposition de fichiers separes, stems ou trackouts, afin de creer, enregistrer, mixer, masteriser et exploiter une seule oeuvre musicale finale.",
    ]),
    ("Article 1 - Nature de la licence", [
        "Le Producteur accorde au Licencie une licence non exclusive, non transferable, non cessible, personnelle, mondiale, valable pour la duree legale de protection des droits, sauf resiliation.",
        "Cette licence ne constitue ni une vente de propriete, ni une licence exclusive, ni une cession totale des droits du Producteur.",
    ]),
    ("Article 2 - Fichiers fournis", [
        "La licence Trackout/Stems comprend, selon disponibilite technique, le WAV master, le MP3 de reference, les stems ou trackouts separes, et tout autre fichier indique dans la page produit ou la confirmation de commande.",
        "Les projets sources natifs Logic Pro, Ableton Live, FL Studio, Pro Tools, Luna, Maschine, MPC, Cubase ou autres ne sont pas inclus sauf accord ecrit separe.",
    ]),
    ("Article 3 - Usage autorise", [
        "Le Licencie peut utiliser l'instrumentale pour creer une seule oeuvre finale avec voix, paroles, topline, interpretation ou apport artistique original.",
        "Sont autorises : distribution numerique mondiale, vente digitale, streaming, clips, visualizers, reels, shorts, teasers, contenus promotionnels lies a l'oeuvre finale, performances publiques, concerts, showcases, livestreams, web radios, podcasts musicaux et monetisation de l'oeuvre finale.",
    ]),
    ("Article 4 - Streams illimites", [
        "La licence Trackout/Stems autorise les streams illimites de l'oeuvre finale, sans exclusivite. Cette absence de plafond ne confere aucun droit exclusif au Licencie et ne limite pas le droit du Producteur de vendre ou conceder la meme instrumentale a d'autres tiers.",
    ]),
    ("Article 5 - Confidentialite des stems", [
        "Les stems et trackouts sont strictement confidentiels. Il est interdit de les revendre, donner, partager publiquement, publier en ligne, distribuer seuls, integrer a un pack, kit, banque de sons, cloud public, forum, Discord public, Telegram, serveur de fichiers ou plateforme equivalente.",
        "Le Licencie peut transmettre les stems uniquement a un ingenieur du son, mixeur, masteriseur, label, manager, directeur artistique ou collaborateur directement implique dans la creation, le mixage, le mastering ou la distribution de l'oeuvre finale. Le Licencie demeure responsable de leur usage.",
    ]),
    ("Article 6 - Propriete et droits reserves", [
        "Le Producteur conserve la propriete de l'instrumentale, de la composition, de l'arrangement, du master instrumental, des stems, fichiers sources, elements sonores preexistants, droits d'auteur, droits voisins eventuels, droits d'edition, publishing, SACEM ou equivalents.",
    ]),
    ("Article 7 - Interdictions generales", [
        "Le Licencie s'interdit de revendre ou transferer la licence, revendre l'instrumentale ou les stems, distribuer l'instrumentale seule, publier le beat comme sa propre production, deposer l'instrumentale seule, revendiquer la propriete exclusive, utiliser l'instrumentale pour plusieurs morceaux, reutiliser les stems dans une autre production ou faire recreer le beat pour contourner la licence.",
    ]),
    ("Article 8 - Synchronisation professionnelle", [
        "La licence n'autorise pas la synchronisation professionnelle en publicite, film, serie, documentaire, jeu video, trailer, placement de marque, campagne institutionnelle ou production audiovisuelle commandee par une marque, agence, societe de production ou institution.",
        "Les clips, visualizers, reels, shorts et contenus promotionnels directement lies a l'oeuvre finale sont autorises.",
    ]),
    ("Article 9 - Content ID", [
        "Le Licencie s'interdit d'enregistrer dans Content ID l'instrumentale seule, le master instrumental, les stems, une version instrumentale de l'oeuvre finale ou tout contenu permettant de bloquer le Producteur ou d'autres licencies legitimes.",
        "En cas de revendication abusive, le Licencie devra la faire retirer dans un delai maximum de 48 heures apres notification ecrite du Producteur.",
    ]),
    ("Article 10 - Credit, composition et revenus", [
        "Le credit recommande est : Prod. by [NOM DE MARQUE]. Il doit figurer lorsque cela est techniquement possible dans les metadonnees, descriptions, credits DSP, visuels et supports promotionnels.",
        "Sauf accord ecrit separe, les droits de composition sont repartis ainsi : Producteur 50% minimum, Artiste/auteurs/topliners/autres contributeurs 50% maximum a repartir entre eux. Le Licencie conserve les revenus du master final sous reserve du respect du contrat.",
    ]),
    ("Article 11 - IA, datasets, NFT et blockchain", [
        "Le Licencie s'interdit d'utiliser l'instrumentale, le master instrumental, les stems ou elements fournis pour entrainer une intelligence artificielle, alimenter un dataset, creer un generateur musical, faire du machine learning commercial, extraire des elements ou creer des oeuvres derivees automatisees.",
        "Les usages NFT, blockchain, token, smart contract, marketplace web3 ou actif numerique assimile necessitent un accord ecrit separe du Producteur.",
    ]),
    ("Article 12 - Samples et garanties", [
        "Le Producteur informera le Licencie, dans la mesure de ses connaissances, de l'existence eventuelle de samples, boucles, interpolations ou elements tiers. Certaines exploitations majeures peuvent necessiter une clearance separee.",
        "Le Producteur ne garantit pas le succes commercial, l'acceptation par les plateformes, l'absence de similarite stylistique avec d'autres oeuvres ou les decisions de distributeurs et systemes automatises.",
    ]),
    ("Article 13 - Paiement, livraison et remboursement", [
        "La licence entre en vigueur apres paiement complet. En cas de paiement rejete, fraude, chargeback ou remboursement non autorise, aucune licence valable n'est accordee ou la licence est suspendue.",
        "La livraison se fait par telechargement, lien prive, email ou espace client. Sauf disposition legale imperative contraire, fraude averee ou erreur imputable au Producteur, aucun remboursement n'est du apres livraison ou acces aux fichiers.",
    ]),
    ("Article 14 - Resiliation et consequences", [
        "Le Producteur peut resilier la licence en cas de violation grave : revente des stems, partage public, transmission non autorisee, Content ID abusif, revendication exclusive, synchronisation non autorisee, usage IA/NFT/blockchain interdit, fausse declaration, defaut de paiement ou atteinte volontaire aux droits.",
        "En cas de violation, le Producteur pourra demander retrait, suppression des revendications, signalement aux plateformes, suspension, resiliation, indemnisation et remboursement des frais engages.",
    ]),
    ("Article 15 - Preuve electronique, donnees et droit applicable", [
        "Confirmation de commande, facture, email, logs, adresse IP, transaction, case a cocher, signature electronique, copie horodatee et version archivee des conditions pourront servir de preuve.",
        "Les donnees personnelles sont traitees pour la commande, livraison, facture, preuve contractuelle, relation client et protection des droits. Le contrat est soumis au droit francais et les litiges relevent des tribunaux francais competents sous reserve des regles imperatives applicables.",
    ]),
]


exclusive_sections = [
    ("Preambule", [
        "Le Producteur est auteur, compositeur, arrangeur et/ou producteur de l'instrumentale [TITRE DU BEAT]. L'Artiste souhaite obtenir une licence exclusive d'utilisation de cette instrumentale afin de creer une seule oeuvre musicale finale.",
        "Le present contrat constitue une licence exclusive d'utilisation, et non une cession totale automatique de propriete intellectuelle. Un full buyout ne peut exister que par clause separee, expresse, detaillee, signee et remuneree distinctement.",
    ]),
    ("Article 1 - Objet et date d'effet", [
        "Le Producteur accorde a l'Artiste une licence exclusive d'utilisation de l'instrumentale pour creer, enregistrer, distribuer, promouvoir, monetiser et exploiter commercialement une seule oeuvre finale.",
        "La licence prend effet apres paiement complet et definitif, confirmation de commande ou facture, et mise a disposition des fichiers prevus.",
    ]),
    ("Article 2 - Exclusivite accordee", [
        "A compter de la date d'effet, le Producteur s'engage a ne plus vendre, louer, distribuer, conceder ou accorder de nouvelle licence de l'instrumentale exacte a un tiers.",
        "Le Producteur s'engage a retirer l'instrumentale de la vente publique dans le delai indique lors de la commande. L'exclusivite porte uniquement sur l'instrumentale exacte, et non sur le style, le genre, les drums, textures, techniques de production ou compositions proches mais distinctes.",
    ]),
    ("Article 3 - Licences anterieures", [
        "L'Artiste reconnait que des licences non exclusives peuvent avoir ete vendues avant la date du present contrat. Ces licences anterieures restent valables dans les limites de leurs contrats initiaux.",
        "L'Artiste ne peut pas demander la suppression retroactive, le blocage, la demonetisation ou la revendication des morceaux deja legalement crees par d'anciens licencies.",
    ]),
    ("Article 4 - Utilisation autorisee", [
        "Sont autorises pour l'oeuvre finale : distribution commerciale mondiale sur DSP, ventes digitales, streams illimites, clips, visualizers, reseaux sociaux, concerts, radio, television, presse, playlists, promotion et monetisation.",
        "La licence est accordee pour le monde entier et pour la duree legale de protection des droits patrimoniaux applicables, sauf resiliation.",
    ]),
    ("Article 5 - Fichiers fournis", [
        "Selon disponibilite et annonce lors de la commande, le Producteur fournit MP3, WAV master, stems/trackouts, informations de tempo, tonalite, structure ou credits. Les fichiers livres sont listables en annexe de commande.",
        "L'absence de certains stems ne constitue pas un defaut si ces fichiers n'etaient pas explicitement annonces comme inclus.",
    ]),
    ("Article 6 - Interdictions", [
        "L'Artiste s'interdit de revendre l'instrumentale seule, revendre les stems, partager ou transferer les fichiers sources, integrer l'instrumentale dans une librairie musicale, sample pack, marketplace de beats, musique de stock, outil de generation musicale ou dataset IA.",
        "Il est interdit de deposer l'instrumentale seule comme oeuvre unique de l'Artiste, de se presenter comme compositeur unique de l'instrumentale si le Producteur en est le compositeur, ou de faire recreer une version quasi identique pour contourner les droits du Producteur.",
    ]),
    ("Article 7 - Content ID", [
        "L'Artiste peut enregistrer l'oeuvre finale dans un systeme Content ID uniquement si cette inscription ne revendique pas l'instrumentale seule, les stems seuls, le master instrumental original, les anciens licencies legitimes ou les usages autorises du Producteur.",
        "En cas de claim abusif, l'Artiste devra le faire retirer ou corriger dans un delai maximum de 48 heures apres notification ecrite du Producteur.",
    ]),
    ("Article 8 - Synchronisation", [
        "Option recommandee : toute utilisation de l'oeuvre finale dans publicite, film, serie, jeu video, documentaire, campagne institutionnelle, placement de marque ou exploitation audiovisuelle commerciale necessite un accord ecrit separe du Producteur.",
        "Option retenue : [OPTION A - ACCORD SEPARE / OPTION B - SYNCHRONISATION AUTORISEE POUR L'OEUVRE FINALE UNIQUEMENT].",
    ]),
    ("Article 9 - Credits, droits d'auteur et publishing", [
        "L'Artiste s'engage a crediter le Producteur : Prod. by [NOM DE MARQUE], lorsque cela est techniquement possible.",
        "Le Producteur conserve ses droits d'auteur sur la composition musicale de l'instrumentale. Sauf accord ecrit different, la repartition de composition de l'oeuvre finale est Producteur 50% minimum et Artiste/auteurs/topliners/autres contributeurs 50% maximum ou selon contributions reelles.",
    ]),
    ("Article 10 - Droits moraux, master final et droits voisins", [
        "Le Producteur conserve ses droits moraux sur l'instrumentale, notamment le droit au respect de son nom, de sa qualite et de son oeuvre. Ces droits sont attaches a sa personne et demeurent inalienables selon le droit francais.",
        "L'Artiste peut etre proprietaire ou coproprietaire du master final contenant sa voix et ses apports. Le Producteur conserve la propriete du master instrumental original, sauf cession expresse, ecrite et separee.",
    ]),
    ("Article 11 - Full buyout optionnel", [
        "Option full buyout : [OUI / NON]. Si l'option est cochee OUI, les Parties devront signer un avenant separe precisant droits cedes, duree, territoire, destination, modes d'exploitation, prix specifique, droits voisins, publishing et limites liees aux droits moraux.",
        "A defaut d'avenant separe conforme, aucune cession totale n'est accordee.",
    ]),
    ("Article 12 - Samples et elements preexistants", [
        "Le Producteur declare selon ses connaissances que l'instrumentale [NE CONTIENT AUCUN SAMPLE IDENTIFIABLE / CONTIENT LES SAMPLES SUIVANTS / CONTIENT DES ELEMENTS A VERIFIER].",
        "Si l'instrumentale contient des samples non clearés, l'Artiste reconnait qu'une exploitation commerciale importante peut necessiter autorisation ou clearance aupres des ayants droit concernes.",
    ]),
    ("Article 13 - IA, NFT et blockchain", [
        "L'Artiste s'interdit d'utiliser l'instrumentale, les stems, trackouts, master instrumental original ou version instrumentale derivee pour entrainer une intelligence artificielle, alimenter un dataset, generer des oeuvres derivees automatisees ou creer une imitation automatisee du style du Producteur.",
        "L'Artiste s'interdit de creer, vendre, minter, tokeniser ou exploiter sous forme de NFT ou actif blockchain l'instrumentale seule, les stems, le master instrumental, les fichiers sources ou boucles isolees sans accord ecrit du Producteur.",
    ]),
    ("Article 14 - Garantie limitee et obligations", [
        "Le Producteur garantit disposer, a sa connaissance, des droits necessaires pour accorder la licence sur les elements qu'il cree ou controle. Il ne garantit pas le succes commercial, l'acceptation par les plateformes ou l'absence de reclamation liee a des elements ajoutes par l'Artiste.",
        "L'Artiste s'engage a payer le prix, respecter les limites du contrat, crediter le Producteur, declarer correctement les droits, ne pas effectuer de Content ID abusif et informer ses distributeurs, labels, managers ou prestataires des limites de la licence.",
    ]),
    ("Article 15 - Paiement et resiliation", [
        "Le prix de la licence exclusive est [PRIX EXCLUSIF]. La licence n'est valable qu'apres paiement complet, effectif et irrevocable. En cas de paiement frauduleux, rejete, annule, conteste ou chargeback, la licence est suspendue jusqu'a regularisation.",
        "Le Producteur peut resilier le contrat apres notification restee sans effet pendant 7 jours en cas de non-paiement, fraude, fausse identite, revente interdite, violation des droits, depot excluant le Producteur, Content ID abusif non retire, usage IA/NFT interdit ou manquement grave.",
    ]),
    ("Article 16 - Preuve, confidentialite et droit applicable", [
        "Facture, numero de commande, email de confirmation, preuve de paiement, signature electronique, telechargement, logs et echanges electroniques valent preuve de transaction et de licence.",
        "Les stems, trackouts, WAV, MP3, fichiers de session ou tout autre element livre sont strictement reserves a la creation et exploitation de l'oeuvre finale. Le contrat est soumis au droit francais et les litiges relevent des tribunaux francais competents sous reserve des regles imperatives applicables.",
    ]),
    ("Annexes a completer", [
        "Annexe 1 - Informations du beat : titre, producteur, nom commercial, BPM, tonalite, duree, date de creation, ISWC, ISRC, samples connus.",
        "Annexe 2 - Fichiers livres : MP3, WAV, stems/trackouts, fichier BPM/tonalite, autres fichiers.",
        "Annexe 3 - Repartition des droits : Producteur, Artiste, autres contributeurs, roles et pourcentages.",
        "Annexe 4 - Licences non exclusives anterieures : date, type de licence, acheteur/artiste ou nombre total de licences anterieures, limites connues.",
    ]),
]


def main():
    files = [
        build_pdf(
            "licence-non-exclusive-mp3-100k-streams.pdf",
            "Licence non exclusive MP3 - 100 000 streams",
            "Contrat de licence non exclusive d'utilisation d'une instrumentale musicale",
            COMMON_PARTIES + ["<b>Format fourni :</b> MP3 uniquement", "<b>Type :</b> Non exclusif - 100 000 streams cumules"],
            mp3_sections,
        ),
        build_pdf(
            "licence-non-exclusive-wav-lease.pdf",
            "Licence non exclusive WAV Lease",
            "Contrat de licence non exclusive d'utilisation d'une instrumentale musicale",
            COMMON_PARTIES + ["<b>Format fourni :</b> WAV master + MP3 reference", "<b>Type :</b> Non exclusif - une oeuvre finale"],
            wav_sections,
        ),
        build_pdf(
            "licence-non-exclusive-trackout-stems.pdf",
            "Licence non exclusive Trackout / Stems",
            "Contrat d'utilisation non exclusive d'une instrumentale avec fichiers separes",
            COMMON_PARTIES + ["<b>Fichiers :</b> WAV + MP3 + stems/trackouts selon disponibilite", "<b>Type :</b> Non exclusif - usage professionnel - streams illimites"],
            stems_sections,
        ),
        build_pdf(
            "licence-exclusive-instrumentale.pdf",
            "Licence exclusive d'utilisation d'instrumentale",
            "Contrat de licence exclusive - une oeuvre finale - droit francais",
            COMMON_PARTIES + ["<b>Prix exclusif :</b> [PRIX EXCLUSIF]", "<b>Type :</b> Exclusif - pas de nouvelles licences apres date d'effet"],
            exclusive_sections,
        ),
    ]
    for path in files:
        print(path)


if __name__ == "__main__":
    main()
