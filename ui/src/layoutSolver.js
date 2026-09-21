const BASE_FILL_OPTIONS = [1200, 1000, 900, 800, 600, 500, 450, 400, 300, 200, 150];
const WALL_FILL_OPTIONS = [1200, 1000, 900, 800, 600, 500, 450, 400, 300, 200];
const TALL_FILL_OPTIONS = [900, 600, 500, 450, 400, 300];

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sum(numbers = []) {
  return numbers.reduce((a, b) => a + b, 0);
}

function clampFillerPair(remaining) {
  if (remaining < 0) return null;
  if (remaining === 0) return { left: 0, right: 0 };

  for (let left = 0; left <= 150; left += 10) {
    const right = remaining - left;
    if (right >= 0 && right <= 150) {
      return { left, right };
    }
  }

  return null;
}

function getFillOptions(mode) {
  if (mode === "base") return BASE_FILL_OPTIONS;
  if (mode === "wall") return WALL_FILL_OPTIONS;
  return TALL_FILL_OPTIONS;
}

function mapWidthsToCabinetKeys(widths, mode) {
  if (mode === "base") return widths.map((w) => `BASE${w}`);
  if (mode === "wall") return widths.map((w) => `WALL${w}`);
  return widths.map((w) => `TALL${w}`);
}

function groupRows(keys) {
  const map = new Map();

  for (const key of keys) {
    map.set(key, (map.get(key) || 0) + 1);
  }

  return Array.from(map.entries()).map(([cabinetKey, qty]) => ({
    cabinetKey,
    qty,
  }));
}

function getRepeatPenalty(widths) {
  const counts = new Map();
  for (const w of widths) {
    counts.set(w, (counts.get(w) || 0) + 1);
  }

  let penalty = 0;
  for (const count of counts.values()) {
    if (count > 2) penalty += (count - 2) * (count - 1);
  }
  return penalty;
}

function getVarietyBonus(widths) {
  if (widths.length <= 1) return 0;

  const distinct = new Set(widths).size;
  const hasCoreSizes = widths.some((w) => w === 900 || w === 800 || w === 600);

  return distinct * 14 + (hasCoreSizes ? 10 : 0);
}

function getSymmetryBonus(widths) {
  if (widths.length < 2) return 0;

  let bonus = 0;

  if (widths.length >= 2 && widths[0] === widths[1]) bonus += 1;
  if (widths.length >= 3 && widths[0] === widths[2]) bonus += 1;
  if (widths.length >= 4 && widths[0] === widths[1] && widths[2] === widths[3]) bonus += 1;

  return bonus;
}

function getPreferredPairBonus(widths) {
  const counts = new Map();
  for (const w of widths) {
    counts.set(w, (counts.get(w) || 0) + 1);
  }

  let bonus = 0;
  for (const [width, count] of counts.entries()) {
    if ((width === 900 || width === 800 || width === 600) && count >= 2) {
      bonus += 1;
    }
  }

  return bonus;
}

function getLogicalOrderBonus(widths) {
  if (widths.length <= 1) return 1;

  let desc = true;
  for (let i = 1; i < widths.length; i += 1) {
    if (widths[i] > widths[i - 1]) {
      desc = false;
      break;
    }
  }

  return desc ? 1 : 0;
}

function scoreCombo(widths, target, fillerTotal) {
  const used = sum(widths);
  const remainder = target - used;

  const bigUnits = widths.filter((w) => w >= 800).length;
  const smallUnits = widths.filter((w) => w <= 300).length;
  const repeatedSamePenalty = getRepeatPenalty(widths);
  const varietyBonus = getVarietyBonus(widths);
  const symmetryBonus = getSymmetryBonus(widths);
  const pairBonus = getPreferredPairBonus(widths);
  const logicalDescendingBonus = getLogicalOrderBonus(widths);

  return (
    bigUnits * 40 +
    pairBonus * 20 +
    symmetryBonus * 25 +
    varietyBonus +
    logicalDescendingBonus * 15 -
    smallUnits * 18 -
    repeatedSamePenalty * 10 -
    fillerTotal * 0.2 -
    Math.abs(remainder) * 5
  );
}

function searchBestMix(target, options, maxItems = 6) {
  let best = null;

  function consider(widths) {
    const used = sum(widths);
    const remaining = target - used;
    const fillers = clampFillerPair(remaining);

    if (!fillers) return;

    const fillerTotal = fillers.left + fillers.right;
    const sortedWidths = [...widths].sort((a, b) => b - a);
    const score = scoreCombo(sortedWidths, target, fillerTotal);

    const candidate = {
      widths: sortedWidths,
      leftFiller: fillers.left,
      rightFiller: fillers.right,
      used,
      remaining,
      fillerTotal,
      score,
    };

    if (!best) {
      best = candidate;
      return;
    }

    if (candidate.score > best.score) {
      best = candidate;
      return;
    }

    if (candidate.score === best.score) {
      if (candidate.fillerTotal < best.fillerTotal) {
        best = candidate;
        return;
      }

      if (
        candidate.fillerTotal === best.fillerTotal &&
        candidate.widths.length < best.widths.length
      ) {
        best = candidate;
      }
    }
  }

  function walk(startIndex, widths, used) {
    if (used > target) return;
    consider(widths);

    if (widths.length >= maxItems) return;

    for (let i = startIndex; i < options.length; i += 1) {
      const width = options[i];
      walk(i, [...widths, width], used + width);
    }
  }

  walk(0, [], 0);
  return best;
}

function buildSpecials(config) {
  const result = {
    widthUsed: 0,
    base: [],
    wall: [],
    tall: [],
  };

  if (config.mode === "base") {
    if (config.allowCorner) {
      result.base.push("CORNERBASE900");
      result.widthUsed += 900;
    }

    if (config.includeSink) {
      const sinkWidth = config.sinkWidth || 900;
      result.base.push(`SINK${sinkWidth}`);
      result.widthUsed += sinkWidth;
    }

    if (config.includeOven) {
      result.base.push("OVEN600");
      result.widthUsed += 600;
    }
  }

  if (config.mode === "wall") {
    if (config.allowCorner) {
      result.wall.push("CORNERWALL600");
      result.widthUsed += 600;
    }

    if (config.includeExtractor) {
      const extractorWidth = config.extractorWidth || 600;
      result.wall.push(`EXTRACTOR${extractorWidth}`);
      result.widthUsed += extractorWidth;
    }
  }

  if (config.mode === "tall") {
    if (config.includeFridge) {
      const fridgeNominal = config.fridgeWidth || 600;
      result.tall.push(`FRIDGE${fridgeNominal}`);
      result.widthUsed += fridgeNominal + 40;
    }

    if (config.includeTallOven) {
      result.tall.push("TALLOWEN600");
      result.widthUsed += 600;
    }
  }

  return result;
}

function arrangeBaseSequence(fillKeys, specials, config) {
  const fillers = [...fillKeys].sort((a, b) => {
    const aW = Number(a.replace("BASE", "")) || 0;
    const bW = Number(b.replace("BASE", "")) || 0;
    return bW - aW;
  });

  const sequence = [];

  if (config.allowCorner && specials.includes("CORNERBASE900")) {
    sequence.push("CORNERBASE900");
  }

  const nonCornerSpecials = specials.filter((key) => key !== "CORNERBASE900");

  const sinkKey = nonCornerSpecials.find((key) => key.startsWith("SINK"));
  const ovenKey = nonCornerSpecials.find((key) => key === "OVEN600");

  if (sinkKey && fillers.length >= 2) {
    const left = [];
    const right = [...fillers];

    while (right.length - left.length > 1) {
      left.push(right.shift());
    }

    sequence.push(...left);

    if (ovenKey) {
      sequence.push(ovenKey);
    }

    sequence.push(sinkKey);
    sequence.push(...right);
    return sequence;
  }

  if (ovenKey) {
    sequence.push(ovenKey);
  }

  if (sinkKey) {
    sequence.push(sinkKey);
  }

  sequence.push(...fillers);
  return sequence;
}

function arrangeWallSequence(fillKeys, specials) {
  const fillers = [...fillKeys].sort((a, b) => {
    const aW = Number(a.replace("WALL", "")) || 0;
    const bW = Number(b.replace("WALL", "")) || 0;
    return bW - aW;
  });

  const sequence = [];

  if (specials.includes("CORNERWALL600")) {
    sequence.push("CORNERWALL600");
  }

  const extractorKey = specials.find((key) => key.startsWith("EXTRACTOR"));

  if (extractorKey && fillers.length >= 2) {
    const left = [];
    const right = [...fillers];

    while (right.length - left.length > 1) {
      left.push(right.shift());
    }

    sequence.push(...left);
    sequence.push(extractorKey);
    sequence.push(...right);
    return sequence;
  }

  if (extractorKey) {
    sequence.push(extractorKey);
  }

  sequence.push(...fillers);
  return sequence;
}

function arrangeTallSequence(fillKeys, specials) {
  const fillers = [...fillKeys].sort((a, b) => {
    const aW = Number(a.replace("TALL", "")) || 0;
    const bW = Number(b.replace("TALL", "")) || 0;
    return bW - aW;
  });

  const fridgeKey = specials.find((key) => key.startsWith("FRIDGE"));
  const tallOvenKey = specials.find((key) => key === "TALLOWEN600");

  const sequence = [];

  if (fridgeKey) {
    sequence.push(fridgeKey);
  }

  if (tallOvenKey) {
    sequence.push(tallOvenKey);
  }

  sequence.push(...fillers);
  return sequence;
}

function arrangeSequence(mode, fillKeys, specialGroups, config) {
  if (mode === "base") {
    return arrangeBaseSequence(fillKeys, specialGroups.base, config);
  }

  if (mode === "wall") {
    return arrangeWallSequence(fillKeys, specialGroups.wall);
  }

  return arrangeTallSequence(fillKeys, specialGroups.tall);
}

export function solveLayout(input) {
  const mode = input.mode || "base";
  const runWidth = toNumber(input.runWidth);

  if (!runWidth || runWidth <= 0) {
    return {
      ok: false,
      message: "Enter a valid run width.",
      rows: [],
      leftFiller: 0,
      rightFiller: 0,
      totalWidth: 0,
      leftover: runWidth,
      sequence: [],
    };
  }

  const specialGroups = buildSpecials(input);
  const usedWidth = specialGroups.widthUsed;

  if (usedWidth > runWidth) {
    return {
      ok: false,
      message: "Special units exceed the available run width.",
      rows: [],
      leftFiller: 0,
      rightFiller: 0,
      totalWidth: usedWidth,
      leftover: runWidth - usedWidth,
      sequence: [],
    };
  }

  const remainingAfterSpecials = runWidth - usedWidth;
  const fillOptions = getFillOptions(mode);
  const bestMix = searchBestMix(remainingAfterSpecials, fillOptions, 6);

  if (!bestMix) {
    return {
      ok: false,
      message: "No valid layout found within the 150mm filler limit.",
      rows: [],
      leftFiller: 0,
      rightFiller: 0,
      totalWidth: usedWidth,
      leftover: runWidth - usedWidth,
      sequence: [],
    };
  }

  const fillKeys = mapWidthsToCabinetKeys(bestMix.widths, mode);
  const sequence = arrangeSequence(mode, fillKeys, specialGroups, input);
  const rows = groupRows(sequence);

  return {
    ok: true,
    message: "Logical designer layout generated.",
    rows,
    leftFiller: bestMix.leftFiller,
    rightFiller: bestMix.rightFiller,
    totalWidth: usedWidth + bestMix.used + bestMix.fillerTotal,
    leftover: runWidth - (usedWidth + bestMix.used + bestMix.fillerTotal),
    sequence,
  };
}