import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createProject,
  createQuote,
  getProject,
  getRoomSpec,
  listProjectLayouts,
  listProjects,
  saveProjectLayout,
  saveRoomSpec,
} from "./api";
import CabinetScene3D, { PLAN_PIXELS_PER_MM } from "./CabinetScene3D";
import { calculateCabinet, cabinetLibrary } from "./cabinetCalculator";
import "./index.css";
import "./App.css";

const STEPS = [
  "START PROJECT",
  "ROOM / SPACE",
  "DESIGN",
  "ADD CUPBOARDS",
  "CONFIGURE",
  "ARRANGE",
  "FINISH DESIGN",
  "REVIEW",
  "PRICE",
  "QUOTE",
  "ORDER",
];

const DESIGN_TYPES = [
  "Kitchen",
  "Built-in cupboards",
  "Pantry",
  "Laundry",
  "TV unit",
  "Bedroom cupboards",
  "Custom",
];

const VIEWS = ["FLOOR LAYOUT", "FRONT ELEVATION", "3D VIEW", "LIST VIEW"];

const LIBRARY_CATEGORIES = [
  { key: "base", label: "Base Units" },
  { key: "wall", label: "Wall Units" },
  { key: "tall", label: "Tall Units" },
  { key: "corner", label: "Corner" },
  { key: "drawer", label: "Drawers" },
  { key: "special", label: "Special" },
];

const CUSTOMER_FLOW = ["DESIGN", "SUMMARY", "QUOTE", "ORDER"];
const ADMIN_FLOW = ["PROJECT", "PRODUCTION", "COSTING", "ORDER"];

const MATERIAL_PRESETS = {
  carcass: ["White", "Nata", "Folkstone", "Storm Grey"],
  doors: ["Melamine", "Painted", "Oak veneer", "Supermatte"],
  worktop: ["Granite", "Quartz", "Compact laminate", "Oak block"],
};

const APPLIANCE_LIBRARY = [
  "Fridge",
  "Oven",
  "Hob",
  "Extractor",
  "Microwave",
  "Dishwasher",
  "Washing machine",
  "Dryer",
  "Sink",
];

const VAT_RATE = 0.15;
const PX_PER_MM = PLAN_PIXELS_PER_MM;
const MIN_WIDTH_MM = 200;
const MIN_HEIGHT_MM = 300;
const STATE_NOTE_PREFIX = "STATE::";

const STYLE_TO_DESIGN_TYPE = {
  gallery: "Kitchen",
  parallel: "Kitchen",
  lshape: "Kitchen",
  ushape: "Kitchen",
};

function toRand(value) {
  return `R${Math.round(value).toLocaleString("en-ZA")}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getKitchenStyleKey(designType) {
  const value = String(designType || "").toLowerCase();
  if (value.includes("parallel")) return "parallel";
  if (value.includes("l shape") || value.includes("l-shape") || value.includes("lshape")) return "lshape";
  if (value.includes("u shape") || value.includes("u-shape") || value.includes("ushape")) return "ushape";
  return "gallery";
}

function makeProjectDraft() {
  return {
    projectName: "",
    customerName: "",
    customerContact: "",
    customerAddress: "",
    designType: "Kitchen",
    roomLength: "",
    roomWidth: "",
    roomHeight: "",
    measurementsLater: false,
  };
}

function defaultMaterials() {
  return {
    carcass: MATERIAL_PRESETS.carcass[0],
    doors: MATERIAL_PRESETS.doors[0],
    worktop: MATERIAL_PRESETS.worktop[0],
  };
}

function makeUnitFromKey(cabinetKey) {
  const spec = cabinetLibrary[cabinetKey];
  if (!spec) return null;

  return {
    id: `${cabinetKey}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    cabinetKey,
    x: 0,
    y: spec.type === "wall" ? 0 : spec.type === "tall" ? 20 : 120,
    width: Number(spec.width) || 600,
    height: Number(spec.height) || 720,
    depth: Number(spec.depth) || 570,
    doors: Number(spec.doors) || 0,
    drawers: Number(spec.drawers) || 0,
    shelves: Number(spec.shelves) || 0,
    frontType: spec.drawers > 0 ? "Drawers" : spec.doors > 0 ? "Doors" : "Open",
    materials: defaultMaterials(),
    hardwareOverrides: {
      hinges: null,
      runners: null,
      handles: null,
    },
  };
}

function classifyCabinet(cabinetKey) {
  const key = String(cabinetKey || "").toUpperCase();
  if (key.startsWith("CORNER")) return "corner";
  if (key.startsWith("DRAWER")) return "drawer";
  if (["SINK", "OVEN", "EXTRACTOR", "FRIDGE", "MICRO", "HOB"].some((token) => key.includes(token))) return "special";
  if (key.startsWith("BASE")) return "base";
  if (key.startsWith("WALL")) return "wall";
  if (key.startsWith("TALL")) return "tall";
  return "special";
}

function cabinetPreviewClass(type) {
  if (type === "wall") return "unit-preview wall";
  if (type === "tall") return "unit-preview tall";
  return "unit-preview base";
}

function finishClass(value) {
  return `finish-${String(value || "white").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function aggregateHardware(units) {
  const totals = new Map();
  for (const unit of units) {
    const result = calculateCabinet(unit.cabinetKey, 1);
    const list = Array.isArray(result.hardware) ? result.hardware : [];
    for (const item of list) {
      const key = item.part;
      totals.set(key, (totals.get(key) || 0) + (Number(item.qty) || 0));
    }
  }
  return Array.from(totals.entries()).map(([part, qty]) => ({ part, qty }));
}

function aggregateCutting(units) {
  const rows = [];
  for (const unit of units) {
    const result = calculateCabinet(unit.cabinetKey, 1);
    rows.push(...(Array.isArray(result.cuttingList) ? result.cuttingList : []));
  }
  return rows;
}

function applySmartRules(unit) {
  if (!unit) return unit;

  const next = { ...unit };
  if (next.width > 600 && next.frontType === "Doors") {
    next.doors = Math.max(2, next.doors || 0);
  }
  if (next.frontType === "Open") {
    next.doors = 0;
    next.drawers = 0;
  }
  return next;
}

function countByType(units) {
  return units.reduce(
    (acc, unit) => {
      const type = cabinetLibrary[unit.cabinetKey]?.type || "base";
      acc.total += 1;
      if (type === "wall") acc.wall += 1;
      else if (type === "tall") acc.tall += 1;
      else acc.base += 1;
      return acc;
    },
    { total: 0, wall: 0, base: 0, tall: 0 }
  );
}

export default function App() {
  const [appScreen, setAppScreen] = useState("HOME");
  const [mode, setMode] = useState("CUSTOMER");
  const [projectDraft, setProjectDraft] = useState(makeProjectDraft());
  const [projectId, setProjectId] = useState("");
  const [savedState, setSavedState] = useState("Saved ✓");
  const [units, setUnits] = useState([]);
  const [appliances, setAppliances] = useState([]);
  const [worktop, setWorktop] = useState({ type: "Standard worktop", cutouts: { sink: false, hob: false }, island: false, peninsula: false, waterfall: false });
  const [selectedId, setSelectedId] = useState("");
  const [activeLibraryCategory, setActiveLibraryCategory] = useState("base");
  const [activeView, setActiveView] = useState("FLOOR LAYOUT");
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [quoteResult, setQuoteResult] = useState(null);
  const [busyQuote, setBusyQuote] = useState(false);
  const [error, setError] = useState("");
  const interactionRef = useRef(null);
  const saveTimerRef = useRef(null);
  const isHydratingRef = useRef(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [productionPack, setProductionPack] = useState(null);

  const selectedUnit = units.find((unit) => unit.id === selectedId) || null;

  const roomWidth = Number(projectDraft.roomLength) || 0;
  const roomDepth = Number(projectDraft.roomWidth) || 0;
  const roomHeight = Number(projectDraft.roomHeight) || 0;
  const sortedUnits = useMemo(
    () => [...units]
      .sort((a, b) => (Number(a.y || 0) - Number(b.y || 0)) || (Number(a.x || 0) - Number(b.x || 0)))
      .map((unit) => ({ ...unit, spec: cabinetLibrary[unit.cabinetKey] || {} })),
    [units]
  );

  const cuttingRows = useMemo(() => aggregateCutting(units), [units]);
  const hardwareRows = useMemo(() => aggregateHardware(units), [units]);
  const counts = useMemo(() => countByType(units), [units]);

  const estimatedMaterial = useMemo(() => {
    const totalBoardM2 = units.reduce((sum, unit) => sum + (calculateCabinet(unit.cabinetKey, 1).totalBoardArea || 0), 0);
    return totalBoardM2 * 650;
  }, [units]);

  const estimatedHardware = useMemo(() => {
    return hardwareRows.reduce((sum, row) => sum + (Number(row.qty) || 0) * 18, 0);
  }, [hardwareRows]);

  const estimatedWorktop = useMemo(() => {
    const linear = Math.max(2, units.reduce((sum, u) => sum + (Number(u.width) || 0), 0) / 1000);
    const base = linear * 1800;
    return base + (worktop.island ? 6500 : 0) + (worktop.peninsula ? 4200 : 0) + (worktop.waterfall ? 2400 : 0);
  }, [units, worktop]);

  const subtotal = estimatedMaterial + estimatedHardware + estimatedWorktop;
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;

  const cabinetSchedule = useMemo(() => {
    return units.map((unit, index) => {
      const spec = cabinetLibrary[unit.cabinetKey] || {};
      return {
        id: `C${String(index + 1).padStart(2, "0")}`,
        label: spec.label || unit.cabinetKey,
        type: spec.type || "base",
        width: unit.width,
        height: unit.height,
        depth: unit.depth,
        frontType: unit.frontType,
        doors: unit.doors,
        drawers: unit.drawers,
        shelves: unit.shelves,
      };
    });
  }, [units]);

  const doorSchedule = useMemo(() => {
    return units
      .filter((unit) => unit.frontType === "Doors" && Number(unit.doors) > 0)
      .map((unit, index) => {
        const doorCount = Math.max(1, Number(unit.doors) || 1);
        const usableWidth = Math.max(0, Number(unit.width) - (doorCount + 1) * 2);
        const oneDoorWidth = doorCount > 1 ? Math.floor(usableWidth / doorCount) : usableWidth;
        const oneDoorHeight = Math.max(0, Number(unit.height) - 4);
        return {
          id: `D${String(index + 1).padStart(2, "0")}`,
          cabinetKey: unit.cabinetKey,
          qty: doorCount,
          width: oneDoorWidth,
          height: oneDoorHeight,
          finish: unit.materials?.doors || "Melamine",
        };
      });
  }, [units]);

  const drawerSchedule = useMemo(() => {
    return units
      .filter((unit) => Number(unit.drawers) > 0)
      .map((unit, index) => {
        const fronts = Math.max(1, Number(unit.drawers) || 1);
        const totalGap = (fronts + 1) * 2;
        const faceHeight = Math.floor(Math.max(0, Number(unit.height) - totalGap) / fronts);
        const faceWidth = Math.max(0, Number(unit.width) - 4);
        return {
          id: `DR${String(index + 1).padStart(2, "0")}`,
          cabinetKey: unit.cabinetKey,
          qty: fronts,
          width: faceWidth,
          height: faceHeight,
          runnerPairs: fronts,
        };
      });
  }, [units]);

  const panelSchedule = useMemo(() => {
    const map = new Map();
    for (const row of cuttingRows) {
      const key = [row.part, row.material, row.height, row.width].join("|");
      if (!map.has(key)) {
        map.set(key, {
          part: row.part,
          material: row.material,
          height: row.height,
          width: row.width,
          qty: Number(row.qty) || 0,
        });
      } else {
        map.get(key).qty += Number(row.qty) || 0;
      }
    }
    return Array.from(map.values()).sort((a, b) => String(a.part).localeCompare(String(b.part)));
  }, [cuttingRows]);

  const boardRequirements = useMemo(() => {
    const map = new Map();
    for (const row of cuttingRows) {
      const material = String(row.material || "16mm board");
      const areaM2 = ((Number(row.height) || 0) * (Number(row.width) || 0) * (Number(row.qty) || 0)) / 1000000;
      map.set(material, (map.get(material) || 0) + areaM2);
    }
    return Array.from(map.entries()).map(([material, areaM2]) => ({
      material,
      areaM2,
      boardCountEstimate: Math.ceil(areaM2 / 5.03),
    }));
  }, [cuttingRows]);

  const edgingRequirements = useMemo(() => {
    const map = new Map();
    for (const row of cuttingRows) {
      const material = String(row.material || "16mm board");
      const edgingMmTotal = (Number(row.edging_mm) || 0) * (Number(row.qty) || 0);
      map.set(material, (map.get(material) || 0) + edgingMmTotal);
    }
    return Array.from(map.entries()).map(([material, edgingMm]) => ({
      material,
      edgingM: edgingMm / 1000,
    }));
  }, [cuttingRows]);

  const libraryItems = useMemo(() => {
    return Object.entries(cabinetLibrary)
      .map(([key, spec]) => ({ key, spec, category: classifyCabinet(key) }))
      .filter((row) => row.category === activeLibraryCategory)
      .sort((a, b) => (a.spec.width || 0) - (b.spec.width || 0));
  }, [activeLibraryCategory]);

  const snapshotState = useMemo(() => ({
    units,
    appliances,
    worktop,
    projectDraft,
    activeLibraryCategory,
    activeView,
  }), [units, appliances, worktop, projectDraft, activeLibraryCategory, activeView]);

  const productionPackStats = useMemo(() => ({
    cabinetCount: cabinetSchedule.length,
    doorCount: doorSchedule.reduce((sum, row) => sum + (Number(row.qty) || 0), 0),
    drawerFrontCount: drawerSchedule.reduce((sum, row) => sum + (Number(row.qty) || 0), 0),
    panelLineCount: panelSchedule.length,
    boardMaterialCount: boardRequirements.length,
    edgingMaterialCount: edgingRequirements.length,
  }), [cabinetSchedule, doorSchedule, drawerSchedule, panelSchedule, boardRequirements, edgingRequirements]);

  function mutateUnits(nextUnits) {
    setHistory((prev) => [...prev, units]);
    setFuture([]);
    setUnits(nextUnits);
    setSavedState("Saving...");
  }

  function generateProductionPack() {
    const pack = {
      generatedAt: new Date().toISOString(),
      project: {
        id: projectId || "-",
        name: projectDraft.projectName || "Untitled Design",
        customer: projectDraft.customerName || "-",
        contact: projectDraft.customerContact || "-",
        designType: projectDraft.designType || "Kitchen",
        room: {
          width: roomWidth,
          depth: roomDepth,
          height: roomHeight,
        },
      },
      stats: productionPackStats,
      cabinetSchedule,
      doorSchedule,
      drawerSchedule,
      panelSchedule,
      hardwareRows,
      boardRequirements,
      edgingRequirements,
    };

    setProductionPack(pack);
  }

  async function refreshProjectOptions() {
    setLoadingProjects(true);
    try {
      const projects = await listProjects();
      setProjectOptions(Array.isArray(projects) ? projects : []);
    } catch {
      setProjectOptions([]);
    } finally {
      setLoadingProjects(false);
    }
  }

  function beginGesture() {
    if (interactionRef.current) return;
    interactionRef.current = { active: true };
    setHistory((prev) => [...prev, units]);
    setFuture([]);
    setSavedState("Saving...");
  }

  function endGesture() {
    interactionRef.current = null;
  }

  function getLocalStateKey(currentProjectId, fallbackName) {
    if (currentProjectId) return `pk-design-state-${currentProjectId}`;
    return `pk-design-state-draft-${String(fallbackName || "untitled").trim().toLowerCase()}`;
  }

  function buildRunsFromUnits(sourceUnits) {
    const groups = {
      base: [],
      wall: [],
      tall: [],
    };

    for (const unit of sourceUnits) {
      const type = cabinetLibrary[unit.cabinetKey]?.type || "base";
      if (!groups[type]) continue;
      groups[type].push(unit);
    }

    return ["base", "wall", "tall"]
      .map((mode) => {
        const row = groups[mode] || [];
        if (row.length === 0) return null;
        const sorted = [...row].sort((a, b) => Number(a.x || 0) - Number(b.x || 0));
        return {
          mode,
          run_width_mm: sorted.reduce((sum, unit) => sum + (Number(unit.width) || 0), 0),
          sequence: sorted.map((unit) => unit.cabinetKey),
          left_filler_mm: 0,
          right_filler_mm: 0,
        };
      })
      .filter(Boolean);
  }

  const persistProjectState = useCallback(async () => {
    const statePayload = {
      version: 1,
      savedAt: Date.now(),
      model: snapshotState,
    };

    const localKey = getLocalStateKey(projectId, projectDraft.projectName);
    localStorage.setItem(localKey, JSON.stringify(statePayload));

    if (!projectId) {
      setSavedState("Saved ✓");
      return;
    }

    try {
      await saveProjectLayout(projectId, {
        name: `${projectDraft.projectName || "Design"} Snapshot`,
        kitchen_style: getKitchenStyleKey(projectDraft.designType),
        runs: buildRunsFromUnits(units),
        note: `${STATE_NOTE_PREFIX}${JSON.stringify(statePayload)}`,
      });
      setSavedState("Saved ✓");
    } catch {
      setSavedState("Saved ✓");
    }
  }, [projectDraft.designType, projectDraft.projectName, projectId, snapshotState, units]);

  async function hydrateProjectState(currentProjectId) {
    const localKey = getLocalStateKey(currentProjectId, projectDraft.projectName);
    const localStateRaw = localStorage.getItem(localKey);
    if (localStateRaw) {
      try {
        const parsed = JSON.parse(localStateRaw);
        const model = parsed?.model;
        if (model) {
          setUnits(Array.isArray(model.units) ? model.units : []);
          setAppliances(Array.isArray(model.appliances) ? model.appliances : []);
          setWorktop(model.worktop || { type: "Standard worktop", cutouts: { sink: false, hob: false }, island: false, peninsula: false, waterfall: false });
          setProjectDraft((prev) => ({ ...prev, ...(model.projectDraft || {}) }));
          if (model.activeLibraryCategory) setActiveLibraryCategory(model.activeLibraryCategory);
          if (model.activeView) setActiveView(model.activeView);
          setSavedState("Saved ✓");
          return;
        }
      } catch {
        // Ignore malformed local snapshot.
      }
    }

    if (!currentProjectId) return;

    try {
      const layouts = await listProjectLayouts(currentProjectId);
      const withState = [...(Array.isArray(layouts) ? layouts : [])]
        .filter((item) => String(item.note || "").startsWith(STATE_NOTE_PREFIX))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const latest = withState[0];
      if (!latest) return;

      const payload = String(latest.note || "").slice(STATE_NOTE_PREFIX.length);
      const parsed = JSON.parse(payload);
      const model = parsed?.model;
      if (!model) return;

      setUnits(Array.isArray(model.units) ? model.units : []);
      setAppliances(Array.isArray(model.appliances) ? model.appliances : []);
      setWorktop(model.worktop || { type: "Standard worktop", cutouts: { sink: false, hob: false }, island: false, peninsula: false, waterfall: false });
      setProjectDraft((prev) => ({ ...prev, ...(model.projectDraft || {}) }));
      if (model.activeLibraryCategory) setActiveLibraryCategory(model.activeLibraryCategory);
      if (model.activeView) setActiveView(model.activeView);
      setSavedState("Saved ✓");
    } catch {
      // Ignore hydration failures and keep current in-memory state.
    }
  }

  async function loadExistingProject(projectIdToLoad) {
    const id = String(projectIdToLoad || "").trim();
    if (!id) return;

    setError("");
    setSavedState("Loading...");
    isHydratingRef.current = true;

    try {
      const project = await getProject(id);
      let room = null;
      try {
        room = await getRoomSpec(id);
      } catch {
        room = null;
      }

      setProjectId(id);
      setProjectDraft((prev) => ({
        ...prev,
        projectName: project?.name || prev.projectName,
        customerName: project?.customer_name || prev.customerName,
        customerContact: project?.customer_email || prev.customerContact,
        designType: STYLE_TO_DESIGN_TYPE[project?.kitchen_style] || prev.designType,
        roomLength: room?.room_width_mm ? String(room.room_width_mm) : prev.roomLength,
        roomWidth: room?.room_depth_mm ? String(room.room_depth_mm) : prev.roomWidth,
        roomHeight: room?.ceiling_height_mm ? String(room.ceiling_height_mm) : prev.roomHeight,
      }));

      setUnits([]);
      setAppliances([]);
      setWorktop({ type: "Standard worktop", cutouts: { sink: false, hob: false }, island: false, peninsula: false, waterfall: false });
      setHistory([]);
      setFuture([]);
      setSelectedId("");

      await hydrateProjectState(id);
      setAppScreen("WORKSPACE");
      setSavedState("Saved ✓");
    } catch (err) {
      setError(err.message || "Failed to load project");
      setSavedState("Saved ✓");
    } finally {
      isHydratingRef.current = false;
    }
  }

  function addUnitFromLibrary(cabinetKey) {
    const unit = makeUnitFromKey(cabinetKey);
    if (!unit) return;
    const placed = {
      ...unit,
      x: 30 + units.length * 28,
      y: unit.y,
    };
    mutateUnits([...units, applySmartRules(placed)]);
    setSelectedId(placed.id);
  }

  function onDragStartLibrary(event, cabinetKey) {
    event.dataTransfer.setData("text/plain", cabinetKey);
  }

  function onDropToCanvas(event) {
    event.preventDefault();
    const cabinetKey = event.dataTransfer.getData("text/plain");
    if (!cabinetKey) return;

    const canvasRect = event.currentTarget.getBoundingClientRect();
    const unit = makeUnitFromKey(cabinetKey);
    if (!unit) return;

    const x = Math.max(8, Math.round(event.clientX - canvasRect.left - 80));
    const y = Math.max(8, Math.round(event.clientY - canvasRect.top - 48));
    const placed = applySmartRules({ ...unit, x, y });

    mutateUnits([...units, placed]);
    setSelectedId(placed.id);
  }

  function updateSelected(field, value) {
    if (!selectedUnit) return;
    const next = units.map((unit) => {
      if (unit.id !== selectedUnit.id) return unit;
      const updated = { ...unit, [field]: value };
      return applySmartRules(updated);
    });
    mutateUnits(next);
  }

  function updateSelectedMaterial(field, value) {
    if (!selectedUnit) return;
    const next = units.map((unit) => {
      if (unit.id !== selectedUnit.id) return unit;
      const updated = { ...unit, materials: { ...unit.materials, [field]: value } };
      return applySmartRules(updated);
    });
    mutateUnits(next);
  }

  function moveSelected(dx) {
    if (!selectedUnit) return;
    const next = units.map((unit) => {
      if (unit.id !== selectedUnit.id) return unit;
      return { ...unit, x: Math.max(0, unit.x + dx) };
    });
    mutateUnits(next);
  }

  function startDragUnit(event, unitId) {
    event.preventDefault();
    const source = units.find((unit) => unit.id === unitId);
    if (!source) return;

    setSelectedId(unitId);
    beginGesture();

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    const startX = Number(source.x) || 0;
    const startY = Number(source.y) || 0;

    function handleMouseMove(moveEvent) {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;

      setUnits((prev) => prev.map((unit) => {
        if (unit.id !== unitId) return unit;
        return {
          ...unit,
          x: Math.max(0, Math.round(startX + dx)),
          y: Math.max(0, Math.round(startY + dy)),
        };
      }));
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      endGesture();
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function startResizeUnit(event, unitId) {
    event.preventDefault();
    event.stopPropagation();

    const source = units.find((unit) => unit.id === unitId);
    if (!source) return;

    setSelectedId(unitId);
    beginGesture();

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    const startWidth = Number(source.width) || 0;
    const startHeight = Number(source.height) || 0;

    function handleMouseMove(moveEvent) {
      const dxPx = moveEvent.clientX - startMouseX;
      const dyPx = moveEvent.clientY - startMouseY;
      const widthDeltaMm = dxPx / PX_PER_MM;
      const heightDeltaMm = dyPx / PX_PER_MM;

      setUnits((prev) => prev.map((unit) => {
        if (unit.id !== unitId) return unit;
        const resized = {
          ...unit,
          width: Math.max(MIN_WIDTH_MM, Math.round((startWidth + widthDeltaMm) / 10) * 10),
          height: Math.max(MIN_HEIGHT_MM, Math.round((startHeight + heightDeltaMm) / 10) * 10),
        };
        return applySmartRules(resized);
      }));
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      endGesture();
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function duplicateSelected() {
    if (!selectedUnit) return;
    const clone = {
      ...selectedUnit,
      id: `${selectedUnit.cabinetKey}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x: selectedUnit.x + 40,
    };
    mutateUnits([...units, clone]);
    setSelectedId(clone.id);
  }

  function deleteSelected() {
    if (!selectedUnit) return;
    const next = units.filter((unit) => unit.id !== selectedUnit.id);
    mutateUnits(next);
    setSelectedId("");
  }

  function undo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [units, ...prev]);
    setUnits(previous);
    setSavedState("Saved ✓");
  }

  function redo() {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, units]);
    setUnits(next);
    setSavedState("Saved ✓");
  }

  async function createNewDesign() {
    setError("");
    try {
      const created = await createProject({
        name: projectDraft.projectName || "Untitled Design",
        customer_name: projectDraft.customerName || "",
        customer_email: projectDraft.customerContact || "",
        kitchen_style: getKitchenStyleKey(projectDraft.designType),
      });

      const id = String(created?.id || "");
      if (id) {
        setProjectId(id);
        await saveRoomSpec(id, {
          room_width_mm: Number(projectDraft.roomLength) || 0,
          room_depth_mm: Number(projectDraft.roomWidth) || 0,
          ceiling_height_mm: Number(projectDraft.roomHeight) || 0,
          doors: [],
          windows: [],
          water_points: [],
          electrical_points: [],
        });
        await hydrateProjectState(id);
      }

      setAppScreen("WORKSPACE");
    } catch (err) {
      setError(err.message || "Failed to create design");
    }
  }

  async function getQuoteNow() {
    setBusyQuote(true);
    setError("");
    try {
      const payload = {
        project_id: projectId || undefined,
        customer_name: projectDraft.customerName,
        customer_email: projectDraft.customerContact,
        cabinets: units.map((unit) => ({ cabinet_key: unit.cabinetKey, qty: 1 })),
        hardware: hardwareRows.map((row) => ({ hardware_key: row.part, qty: row.qty })),
        layout: {
          room_width_mm: roomWidth,
          room_depth_mm: roomDepth,
          room_height_mm: roomHeight,
          kitchen_style: getKitchenStyleKey(projectDraft.designType),
          cabinet_run_mm: units.reduce((sum, unit) => sum + (Number(unit.width) || 0), 0),
        },
      };

      const created = await createQuote(payload);
      setQuoteResult(created || null);
      setAppScreen("QUOTE");
    } catch (err) {
      setError(err.message || "Failed to generate quote");
    } finally {
      setBusyQuote(false);
    }
  }

  function addAppliance(name) {
    const next = [...appliances, { id: `${name}-${Date.now()}`, name }];
    setAppliances(next);
  }

  function updateDraft(field, value) {
    setProjectDraft((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    if (isHydratingRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSavedState("Saving...");
    saveTimerRef.current = setTimeout(() => {
      persistProjectState();
    }, 600);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [persistProjectState]);

  useEffect(() => {
    refreshProjectOptions();
  }, []);

  function renderTopNav() {
    return (
      <header className="pk-topbar">
        <div className="pk-brand">
          <div className="pk-logo">PK</div>
          <div>
            <h1>Panda Kitchens DIY Cupboards</h1>
            <p>Design once. Calculate automatically. Quote instantly.</p>
          </div>
        </div>
        <div className="pk-top-actions">
          <span className="save-state">{savedState}</span>
          <button type="button" className="ghost" onClick={() => setMode(mode === "CUSTOMER" ? "ADMIN" : "CUSTOMER")}>{mode === "CUSTOMER" ? "Switch to Admin" : "Switch to Customer"}</button>
        </div>
      </header>
    );
  }

  function renderHome() {
    return (
      <section className="home-screen">
        <div className="home-hero">
          <h2>Plan your cupboards with confidence</h2>
          <p>Create visual layouts, configure every unit, get instant pricing, and move straight to order.</p>
          <button type="button" className="primary cta" onClick={() => setAppScreen("NEW_PROJECT")}>+ CREATE NEW DESIGN</button>
        </div>

        <div className="home-grid">
          <button type="button" className="home-tile" onClick={() => setAppScreen("NEW_PROJECT")}>Create New Design</button>
          <button type="button" className="home-tile" onClick={() => setAppScreen("PROJECTS")}>My Designs</button>
          <button type="button" className="home-tile" onClick={() => setAppScreen("QUOTE")}>Saved Quotes</button>
          <button type="button" className="home-tile" onClick={() => setAppScreen("ORDER")}>Orders</button>
          <button type="button" className="home-tile" onClick={() => setAppScreen("ACCOUNT")}>Account</button>
        </div>
      </section>
    );
  }

  function renderProjects() {
    return (
      <section className="summary-screen">
        <div className="workspace-header">
          <div>
            <h2>My Designs</h2>
            <p>Open any saved project and continue from the exact workspace state.</p>
          </div>
          <div className="workspace-header-actions">
            <button type="button" className="ghost" onClick={refreshProjectOptions} disabled={loadingProjects}>
              {loadingProjects ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" className="primary" onClick={() => setAppScreen("NEW_PROJECT")}>Create New Design</button>
          </div>
        </div>

        <div className="summary-grid">
          {projectOptions.map((project) => (
            <article key={project.id} className="summary-card">
              <h3>{project.name || "Untitled"}</h3>
              <p><strong>Project ID:</strong> {project.id}</p>
              <p><strong>Customer:</strong> {project.customer_name || "-"}</p>
              <p><strong>Email:</strong> {project.customer_email || "-"}</p>
              <p><strong>Status:</strong> {project.status || "draft"}</p>
              <p><strong>Updated:</strong> {project.updated_at ? new Date(project.updated_at).toLocaleString() : "-"}</p>
              <div className="row-actions">
                <button type="button" className="primary" onClick={() => loadExistingProject(project.id)}>Open Design</button>
              </div>
            </article>
          ))}
        </div>

        {!loadingProjects && projectOptions.length === 0 && (
          <article className="summary-card">
            <h3>No saved designs yet</h3>
            <p>Create a new design to start your project library.</p>
          </article>
        )}
      </section>
    );
  }

  function renderNewProject() {
    return (
      <section className="new-project-screen">
        <div className="journey-bar" role="status" aria-label="Design journey">
          {STEPS.map((step) => (
            <span key={step} className={step === "START PROJECT" || step === "ROOM / SPACE" ? "active" : ""}>{step}</span>
          ))}
        </div>

        <div className="new-project-card">
          <h2>Create New Design</h2>
          <div className="form-grid two">
            <label>
              Project Name
              <input value={projectDraft.projectName} onChange={(e) => updateDraft("projectName", e.target.value)} placeholder="Smith Kitchen" />
            </label>
            <label>
              Design Type
              <select value={projectDraft.designType} onChange={(e) => updateDraft("designType", e.target.value)}>
                {DESIGN_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>
              Customer Name
              <input value={projectDraft.customerName} onChange={(e) => updateDraft("customerName", e.target.value)} placeholder="Customer full name" />
            </label>
            <label>
              Contact Details
              <input value={projectDraft.customerContact} onChange={(e) => updateDraft("customerContact", e.target.value)} placeholder="Phone or email" />
            </label>
            <label className="span-2">
              Address (optional)
              <input value={projectDraft.customerAddress} onChange={(e) => updateDraft("customerAddress", e.target.value)} placeholder="Optional site address" />
            </label>
            <label>
              Room Length (mm)
              <input type="number" value={projectDraft.roomLength} onChange={(e) => updateDraft("roomLength", e.target.value)} />
            </label>
            <label>
              Room Width (mm)
              <input type="number" value={projectDraft.roomWidth} onChange={(e) => updateDraft("roomWidth", e.target.value)} />
            </label>
            <label>
              Room Height (mm)
              <input type="number" value={projectDraft.roomHeight} onChange={(e) => updateDraft("roomHeight", e.target.value)} />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={projectDraft.measurementsLater}
                onChange={(e) => updateDraft("measurementsLater", e.target.checked)}
              />
              I will enter measurements later
            </label>
          </div>

          <div className="row-actions">
            <button type="button" className="ghost" onClick={() => setAppScreen("HOME")}>Back</button>
            <button type="button" className="primary" onClick={createNewDesign}>CREATE DESIGN</button>
          </div>
        </div>
      </section>
    );
  }

  function renderWorkspace() {
    const baseUnits = sortedUnits.filter((unit) => (cabinetLibrary[unit.cabinetKey]?.type || "base") === "base");
    const wallUnits = sortedUnits.filter((unit) => (cabinetLibrary[unit.cabinetKey]?.type || "base") === "wall");
    const tallUnits = sortedUnits.filter((unit) => (cabinetLibrary[unit.cabinetKey]?.type || "base") === "tall");

    function renderFrontDetails(unit, compact = false) {
      const spec = cabinetLibrary[unit.cabinetKey] || {};
      const special = String(spec.special || "");
      const doorCount = Math.max(0, Number(unit.doors) || 0);
      const drawerCount = Math.max(0, Number(unit.drawers) || 0);

      if (special.includes("fridge")) {
        return <span className="appliance-front fridge-front"><i /><i /><b>FRIDGE</b></span>;
      }

      if (special.includes("oven")) {
        return <span className="appliance-front oven-front"><i /><b>OVEN</b><i /></span>;
      }

      if (special.includes("extractor")) {
        return <span className="appliance-front extractor-front"><i /><b>EXTRACTOR</b></span>;
      }

      if (special.includes("sink")) {
        return (
          <>
            <span className="sink-detail"><i /><b /></span>
            <span className="front-grid doors" style={{ gridTemplateColumns: `repeat(${Math.max(1, doorCount)}, 1fr)` }}>
              {Array.from({ length: Math.max(1, doorCount) }, (_, index) => <i key={index}><b /></i>)}
            </span>
          </>
        );
      }

      if (drawerCount > 0 || unit.frontType === "Drawers") {
        return (
          <span className="front-grid drawers" style={{ gridTemplateRows: `repeat(${Math.max(1, drawerCount)}, 1fr)` }}>
            {Array.from({ length: Math.max(1, drawerCount) }, (_, index) => <i key={index}><b /></i>)}
          </span>
        );
      }

      if (unit.frontType === "Open") {
        return (
          <span className="open-front">
            {Array.from({ length: Math.max(1, compact ? 1 : Number(unit.shelves) || 1) }, (_, index) => <i key={index} />)}
          </span>
        );
      }

      return (
        <span className="front-grid doors" style={{ gridTemplateColumns: `repeat(${Math.max(1, doorCount)}, 1fr)` }}>
          {Array.from({ length: Math.max(1, doorCount) }, (_, index) => <i key={index}><b /></i>)}
        </span>
      );
    }

    function renderElevationUnit(unit) {
      const spec = cabinetLibrary[unit.cabinetKey] || {};
      const type = spec.type || "base";
      const visualWidth = Math.max(64, Math.round(Number(unit.width) * 0.15));
      const visualHeight = Math.max(type === "tall" ? 250 : 94, Math.round(Number(unit.height) * 0.12));
      return (
        <button
          key={unit.id}
          type="button"
          className={`real-cabinet ${type} ${finishClass(unit.materials?.doors)} ${selectedId === unit.id ? "selected" : ""}`}
          style={{ width: `${visualWidth}px`, height: `${visualHeight}px` }}
          onClick={() => setSelectedId(unit.id)}
          title={`${spec.label || unit.cabinetKey} · ${unit.width}×${unit.height}×${unit.depth}mm`}
        >
          {renderFrontDetails(unit)}
          <span className="cabinet-dimension">{unit.width}</span>
        </button>
      );
    }

    function renderCanvasContent() {
      if (activeView === "FLOOR LAYOUT" || activeView === "2D PLAN") {
        return (
          <div className="canvas-surface">
            {units.map((unit) => {
              const spec = cabinetLibrary[unit.cabinetKey];
              const type = spec?.type || "base";
              const hasCorner = Boolean(spec?.corner || String(spec?.special || "").includes("corner"));
              const widthPx = Math.max(48, Math.round((Number(unit.width) || Number(spec?.width) || 600) * PX_PER_MM));
              const depthPx = Math.max(48, Math.round((Number(unit.depth) || Number(spec?.depth) || 570) * PX_PER_MM));
              const baseHeightPx = type === "wall" ? 34 : type === "tall" ? 88 : 58;
              const heightPx = Math.max(baseHeightPx, Math.round((Number(unit.height) || Number(spec?.height) || 720) * 0.08));
              const floorSizePx = Math.max(widthPx, depthPx);
              const floorStyle = hasCorner
                ? {
                    left: `${unit.x}px`,
                    top: `${unit.y}px`,
                    width: `${floorSizePx}px`,
                    height: `${floorSizePx}px`,
                    clipPath: "polygon(0 0, 100% 0, 100% 100%, 30% 100%, 30% 30%, 0 30%)",
                  }
                : {
                    left: `${unit.x}px`,
                    top: `${unit.y}px`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                  };

              return (
                <div
                  key={unit.id}
                  className={`canvas-unit ${type} ${hasCorner ? "corner" : ""} ${selectedId === unit.id ? "selected" : ""}`}
                  style={floorStyle}
                  onClick={() => setSelectedId(unit.id)}
                  onMouseDown={(event) => startDragUnit(event, unit.id)}
                  role="button"
                  tabIndex={0}
                  title={`${spec?.label || unit.cabinetKey} ${unit.width}mm`}
                >
                  <span className="plan-depth" />
                  <span className="plan-front-edge" />
                  <span className="label">{spec?.label || unit.cabinetKey}</span>
                  <span className="meta">{unit.width} × {unit.height}mm</span>
                  {renderFrontDetails(unit, true)}
                  <span
                    className="resize-handle"
                    onMouseDown={(event) => startResizeUnit(event, unit.id)}
                    role="presentation"
                  />
                </div>
              );
            })}
          </div>
        );
      }

      if (activeView === "FRONT ELEVATION") {
        return (
          <div className="elevation-surface">
            <div className="room-elevation">
              <div className="elevation-ceiling"><span>{roomHeight || 2700} mm ceiling</span></div>
              <div className="upper-cabinet-run">
                {wallUnits.map(renderElevationUnit)}
              </div>
              <div className="backsplash-zone">
                <span className="backsplash-grid" />
                {worktop.cutouts.hob && <span className="hob-detail"><i /><i /><i /><i /></span>}
              </div>
              <div className="lower-kitchen-run">
                <div className={`worktop-strip ${finishClass(worktop.type)}`} />
                <div className="floor-cabinet-line">
                  <div className="tall-unit-run">{tallUnits.map(renderElevationUnit)}</div>
                  <div className="base-unit-run">{baseUnits.map(renderElevationUnit)}</div>
                </div>
                <div className="plinth-strip" />
              </div>
              {units.length === 0 && <p className="elevation-empty panel-note">Add cabinets to build the elevation.</p>}
              <div className="floor-shadow" />
            </div>
          </div>
        );
      }

      if (activeView === "3D VIEW") {
        return (
          <CabinetScene3D
            units={sortedUnits}
            selectedId={selectedId}
            onSelect={setSelectedId}
            roomWidthMm={roomWidth}
            roomDepthMm={roomDepth}
            roomHeightMm={roomHeight}
            worktop={worktop}
          />
        );
      }

      return (
        <div className="list-view-surface">
          <div className="list-table">
            <div className="list-head">
              <span>Cabinet</span>
              <span>Type</span>
              <span>Position</span>
              <span>Size</span>
              <span>Front</span>
            </div>
            {sortedUnits.map((unit) => {
              const spec = cabinetLibrary[unit.cabinetKey] || {};
              return (
                <button key={unit.id} type="button" className={`list-row list-row-btn ${selectedId === unit.id ? "selected" : ""}`} onClick={() => setSelectedId(unit.id)}>
                  <span>{spec.label || unit.cabinetKey}</span>
                  <span>{spec.type || "base"}</span>
                  <span>X {Math.round(unit.x)} · Y {Math.round(unit.y)}</span>
                  <span>{unit.width} × {unit.height} × {unit.depth}</span>
                  <span>{unit.frontType}</span>
                </button>
              );
            })}
            {sortedUnits.length === 0 && <div className="list-row"><span>No cabinets yet.</span><span>-</span><span>-</span><span>-</span><span>-</span></div>}
          </div>
        </div>
      );
    }

    return (
      <section className="workspace-screen">
        <div className="workspace-header">
          <div>
            <h2>{projectDraft.projectName || "Untitled Design"}</h2>
            <p>{projectDraft.designType} · {projectId ? `Project #${projectId}` : "New project"}</p>
          </div>
          <div className="workspace-header-actions">
            <button type="button" className="ghost" onClick={undo} disabled={history.length === 0}>UNDO</button>
            <button type="button" className="ghost" onClick={redo} disabled={future.length === 0}>REDO</button>
            <button type="button" className="ghost" onClick={() => setAppScreen("SUMMARY")}>PREVIEW</button>
          </div>
        </div>

        <div className="toolbar">
          <div>
            <strong>Toolbar</strong>
            <span>Cabinets | Appliances | Worktop | Accessories | View</span>
          </div>
          <div className="view-tabs">
            {VIEWS.map((view) => (
              <button type="button" key={view} className={activeView === view ? "tab active" : "tab"} onClick={() => setActiveView(view)}>{view}</button>
            ))}
          </div>
        </div>

        <div className="workspace-grid">
          <aside className="library-panel">
            <h3>Library</h3>
            <div className="category-tabs">
              {LIBRARY_CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className={activeLibraryCategory === category.key ? "cat active" : "cat"}
                  onClick={() => setActiveLibraryCategory(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="library-items">
              {libraryItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  draggable
                  onDragStart={(event) => onDragStartLibrary(event, item.key)}
                  className="library-item"
                  onClick={() => addUnitFromLibrary(item.key)}
                >
                  <span className={cabinetPreviewClass(item.spec.type)} />
                  <div>
                    <strong>{item.spec.label}</strong>
                    <small>{item.spec.width}w × {item.spec.height}h × {item.spec.depth}d</small>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main
            className="canvas-panel"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDropToCanvas}
            role="region"
            aria-label="Design canvas"
          >
            {renderCanvasContent()}
          </main>

          <aside className="properties-panel">
            <h3>Properties</h3>
            {!selectedUnit && <p className="panel-note">Select a cabinet to edit dimensions, fronts, materials and hardware.</p>}
            {selectedUnit && (
              <div className="properties-body">
                <div className="mini-actions">
                  <button type="button" className="ghost" onClick={() => moveSelected(-20)}>Move Left</button>
                  <button type="button" className="ghost" onClick={() => moveSelected(20)}>Move Right</button>
                  <button type="button" className="ghost" onClick={duplicateSelected}>Duplicate</button>
                  <button type="button" className="danger" onClick={deleteSelected}>Delete</button>
                </div>

                <label>
                  Width (mm)
                  <input
                    type="number"
                    value={selectedUnit.width}
                    onChange={(e) => updateSelected("width", Number(e.target.value) || 0)}
                  />
                </label>
                <label>
                  Height (mm)
                  <input
                    type="number"
                    value={selectedUnit.height}
                    onChange={(e) => updateSelected("height", Number(e.target.value) || 0)}
                  />
                </label>
                <label>
                  Depth (mm)
                  <input
                    type="number"
                    value={selectedUnit.depth}
                    onChange={(e) => updateSelected("depth", Number(e.target.value) || 0)}
                  />
                </label>

                <label>
                  Front Type
                  <select value={selectedUnit.frontType} onChange={(e) => updateSelected("frontType", e.target.value)}>
                    <option value="Doors">Doors</option>
                    <option value="Drawers">Drawers</option>
                    <option value="Open">Open</option>
                  </select>
                </label>

                <label>
                  Doors
                  <input
                    type="number"
                    min="0"
                    value={selectedUnit.doors}
                    onChange={(e) => updateSelected("doors", Number(e.target.value) || 0)}
                  />
                </label>
                <label>
                  Drawers
                  <input
                    type="number"
                    min="0"
                    value={selectedUnit.drawers}
                    onChange={(e) => updateSelected("drawers", Number(e.target.value) || 0)}
                  />
                </label>
                <label>
                  Shelves
                  <input
                    type="number"
                    min="0"
                    value={selectedUnit.shelves}
                    onChange={(e) => updateSelected("shelves", Number(e.target.value) || 0)}
                  />
                </label>

                <label>
                  Carcass Material
                  <select value={selectedUnit.materials.carcass} onChange={(e) => updateSelectedMaterial("carcass", e.target.value)}>
                    {MATERIAL_PRESETS.carcass.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Door Finish
                  <select value={selectedUnit.materials.doors} onChange={(e) => updateSelectedMaterial("doors", e.target.value)}>
                    {MATERIAL_PRESETS.doors.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Worktop
                  <select value={selectedUnit.materials.worktop} onChange={(e) => updateSelectedMaterial("worktop", e.target.value)}>
                    {MATERIAL_PRESETS.worktop.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
            )}
          </aside>
        </div>

        <section className="workspace-extras">
          <div className="worktop-card">
            <h3>Worktop & Cut-outs</h3>
            <label>
              Worktop Type
              <select value={worktop.type} onChange={(e) => setWorktop((prev) => ({ ...prev, type: e.target.value }))}>
                <option>Standard worktop</option>
                <option>Waterfall edge</option>
                <option>Island</option>
                <option>Peninsula</option>
              </select>
            </label>
            <label className="checkbox-label"><input type="checkbox" checked={worktop.cutouts.sink} onChange={(e) => setWorktop((prev) => ({ ...prev, cutouts: { ...prev.cutouts, sink: e.target.checked } }))} /> Sink cut-out</label>
            <label className="checkbox-label"><input type="checkbox" checked={worktop.cutouts.hob} onChange={(e) => setWorktop((prev) => ({ ...prev, cutouts: { ...prev.cutouts, hob: e.target.checked } }))} /> Hob cut-out</label>
            <label className="checkbox-label"><input type="checkbox" checked={worktop.island} onChange={(e) => setWorktop((prev) => ({ ...prev, island: e.target.checked }))} /> Include island</label>
            <label className="checkbox-label"><input type="checkbox" checked={worktop.peninsula} onChange={(e) => setWorktop((prev) => ({ ...prev, peninsula: e.target.checked }))} /> Include peninsula</label>
            <label className="checkbox-label"><input type="checkbox" checked={worktop.waterfall} onChange={(e) => setWorktop((prev) => ({ ...prev, waterfall: e.target.checked }))} /> Waterfall edge</label>
          </div>

          <div className="appliance-card">
            <h3>Appliances</h3>
            <div className="appliance-picker">
              {APPLIANCE_LIBRARY.map((item) => (
                <button type="button" key={item} className="ghost" onClick={() => addAppliance(item)}>{item}</button>
              ))}
            </div>
            <div className="appliance-list">
              {appliances.length === 0 && <p className="panel-note">No appliances added yet.</p>}
              {appliances.map((item) => <span key={item.id} className="chip">{item.name}</span>)}
            </div>
          </div>
        </section>

        <footer className="status-bar" role="status" aria-label="Design information">
          <span>Cabinets: <strong>{counts.total}</strong></span>
          <span>Wall Units: <strong>{counts.wall}</strong></span>
          <span>Base Units: <strong>{counts.base}</strong></span>
          <span>Tall Units: <strong>{counts.tall}</strong></span>
          <span>Estimated Materials: <strong>{toRand(estimatedMaterial)}</strong></span>
          <span>Estimated Total: <strong>{toRand(total)}</strong></span>
          <button type="button" className="primary" onClick={() => setAppScreen("SUMMARY")}>FINISH DESIGN</button>
        </footer>
      </section>
    );
  }

  function renderSummary() {
    return (
      <section className="summary-screen">
        <div className="journey-bar" role="status" aria-label="Design journey">
          {STEPS.map((step) => (
            <span key={step} className={["FINISH DESIGN", "REVIEW", "PRICE"].includes(step) ? "active" : ""}>{step}</span>
          ))}
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <h2>Your Design</h2>
            <p><strong>Project:</strong> {projectDraft.projectName || "-"}</p>
            <p><strong>Customer:</strong> {projectDraft.customerName || "-"}</p>
            <p><strong>Type:</strong> {projectDraft.designType}</p>
            <p><strong>Room:</strong> {roomWidth || 0} × {roomDepth || 0} × {roomHeight || 0} mm</p>
            <p><strong>Cabinets:</strong> {counts.total}</p>
            <p><strong>Appliances:</strong> {appliances.length}</p>
            <p><strong>Worktop:</strong> {worktop.type}</p>
          </article>

          <article className="summary-card">
            <h2>Estimated Price</h2>
            <p><strong>Materials:</strong> {toRand(estimatedMaterial)}</p>
            <p><strong>Hardware:</strong> {toRand(estimatedHardware)}</p>
            <p><strong>Worktop:</strong> {toRand(estimatedWorktop)}</p>
            <p><strong>Subtotal:</strong> {toRand(subtotal)}</p>
            <p><strong>VAT (15%):</strong> {toRand(vat)}</p>
            <p className="total-line"><strong>Total:</strong> {toRand(total)}</p>
          </article>

          <article className="summary-card span-2">
            <h2>Cabinet List View</h2>
            <div className="list-table">
              <div className="list-head">
                <span>Cabinet</span>
                <span>Size (W×H×D)</span>
                <span>Front</span>
                <span>Materials</span>
              </div>
              {units.map((unit) => {
                const spec = cabinetLibrary[unit.cabinetKey];
                return (
                  <div key={unit.id} className="list-row">
                    <span>{spec?.label || unit.cabinetKey}</span>
                    <span>{unit.width} × {unit.height} × {unit.depth} mm</span>
                    <span>{unit.frontType}</span>
                    <span>{unit.materials.carcass} / {unit.materials.doors}</span>
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        <div className="row-actions">
          <button type="button" className="ghost" onClick={() => setAppScreen("WORKSPACE")}>Back to Design</button>
          <button type="button" className="primary" onClick={getQuoteNow} disabled={busyQuote}>{busyQuote ? "Generating..." : "GET QUOTE"}</button>
        </div>
      </section>
    );
  }

  function renderQuote() {
    return (
      <section className="quote-screen">
        <h2>Quotation</h2>
        <div className="quote-layout">
          <article className="summary-card">
            <h3>Materials</h3>
            <p>Cabinet materials: {toRand(estimatedMaterial * 0.55)}</p>
            <p>Doors and panels: {toRand(estimatedMaterial * 0.45)}</p>
            <p>Worktop: {toRand(estimatedWorktop)}</p>
          </article>

          <article className="summary-card">
            <h3>Hardware</h3>
            {hardwareRows.map((row) => (
              <p key={row.part}>{row.part}: {row.qty}</p>
            ))}
            {hardwareRows.length === 0 && <p>No hardware lines yet.</p>}
          </article>

          <article className="summary-card">
            <h3>Other</h3>
            <p>Delivery: {toRand(1800)}</p>
            <p>Installation (optional): {toRand(6200)}</p>
          </article>

          <article className="summary-card total-card">
            <h3>Total</h3>
            <p>Subtotal: {toRand(subtotal)}</p>
            <p>VAT: {toRand(vat)}</p>
            <p className="total-line">Total: {toRand(total)}</p>
            <p className="panel-note">Quote ID: {quoteResult?.id || quoteResult?.quote_id || "Pending"}</p>
          </article>
        </div>

        <div className="row-actions">
          <button type="button" className="ghost" onClick={() => setAppScreen("SUMMARY")}>REVIEW DESIGN</button>
          <button type="button" className="primary" onClick={() => setAppScreen("ORDER")}>APPROVE QUOTE</button>
        </div>
      </section>
    );
  }

  function renderOrder() {
    return (
      <section className="order-screen">
        <h2>Order Process</h2>
        <div className="timeline">
          <span className="done">APPROVE QUOTE</span>
          <span className="active">PAYMENT</span>
          <span>PAYMENT CONFIRMED</span>
          <span>ORDER CREATED</span>
          <span>PRODUCTION PACK GENERATED</span>
          <span>PRODUCTION</span>
          <span>INSTALLATION</span>
          <span>COMPLETED</span>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <h3>Customer View</h3>
            <ul>
              <li>Design preview</li>
              <li>Materials and options</li>
              <li>Price and quote</li>
              <li>Approval and payment</li>
              <li>Order tracking</li>
            </ul>
          </article>

          <article className="summary-card">
            <h3>Admin View</h3>
            <div className="flow-pills">
              {(mode === "CUSTOMER" ? CUSTOMER_FLOW : ADMIN_FLOW).map((item) => <span key={item} className="chip">{item}</span>)}
            </div>
            <p className="panel-note">Switch mode in the top-right to move between customer and Panda Kitchens operations.</p>
          </article>
        </div>
      </section>
    );
  }

  function renderAdminProduction() {
    if (mode !== "ADMIN") return null;

    const packReady = Boolean(productionPack);

    return (
      <section className="admin-screen">
        <h2>Admin Production</h2>
        <div className="row-actions admin-actions">
          <button type="button" className="primary" onClick={generateProductionPack}>
            {packReady ? "Regenerate Production Pack" : "Generate Production Pack"}
          </button>
          <button type="button" className="ghost" onClick={() => window.print()}>Print Production Pack</button>
        </div>

        {!packReady && (
          <article className="summary-card">
            <h3>Production Pack Not Generated</h3>
            <p>Generate the pack to freeze current cabinet schedules, doors/drawers, panel breakdown, edging totals and board requirements for workshop issue.</p>
          </article>
        )}

        {packReady && (
        <div className="summary-grid production-pack-sheet">
          <article className="summary-card span-2 production-pack-header">
            <h3>Panda Kitchens Production Pack</h3>
            <p><strong>Project:</strong> {productionPack.project.name} ({productionPack.project.id})</p>
            <p><strong>Customer:</strong> {productionPack.project.customer} · {productionPack.project.contact}</p>
            <p><strong>Design Type:</strong> {productionPack.project.designType}</p>
            <p><strong>Room:</strong> {productionPack.project.room.width || 0} × {productionPack.project.room.depth || 0} × {productionPack.project.room.height || 0} mm</p>
            <p><strong>Generated:</strong> {formatDateTime(productionPack.generatedAt)}</p>
            <p><strong>Pack Totals:</strong> {productionPack.stats.cabinetCount} cabinets, {productionPack.stats.doorCount} doors, {productionPack.stats.drawerFrontCount} drawer fronts, {productionPack.stats.panelLineCount} panel lines</p>
          </article>

          <article className="summary-card span-2">
            <h3>Cabinet Schedule</h3>
            <div className="list-table">
              <div className="list-head">
                <span>ID</span>
                <span>Cabinet</span>
                <span>Type</span>
                <span>Size</span>
                <span>Front</span>
              </div>
              {productionPack.cabinetSchedule.map((row) => (
                <div className="list-row" key={row.id}>
                  <span>{row.id}</span>
                  <span>{row.label}</span>
                  <span>{row.type}</span>
                  <span>{row.width} × {row.height} × {row.depth}</span>
                  <span>{row.frontType} ({row.doors}D/{row.drawers}Dr)</span>
                </div>
              ))}
              {productionPack.cabinetSchedule.length === 0 && <div className="list-row"><span>No cabinets yet.</span><span>-</span><span>-</span><span>-</span><span>-</span></div>}
            </div>
          </article>

          <article className="summary-card">
            <h3>Door Schedule</h3>
            {productionPack.doorSchedule.map((row) => (
              <p key={row.id}>{row.id} · {row.cabinetKey} · {row.qty} × {row.height}×{row.width} ({row.finish})</p>
            ))}
            {productionPack.doorSchedule.length === 0 && <p>No door fronts.</p>}
          </article>

          <article className="summary-card">
            <h3>Drawer Schedule</h3>
            {productionPack.drawerSchedule.map((row) => (
              <p key={row.id}>{row.id} · {row.cabinetKey} · {row.qty} fronts {row.height}×{row.width} · {row.runnerPairs} runner pairs</p>
            ))}
            {productionPack.drawerSchedule.length === 0 && <p>No drawer fronts.</p>}
          </article>

          <article className="summary-card span-2">
            <h3>Automatic Cutting List</h3>
            <div className="list-table">
              <div className="list-head">
                <span>Part</span>
                <span>Cabinet</span>
                <span>Material</span>
                <span>Size</span>
                <span>Qty</span>
              </div>
              {productionPack.panelSchedule.map((row, index) => (
                <div className="list-row" key={`${row.part}-${index}`}>
                  <span>{row.part}</span>
                  <span>{row.cabinet || "-"}</span>
                  <span>{row.material}</span>
                  <span>{row.height} × {row.width}</span>
                  <span>{row.qty}</span>
                </div>
              ))}
              {productionPack.panelSchedule.length === 0 && <div className="list-row"><span>No cabinets in design yet.</span><span>-</span><span>-</span><span>-</span><span>-</span></div>}
            </div>
          </article>

          <article className="summary-card span-2">
            <h3>Panel Schedule</h3>
            <div className="list-table">
              <div className="list-head">
                <span>Part</span>
                <span>Material</span>
                <span>Height</span>
                <span>Width</span>
                <span>Qty</span>
              </div>
              {productionPack.panelSchedule.map((row, index) => (
                <div className="list-row" key={`${row.part}-${row.material}-${index}`}>
                  <span>{row.part}</span>
                  <span>{row.material}</span>
                  <span>{row.height}</span>
                  <span>{row.width}</span>
                  <span>{row.qty}</span>
                </div>
              ))}
              {productionPack.panelSchedule.length === 0 && <div className="list-row"><span>No panels yet.</span><span>-</span><span>-</span><span>-</span><span>-</span></div>}
            </div>
          </article>

          <article className="summary-card">
            <h3>Hardware Calculator</h3>
            {productionPack.hardwareRows.map((row) => (
              <p key={row.part}>{row.part}: {row.qty}</p>
            ))}
            {productionPack.hardwareRows.length === 0 && <p>No hardware yet.</p>}
          </article>

          <article className="summary-card">
            <h3>Costing</h3>
            <p>Supplier material: {toRand(estimatedMaterial * 0.72)}</p>
            <p>Labour: {toRand(subtotal * 0.12)}</p>
            <p>Markup basis: {toRand(subtotal)}</p>
            <p>Recommended selling: {toRand(total)}</p>
          </article>

          <article className="summary-card">
            <h3>Board Requirements</h3>
            {productionPack.boardRequirements.map((row) => (
              <p key={row.material}>{row.material}: {row.areaM2.toFixed(2)} m2 (~{row.boardCountEstimate} boards)</p>
            ))}
            {productionPack.boardRequirements.length === 0 && <p>No board usage yet.</p>}
          </article>

          <article className="summary-card">
            <h3>Edging Requirements</h3>
            {productionPack.edgingRequirements.map((row) => (
              <p key={row.material}>{row.material}: {row.edgingM.toFixed(1)} m</p>
            ))}
            {productionPack.edgingRequirements.length === 0 && <p>No edging usage yet.</p>}
          </article>
        </div>
        )}
      </section>
    );
  }

  function renderAccount() {
    return (
      <section className="summary-card">
        <h2>Account</h2>
        <p>Account management placeholders for profile, saved addresses and team access.</p>
        <button type="button" className="ghost" onClick={() => setAppScreen("HOME")}>Back Home</button>
      </section>
    );
  }

  return (
    <div className="pk-shell">
      {renderTopNav()}

      <nav className="main-nav" aria-label="Primary navigation">
        <button type="button" className={appScreen === "HOME" ? "active" : ""} onClick={() => setAppScreen("HOME")}>Home</button>
        <button type="button" className={appScreen === "NEW_PROJECT" ? "active" : ""} onClick={() => setAppScreen("NEW_PROJECT")}>New Project</button>
        <button type="button" className={appScreen === "PROJECTS" ? "active" : ""} onClick={() => setAppScreen("PROJECTS")}>My Designs</button>
        <button type="button" className={appScreen === "WORKSPACE" ? "active" : ""} onClick={() => setAppScreen("WORKSPACE")}>Design Workspace</button>
        <button type="button" className={appScreen === "SUMMARY" ? "active" : ""} onClick={() => setAppScreen("SUMMARY")}>Review</button>
        <button type="button" className={appScreen === "QUOTE" ? "active" : ""} onClick={() => setAppScreen("QUOTE")}>Quote</button>
        <button type="button" className={appScreen === "ORDER" ? "active" : ""} onClick={() => setAppScreen("ORDER")}>Order</button>
      </nav>

      {error && <div className="error-banner">{error}</div>}

      {appScreen === "HOME" && renderHome()}
      {appScreen === "NEW_PROJECT" && renderNewProject()}
      {appScreen === "PROJECTS" && renderProjects()}
      {appScreen === "WORKSPACE" && renderWorkspace()}
      {appScreen === "SUMMARY" && renderSummary()}
      {appScreen === "QUOTE" && renderQuote()}
      {appScreen === "ORDER" && renderOrder()}
      {appScreen === "ACCOUNT" && renderAccount()}

      {renderAdminProduction()}
    </div>
  );
}
