export const cabinetLibrary = {
  BASE150: { label: "Base 150 Spice", type: "base", width: 150, height: 720, depth: 570, doors: 1, shelves: 0, drawers: 0 },
  BASE200: { label: "Base 200", type: "base", width: 200, height: 720, depth: 570, doors: 1, shelves: 1, drawers: 0 },
  BASE300: { label: "Base 300", type: "base", width: 300, height: 720, depth: 570, doors: 1, shelves: 1, drawers: 0 },
  BASE400: { label: "Base 400", type: "base", width: 400, height: 720, depth: 570, doors: 1, shelves: 1, drawers: 0 },
  BASE450: { label: "Base 450", type: "base", width: 450, height: 720, depth: 570, doors: 1, shelves: 1, drawers: 0 },
  BASE500: { label: "Base 500", type: "base", width: 500, height: 720, depth: 570, doors: 1, shelves: 1, drawers: 0 },
  BASE600: { label: "Base 600", type: "base", width: 600, height: 720, depth: 570, doors: 2, shelves: 1, drawers: 0 },
  BASE800: { label: "Base 800", type: "base", width: 800, height: 720, depth: 570, doors: 2, shelves: 1, drawers: 0 },
  BASE900: { label: "Base 900", type: "base", width: 900, height: 720, depth: 570, doors: 2, shelves: 1, drawers: 0 },
  BASE1000: { label: "Base 1000", type: "base", width: 1000, height: 720, depth: 570, doors: 2, shelves: 1, drawers: 0 },
  BASE1200: { label: "Base 1200", type: "base", width: 1200, height: 720, depth: 570, doors: 2, shelves: 1, drawers: 0 },

  WALL200: { label: "Wall 200", type: "wall", width: 200, height: 720, depth: 300, doors: 1, shelves: 1, drawers: 0 },
  WALL300: { label: "Wall 300", type: "wall", width: 300, height: 720, depth: 300, doors: 1, shelves: 1, drawers: 0 },
  WALL400: { label: "Wall 400", type: "wall", width: 400, height: 720, depth: 300, doors: 1, shelves: 1, drawers: 0 },
  WALL450: { label: "Wall 450", type: "wall", width: 450, height: 720, depth: 300, doors: 1, shelves: 1, drawers: 0 },
  WALL500: { label: "Wall 500", type: "wall", width: 500, height: 720, depth: 300, doors: 1, shelves: 1, drawers: 0 },
  WALL600: { label: "Wall 600", type: "wall", width: 600, height: 720, depth: 300, doors: 2, shelves: 1, drawers: 0 },
  WALL800: { label: "Wall 800", type: "wall", width: 800, height: 720, depth: 300, doors: 2, shelves: 1, drawers: 0 },
  WALL900: { label: "Wall 900", type: "wall", width: 900, height: 720, depth: 300, doors: 2, shelves: 1, drawers: 0 },
  WALL1000: { label: "Wall 1000", type: "wall", width: 1000, height: 720, depth: 300, doors: 2, shelves: 1, drawers: 0 },
  WALL1200: { label: "Wall 1200", type: "wall", width: 1200, height: 720, depth: 300, doors: 2, shelves: 1, drawers: 0 },

  TALL300: { label: "Tall 300", type: "tall", width: 300, height: 2100, depth: 570, doors: 1, shelves: 4, drawers: 0 },
  TALL400: { label: "Tall 400", type: "tall", width: 400, height: 2100, depth: 570, doors: 1, shelves: 4, drawers: 0 },
  TALL450: { label: "Tall 450", type: "tall", width: 450, height: 2100, depth: 570, doors: 1, shelves: 4, drawers: 0 },
  TALL500: { label: "Tall 500", type: "tall", width: 500, height: 2100, depth: 570, doors: 1, shelves: 4, drawers: 0 },
  TALL600: { label: "Tall 600", type: "tall", width: 600, height: 2100, depth: 570, doors: 2, shelves: 4, drawers: 0 },
  TALL900: { label: "Tall 900", type: "tall", width: 900, height: 2100, depth: 570, doors: 2, shelves: 4, drawers: 0 },

  SINK800: { label: "Sink 800", type: "base", width: 800, height: 720, depth: 570, doors: 2, shelves: 0, drawers: 0, special: "sink" },
  SINK900: { label: "Sink 900", type: "base", width: 900, height: 720, depth: 570, doors: 2, shelves: 0, drawers: 0, special: "sink" },

  OVEN600: { label: "Oven Base 600", type: "base", width: 600, height: 720, depth: 570, doors: 0, shelves: 0, drawers: 1, special: "oven" },
  TALLOWEN600: { label: "Tall Oven 600", type: "tall", width: 600, height: 2100, depth: 570, doors: 2, shelves: 2, drawers: 0, special: "oven_tall" },

  EXTRACTOR600: { label: "Extractor Space 600", type: "wall", width: 600, height: 720, depth: 300, doors: 0, shelves: 0, drawers: 0, special: "extractor" },
  EXTRACTOR900: { label: "Extractor Space 900", type: "wall", width: 900, height: 720, depth: 300, doors: 0, shelves: 0, drawers: 0, special: "extractor" },

  FRIDGE600: { label: "Fridge Housing 600 (+40)", type: "tall", width: 640, nominalWidth: 600, height: 2100, depth: 600, doors: 0, shelves: 1, drawers: 0, special: "fridge" },
  FRIDGE900: { label: "Fridge Housing 900 (+40)", type: "tall", width: 940, nominalWidth: 900, height: 2100, depth: 600, doors: 0, shelves: 1, drawers: 0, special: "fridge" },

  CORNERBASE900: {
    label: "Corner Base 900 x 900",
    type: "base",
    width: 900,
    height: 720,
    depth: 900,
    doors: 1,
    shelves: 1,
    drawers: 0,
    special: "corner_base",
    corner: {
      sizeA: 900,
      sizeB: 900,
      backCut: 443,
      internalA: 881,
      internalB: 881,
      note: "Mitred, 2 long sides",
    },
  },

  CORNERWALL600: {
    label: "Corner Wall 600 x 600",
    type: "wall",
    width: 600,
    height: 720,
    depth: 600,
    doors: 1,
    shelves: 1,
    drawers: 0,
    special: "corner_wall",
    corner: {
      sizeA: 600,
      sizeB: 600,
      backCut: 177,
      note: "Corner wall rule applies",
    },
  },

  DRAWER600_3: { label: "Drawer Base 600 (3 Drawer)", type: "base", width: 600, height: 720, depth: 570, doors: 0, shelves: 0, drawers: 3 },
  DRAWER800_3: { label: "Drawer Base 800 (3 Drawer)", type: "base", width: 800, height: 720, depth: 570, doors: 0, shelves: 0, drawers: 3 },
  DRAWER900_3: { label: "Drawer Base 900 (3 Drawer)", type: "base", width: 900, height: 720, depth: 570, doors: 0, shelves: 0, drawers: 3 },
};

const BOARD_THICKNESS = 16;
const BACK_THICKNESS = 3;
const DOOR_GAP = 2;

function mm2ToM2(value) {
  return value / 1000000;
}

function mmToM(value) {
  return value / 1000;
}

function area(height, width, qty = 1) {
  return mm2ToM2(height * width) * qty;
}

function edgingLengthMm(edges = []) {
  return edges.reduce((sum, edge) => sum + edge, 0);
}

function pushPart(parts, {
  part,
  cabinet,
  material,
  height,
  width,
  qty = 1,
  edging = [],
  grain = "None",
}) {
  parts.push({
    part,
    cabinet,
    material,
    height,
    width,
    qty,
    edging_mm: edgingLengthMm(edging) * qty,
    grain,
  });
}

function buildCornerBaseParts(cabinetKey, spec, qty) {
  const parts = [];
  const h = spec.height;
  const d = spec.depth;
  const backCut = spec.corner.backCut;

  pushPart(parts, {
    part: "Corner Side",
    cabinet: cabinetKey,
    material: "16mm board",
    height: h,
    width: d,
    qty: 2 * qty,
    edging: [h, d],
    grain: "Height",
  });

  pushPart(parts, {
    part: "Corner Top",
    cabinet: cabinetKey,
    material: "16mm board",
    height: d - backCut,
    width: d - backCut,
    qty,
    edging: [d - backCut, d - backCut],
    grain: "Width",
  });

  pushPart(parts, {
    part: "Corner Bottom",
    cabinet: cabinetKey,
    material: "16mm board",
    height: d - backCut,
    width: d - backCut,
    qty,
    edging: [d - backCut, d - backCut],
    grain: "Width",
  });

  pushPart(parts, {
    part: "Corner Back",
    cabinet: cabinetKey,
    material: "3mm hardboard",
    height: h,
    width: backCut,
    qty: 2 * qty,
  });

  if ((spec.shelves || 0) > 0) {
    pushPart(parts, {
      part: "Corner Shelf",
      cabinet: cabinetKey,
      material: "16mm board",
      height: spec.corner.internalA,
      width: spec.corner.internalB,
      qty: spec.shelves * qty,
      edging: [spec.corner.internalA, spec.corner.internalB],
      grain: "Width",
    });
  }

  return parts;
}

function buildCornerWallParts(cabinetKey, spec, qty) {
  const parts = [];
  const h = spec.height;
  const d = spec.depth;
  const backCut = spec.corner.backCut;

  pushPart(parts, {
    part: "Corner Side",
    cabinet: cabinetKey,
    material: "16mm board",
    height: h,
    width: d,
    qty: 2 * qty,
    edging: [h, d],
    grain: "Height",
  });

  pushPart(parts, {
    part: "Corner Top",
    cabinet: cabinetKey,
    material: "16mm board",
    height: d - backCut,
    width: d - backCut,
    qty,
    edging: [d - backCut],
    grain: "Width",
  });

  pushPart(parts, {
    part: "Corner Bottom",
    cabinet: cabinetKey,
    material: "16mm board",
    height: d - backCut,
    width: d - backCut,
    qty,
    edging: [d - backCut],
    grain: "Width",
  });

  pushPart(parts, {
    part: "Corner Back",
    cabinet: cabinetKey,
    material: "3mm hardboard",
    height: h,
    width: backCut,
    qty: 2 * qty,
  });

  if ((spec.shelves || 0) > 0) {
    pushPart(parts, {
      part: "Corner Shelf",
      cabinet: cabinetKey,
      material: "16mm board",
      height: d - backCut - 16,
      width: d - backCut - 16,
      qty: spec.shelves * qty,
      edging: [d - backCut - 16],
      grain: "Width",
    });
  }

  return parts;
}

function buildCabinetParts(cabinetKey, spec, qty) {
  if (spec.special === "corner_base") {
    return buildCornerBaseParts(cabinetKey, spec, qty);
  }

  if (spec.special === "corner_wall") {
    return buildCornerWallParts(cabinetKey, spec, qty);
  }

  const parts = [];
  const cabinetHeight = spec.height;
  const cabinetWidth = spec.width;
  const cabinetDepth = spec.depth;

  const internalWidth = cabinetWidth - BOARD_THICKNESS * 2;
  const internalDepth = cabinetDepth - BACK_THICKNESS;
  const doubleDoor = spec.doors === 2;
  const singleDoor = spec.doors === 1;
  const isWall = spec.type === "wall";

  pushPart(parts, {
    part: "Side",
    cabinet: cabinetKey,
    material: "16mm board",
    height: cabinetHeight,
    width: cabinetDepth,
    qty: 2 * qty,
    edging: [cabinetHeight, cabinetDepth],
    grain: "Height",
  });

  pushPart(parts, {
    part: isWall ? "Top" : "Bottom",
    cabinet: cabinetKey,
    material: "16mm board",
    height: internalWidth,
    width: cabinetDepth,
    qty,
    edging: [internalWidth],
    grain: "Width",
  });

  pushPart(parts, {
    part: isWall ? "Bottom" : "Top",
    cabinet: cabinetKey,
    material: "16mm board",
    height: internalWidth,
    width: cabinetDepth,
    qty,
    edging: [internalWidth],
    grain: "Width",
  });

  if ((spec.shelves || 0) > 0) {
    pushPart(parts, {
      part: "Shelf",
      cabinet: cabinetKey,
      material: "16mm board",
      height: internalWidth,
      width: internalDepth - 20,
      qty: spec.shelves * qty,
      edging: [internalWidth],
      grain: "Width",
    });
  }

  pushPart(parts, {
    part: "Back",
    cabinet: cabinetKey,
    material: "3mm hardboard",
    height: cabinetHeight,
    width: cabinetWidth,
    qty,
  });

  if (singleDoor) {
    pushPart(parts, {
      part: "Door",
      cabinet: cabinetKey,
      material: "16mm board",
      height: cabinetHeight - DOOR_GAP * 2,
      width: cabinetWidth - DOOR_GAP * 2,
      qty,
      edging: [
        cabinetHeight - DOOR_GAP * 2,
        cabinetHeight - DOOR_GAP * 2,
        cabinetWidth - DOOR_GAP * 2,
        cabinetWidth - DOOR_GAP * 2,
      ],
      grain: "Height",
    });
  }

  if (doubleDoor) {
    const doorWidth = Math.floor((cabinetWidth - 3 * DOOR_GAP) / 2);

    pushPart(parts, {
      part: "Door",
      cabinet: cabinetKey,
      material: "16mm board",
      height: cabinetHeight - DOOR_GAP * 2,
      width: doorWidth,
      qty: 2 * qty,
      edging: [
        cabinetHeight - DOOR_GAP * 2,
        cabinetHeight - DOOR_GAP * 2,
        doorWidth,
        doorWidth,
      ],
      grain: "Height",
    });
  }

  if ((spec.drawers || 0) > 0) {
    const frontGapTotal = (spec.drawers + 1) * DOOR_GAP;
    const usableHeight = cabinetHeight - frontGapTotal;
    const frontHeight = Math.floor(usableHeight / spec.drawers);
    const frontWidth = cabinetWidth - DOOR_GAP * 2;

    pushPart(parts, {
      part: "Drawer Front",
      cabinet: cabinetKey,
      material: "16mm board",
      height: frontHeight,
      width: frontWidth,
      qty: spec.drawers * qty,
      edging: [frontHeight, frontHeight, frontWidth, frontWidth],
      grain: "Height",
    });
  }

  return parts.filter((item) => item.qty > 0);
}

export function calculateCabinet(cabinetKey, qty = 1) {
  const spec = cabinetLibrary[cabinetKey];

  if (!spec) {
    return {
      cabinetKey,
      label: "Unknown cabinet",
      qty,
      totalBoardArea: 0,
      totalBackArea: 0,
      totalFrontArea: 0,
      totalEdging: 0,
      cuttingList: [],
      hardware: [],
    };
  }

  const cuttingList = buildCabinetParts(cabinetKey, spec, qty);

  let totalBoardArea = 0;
  let totalBackArea = 0;
  let totalFrontArea = 0;
  let totalEdgingMm = 0;

  for (const item of cuttingList) {
    const partArea = area(item.height, item.width, item.qty);
    totalEdgingMm += item.edging_mm || 0;

    if (item.material === "3mm hardboard") {
      totalBackArea += partArea;
    } else if (
      item.part.toLowerCase().includes("door") ||
      item.part.toLowerCase().includes("front")
    ) {
      totalFrontArea += partArea;
      totalBoardArea += partArea;
    } else {
      totalBoardArea += partArea;
    }
  }

  const hardware = [];

  if (spec.doors === 1) {
    hardware.push({ part: "Hinge", qty: qty * 2 });
    hardware.push({ part: "Handle", qty: qty * 1 });
  }

  if (spec.doors === 2) {
    hardware.push({ part: "Hinge", qty: qty * 4 });
    hardware.push({ part: "Handle", qty: qty * 2 });
  }

  if ((spec.shelves || 0) > 0) {
    hardware.push({ part: "Shelf Pin", qty: qty * spec.shelves * 4 });
  }

  if (spec.type === "base") {
    hardware.push({ part: "Leg", qty: qty * 4 });
  }

  if ((spec.drawers || 0) > 0) {
    hardware.push({ part: "Runner Pair", qty: qty * spec.drawers });
    hardware.push({ part: "Handle", qty: qty * spec.drawers });
  }

  return {
    cabinetKey,
    label: spec.label,
    qty,
    width: spec.width,
    height: spec.height,
    depth: spec.depth,
    totalBoardArea,
    totalBackArea,
    totalFrontArea,
    totalEdging: mmToM(totalEdgingMm),
    cuttingList,
    hardware,
  };
}