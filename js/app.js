(() => {
  "use strict";

  const COLORS = {
    phase: { id: "phase", name: "Marron", hex: "#6b3f24", role: "Phase permanente" },
    neutre: { id: "neutre", name: "Bleu", hex: "#1d6bb8", role: "Neutre" },
    terre: { id: "terre", name: "Vert / jaune", hex: "#2f9e44", role: "Terre", pattern: true },
    retour: { id: "retour", name: "Orange", hex: "#e36b12", role: "Retour lampe / phase coupée" },
    navA: { id: "navA", name: "Noir", hex: "#242424", role: "Navette A" },
    navB: { id: "navB", name: "Gris", hex: "#8b9098", role: "Navette B" },
    navC: { id: "navC", name: "Violet", hex: "#6d3b96", role: "Navette C" },
    navD: { id: "navD", name: "Rouge", hex: "#c0392b", role: "Navette D" },
    navE: { id: "navE", name: "Rose", hex: "#e39ab8", role: "Navette E" },
    navF: { id: "navF", name: "Blanc", hex: "#f3f1ea", role: "Navette F", stroke: "#6a6358" },
    cmd: { id: "cmd", name: "Violet", hex: "#6d3b96", role: "Commande poussoir" },
  };

  const $ = (id) => document.getElementById(id);

  function createPlan(type, points, lights) {
    const n = Number(points);
    const L = Number(lights) || 1;
    let plan;
    if (type === "telerupteur") plan = planTelerupteur(n);
    else if (n === 1) plan = planSimple();
    else if (n === 2) plan = planVaEtVient();
    else plan = planPermutateur(n);
    return applyLights(plan, L);
  }

  function lumLabels(L) {
    return Array.from({ length: L }, (_, i) => `Éclairage ${i + 1}`);
  }

  function applyLights(plan, L) {
    plan.lights = L;
    const labels = lumLabels(L);

    const expand = (groupId, verb) => {
      const gr = plan.groups.find((g) => g.color === groupId);
      if (!gr) return;
      gr.members = gr.members.filter((m) => !/luminaire|éclairage|lampe/i.test(m));
      labels.forEach((lab) => gr.members.push(`${lab} → ${verb}`));
      if (L > 1) {
        gr.how = `${gr.how.replace(/\.$/, "")}. Avec ${L} lampes : tous les ${verb} dans la même Wago.`;
      }
    };

    expand("terre", "terre");
    expand("neutre", "neutre");
    expand("retour", "orange (phase)");

    plan.cables = plan.cables.filter((c) => !/luminaire|éclairage/i.test(c.label));
    labels.forEach((lab) => {
      plan.cables.push(cable(`Araignée → ${lab}`, "3G 1,5 mm²", ["terre", "neutre", "retour"]));
    });

    plan.materiel = plan.materiel.filter((m) => !/luminaire|éclairage/i.test(m));
    plan.materiel.push(
      L === 1 ? "1 luminaire + câble 3G 1,5 mm²" : `${L} luminaires en parallèle + ${L} câbles 3G 1,5 mm²`
    );
    if (L > 1) {
      plan.materiel.push("Wago assez grandes (terre / neutre / orange) pour tous les départs lampes");
    }

    const lightNote =
      L === 1
        ? "1 éclairage au plafond."
        : `${L} éclairages en parallèle : même orange, même bleu, même terre dans la boîte.`;

    plan.subtitle = `${plan.subtitle} ${lightNote}`;
    plan.title =
      L === 1
        ? plan.title
        : `${plan.title} · ${L} éclairages`;

    plan.schema.lights = L;
    plan.schema.lumWires = ["terre", "neutre", "retour"];
    return plan;
  }

  /* ---------- Plans de base (1 luminaire, étendu ensuite) ---------- */

  function planSimple() {
    return {
      id: "simple",
      title: "Couloir · interrupteur simple",
      subtitle: "Un seul point de commande près de la porte.",
      hint: "Cas le plus simple : 2 fils vers l’interrupteur, 3 fils vers chaque luminaire.",
      flow: [
        { type: "box", title: "Tableau 10 A", text: "Phase · neutre · terre" },
        { type: "wire", color: "phase", text: "marron" },
        { type: "box", title: "Interrupteur", text: "L → 1" },
        { type: "wire", color: "retour", text: "orange" },
        { type: "box", title: "Éclairages", text: "tous en parallèle" },
      ],
      groups: [
        g("terre", "Terre", "Tous les verts/jaunes ensemble.", ["Tableau → terre", "Éclairage → terre"]),
        g("neutre", "Neutre", "Tous les bleus ensemble.", ["Tableau → neutre", "Éclairage → neutre"]),
        g("phase", "Phase", "La phase du tableau va à l’interrupteur.", [
          "Tableau → phase marron",
          "Interrupteur → marron (borne L ou P)",
        ]),
        g("retour", "Retour lampes", "L’orange de l’interrupteur alimente toutes les lampes.", [
          "Interrupteur → orange (borne 1)",
          "Éclairage → orange",
        ]),
      ],
      cables: [
        cable("Tableau → araignée", "3G 1,5 mm²", ["terre", "neutre", "phase"]),
        cable("Araignée → interrupteur", "2 × 1,5 mm²", ["phase", "retour"]),
      ],
      devices: [
        device("Interrupteur (entrée couloir)", "Simple · 2 bornes", "simple", [
          ["L / P", "phase", "Marron · phase"],
          ["1", "retour", "Orange · vers les lampes"],
        ]),
      ],
      tableau: {
        lines: [
          "Disjoncteur 10 A circuit éclairage.",
          "Départ 3G vers la boîte au plafond du couloir.",
        ],
        steps: [
          { html: "Placez (ou utilisez) un <b>disjoncteur 10&nbsp;A</b> pour le circuit éclairage." },
          { html: "Départ vers l’araignée : <span class=\"wire-tag\"><span class=\"dot\" style=\"background:#6b3f24\"></span>marron</span> phase, <span class=\"wire-tag\"><span class=\"dot\" style=\"background:#1d6bb8\"></span>bleu</span> neutre, <span class=\"wire-tag\"><span class=\"dot terre\"></span>terre</span>." },
          { html: "Pas de télérupteur ici : la coupure se fait dans les interrupteurs." },
        ],
      },
      materiel: [
        "Disjoncteur 10 A",
        "Boîte de dérivation plafond (araignée)",
        "Interrupteur simple",
        "Wago par couleur",
      ],
      schema: {
        kind: "mecanique",
        switches: [{ id: "s1", label: "Entrée", kind: "simple", wires: ["phase", "retour"], place: "start" }],
        tabWires: ["terre", "neutre", "phase"],
      },
    };
  }

  function planVaEtVient() {
    return {
      id: "vv",
      title: "Couloir · va-et-vient",
      subtitle: "Un interrupteur à chaque bout du couloir.",
      hint: "Deux va-et-vient (3 bornes). Les navettes noir + gris passent par la boîte plafond.",
      flow: [
        { type: "box", title: "Phase", text: "marron" },
        { type: "box", title: "VV entrée", text: "P, 1, 2" },
        { type: "pair", wires: [
          { color: "navA", text: "noir" },
          { color: "navB", text: "gris" },
        ]},
        { type: "box", title: "VV sortie", text: "P = orange" },
        { type: "box", title: "Éclairages", text: "plafond" },
      ],
      groups: [
        g("terre", "Terre", "Tous les verts/jaunes ensemble.", ["Tableau → terre", "Éclairage → terre"]),
        g("neutre", "Neutre", "Tous les bleus ensemble.", ["Tableau → neutre", "Éclairage → neutre"]),
        g("phase", "Phase", "Phase seulement sur le VV côté tableau / entrée.", [
          "Tableau → phase marron",
          "VV entrée → marron (borne P)",
        ]),
        g("navA", "Navette A", "Noir entre les deux VV, via la boîte.", [
          "VV entrée → noir (1)",
          "VV sortie → noir (1)",
        ]),
        g("navB", "Navette B", "Gris entre les deux VV, via la boîte.", [
          "VV entrée → gris (2)",
          "VV sortie → gris (2)",
        ]),
        g("retour", "Retour lampes", "Commun du VV sortie → toutes les lampes.", [
          "VV sortie → orange (borne P)",
          "Éclairage → orange",
        ]),
      ],
      cables: [
        cable("Tableau → araignée", "3G 1,5 mm²", ["terre", "neutre", "phase"]),
        cable("Araignée → VV entrée", "3 × 1,5 mm²", ["phase", "navA", "navB"]),
        cable("Araignée → VV sortie", "3 × 1,5 mm²", ["retour", "navA", "navB"]),
      ],
      devices: [
        device("VV entrée couloir", "Côté phase", "vv", [
          ["P", "phase", "Marron · phase"],
          ["1", "navA", "Noir · navette A"],
          ["2", "navB", "Gris · navette B"],
        ]),
        device("VV sortie couloir", "Côté lampes", "vv", [
          ["P", "retour", "Orange · retour lampes"],
          ["1", "navA", "Noir · navette A"],
          ["2", "navB", "Gris · navette B"],
        ]),
      ],
      tableau: {
        lines: [
          "Disjoncteur 10 A.",
          "Toute la logique va-et-vient se fait dans la boîte plafond, pas au tableau.",
        ],
        steps: [
          { html: "Disjoncteur <b>10&nbsp;A</b> — même départ 3G que pour un interrupteur simple." },
          { html: "Vers l’araignée : <span class=\"wire-tag\"><span class=\"dot\" style=\"background:#6b3f24\"></span>marron</span>, <span class=\"wire-tag\"><span class=\"dot\" style=\"background:#1d6bb8\"></span>bleu</span>, <span class=\"wire-tag\"><span class=\"dot terre\"></span>terre</span>." },
          { html: "Les navettes et le retour se câblent dans la boîte, pas au tableau." },
        ],
      },
      materiel: ["2 va-et-vient", "Boîte de dérivation assez grande", "Wago : terre, neutre, phase, 2 navettes, retour"],
      schema: {
        kind: "mecanique",
        switches: [
          { id: "s1", label: "Entrée", kind: "vv", wires: ["phase", "navA", "navB"], place: "start" },
          { id: "s2", label: "Sortie", kind: "vv", wires: ["retour", "navA", "navB"], place: "end" },
        ],
        tabWires: ["terre", "neutre", "phase"],
      },
    };
  }

  function planPermutateur(n) {
    const three = n === 3;
    const groups = [
      g("terre", "Terre", "Tous les verts/jaunes ensemble.", ["Tableau → terre", "Éclairage → terre"]),
      g("neutre", "Neutre", "Tous les bleus ensemble.", ["Tableau → neutre", "Éclairage → neutre"]),
      g("phase", "Phase", "Phase sur le premier va-et-vient.", [
        "Tableau → phase marron",
        "VV entrée → marron (P)",
      ]),
      g("navA", "Navette A", "Noir VV1 ↔ permutateur.", ["VV entrée → noir (1)", "Permutateur → noir (arrivée)"]),
      g("navB", "Navette B", "Gris VV1 ↔ permutateur.", ["VV entrée → gris (2)", "Permutateur → gris (arrivée)"]),
    ];

    if (three) {
      groups.push(
        g("navC", "Navette C", "Violet permutateur ↔ VV2.", ["Permutateur → violet", "VV sortie → violet (1)"]),
        g("navD", "Navette D", "Rouge permutateur ↔ VV2.", ["Permutateur → rouge", "VV sortie → rouge (2)"])
      );
    } else {
      groups.push(
        g("navC", "Navette C", "Violet entre permutateurs.", ["Perm. 1 → violet", "Perm. 2 → violet"]),
        g("navD", "Navette D", "Rouge entre permutateurs.", ["Perm. 1 → rouge", "Perm. 2 → rouge"]),
        g("navE", "Navette E", "Rose vers VV sortie.", ["Perm. 2 → rose", "VV sortie → rose (1)"]),
        g("navF", "Navette F", "Blanc vers VV sortie.", ["Perm. 2 → blanc", "VV sortie → blanc (2)"])
      );
    }
    groups.push(
      g("retour", "Retour lampes", "Commun du dernier VV → lampes.", [
        "VV sortie → orange (P)",
        "Éclairage → orange",
      ])
    );

    const devices = [
      device("VV entrée", "Côté phase", "vv", [
        ["P", "phase", "Marron"],
        ["1", "navA", "Noir"],
        ["2", "navB", "Gris"],
      ]),
    ];
    const switches = [
      { id: "s1", label: "Entrée", kind: "vv", wires: ["phase", "navA", "navB"], place: "start" },
    ];

    if (three) {
      devices.push(
        device("Permutateur (milieu)", "4 bornes · 2 paires", "perm", [
          ["Arrivée", "navA", "Noir + gris"],
          ["Arrivée", "navB", "Noir + gris"],
          ["Départ", "navC", "Violet + rouge"],
          ["Départ", "navD", "Violet + rouge"],
        ]),
        device("VV sortie", "Côté lampes", "vv", [
          ["P", "retour", "Orange"],
          ["1", "navC", "Violet"],
          ["2", "navD", "Rouge"],
        ])
      );
      switches.push(
        { id: "s2", label: "Milieu", kind: "perm", wires: ["navA", "navB", "navC", "navD"], place: "mid" },
        { id: "s3", label: "Sortie", kind: "vv", wires: ["retour", "navC", "navD"], place: "end" }
      );
    } else {
      devices.push(
        device("Permutateur 1", "4 bornes", "perm", [
          ["Arrivée", "navA", "Noir + gris"],
          ["Arrivée", "navB", "Noir + gris"],
          ["Départ", "navC", "Violet + rouge"],
          ["Départ", "navD", "Violet + rouge"],
        ]),
        device("Permutateur 2", "4 bornes", "perm", [
          ["Arrivée", "navC", "Violet + rouge"],
          ["Arrivée", "navD", "Violet + rouge"],
          ["Départ", "navE", "Rose + blanc"],
          ["Départ", "navF", "Rose + blanc"],
        ]),
        device("VV sortie", "Côté lampes", "vv", [
          ["P", "retour", "Orange"],
          ["1", "navE", "Rose"],
          ["2", "navF", "Blanc"],
        ])
      );
      switches.push(
        { id: "s2", label: "Milieu 1", kind: "perm", wires: ["navA", "navB", "navC", "navD"], place: "mid" },
        { id: "s3", label: "Milieu 2", kind: "perm", wires: ["navC", "navD", "navE", "navF"], place: "mid2" },
        { id: "s4", label: "Sortie", kind: "vv", wires: ["retour", "navE", "navF"], place: "end" }
      );
    }

    const cables = [
      cable("Tableau → araignée", "3G 1,5 mm²", ["terre", "neutre", "phase"]),
      cable("Araignée → VV entrée", "3 × 1,5 mm²", ["phase", "navA", "navB"]),
    ];
    if (three) {
      cables.push(
        cable("Araignée → permutateur", "4 × 1,5 mm²", ["navA", "navB", "navC", "navD"]),
        cable("Araignée → VV sortie", "3 × 1,5 mm²", ["retour", "navC", "navD"])
      );
    } else {
      cables.push(
        cable("Araignée → permutateur 1", "4 × 1,5 mm²", ["navA", "navB", "navC", "navD"]),
        cable("Araignée → permutateur 2", "4 × 1,5 mm²", ["navC", "navD", "navE", "navF"]),
        cable("Araignée → VV sortie", "3 × 1,5 mm²", ["retour", "navE", "navF"])
      );
    }

    return {
      id: three ? "perm3" : "perm4",
      title: three ? "Couloir · 3 commandes" : "Couloir · 4 commandes",
      subtitle: three
        ? "VV aux deux bouts, permutateur au milieu du couloir."
        : "VV aux bouts, deux permutateurs sur le parcours.",
      hint: "Dès 3 points, le télérupteur est souvent plus simple (tous les boutons identiques).",
      flow: three
        ? [
            { type: "box", title: "VV entrée", text: "phase" },
            { type: "box", title: "Permutateur", text: "milieu" },
            { type: "box", title: "VV sortie", text: "orange" },
            { type: "box", title: "Éclairages", text: "plafond" },
          ]
        : [
            { type: "box", title: "VV entrée", text: "" },
            { type: "box", title: "Perm. 1", text: "" },
            { type: "box", title: "Perm. 2", text: "" },
            { type: "box", title: "VV sortie", text: "" },
          ],
      groups,
      cables,
      devices,
      tableau: {
        lines: [
          "Départ 3G depuis le disjoncteur 10 A.",
          "Repérez chaque paire de navettes (ruban) avant de fermer la boîte.",
        ],
        steps: [
          { html: "Disjoncteur <b>10&nbsp;A</b>, départ 3G vers la boîte plafond." },
          { html: "Aucun permutateur au tableau : ils sont aux points de commande." },
          { html: "Repérez chaque paire de navettes (ruban / étiquette) avant de fermer l’araignée." },
        ],
      },
      materiel: three
        ? ["2 va-et-vient", "1 permutateur", "Grande boîte plafond", "Wago par groupe"]
        : ["2 va-et-vient", "2 permutateurs", "Grande boîte plafond", "Wago par groupe"],
      schema: {
        kind: "mecanique",
        switches,
        tabWires: ["terre", "neutre", "phase"],
      },
    };
  }

  function planTelerupteur(n) {
    const poussoirs = Array.from({ length: n }, (_, i) => i + 1);
    const cmdMembers = [...poussoirs.map((i) => `Poussoir ${i} → violet`), "Retour tableau → violet (A1)"];
    const phaseMembers = ["Tableau → phase marron", ...poussoirs.map((i) => `Poussoir ${i} → marron`)];

    const places = ["start", "mid", "mid2", "end"];
    return {
      id: "tel",
      title: `Couloir · télérupteur · ${n} poussoir${n > 1 ? "s" : ""}`,
      subtitle: "Module au tableau. Tous les boutons du couloir sont identiques.",
      hint: "Idéal dès 3 points : pas de navettes, pas de permutateur.",
      flow: [
        { type: "box", title: "Poussoirs", text: "en parallèle" },
        { type: "wire", color: "cmd", text: "violet → A1" },
        { type: "box", title: "Télérupteur", text: "au tableau" },
        { type: "wire", color: "retour", text: "orange" },
        { type: "box", title: "Éclairages", text: "plafond" },
      ],
      groups: [
        g("terre", "Terre", "Tous les verts/jaunes ensemble.", ["Tableau → terre", "Éclairage → terre"]),
        g("neutre", "Neutre", "Tous les bleus ensemble.", ["Tableau → neutre", "Éclairage → neutre"]),
        g("phase", "Phase poussoirs", "Même phase à tous les boutons.", phaseMembers),
        g("cmd", "Commande", "Tous les violets + retour A1.", cmdMembers),
        g("retour", "Phase coupée", "Sortie télérupteur (2) → toutes les lampes.", [
          "Tableau → orange (sortie télérupteur)",
          "Éclairage → orange",
        ]),
      ],
      cables: [
        cable("Tableau → araignée", "5 × 1,5 mm²", ["terre", "neutre", "phase", "retour", "cmd"]),
        ...poussoirs.map((i) => cable(`Araignée → poussoir ${i}`, "2 × 1,5 mm²", ["phase", "cmd"])),
      ],
      devices: poussoirs.map((i) =>
        device(`Poussoir ${i}`, "Momentané · 2 bornes", "bp", [
          ["1", "phase", "Marron"],
          ["2", "cmd", "Violet"],
        ])
      ),
      tableau: {
        lines: [
          "Disjoncteur 10 A puis télérupteur sur rail DIN.",
          "1 = phase, 2 = orange vers boîte, A1 = violet, A2 = neutre.",
        ],
        module: [
          { mark: "1", color: "phase", text: "Phase après disjoncteur" },
          { mark: "2", color: "retour", text: "Orange vers boîte / lampes" },
          { mark: "A1", color: "cmd", text: "Violet · poussoirs" },
          { mark: "A2", color: "neutre", text: "Neutre bleu" },
        ],
        steps: [
          { html: "Coupez le général, puis placez le <b>disjoncteur 10&nbsp;A</b> et le <b>télérupteur</b> sur le rail DIN." },
          { html: "Reliez la phase du peigne à l’entrée du disjoncteur, et le neutre du peigne à la borne <b>A2</b>." },
          { html: "Sortie du disjoncteur → borne <b>1</b> du télérupteur <span class=\"wire-tag\"><span class=\"dot\" style=\"background:#6b3f24\"></span>marron</span>." },
          { html: "Depuis la même phase (après disjoncteur), tirez aussi le <span class=\"wire-tag\"><span class=\"dot\" style=\"background:#6b3f24\"></span>marron</span> vers l’araignée (phase des poussoirs)." },
          { html: "Borne <b>2</b> → <span class=\"wire-tag\"><span class=\"dot\" style=\"background:#e36b12\"></span>orange</span> vers l’araignée (phase coupée des lampes)." },
          { html: "Borne <b>A1</b> ← <span class=\"wire-tag\"><span class=\"dot\" style=\"background:#6d3b96\"></span>violet</span> qui revient de l’araignée (tous les poussoirs)." },
          { html: "Ajoutez <span class=\"wire-tag\"><span class=\"dot terre\"></span>terre</span> et <span class=\"wire-tag\"><span class=\"dot\" style=\"background:#1d6bb8\"></span>bleu</span> vers l’araignée. Total : 5 fils." },
        ],
      },
      materiel: [
        "Tableau Schneider RESI9",
        "Disjoncteur 10 A RESI9 + télérupteur RESI9 (rail DIN)",
        `${n} poussoir${n > 1 ? "s" : ""} Schneider (Odace / Unica — fonction poussoir)`,
        "Liaison 5 fils tableau ↔ boîte",
        "Wago terre, neutre, phase, commande, retour",
      ],
      schema: {
        kind: "telerupteur",
        switches: poussoirs.map((i, idx) => ({
          id: `p${i}`,
          label: `BP ${i}`,
          kind: "bp",
          wires: ["phase", "cmd"],
          place: places[Math.min(idx, places.length - 1)],
        })),
        tabWires: ["terre", "neutre", "phase", "retour", "cmd"],
      },
    };
  }

  function g(color, title, how, members) {
    return { id: color, color, title, how, members };
  }
  function cable(label, spec, cores) {
    return { label, spec, cores };
  }
  function device(title, kind, layout, terminals) {
    return { title, kind, layout, terminals };
  }
  function uniqueColors(plan) {
    return [...new Set(plan.groups.map((g) => g.color))].map((id) => COLORS[id]);
  }
  function strokeOf(id) {
    const c = COLORS[id];
    return c.pattern ? "url(#terre)" : c.hex;
  }
  function defsSvg() {
    return `<defs>
      <pattern id="terre" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="#2f9e44"/><rect width="4" height="8" fill="#f2d400"/>
      </pattern>
      <pattern id="terre2" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="#2f9e44"/><rect width="4" height="8" fill="#f2d400"/>
      </pattern>
    </defs>`;
  }

  /* ---------- Vue couloir ---------- */

  function svgCorridor(plan) {
    const W = 1120;
    const H = 520;
    const L = plan.lights;
    const switches = plan.schema.switches;

    const ceilY = 70;
    const wallY = 340;
    const floorY = 470;
    const x0 = 120;
    const x1 = 1060;

    const lights = Array.from({ length: L }, (_, i) => {
      const t = L === 1 ? 0.5 : i / (L - 1);
      return { x: x0 + 160 + t * (x1 - x0 - 220), label: `Écl. ${i + 1}` };
    });
    const boxX = (x0 + x1) / 2;

    const swPos = switches.map((s, i) => {
      const t = switches.length === 1 ? 0.15 : i / (switches.length - 1);
      return { ...s, x: x0 + 40 + t * (x1 - x0 - 80), y: wallY };
    });

    const tubes = [];
    // plafond : boîte ↔ lampes
    lights.forEach((lt) => {
      tubes.push(ceilingTube(boxX, ceilY + 36, lt.x, ceilY + 36, ["terre", "neutre", "retour"]));
    });
    // tableau → boîte
    tubes.push(ceilingTube(70, ceilY + 36, boxX - 55, ceilY + 36, plan.schema.tabWires));
    // boîte → interrupteurs (descend au mur)
    swPos.forEach((s) => {
      tubes.push(dropTube(boxX, ceilY + 55, s.x, s.y - 50, s.wires));
    });

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Couloir">
      ${defsSvg()}
      <!-- plafond -->
      <rect x="40" y="40" width="1040" height="70" fill="#d8d0c0" stroke="#111" stroke-width="2"/>
      <text x="60" y="62" font-size="11" fill="#5a5248" font-family="IBM Plex Sans, sans-serif">PLAFOND DU COULOIR</text>
      <!-- mur -->
      <rect x="40" y="110" width="1040" height="280" fill="#f0e9da"/>
      <path d="M40 110 H1080 M40 390 H1080" stroke="#c4b79f" stroke-width="1"/>
      <!-- sol -->
      <rect x="40" y="390" width="1040" height="100" fill="#cbb89a" stroke="#111" stroke-width="2"/>
      <text x="60" y="470" font-size="11" fill="#5a5248">SOL</text>
      <!-- porte entrée -->
      <rect x="55" y="220" width="50" height="170" fill="#e8dfcf" stroke="#111" stroke-width="2"/>
      <text x="80" y="210" text-anchor="middle" font-size="10">Porte</text>
      <!-- porte sortie -->
      <rect x="1015" y="220" width="50" height="170" fill="#e8dfcf" stroke="#111" stroke-width="2"/>

      ${tubes.join("")}
      ${junctionCeiling(boxX, ceilY + 28)}
      ${lights.map((lt) => lightCeiling(lt.x, ceilY + 28, lt.label)).join("")}
      ${tableauMini(48, 118, plan)}
      ${swPos.map((s) => wallSwitch(s)).join("")}

      <text x="560" y="505" text-anchor="middle" font-size="13" font-family="Bricolage Grotesque, sans-serif" font-weight="700">
        Couloir — ${switches.length} commande${switches.length > 1 ? "s" : ""} · ${L} éclairage${L > 1 ? "s" : ""} · boîte au plafond
      </text>
    </svg>`;
  }

  function junctionCeiling(x, y) {
    return `<g>
      <rect x="${x - 34}" y="${y - 18}" width="68" height="36" rx="6" fill="#f0a020" stroke="#111" stroke-width="2.5"/>
      <text x="${x}" y="${y - 2}" text-anchor="middle" font-size="10" font-weight="700" font-family="Bricolage Grotesque, sans-serif">BOÎTE</text>
      <text x="${x}" y="${y + 12}" text-anchor="middle" font-size="9" fill="#3a2a10">dérivation</text>
    </g>`;
  }

  function lightCeiling(x, y, label) {
    return `<g>
      <line x1="${x}" y1="${y + 18}" x2="${x}" y2="${y + 48}" stroke="#111" stroke-width="1.5"/>
      <circle cx="${x}" cy="${y + 62}" r="16" fill="#fff3b0" stroke="#111" stroke-width="2"/>
      <path d="M${x - 7} ${y + 56} l14 12 M${x + 7} ${y + 56} l-14 12" stroke="#c9a227" stroke-width="1.3"/>
      <text x="${x}" y="${y + 92}" text-anchor="middle" font-size="10" font-family="Bricolage Grotesque, sans-serif" font-weight="700">${label}</text>
    </g>`;
  }

  function wallSwitch(s) {
    const isBp = s.kind === "bp";
    const dots = s.wires
      .map((id, i) => {
        const x = s.x - ((s.wires.length - 1) * 7) / 2 + i * 7;
        return `<circle cx="${x}" cy="${s.y + 28}" r="3.5" fill="${strokeOf(id)}" stroke="#111" stroke-width="0.6"/>`;
      })
      .join("");
    return `<g class="device-box">
      <rect x="${s.x - 36}" y="${s.y - 28}" width="72" height="64" rx="8" fill="#f7f1e4" stroke="#111" stroke-width="2.2"/>
      ${isBp
        ? `<circle cx="${s.x}" cy="${s.y - 4}" r="10" fill="#fff" stroke="#111" stroke-width="2"/>`
        : `<rect x="${s.x - 11}" y="${s.y - 16}" width="22" height="22" rx="3" fill="#fff" stroke="#111" stroke-width="2"/>`}
      <text x="${s.x}" y="${s.y + 18}" text-anchor="middle" font-size="10" font-weight="700" font-family="Bricolage Grotesque, sans-serif">${s.label}</text>
      ${dots}
    </g>`;
  }

  function tableauMini(x, y, plan) {
    const tel = plan.schema.kind === "telerupteur";
    return `<g>
      <rect x="${x}" y="${y}" width="70" height="${tel ? 110 : 78}" rx="6" fill="#d9d4cb" stroke="#111" stroke-width="2"/>
      <rect x="${x + 6}" y="${y + 6}" width="58" height="16" rx="2" fill="#3d3a36"/>
      <text x="${x + 35}" y="${y + 18}" text-anchor="middle" fill="#e6b800" font-size="8" font-family="IBM Plex Mono, monospace">TABLEAU</text>
      <rect x="${x + 12}" y="${y + 30}" width="28" height="34" rx="3" fill="#f3efe6" stroke="#111"/>
      <rect x="${x + 16}" y="${y + 34}" width="20" height="7" rx="1" fill="#c0392b"/>
      <text x="${x + 26}" y="${y + 56}" text-anchor="middle" font-size="8">10A</text>
      ${tel ? `<rect x="${x + 40}" y="${y + 30}" width="22" height="50" rx="3" fill="#ece8de" stroke="#111"/>
        <circle cx="${x + 47}" cy="${y + 42}" r="2.5" fill="#6b3f24"/>
        <circle cx="${x + 55}" cy="${y + 42}" r="2.5" fill="#e36b12"/>
        <circle cx="${x + 47}" cy="${y + 58}" r="2.5" fill="#6d3b96"/>
        <circle cx="${x + 55}" cy="${y + 58}" r="2.5" fill="#1d6bb8"/>` : ""}
    </g>`;
  }

  function ceilingTube(x1, y, x2, y2, wires) {
    const mid = (x1 + x2) / 2;
    const paths = wires
      .map((id, i) => {
        const off = (i - (wires.length - 1) / 2) * 4;
        return `<path class="wire" data-group="${id}" d="M${x1} ${y + off} L${x2} ${y2 + off}" fill="none" stroke="${strokeOf(id)}" stroke-width="3" stroke-linecap="round"/>`;
      })
      .join("");
    return `<g>
      <path d="M${x1} ${y} L${x2} ${y2}" fill="none" stroke="#c9b896" stroke-width="${6 + wires.length * 3}" stroke-linecap="round" opacity="0.55"/>
      ${paths}
    </g>`;
  }

  function dropTube(x1, y1, x2, y2, wires) {
    const paths = wires
      .map((id, i) => {
        const off = (i - (wires.length - 1) / 2) * 4;
        return `<path class="wire" data-group="${id}" d="M${x1 + off} ${y1} L${x1 + off} ${y1 + 40} L${x2 + off} ${y2}" fill="none" stroke="${strokeOf(id)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
      })
      .join("");
    return `<g>
      <path d="M${x1} ${y1} L${x1} ${y1 + 40} L${x2} ${y2}" fill="none" stroke="#c9b896" stroke-width="${5 + wires.length * 2.5}" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
      ${paths}
    </g>`;
  }

  /* ---------- Boîte ouverte (détail Wago) ---------- */

  function svgBoxDetail(plan) {
    const groups = plan.groups;
    const ports = buildPorts(plan);
    const cols = Math.min(groups.length, 4);
    const rows = Math.ceil(groups.length / cols);
    const cellW = 200;
    const cellH = 150;
    const padX = 90;
    const padY = 100;
    const boxW = cols * cellW + 40;
    const boxH = rows * cellH + 50;
    const W = boxW + padX * 2;
    const H = boxH + padY * 2 + 40;

    const wagos = groups.map((gr, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...gr,
        x: padX + 20 + col * cellW + cellW / 2,
        y: padY + 30 + row * cellH + 55,
      };
    });

    const portSvg = ports
      .map((p, i) => {
        const side = p.side;
        let x, y, tx, ty;
        if (side === "left") {
          x = padX;
          y = padY + 40 + (i * (boxH - 60)) / Math.max(ports.filter((q) => q.side === "left").length - 1 || 1, 1);
          // recalculate with local index
        }
        return null;
      })
      .filter(Boolean);

    // Place ports around the box
    const leftPorts = ports.filter((p) => p.side === "left");
    const rightPorts = ports.filter((p) => p.side === "right");
    const topPorts = ports.filter((p) => p.side === "top");
    const bottomPorts = ports.filter((p) => p.side === "bottom");

    function place(list, side) {
      return list
        .map((p, i) => {
          const n = list.length;
          let x, y, lx, ly, anchor;
          if (side === "left") {
            x = padX;
            y = padY + 50 + (n === 1 ? boxH / 2 - 50 : (i * (boxH - 80)) / (n - 1));
            lx = x - 8;
            ly = y;
            anchor = "end";
          } else if (side === "right") {
            x = padX + boxW;
            y = padY + 50 + (n === 1 ? boxH / 2 - 50 : (i * (boxH - 80)) / (n - 1));
            lx = x + 8;
            ly = y;
            anchor = "start";
          } else if (side === "top") {
            x = padX + 50 + (n === 1 ? boxW / 2 - 50 : (i * (boxW - 100)) / (n - 1));
            y = padY;
            lx = x;
            ly = y - 10;
            anchor = "middle";
          } else {
            x = padX + 50 + (n === 1 ? boxW / 2 - 50 : (i * (boxW - 100)) / (n - 1));
            y = padY + boxH;
            lx = x;
            ly = y + 16;
            anchor = "middle";
          }
          const stubs = p.wires
            .map((id, wi) => {
              const off = (wi - (p.wires.length - 1) / 2) * 7;
              const x2 = side === "left" ? x + 28 : side === "right" ? x - 28 : x + off;
              const y2 = side === "top" ? y + 28 : side === "bottom" ? y - 28 : y + off;
              const x1 = side === "left" ? x - 2 : side === "right" ? x + 2 : x + off;
              const y1 = side === "top" ? y - 2 : side === "bottom" ? y + 2 : y + off;
              // connect toward nearest matching wago
              const target = wagos.find((w) => w.color === id);
              const tx = target ? target.x : x2;
              const ty = target ? target.y - 28 : y2;
              return `<g class="wire" data-group="${id}">
                <path d="M${x1} ${y1} L${x2} ${y2} L${tx} ${ty}" fill="none" stroke="${strokeOf(id)}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
              </g>`;
            })
            .join("");
          return `<g>
            <circle cx="${x}" cy="${y}" r="7" fill="#fff" stroke="#111" stroke-width="1.5"/>
            <text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10" font-family="IBM Plex Sans, sans-serif" fill="#3a3228">${escapeHtml(p.label)}</text>
            ${stubs}
          </g>`;
        })
        .join("");
    }

    const wagoSvg = wagos
      .map((w) => {
        const c = COLORS[w.color];
        const n = Math.min(w.members.length, 6);
        const holes = Array.from({ length: Math.max(n, 2) }, (_, i) => {
          const hx = w.x - ((Math.max(n, 2) - 1) * 14) / 2 + i * 14;
          return `<circle cx="${hx}" cy="${w.y + 8}" r="4" fill="#1a1a1a"/><circle cx="${hx}" cy="${w.y + 8}" r="2.2" fill="${strokeOf(w.color)}"/>`;
        }).join("");
        return `<g class="box-wago" data-group="${w.color}">
          <rect x="${w.x - 70}" y="${w.y - 36}" width="140" height="72" rx="8" fill="#fff" stroke="#111" stroke-width="2"/>
          <rect x="${w.x - 70}" y="${w.y - 36}" width="140" height="18" rx="8" fill="${c.hex}" opacity="0.85"/>
          <rect x="${w.x - 70}" y="${w.y - 24}" width="140" height="6" fill="${c.hex}"/>
          <text x="${w.x}" y="${w.y - 23}" text-anchor="middle" font-size="11" font-weight="700" fill="${w.color === "navF" || w.color === "neutre" ? "#111" : "#fff"}" font-family="Bricolage Grotesque, sans-serif">${escapeHtml(c.name)}</text>
          <text x="${w.x}" y="${w.y - 4}" text-anchor="middle" font-size="10" fill="#5a5248">${escapeHtml(w.title)} · ${w.members.length} fils</text>
          ${holes}
          <text x="${w.x}" y="${w.y + 28}" text-anchor="middle" font-size="9" fill="#8a8073">Wago</text>
        </g>`;
      })
      .join("");

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Boîte de dérivation ouverte">
      ${defsSvg().replace(/id="terre"/g, 'id="terre-box"').replace(/url\(#terre\)/g, "url(#terre-box)")}
      <text x="${W / 2}" y="28" text-anchor="middle" font-size="14" font-family="Bricolage Grotesque, sans-serif" font-weight="800">Intérieur de la boîte — chaque Wago = une seule couleur</text>
      <rect x="${padX}" y="${padY}" width="${boxW}" height="${boxH}" rx="16" fill="#ffe08a" stroke="#111" stroke-width="3"/>
      <rect x="${padX + 8}" y="${padY + 8}" width="${boxW - 16}" height="${boxH - 16}" rx="12" fill="#fff6d0" stroke="#d4a017" stroke-width="1.5" stroke-dasharray="5 4"/>
      ${place(topPorts, "top")}
      ${place(leftPorts, "left")}
      ${place(rightPorts, "right")}
      ${place(bottomPorts, "bottom")}
      ${wagoSvg}
      <text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#5a5248">Astuce : étiquetez chaque gaine (Entrée, Sortie, Écl.1…) avant de fermer le couvercle.</text>
    </svg>`;
  }

  function buildPorts(plan) {
    const ports = [{ side: "left", label: "← Tableau", wires: plan.schema.tabWires }];
    plan.schema.switches.forEach((s, i) => {
      const side = i % 2 === 0 ? "bottom" : "bottom";
      ports.push({ side, label: s.label, wires: s.wires });
    });
    const L = plan.lights;
    for (let i = 0; i < L; i++) {
      ports.push({
        side: i < Math.ceil(L / 2) ? "top" : "right",
        label: `Écl. ${i + 1}`,
        wires: ["terre", "neutre", "retour"],
      });
    }
    // redistribute switches: first half left-ish bottom, keep simple bottom
    return ports;
  }

  /* ---------- Schéma étoile (compact) ---------- */

  function svgSchema(plan) {
    const W = 900;
    const H = 480;
    const ax = 420;
    const ay = 200;
    const ar = 58;
    const L = plan.lights;
    const tab = { x: 30, y: 70, w: 110, h: plan.schema.kind === "telerupteur" ? 180 : 140 };
    const switches = plan.schema.switches;
    const n = switches.length;
    const sw = switches.map((s, i) => ({
      ...s,
      x: n === 1 ? ax : 80 + (i * (W - 160)) / (n - 1),
      y: 400,
    }));
    const lights = Array.from({ length: L }, (_, i) => ({
      x: L === 1 ? 760 : 620 + (i * 200) / Math.max(L - 1, 1),
      y: 40 + (i % 2) * 70,
      label: `É${i + 1}`,
    }));

    const cables = [];
    cables.push(bundle(edge(ax, ay, ar, tab.x + tab.w, tab.y + tab.h / 2), { x: tab.x + tab.w, y: tab.y + tab.h / 2 }, plan.schema.tabWires, "tableau"));
    lights.forEach((lt) => {
      cables.push(bundle(edge(ax, ay, ar, lt.x, lt.y + 40), { x: lt.x - 6, y: lt.y + 40 }, ["terre", "neutre", "retour"], lt.label));
    });
    sw.forEach((s) => {
      cables.push(bundle(edge(ax, ay, ar, s.x, s.y - 36), { x: s.x, y: s.y - 38 }, s.wires, s.label));
    });

    return `<svg viewBox="0 0 ${W} ${H}" aria-label="${escapeHtml(plan.title)}">
      ${defsSvg()}
      ${tableauSvg(tab, plan)}
      ${lights.map((lt) => luminaireSvg(lt)).join("")}
      ${cables.join("")}
      ${araigneeSvg(ax, ay, ar)}
      ${sw.map(switchSvg).join("")}
    </svg>`;
  }

  function edge(cx, cy, r, tx, ty) {
    const dx = tx - cx;
    const dy = ty - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: cx + (dx / len) * r, y: cy + (dy / len) * r };
  }

  function bundle(from, to, wires, label) {
    const n = wires.length;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const gap = 5.5;
    const paths = wires
      .map((id, i) => {
        const off = (i - (n - 1) / 2) * gap;
        const x1 = from.x + px * off;
        const y1 = from.y + py * off;
        const x2 = to.x + px * off;
        const y2 = to.y + py * off;
        const outline = COLORS[id].stroke || "#1c1712";
        return `<g class="wire" data-group="${id}">
          <path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${outline}" stroke-width="5.5" stroke-linecap="round" opacity="0.2"/>
          <path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${strokeOf(id)}" stroke-width="3.5" stroke-linecap="round"/>
        </g>`;
      })
      .join("");
    const lx = (from.x + to.x) / 2;
    const ly = (from.y + to.y) / 2;
    return `<g>${paths}<text x="${lx}" y="${ly - 6}" text-anchor="middle" font-size="9" fill="#5a5248">${escapeHtml(label)}</text></g>`;
  }

  function araigneeSvg(x, y, r) {
    return `<g>
      <circle cx="${x}" cy="${y}" r="${r}" fill="#fff6d6" stroke="#111" stroke-width="2.5"/>
      <circle cx="${x}" cy="${y}" r="7" fill="#111"/>
      <text x="${x}" y="${y + 22}" text-anchor="middle" font-size="12" font-weight="800" font-family="Bricolage Grotesque, sans-serif">Araignée</text>
    </g>`;
  }

  function tableauSvg(tab, plan) {
    const tel = plan.schema.kind === "telerupteur";
    return `<g>
      <rect x="${tab.x}" y="${tab.y}" width="${tab.w}" height="${tab.h}" rx="8" fill="#d9d4cb" stroke="#111" stroke-width="2"/>
      <rect x="${tab.x + 8}" y="${tab.y + 8}" width="${tab.w - 16}" height="20" rx="3" fill="#3d3a36"/>
      <text x="${tab.x + tab.w / 2}" y="${tab.y + 22}" text-anchor="middle" fill="#e6b800" font-size="9" font-family="IBM Plex Mono, monospace">TABLEAU</text>
      <rect x="${tab.x + 14}" y="${tab.y + 40}" width="32" height="40" rx="3" fill="#f3efe6" stroke="#111"/>
      <rect x="${tab.x + 18}" y="${tab.y + 46}" width="24" height="8" rx="1" fill="#c0392b"/>
      ${tel ? `<rect x="${tab.x + 54}" y="${tab.y + 40}" width="40" height="70" rx="3" fill="#ece8de" stroke="#111"/>
        <text x="${tab.x + 74}" y="${tab.y + 54}" text-anchor="middle" font-size="8">Télérup.</text>` : ""}
      <text x="${tab.x + tab.w / 2}" y="${tab.y + tab.h + 14}" text-anchor="middle" font-size="10" font-weight="700">Tableau</text>
    </g>`;
  }

  function luminaireSvg(p) {
    return `<g>
      <circle cx="${p.x + 20}" cy="${p.y + 36}" r="18" fill="#fff3b0" stroke="#111" stroke-width="2"/>
      <text x="${p.x + 20}" y="${p.y + 68}" text-anchor="middle" font-size="10" font-weight="700">${p.label || "Écl."}</text>
    </g>`;
  }

  function switchSvg(s) {
    const isBp = s.kind === "bp";
    return `<g>
      <rect x="${s.x - 40}" y="${s.y - 30}" width="80" height="58" rx="8" fill="#f7f1e4" stroke="#111" stroke-width="2"/>
      ${isBp
        ? `<circle cx="${s.x}" cy="${s.y - 6}" r="9" fill="#fff" stroke="#111" stroke-width="1.8"/>`
        : `<rect x="${s.x - 10}" y="${s.y - 16}" width="20" height="20" rx="3" fill="#fff" stroke="#111" stroke-width="1.8"/>`}
      <text x="${s.x}" y="${s.y + 20}" text-anchor="middle" font-size="10" font-weight="700">${s.label}</text>
    </g>`;
  }

  /* ---------- Tableau détaillé (télérupteur / départ) ---------- */

  function svgTableauDetail(plan) {
    const tel = plan.schema.kind === "telerupteur";
    return tel ? svgTableauTelerupteur() : svgTableauSimple();
  }

  function svgTableauSimple() {
    const W = 980;
    const H = 320;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Raccordement tableau éclairage">
      ${defsSvg()}
      <rect x="20" y="20" width="940" height="260" rx="14" fill="#d9d4cb" stroke="#111" stroke-width="2.5"/>
      <text x="40" y="48" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="18">Tableau — départ éclairage</text>
      <text x="40" y="68" font-size="12" fill="#5a5248">Sans télérupteur : seulement le disjoncteur 10 A</text>

      <!-- peignes -->
      <rect x="40" y="90" width="200" height="10" rx="2" fill="#6b3f24"/>
      <text x="40" y="85" font-size="10" fill="#6b3f24" font-weight="600">Peigne phase</text>
      <rect x="40" y="120" width="200" height="10" rx="2" fill="#1d6bb8"/>
      <text x="40" y="115" font-size="10" fill="#1d6bb8" font-weight="600">Peigne neutre</text>

      <!-- DJ -->
      <rect x="280" y="80" width="70" height="110" rx="6" fill="#f3efe6" stroke="#111" stroke-width="2"/>
      <rect x="292" y="92" width="46" height="14" rx="2" fill="#c0392b"/>
      <text x="315" y="128" text-anchor="middle" font-size="12" font-weight="700">10 A</text>
      <text x="315" y="148" text-anchor="middle" font-size="10">Disjoncteur</text>
      <circle cx="300" cy="168" r="5" fill="#6b3f24" stroke="#111"/>
      <circle cx="330" cy="168" r="5" fill="#6b3f24" stroke="#111"/>
      <text x="300" y="188" text-anchor="middle" font-size="9">in</text>
      <text x="330" y="188" text-anchor="middle" font-size="9">out</text>

      <g class="wire" data-group="phase">
        <path d="M240 95 H300 V168" fill="none" stroke="#6b3f24" stroke-width="3.5" stroke-linecap="round"/>
      </g>

      <!-- départ -->
      <rect x="520" y="70" width="220" height="160" rx="10" fill="#fffbf3" stroke="#111" stroke-width="2"/>
      <text x="630" y="95" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="14">Départ → araignée</text>
      <text x="630" y="115" text-anchor="middle" font-size="11" fill="#5a5248">3G 1,5 mm²</text>
      ${departWireRow(560, 140, "phase", "Marron · phase")}
      ${departWireRow(560, 168, "neutre", "Bleu · neutre")}
      ${departWireRow(560, 196, "terre", "Vert/jaune · terre")}

      <g class="wire" data-group="phase">
        <path d="M330 168 H400 V150 H520" fill="none" stroke="#6b3f24" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g class="wire" data-group="neutre">
        <path d="M240 125 H400 V178 H520" fill="none" stroke="#1d6bb8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g class="wire" data-group="terre">
        <path d="M400 210 H520" fill="none" stroke="url(#terre)" stroke-width="3.5" stroke-linecap="round"/>
        <text x="400" y="228" font-size="10" fill="#2f9e44">← barre de terre</text>
      </g>

      <text x="490" y="270" text-anchor="middle" font-size="12" fill="#5a5248">La coupure de la lampe se fait dans les interrupteurs, pas ici.</text>
    </svg>`;
  }

  function departWireRow(x, y, colorId, label) {
    const c = COLORS[colorId];
    const fill = c.pattern ? "url(#terre)" : c.hex;
    return `<g class="wire" data-group="${colorId}">
      <circle cx="${x}" cy="${y}" r="7" fill="${fill}" stroke="#111" stroke-width="1"/>
      <text x="${x + 16}" y="${y + 4}" font-size="13" font-family="IBM Plex Sans, sans-serif">${escapeHtml(label)}</text>
    </g>`;
  }

  function svgTableauTelerupteur() {
    const W = 1100;
    const H = 440;
    // Positions
    const djX = 220, djY = 130;
    const telX = 420, telY = 100;
    const outX = 780;

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Raccordement télérupteur au tableau">
      ${defsSvg()}
      <rect x="16" y="16" width="1068" height="408" rx="14" fill="#d9d4cb" stroke="#111" stroke-width="2.5"/>
      <text x="36" y="46" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="18">Tableau — télérupteur + départ araignée</text>
      <text x="36" y="66" font-size="12" fill="#5a5248">Chaque appui sur un poussoir inverse la lumière via le module</text>

      <!-- Peignes -->
      <rect x="36" y="100" width="150" height="12" rx="2" fill="#6b3f24"/>
      <text x="36" y="94" font-size="11" fill="#6b3f24" font-weight="600">Peigne PHASE</text>
      <rect x="36" y="300" width="150" height="12" rx="2" fill="#1d6bb8"/>
      <text x="36" y="294" font-size="11" fill="#1d6bb8" font-weight="600">Peigne NEUTRE</text>
      <rect x="36" y="340" width="150" height="12" rx="2" fill="url(#terre)"/>
      <text x="36" y="334" font-size="11" fill="#2f9e44" font-weight="600">Barre TERRE</text>

      <!-- Disjoncteur -->
      <g>
        <rect x="${djX}" y="${djY}" width="80" height="130" rx="7" fill="#f3efe6" stroke="#111" stroke-width="2.2"/>
        <rect x="${djX + 14}" y="${djY + 12}" width="52" height="16" rx="2" fill="#c0392b"/>
        <text x="${djX + 40}" y="${djY + 52}" text-anchor="middle" font-size="14" font-weight="800" font-family="Bricolage Grotesque, sans-serif">10 A</text>
        <text x="${djX + 40}" y="${djY + 70}" text-anchor="middle" font-size="10">Disjoncteur</text>
        <circle cx="${djX + 28}" cy="${djY + 100}" r="6" fill="#6b3f24" stroke="#111"/>
        <circle cx="${djX + 52}" cy="${djY + 100}" r="6" fill="#6b3f24" stroke="#111"/>
        <text x="${djX + 28}" y="${djY + 120}" text-anchor="middle" font-size="9">entrée</text>
        <text x="${djX + 52}" y="${djY + 120}" text-anchor="middle" font-size="9">sortie</text>
      </g>

      <!-- Télérupteur -->
      <g>
        <rect x="${telX}" y="${telY}" width="160" height="220" rx="10" fill="#ece8de" stroke="#111" stroke-width="2.5"/>
        <rect x="${telX + 12}" y="${telY + 10}" width="136" height="28" rx="4" fill="#3d3a36"/>
        <text x="${telX + 80}" y="${telY + 29}" text-anchor="middle" fill="#e6b800" font-size="12" font-family="IBM Plex Mono, monospace">TÉLÉRUPTEUR</text>

        <!-- bornes haut : 1 et 2 (contact puissance) -->
        <g class="wire" data-group="phase">
          <circle cx="${telX + 45}" cy="${telY + 70}" r="9" fill="#6b3f24" stroke="#111" stroke-width="1.5"/>
          <text x="${telX + 45}" y="${telY + 74}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">1</text>
        </g>
        <g class="wire" data-group="retour">
          <circle cx="${telX + 115}" cy="${telY + 70}" r="9" fill="#e36b12" stroke="#111" stroke-width="1.5"/>
          <text x="${telX + 115}" y="${telY + 74}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">2</text>
        </g>
        <text x="${telX + 80}" y="${telY + 100}" text-anchor="middle" font-size="11" fill="#5a5248">Contact puissance</text>

        <!-- bornes bas : A1 A2 (bobine) -->
        <g class="wire" data-group="cmd">
          <circle cx="${telX + 45}" cy="${telY + 150}" r="9" fill="#6d3b96" stroke="#111" stroke-width="1.5"/>
          <text x="${telX + 45}" y="${telY + 154}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">A1</text>
        </g>
        <g class="wire" data-group="neutre">
          <circle cx="${telX + 115}" cy="${telY + 150}" r="9" fill="#1d6bb8" stroke="#111" stroke-width="1.5"/>
          <text x="${telX + 115}" y="${telY + 154}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">A2</text>
        </g>
        <text x="${telX + 80}" y="${telY + 180}" text-anchor="middle" font-size="11" fill="#5a5248">Bobine (commande)</text>
        <text x="${telX + 80}" y="${telY + 205}" text-anchor="middle" font-size="10" fill="#8a8073">Chaque appui = inverse</text>
      </g>

      <!-- Fil phase peigne → DJ entrée -->
      <g class="wire" data-group="phase">
        <path d="M186 106 H${djX + 28} V${djY + 100}" fill="none" stroke="#6b3f24" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <!-- DJ sortie → borne 1 -->
      <g class="wire" data-group="phase">
        <path d="M${djX + 52} ${djY + 100} H${telX + 45} V${telY + 70}" fill="none" stroke="#6b3f24" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="360" y="218" font-size="10" fill="#6b3f24" font-weight="600">marron</text>
      </g>
      <!-- Neutre peigne → A2 -->
      <g class="wire" data-group="neutre">
        <path d="M186 306 H${telX + 115} V${telY + 150}" fill="none" stroke="#1d6bb8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="300" y="320" font-size="10" fill="#1d6bb8" font-weight="600">bleu → A2</text>
      </g>

      <!-- Départ araignée -->
      <rect x="${outX}" y="70" width="280" height="300" rx="12" fill="#fffbf3" stroke="#111" stroke-width="2.2"/>
      <text x="${outX + 140}" y="98" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="15">Vers l’araignée</text>
      <text x="${outX + 140}" y="118" text-anchor="middle" font-size="11" fill="#5a5248">5 fils · 1,5 mm²</text>

      ${departWireRow(outX + 28, 150, "phase", "Marron · phase poussoirs")}
      ${departWireRow(outX + 28, 185, "retour", "Orange · phase lampes (borne 2)")}
      ${departWireRow(outX + 28, 220, "cmd", "Violet · commande (borne A1)")}
      ${departWireRow(outX + 28, 255, "neutre", "Bleu · neutre lampes")}
      ${departWireRow(outX + 28, 290, "terre", "Vert/jaune · terre")}

      <text x="${outX + 140}" y="340" text-anchor="middle" font-size="11" fill="#5a5248">Même câble / même gaine ICTA</text>

      <!-- Wires to departure -->
      <!-- phase after DJ also to araignée (bridge from near borne 1) -->
      <g class="wire" data-group="phase">
        <path d="M${telX + 45} ${telY + 70} H${telX - 20} V80 H${outX}" fill="none" stroke="#6b3f24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <!-- borne 2 → orange -->
      <g class="wire" data-group="retour">
        <path d="M${telX + 115} ${telY + 70} H${outX}" fill="none" stroke="#e36b12" stroke-width="3.5" stroke-linecap="round"/>
        <text x="650" y="88" font-size="10" fill="#e36b12" font-weight="600">orange (2)</text>
      </g>
      <!-- A1 ← violet -->
      <g class="wire" data-group="cmd">
        <path d="M${telX + 45} ${telY + 150} H${telX - 30} V250 H${outX}" fill="none" stroke="#6d3b96" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="640" y="244" font-size="10" fill="#6d3b96" font-weight="600">violet (A1)</text>
      </g>
      <!-- neutre to araignée -->
      <g class="wire" data-group="neutre">
        <path d="M186 306 H200 V270 H${outX}" fill="none" stroke="#1d6bb8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
      </g>
      <!-- terre to araignée -->
      <g class="wire" data-group="terre">
        <path d="M186 346 H210 V305 H${outX}" fill="none" stroke="url(#terre)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>

      <text x="550" y="400" text-anchor="middle" font-size="12" fill="#5a5248">Survolez un fil : tout le même réseau s’allume (borne ↔ départ)</text>
    </svg>`;
  }

  /* ---------- Dos poussoir Schneider ---------- */

  function svgPoussoirDetail(plan) {
    const tel = plan.schema.kind === "telerupteur";
    if (!tel) return svgPoussoirHintMecanique();
    return svgPoussoirSchneiderRear();
  }

  function svgPoussoirHintMecanique() {
    return `<svg viewBox="0 0 900 220" role="img" aria-label="Astuce poussoir">
      <rect x="20" y="20" width="860" height="180" rx="14" fill="#fffbf3" stroke="#111" stroke-width="2"/>
      <text x="450" y="90" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="20">Vue arrière poussoir Schneider</text>
      <text x="450" y="125" text-anchor="middle" font-size="14" fill="#5a5248">Choisissez « Télérupteur » en haut pour voir le câblage derrière le poussoir</text>
      <text x="450" y="155" text-anchor="middle" font-size="13" fill="#5a5248">(marron + violet) avec tableau RESI9.</text>
    </svg>`;
  }

  function svgPoussoirSchneiderRear() {
    const W = 1100;
    const H = 520;
    // Mechanism center
    const mx = 520;
    const my = 210;

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dos poussoir Schneider câblé">
      ${defsSvg()}

      <!-- fond atelier -->
      <rect x="16" y="16" width="1068" height="488" rx="14" fill="#ebe4d4" stroke="#111" stroke-width="2"/>

      <text x="40" y="48" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="18">Dos du poussoir Schneider (mécanisme retiré de la plaque)</text>
      <text x="40" y="70" font-size="12" fill="#5a5248">2 bornes à vis · pas de polarité · fils 1,5 mm²</text>

      <!-- Badge marques -->
      <g>
        <rect x="820" y="32" width="230" height="52" rx="8" fill="#3d3a36"/>
        <text x="935" y="54" text-anchor="middle" fill="#fff" font-size="12" font-family="IBM Plex Mono, monospace">Schneider Electric</text>
        <text x="935" y="72" text-anchor="middle" fill="#e6b800" font-size="11">Poussoir · tableau RESI9</text>
      </g>

      <!-- Mur / boîte d'encastrement -->
      <rect x="70" y="100" width="200" height="280" rx="10" fill="#cfc6b4" stroke="#111" stroke-width="2"/>
      <text x="170" y="128" text-anchor="middle" font-size="12" font-weight="700">Boîte d’encastrement</text>
      <ellipse cx="170" cy="250" rx="55" ry="70" fill="#9a9080" stroke="#111" stroke-width="1.5" opacity="0.5"/>
      <text x="170" y="360" text-anchor="middle" font-size="11" fill="#5a5248">dans le mur</text>

      <!-- Gaine ICTA arrivant -->
      <g>
        <path d="M120 380 C120 430, 200 450, 280 430" fill="none" stroke="#c9a227" stroke-width="18" stroke-linecap="round"/>
        <path d="M120 380 C120 430, 200 450, 280 430" fill="none" stroke="#e8d48a" stroke-width="12" stroke-linecap="round"/>
        <text x="160" y="455" font-size="11" fill="#5a5248">Gaine ICTA</text>
        <text x="160" y="470" font-size="10" fill="#8a8073">depuis l’araignée</text>
      </g>

      <!-- Fils sortant de la gaine vers le mécanisme -->
      <g class="wire" data-group="phase">
        <path d="M250 420 C320 400, 360 320, 430 278" fill="none" stroke="#6b3f24" stroke-width="7" stroke-linecap="round"/>
        <path d="M250 420 C320 400, 360 320, 430 278" fill="none" stroke="#6b3f24" stroke-width="4.5" stroke-linecap="round"/>
        <!-- cuivre dénudé -->
        <path d="M430 278 L455 268" fill="none" stroke="#c9a06a" stroke-width="3.5" stroke-linecap="round"/>
      </g>
      <g class="wire" data-group="cmd">
        <path d="M270 435 C340 430, 380 360, 450 318" fill="none" stroke="#6d3b96" stroke-width="7" stroke-linecap="round"/>
        <path d="M270 435 C340 430, 380 360, 450 318" fill="none" stroke="#6d3b96" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M450 318 L470 308" fill="none" stroke="#c9a06a" stroke-width="3.5" stroke-linecap="round"/>
      </g>

      <!-- Mécanisme Schneider (vue arrière) -->
      <g>
        <!-- corps -->
        <rect x="${mx - 110}" y="${my - 90}" width="220" height="200" rx="16" fill="#f4f1ea" stroke="#111" stroke-width="2.8"/>
        <!-- rainures / griffes -->
        <rect x="${mx - 118}" y="${my - 40}" width="12" height="70" rx="3" fill="#d8d2c4" stroke="#111"/>
        <rect x="${mx + 106}" y="${my - 40}" width="12" height="70" rx="3" fill="#d8d2c4" stroke="#111"/>

        <!-- logo zone -->
        <text x="${mx}" y="${my - 62}" text-anchor="middle" font-size="11" font-family="IBM Plex Mono, monospace" fill="#5a5248">SCHNEIDER</text>
        <text x="${mx}" y="${my - 46}" text-anchor="middle" font-size="10" fill="#8a8073">poussoir 10 AX</text>

        <!-- Zone bornes -->
        <rect x="${mx - 80}" y="${my - 20}" width="160" height="100" rx="8" fill="#e8e2d4" stroke="#111" stroke-width="1.5"/>

        <!-- Borne gauche (phase marron) -->
        <g class="wire" data-group="phase">
          <rect x="${mx - 62}" y="${my}" width="48" height="48" rx="6" fill="#fff" stroke="#111" stroke-width="1.8"/>
          <!-- vis -->
          <circle cx="${mx - 38}" cy="${my + 24}" r="11" fill="#b8b0a0" stroke="#444" stroke-width="2"/>
          <line x1="${mx - 47}" y1="${my + 24}" x2="${mx - 29}" y2="${my + 24}" stroke="#333" stroke-width="2"/>
          <line x1="${mx - 38}" y1="${my + 15}" x2="${mx - 38}" y2="${my + 33}" stroke="#333" stroke-width="1.2" opacity="0.5"/>
          <!-- entrée fil -->
          <rect x="${mx - 54}" y="${my + 40}" width="32" height="8" rx="2" fill="#3d3a36"/>
          <text x="${mx - 38}" y="${my - 6}" text-anchor="middle" font-size="12" font-weight="700" font-family="IBM Plex Mono, monospace">L</text>
        </g>

        <!-- Borne droite (commande violet) -->
        <g class="wire" data-group="cmd">
          <rect x="${mx + 14}" y="${my}" width="48" height="48" rx="6" fill="#fff" stroke="#111" stroke-width="1.8"/>
          <circle cx="${mx + 38}" cy="${my + 24}" r="11" fill="#b8b0a0" stroke="#444" stroke-width="2"/>
          <line x1="${mx + 29}" y1="${my + 24}" x2="${mx + 47}" y2="${my + 24}" stroke="#333" stroke-width="2"/>
          <line x1="${mx + 38}" y1="${my + 15}" x2="${mx + 38}" y2="${my + 33}" stroke="#333" stroke-width="1.2" opacity="0.5"/>
          <rect x="${mx + 22}" y="${my + 40}" width="32" height="8" rx="2" fill="#3d3a36"/>
          <text x="${mx + 38}" y="${my - 6}" text-anchor="middle" font-size="12" font-weight="700" font-family="IBM Plex Mono, monospace">1</text>
        </g>

        <text x="${mx}" y="${my + 95}" text-anchor="middle" font-size="11" fill="#5a5248">Serrez bien les 2 vis · dénudez ~8 mm</text>
      </g>

      <!-- Labels fils -->
      <g class="wire" data-group="phase">
        <rect x="300" y="240" width="120" height="36" rx="8" fill="#fff" stroke="#6b3f24" stroke-width="2"/>
        <circle cx="318" cy="258" r="7" fill="#6b3f24"/>
        <text x="330" y="255" font-size="12" font-weight="700">Marron</text>
        <text x="330" y="270" font-size="10" fill="#5a5248">phase (borne L)</text>
      </g>
      <g class="wire" data-group="cmd">
        <rect x="300" y="300" width="130" height="36" rx="8" fill="#fff" stroke="#6d3b96" stroke-width="2"/>
        <circle cx="318" cy="318" r="7" fill="#6d3b96"/>
        <text x="330" y="315" font-size="12" font-weight="700">Violet</text>
        <text x="330" y="330" font-size="10" fill="#5a5248">commande (borne 1)</text>
      </g>

      <!-- Panneau résumé RESI9 -->
      <g>
        <rect x="760" y="120" width="300" height="340" rx="12" fill="#fffbf3" stroke="#111" stroke-width="2"/>
        <rect x="776" y="136" width="268" height="36" rx="6" fill="#3d3a36"/>
        <text x="910" y="160" text-anchor="middle" fill="#e6b800" font-size="13" font-family="IBM Plex Mono, monospace">RESI9 · rappel</text>

        <text x="790" y="200" font-size="13" font-weight="700" font-family="Bricolage Grotesque, sans-serif">Dans le poussoir</text>
        <text x="790" y="222" font-size="12" fill="#5a5248">Seulement 2 fils :</text>
        ${miniRow(790, 245, "phase", "Marron → L")}
        ${miniRow(790, 275, "cmd", "Violet → 1")}

        <text x="790" y="320" font-size="13" font-weight="700" font-family="Bricolage Grotesque, sans-serif">Dans le RESI9</text>
        <text x="790" y="342" font-size="12" fill="#5a5248">Télérupteur rail DIN :</text>
        ${miniRow(790, 365, "phase", "1 · phase après 10 A")}
        ${miniRow(790, 392, "retour", "2 · orange lampes")}
        ${miniRow(790, 419, "cmd", "A1 · violet poussoirs")}
        ${miniRow(790, 446, "neutre", "A2 · neutre bleu")}
      </g>

      <text x="550" y="495" text-anchor="middle" font-size="12" fill="#5a5248">Astuce : on peut inverser marron et violet sur le poussoir — ça marche pareil (contact momentané).</text>
    </svg>`;
  }

  function miniRow(x, y, colorId, label) {
    const c = COLORS[colorId];
    const fill = c.pattern ? "url(#terre)" : c.hex;
    return `<g class="wire" data-group="${colorId}">
      <circle cx="${x + 8}" cy="${y}" r="6" fill="${fill}" stroke="#111" stroke-width="0.8"/>
      <text x="${x + 22}" y="${y + 4}" font-size="12">${escapeHtml(label)}</text>
    </g>`;
  }

  function poussoirNotesHtml(plan) {
    if (plan.schema.kind !== "telerupteur") {
      return `<div class="note"><b>Mode interrupteurs</b>Passez en « Télérupteur » pour le détail Schneider + RESI9.</div>`;
    }
    return `
      <div class="note">
        <b>1. Coupez le 10 A RESI9</b>
        Vérifiez l’absence de tension avant d’ouvrir le poussoir.
      </div>
      <div class="note">
        <b>2. Dénudez ~8 mm</b>
        <span class="dot" style="background:#6b3f24"></span>Marron et
        <span class="dot" style="background:#6d3b96"></span>violet · 1,5 mm².
      </div>
      <div class="note">
        <b>3. Une couleur par borne</b>
        Marron dans L (ou n’importe laquelle), violet dans l’autre. Serrez.
      </div>
      <div class="note">
        <b>4. Tous les poussoirs identiques</b>
        Même câblage sur BP1, BP2, BP3… en parallèle via l’araignée.
      </div>`;
  }

  /* ---------- UI ---------- */

  function renderFlow(flow) {
    if (!flow?.length) return "";
    const parts = flow.map((step, i) => {
      let html = i > 0 ? `<span class="arrow">→</span>` : "";
      if (step.type === "box") {
        html += `<div class="flow-box"><b>${escapeHtml(step.title)}</b>${escapeHtml(step.text || "")}</div>`;
      } else if (step.type === "wire") {
        const c = COLORS[step.color];
        html += `<div class="flow-box" style="border-color:${c.hex}"><span class="dot" style="background:${c.hex}"></span>${escapeHtml(step.text)}</div>`;
      } else if (step.type === "pair") {
        html += `<div class="pair">${step.wires
          .map((w) => `<span style="display:inline-flex;gap:6px;align-items:center;font-size:12px"><span class="dot" style="background:${COLORS[w.color].hex}"></span>${escapeHtml(w.text)}</span>`)
          .join("")}</div>`;
      }
      return html;
    });
    return `<h3>Principe en une ligne</h3><div class="flow">${parts.join("")}</div>`;
  }

  function render(plan) {
    const tel = plan.schema.kind === "telerupteur";
    $("plan-title").textContent = plan.title;
    $("plan-sub").textContent = plan.subtitle;
    $("type-hint").textContent = plan.hint;
    $("corridor").innerHTML = svgCorridor(plan);
    $("box-detail").innerHTML = svgBoxDetail(plan);
    $("schema").innerHTML = svgSchema(plan);
    $("tableau-detail").innerHTML = svgTableauDetail(plan);
    $("tab-detail-title").textContent = tel
      ? "Raccordement du télérupteur"
      : "Raccordement au tableau";
    $("tab-detail-sub").textContent = tel
      ? "Tableau Schneider RESI9 : disjoncteur 10 A → télérupteur (1, 2, A1, A2) → départ 5 fils vers l’araignée."
      : "Disjoncteur 10 A → départ 3G (marron, bleu, terre) vers la boîte au plafond.";
    $("principle").innerHTML = renderFlow(plan.flow || []);
    $("legend").innerHTML = uniqueColors(plan)
      .map(
        (c) => `<button type="button" class="chip" data-group="${c.id}">
          <span class="swatch ${c.pattern ? "terre" : ""}" style="${c.pattern ? "" : `background:${c.hex}`}"></span>
          <span class="name">${c.name}</span>
          <span class="role">${c.role}</span>
        </button>`
      )
      .join("");

    $("bornier").innerHTML = plan.groups
      .map(
        (gr, i) => `<article class="wago" data-group="${gr.color}" style="border-left-color:${COLORS[gr.color].hex}">
          <div class="wago-head">
            <h3>${i + 1}. ${gr.title} · ${COLORS[gr.color].name}</h3>
            <span class="count">${gr.members.length} fils</span>
          </div>
          <p class="sub">${gr.how}</p>
          <ul>${gr.members
            .map(
              (m) =>
                `<li><span class="dot ${gr.color === "terre" ? "terre" : ""}" style="${gr.color === "terre" ? "" : `background:${COLORS[gr.color].hex}`}"></span>${escapeHtml(m)}</li>`
            )
            .join("")}</ul>
        </article>`
      )
      .join("");

    $("tableau-box").innerHTML = plan.tableau.module
      ? plan.tableau.module
          .map(
            (t) => `<div class="terminal" data-group="${t.color}">
              <b>Borne ${t.mark}</b>
              <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
                <span class="dot" style="background:${COLORS[t.color].hex}"></span>
                <span>${escapeHtml(t.text)}</span>
              </div>
            </div>`
          )
          .join("")
      : plan.tableau.lines.map((l) => `<div class="terminal"><span>${escapeHtml(l)}</span></div>`).join("");

    $("tableau-steps-list").innerHTML = (plan.tableau.steps || [])
      .map((s) => `<li>${s.html}</li>`)
      .join("");

    $("appareils").innerHTML = plan.devices.map(deviceCard).join("");
    $("cables").innerHTML = plan.cables
      .map(
        (c, i) => `<div class="cable-item"><span class="num">${i + 1}.</span><div>
          <div><strong>${escapeHtml(c.label)}</strong> · ${escapeHtml(c.spec)}</div>
          <div class="cores">${c.cores
            .map((id) => {
              const col = COLORS[id];
              const bg = col.pattern
                ? "background:repeating-linear-gradient(45deg,#2f9e44 0 3px,#f2d400 3px 6px)"
                : `background:${col.hex}`;
              return `<span class="core" title="${col.name}" style="${bg}"></span>`;
            })
            .join("")}</div></div></div>`
      )
      .join("");
    $("materiel").innerHTML = plan.materiel
      .map((m, i) => `<div class="mat-item"><span class="num">${i + 1}.</span><span>${escapeHtml(m)}</span></div>`)
      .join("");

    $("poussoir-detail").innerHTML = svgPoussoirDetail(plan);
    $("poussoir-notes").innerHTML = poussoirNotesHtml(plan);
    $("poussoir-title").textContent =
      plan.schema.kind === "telerupteur"
        ? "Derrière le poussoir Schneider : où brancher les câbles"
        : "Dos poussoir Schneider (mode télérupteur)";
    $("poussoir-sub").innerHTML =
      plan.schema.kind === "telerupteur"
        ? "Mécanisme type Odace / Schneider. Les 2 fils viennent de l’araignée ; le télérupteur est dans le tableau <strong>RESI9</strong>."
        : "Disponible quand vous choisissez <strong>Télérupteur</strong> — vue arrière du mécanisme avec marron + violet.";

    bindHover();
  }

  function deviceCard(d) {
    const rows = groupTerminals(d);
    return `<article class="device">
      <h3>${escapeHtml(d.title)}</h3>
      <div class="kind">${escapeHtml(d.kind)}</div>
      <div class="mecanisme">${rows
        .map(
          (row) => `<div class="borne-row">${row
            .map((t) => {
              const c = COLORS[t[1]];
              return `<div class="borne">
                <div class="vis" style="box-shadow: inset 0 0 0 6px ${c.pattern ? "#2f9e44" : c.hex}"></div>
                <div class="mark">${t[0]}</div>
                <div>${escapeHtml(t[2])}</div>
              </div>`;
            })
            .join("")}</div>`
        )
        .join("")}</div>
    </article>`;
  }

  function groupTerminals(d) {
    if (d.layout === "vv") return [[d.terminals[1], d.terminals[2]], [d.terminals[0]]];
    if (d.layout === "perm") return [d.terminals.slice(0, 2), d.terminals.slice(2)];
    return [d.terminals];
  }

  let activeGroup = null;

  function setHighlight(groupId) {
    activeGroup = groupId;
    document.querySelectorAll(".wire, .box-wago").forEach((w) => {
      const on = !groupId || w.getAttribute("data-group") === groupId;
      w.classList.toggle("hl-off", !on);
    });
    document.querySelectorAll(".wago, .chip, .tableau-box .terminal[data-group]").forEach((el) => {
      el.classList.toggle("active", !!groupId && el.getAttribute("data-group") === groupId);
    });
  }

  function bindHover() {
    const tip = $("tooltip");
    document
      .querySelectorAll("#corridor .wire, #box-detail .wire, #box-detail .box-wago, #schema .wire, #tableau-detail .wire, #poussoir-detail .wire")
      .forEach((w) => {
        w.addEventListener("pointerenter", (e) => {
          const id = w.getAttribute("data-group");
          setHighlight(id);
          const c = COLORS[id];
          if (!c) return;
          tip.hidden = false;
          tip.textContent = `${c.name} — ${c.role}`;
          moveTip(e);
        });
        w.addEventListener("pointermove", moveTip);
        w.addEventListener("pointerleave", () => {
          tip.hidden = true;
          setHighlight(null);
        });
        w.addEventListener("click", () => {
          const id = w.getAttribute("data-group");
          setHighlight(activeGroup === id ? null : id);
        });
      });
    document.querySelectorAll(".wago, .chip, .tableau-box .terminal[data-group]").forEach((el) => {
      el.addEventListener("pointerenter", () => setHighlight(el.getAttribute("data-group")));
      el.addEventListener("pointerleave", () => setHighlight(null));
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-group");
        setHighlight(activeGroup === id ? null : id);
      });
    });
  }

  function moveTip(e) {
    const wrap = $("schema-wrap");
    const r = wrap.getBoundingClientRect();
    const tip = $("tooltip");
    tip.style.left = `${e.clientX - r.left + wrap.scrollLeft + 12}px`;
    tip.style.top = `${e.clientY - r.top + 12}px`;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function current() {
    return createPlan(
      document.querySelector("input[name=type]:checked").value,
      document.querySelector("input[name=points]:checked").value,
      document.querySelector("input[name=lights]:checked").value
    );
  }

  function init() {
    document.querySelectorAll("input[name=type], input[name=points], input[name=lights]").forEach((el) => {
      el.addEventListener("change", () => render(current()));
    });
    $("btn-print").addEventListener("click", () => window.print());
    render(current());
  }

  init();
})();
