# main.py
from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Tuple
from uuid import uuid4
from datetime import datetime, timezone
import math
import re

from models import (
    LayoutResponse,
    LayoutSaveRequest,
    ProjectCreateRequest,
    ProjectPatchRequest,
    ProjectQuoteCreateRequest,
    ProjectQuoteResponse,
    ProjectResponse,
    RoomSpecResponse,
    RoomSpecUpsertRequest,
)

app = FastAPI(title="DIY Cupboards API", version="0.5.0")

# -----------------------------
# CORS (for Vite)
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Fake auth (replace with JWT later)
# -----------------------------
def require_role(required: str):
    def dep(x_role: Optional[str] = Header(default="client")):
        if x_role != required:
            raise HTTPException(status_code=403, detail="Forbidden")
        return x_role
    return dep


# -----------------------------
# Models
# -----------------------------
class UnitRequest(BaseModel):
    sku: str
    qty: int = Field(ge=1)


class QuoteCreateRequest(BaseModel):
    customer_name: str
    customer_email: str
    material_code: str = "MEL16-WHITE"  # 16mm carcass material (white or woodgrain)
    units: List[UnitRequest]


class OrderListRequest(BaseModel):
    material_code: str = "MEL16-WHITE"
    units: List[UnitRequest]


class QuotePublicView(BaseModel):
    quote_id: str
    customer_name: str
    customer_email: str
    subtotal: float
    vat: float
    total: float
    status: str  # quoted / paid / ordered


class Part(BaseModel):
    name: str
    width_mm: int
    height_mm: int
    thickness_mm: int
    material_code: str
    qty: int
    grain: str = "none"      # "vertical" / "horizontal" / "none"
    edging_mm: int = 0       # edging length PER ONE part (mm). total = edging_mm * qty


class CuttingList(BaseModel):
    quote_id: str
    parts: List[Part]
    board_summary: Dict[str, Dict[str, float]]  # per material: {boards_needed, total_area_m2, ...}
    edging_summary: Dict[str, float]            # per material: meters
    hardware_summary: Dict[str, int]            # hinges, runners_pairs, handles
    internal_costing: Dict[str, float]


class PaymentInitiateRequest(BaseModel):
    quote_id: str


class PaymentInitiateResponse(BaseModel):
    payment_reference: str
    pay_url: str


class WebhookPaymentPayload(BaseModel):
    payment_reference: str
    status: str  # "paid" / "failed"


# -----------------------------
# In-memory storage (swap to DB later)
# -----------------------------
QUOTES: Dict[str, dict] = {}
CUTTING_LISTS: Dict[str, dict] = {}
PAYMENTS: Dict[str, dict] = {}
ORDERS: Dict[str, dict] = {}

# v1 project/workflow stores
PROJECTS: Dict[str, dict] = {}
ROOM_SPECS: Dict[str, dict] = {}
PROJECT_LAYOUTS: Dict[str, List[dict]] = {}
PROJECT_QUOTES: Dict[str, List[dict]] = {}
V1_QUOTES_BY_ID: Dict[str, dict] = {}

# -----------------------------
# Configuration
# -----------------------------
VAT_RATE = 0.15
WASTE_PCT = 0.15

CARCASS_THICKNESS = 16
BACK_THICKNESS = 3
GAP = 2  # door gaps

BASE_DEPTH = 570
WALL_DEPTH = 300

# If you later want to use legs in pricing/notes:
BASE_HEIGHTS = {
    720: {"carcass_h": 720, "legs_mm": 150},
    780: {"carcass_h": 780, "legs_mm": 100},
}

# Board specs (update prices/sizes to your suppliers)
BOARD_SPECS = {
    # 16mm Melamine boards (common SA: 2750 x 1830)
    "MEL16-WHITE": {"board_w_mm": 2750, "board_h_mm": 1830, "price_per_board": 780.0, "grain": False},
    "MEL16-GRAIN": {"board_w_mm": 2750, "board_h_mm": 1830, "price_per_board": 920.0, "grain": True},  # woodgrain
    # 3mm backs (often 2440 x 1220 hardboard)
    "HB3": {"board_w_mm": 2440, "board_h_mm": 1220, "price_per_board": 220.0, "grain": False},
}

# SKU catalog (add your full range here over time)
# Notes:
# - type: base / wall
# - w,h,d in mm
# - doors: 0/1/2
# - drawers: number of drawers
# - end_panels: count of extra end panels to add (+30mm depth, same height)
SKU_CATALOG = {
    "BASE600": {"type": "base", "w": 600, "h": 720, "d": BASE_DEPTH, "doors": 2, "drawers": 0, "end_panels": 0},
    "WALL600": {"type": "wall", "w": 600, "h": 720, "d": WALL_DEPTH, "doors": 2, "drawers": 0, "end_panels": 0},
    "BASE600_3DRW": {"type": "base", "w": 600, "h": 720, "d": BASE_DEPTH, "doors": 0, "drawers": 3, "end_panels": 0},
    "BASE600_END": {"type": "base", "w": 600, "h": 720, "d": BASE_DEPTH, "doors": 2, "drawers": 0, "end_panels": 1},
}

KITCHEN_STYLES = [
    {"key": "gallery", "label": "Galley / Studio", "run_modes": ["base"]},
    {"key": "parallel", "label": "Parallel", "run_modes": ["base", "wall"]},
    {"key": "lshape", "label": "L Shape", "run_modes": ["base", "wall"]},
    {"key": "ushape", "label": "U Shape", "run_modes": ["base", "wall", "tall"]},
]

CABINET_RATE_PER_MM = 2.75
HARDWARE_PRICES = {
    "HANDLE": 35.0,
    "HINGE": 18.0,
    "RUNNER": 110.0,
    "LEG": 22.0,
    "SHELF_PIN": 1.5,
    "SCREW_BOX": 280.0,
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def extract_width_mm(cabinet_key: str) -> int:
    clean = str(cabinet_key or "").upper()
    if clean.startswith("FRIDGE600"):
        return 640
    if clean.startswith("FRIDGE900"):
        return 940
    if clean.startswith("CORNERBASE900"):
        return 900
    if clean.startswith("CORNERWALL600"):
        return 600
    if clean.startswith("OVEN"):
        return 600
    if clean.startswith("TALLOWEN"):
        return 600

    match = re.search(r"(\d+)", clean)
    return int(match.group(1)) if match else 0


def calculate_project_quote_totals(cabinets: List[dict], hardware: List[dict]) -> Dict[str, float]:
    cabinet_run_mm = 0
    for row in cabinets:
        qty = int(row.get("qty", 0))
        width_mm = extract_width_mm(row.get("cabinet_key", ""))
        cabinet_run_mm += width_mm * max(qty, 0)

    cabinet_cost = cabinet_run_mm * CABINET_RATE_PER_MM

    hardware_cost = 0.0
    for row in hardware:
        key = str(row.get("hardware_key", "")).upper()
        qty = int(row.get("qty", 0))
        hardware_cost += HARDWARE_PRICES.get(key, 0.0) * max(qty, 0)

    subtotal = cabinet_cost + hardware_cost
    vat = subtotal * VAT_RATE
    total = subtotal + vat
    return {
        "subtotal": round(subtotal, 2),
        "vat": round(vat, 2),
        "total": round(total, 2),
    }


def require_project(project_id: str) -> dict:
    project = PROJECTS.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# -----------------------------
# Helpers
# -----------------------------
def mm2_to_m2(area_mm2: float) -> float:
    return area_mm2 / 1_000_000.0


def is_grain_material(material_code: str) -> bool:
    spec = BOARD_SPECS.get(material_code)
    return bool(spec and spec.get("grain"))


def add_part(
    parts: List[Part],
    *,
    name: str,
    w: int,
    h: int,
    th: int,
    mat: str,
    qty: int,
    grain: str,
    edging_mm: int
):
    parts.append(
        Part(
            name=name,
            width_mm=int(round(w)),
            height_mm=int(round(h)),
            thickness_mm=th,
            material_code=mat,
            qty=int(qty),
            grain=grain,
            edging_mm=int(round(edging_mm)),
        )
    )


def edging_rule(part_name: str, long_mm: int, short_mm: int) -> int:
    """
    Your rules:
    - Side panels: 1L + 1S (long=height, short=depth)
    - "Rest" carcass parts (top/bottom/shelf): 1L (long=front edge width)
    - Doors & Drawer fronts: all around (2*(w+h))
    - End panels: 1L + 2S (long=height, short=depth)
    """
    n = part_name.lower()
    if "door" in n or "drawer front" in n or "front" in n:
        # caller passes long=w, short=h for these
        return 2 * (long_mm + short_mm)

    if "end panel" in n:
        return long_mm + 2 * short_mm

    if "side" in n:
        return long_mm + short_mm

    # default carcass: 1 long
    return long_mm


def hinge_count_for_door(door_h: int) -> int:
    # sane default hinge counts
    if door_h <= 900:
        return 2
    if door_h <= 1500:
        return 3
    return 4


def generate_carcass_parts(material_code: str, sku: str, qty: int) -> Tuple[List[Part], Dict[str, int]]:
    if sku not in SKU_CATALOG:
        raise HTTPException(status_code=400, detail=f"Unknown SKU: {sku}")

    item = SKU_CATALOG[sku]
    w, h, d = item["w"], item["h"], item["d"]
    th = CARCASS_THICKNESS

    doors = int(item.get("doors", 0))
    drawers = int(item.get("drawers", 0))
    end_panels = int(item.get("end_panels", 0))

    parts: List[Part] = []
    hardware = {"hinges": 0, "runners_pairs": 0, "handles": 0}

    # Grain logic: carcass usually "none"; doors/fronts/end panels vertical if woodgrain
    door_grain = "vertical" if is_grain_material(material_code) else "none"
    endpanel_grain = "vertical" if is_grain_material(material_code) else "none"

    # --- CARCASS (16mm) ---
    # Side panels (depth x height). Edging: 1L(height)+1S(depth) => pass long=height, short=depth
    e_side = edging_rule("Side Panel", long_mm=h, short_mm=d)
    add_part(
        parts, name=f"{sku} - Side Panel",
        w=d, h=h, th=th, mat=material_code, qty=2 * qty,
        grain="none", edging_mm=e_side
    )

    internal_w = w - 2 * th

    # Top & Bottom (internal width x depth). Edging: 1L (front edge = internal width)
    e_tb = edging_rule("Bottom", long_mm=internal_w, short_mm=0)
    add_part(parts, name=f"{sku} - Bottom", w=internal_w, h=d, th=th, mat=material_code, qty=1 * qty, grain="none", edging_mm=e_tb)
    add_part(parts, name=f"{sku} - Top",    w=internal_w, h=d, th=th, mat=material_code, qty=1 * qty, grain="none", edging_mm=e_tb)

    # 1 shelf default (adjust per SKU later)
    e_sh = edging_rule("Shelf", long_mm=internal_w, short_mm=0)
    add_part(parts, name=f"{sku} - Shelf", w=internal_w, h=d, th=th, mat=material_code, qty=1 * qty, grain="none", edging_mm=e_sh)

    # --- BACK (3mm), always ---
    back_w = internal_w
    back_h = h - 2 * th
    add_part(parts, name=f"{sku} - Back (3mm)", w=back_w, h=back_h, th=BACK_THICKNESS, mat="HB3", qty=1 * qty, grain="none", edging_mm=0)

    # --- DOORS (16mm) ---
    if doors > 0:
        door_h = h - 2 * GAP

        if doors == 1:
            door_w = w - 2 * GAP
            e_d = edging_rule("Door", long_mm=door_w, short_mm=door_h)  # all around
            add_part(parts, name=f"{sku} - Door", w=door_w, h=door_h, th=th, mat=material_code, qty=1 * qty, grain=door_grain, edging_mm=e_d)
            hardware["hinges"] += hinge_count_for_door(door_h) * qty
            hardware["handles"] += 1 * qty
        else:
            mid_gap = GAP
            door_w = (w - 2 * GAP - mid_gap) / 2
            e_d = edging_rule("Door", long_mm=int(door_w), short_mm=door_h)
            add_part(parts, name=f"{sku} - Door (L/R)", w=door_w, h=door_h, th=th, mat=material_code, qty=doors * qty, grain=door_grain, edging_mm=e_d)
            hardware["hinges"] += hinge_count_for_door(door_h) * doors * qty
            hardware["handles"] += doors * qty

    # --- DRAWER FRONTS (16mm) ---
    if drawers > 0:
        front_w = w - 2 * GAP
        front_h = int((h - 2 * GAP - (drawers - 1) * GAP) / drawers)
        e_f = edging_rule("Drawer Front", long_mm=front_w, short_mm=front_h)  # all around
        add_part(parts, name=f"{sku} - Drawer Front", w=front_w, h=front_h, th=th, mat=material_code, qty=drawers * qty, grain=door_grain, edging_mm=e_f)

        hardware["runners_pairs"] += drawers * qty
        hardware["handles"] += drawers * qty

    # --- END PANELS (16mm) ---
    # "additional end panels 30mm wider but same height as cupboard"
    # We'll interpret as: depth + 30mm. Edging: 1L(height) + 2S(depth)
    if end_panels > 0:
        ep_depth = d + 30
        e_ep = edging_rule("End Panel", long_mm=h, short_mm=ep_depth)
        add_part(parts, name=f"{sku} - End Panel (+30mm)", w=ep_depth, h=h, th=th, mat=material_code, qty=end_panels * qty, grain=endpanel_grain, edging_mm=e_ep)

    return parts, hardware


def summarize_edging(parts: List[Part]) -> Dict[str, float]:
    sums_mm: Dict[str, int] = {}
    for p in parts:
        if p.edging_mm <= 0:
            continue
        sums_mm[p.material_code] = sums_mm.get(p.material_code, 0) + (p.edging_mm * p.qty)
    return {mat: round(mm / 1000.0, 2) for mat, mm in sums_mm.items()}


def summarize_hardware(hardware_rows: List[Dict[str, int]]) -> Dict[str, int]:
    out = {"hinges": 0, "runners_pairs": 0, "handles": 0}
    for row in hardware_rows:
        for k in out:
            out[k] += int(row.get(k, 0))
    return out


def generate_parts_and_counts(material_code: str, units: List[UnitRequest]) -> Tuple[List[Part], Dict[str, float], Dict[str, int]]:
    all_parts: List[Part] = []
    hardware_rows: List[Dict[str, int]] = []

    for u in units:
        parts, hw = generate_carcass_parts(material_code, u.sku, u.qty)
        all_parts.extend(parts)
        hardware_rows.append(hw)

    edging_summary = summarize_edging(all_parts)
    hardware_summary = summarize_hardware(hardware_rows)
    return all_parts, edging_summary, hardware_summary


def estimate_boards_needed_multi(parts: List[Part]) -> Dict[str, Dict[str, float]]:
    grouped_area: Dict[str, float] = {}

    for p in parts:
        area_m2 = mm2_to_m2(p.width_mm * p.height_mm) * p.qty
        grouped_area[p.material_code] = grouped_area.get(p.material_code, 0.0) + area_m2

    out: Dict[str, Dict[str, float]] = {}

    for mat, total_area_m2 in grouped_area.items():
        spec = BOARD_SPECS.get(mat)
        if not spec:
            raise HTTPException(status_code=400, detail=f"Unknown material_code in parts: {mat}")

        board_area_m2 = mm2_to_m2(spec["board_w_mm"] * spec["board_h_mm"])
        adjusted_area_m2 = total_area_m2 * (1.0 + WASTE_PCT)
        boards_needed = math.ceil(adjusted_area_m2 / board_area_m2)

        out[mat] = {
            "total_area_m2": round(total_area_m2, 4),
            "adjusted_area_m2": round(adjusted_area_m2, 4),
            "board_area_m2": round(board_area_m2, 4),
            "boards_needed": float(boards_needed),
        }

    return out


def calculate_quote_totals_multi(board_summary: Dict[str, Dict[str, float]]) -> Dict[str, float]:
    board_cost = 0.0
    for mat, info in board_summary.items():
        spec = BOARD_SPECS[mat]
        boards_needed = int(info["boards_needed"])
        board_cost += boards_needed * spec["price_per_board"]

    # Later you can add:
    # - edging cost per meter
    # - hardware cost
    # - labour
    # - delivery
    extras = 0.0

    subtotal = board_cost + extras
    vat = subtotal * VAT_RATE
    total = subtotal + vat

    return {
        "subtotal": round(subtotal, 2),
        "vat": round(vat, 2),
        "total": round(total, 2),
        "board_cost": round(board_cost, 2),
        "extras": round(extras, 2),
    }


# -----------------------------
# Routes
# -----------------------------
@app.get("/v1/kitchen-styles")
def get_kitchen_styles():
    return {"styles": KITCHEN_STYLES}


@app.post("/v1/projects", response_model=ProjectResponse)
def create_project(payload: ProjectCreateRequest):
    project_id = str(uuid4())
    timestamp = now_utc()
    record = {
        "id": project_id,
        "name": payload.name,
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email,
        "kitchen_style": payload.kitchen_style,
        "status": "draft",
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    PROJECTS[project_id] = record
    PROJECT_LAYOUTS.setdefault(project_id, [])
    PROJECT_QUOTES.setdefault(project_id, [])
    return ProjectResponse(**record)


@app.get("/v1/projects", response_model=List[ProjectResponse])
def list_projects():
    projects = sorted(PROJECTS.values(), key=lambda p: p["created_at"], reverse=True)
    return [ProjectResponse(**p) for p in projects]


@app.get("/v1/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    project = require_project(project_id)
    return ProjectResponse(**project)


@app.patch("/v1/projects/{project_id}", response_model=ProjectResponse)
def patch_project(project_id: str, payload: ProjectPatchRequest):
    project = require_project(project_id)
    updates = payload.model_dump(exclude_unset=True)
    if updates:
        project.update(updates)
        project["updated_at"] = now_utc()
    return ProjectResponse(**project)


@app.post("/v1/projects/{project_id}/room-spec", response_model=RoomSpecResponse)
def upsert_room_spec(project_id: str, payload: RoomSpecUpsertRequest):
    require_project(project_id)
    timestamp = now_utc()
    record = {
        "project_id": project_id,
        **payload.model_dump(),
        "updated_at": timestamp,
    }
    ROOM_SPECS[project_id] = record
    PROJECTS[project_id]["updated_at"] = timestamp
    return RoomSpecResponse(**record)


@app.get("/v1/projects/{project_id}/room-spec", response_model=RoomSpecResponse)
def get_room_spec(project_id: str):
    require_project(project_id)
    room = ROOM_SPECS.get(project_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room spec not found")
    return RoomSpecResponse(**room)


@app.post("/v1/projects/{project_id}/layouts", response_model=LayoutResponse)
def save_project_layout(project_id: str, payload: LayoutSaveRequest):
    require_project(project_id)
    layout_id = str(uuid4())
    timestamp = now_utc()
    record = {
        "id": layout_id,
        "project_id": project_id,
        **payload.model_dump(),
        "created_at": timestamp,
    }
    PROJECT_LAYOUTS.setdefault(project_id, []).append(record)
    PROJECTS[project_id]["kitchen_style"] = payload.kitchen_style
    PROJECTS[project_id]["updated_at"] = timestamp
    return LayoutResponse(**record)


@app.get("/v1/projects/{project_id}/layouts", response_model=List[LayoutResponse])
def list_project_layouts(project_id: str):
    require_project(project_id)
    layouts = PROJECT_LAYOUTS.get(project_id, [])
    return [LayoutResponse(**row) for row in layouts]


@app.post("/v1/projects/{project_id}/quotes", response_model=ProjectQuoteResponse)
def create_project_quote(project_id: str, payload: ProjectQuoteCreateRequest):
    project = require_project(project_id)
    quote_id = str(uuid4())
    timestamp = now_utc()

    cabinets = [row.model_dump() for row in payload.cabinets]
    hardware = [row.model_dump() for row in payload.hardware]
    totals = calculate_project_quote_totals(cabinets, hardware)

    record = {
        "id": quote_id,
        "project_id": project_id,
        "customer_name": payload.customer_name or project["customer_name"],
        "customer_email": payload.customer_email or project["customer_email"],
        "cabinets": cabinets,
        "hardware": hardware,
        "layout": payload.layout.model_dump(),
        "subtotal": totals["subtotal"],
        "vat": totals["vat"],
        "total": totals["total"],
        "created_at": timestamp,
    }

    PROJECT_QUOTES.setdefault(project_id, []).append(record)
    V1_QUOTES_BY_ID[quote_id] = record

    project["status"] = "quoted"
    project["kitchen_style"] = payload.layout.kitchen_style
    project["updated_at"] = timestamp

    return ProjectQuoteResponse(**record)


@app.get("/v1/projects/{project_id}/quotes", response_model=List[ProjectQuoteResponse])
def list_project_quotes(project_id: str):
    require_project(project_id)
    quotes = PROJECT_QUOTES.get(project_id, [])
    return [ProjectQuoteResponse(**row) for row in quotes]


@app.get("/v1/quotes/{quote_id}", response_model=ProjectQuoteResponse)
def get_project_quote(quote_id: str):
    quote = V1_QUOTES_BY_ID.get(quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return ProjectQuoteResponse(**quote)


@app.get("/")
def home():
    return {"status": "ok", "message": "DIY Cupboards API running"}


@app.post("/quotes", response_model=QuotePublicView)
def create_quote(payload: QuoteCreateRequest):
    quote_id = str(uuid4())

    parts, edging_summary, hardware_summary = generate_parts_and_counts(payload.material_code, payload.units)
    board_summary = estimate_boards_needed_multi(parts)
    totals = calculate_quote_totals_multi(board_summary)

    QUOTES[quote_id] = {
        "quote_id": quote_id,
        "customer_name": payload.customer_name,
        "customer_email": payload.customer_email,
        "material_code": payload.material_code,
        "units": [u.model_dump() for u in payload.units],
        "status": "quoted",
        "totals": totals,
    }

    # Cutting list is INTERNAL ONLY (admin)
    CUTTING_LISTS[quote_id] = {
        "quote_id": quote_id,
        "parts": [p.model_dump() for p in parts],
        "board_summary": board_summary,
        "edging_summary": edging_summary,
        "hardware_summary": hardware_summary,
        "internal_costing": totals,
    }

    return QuotePublicView(
        quote_id=quote_id,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        subtotal=totals["subtotal"],
        vat=totals["vat"],
        total=totals["total"],
        status="quoted",
    )


@app.get("/quotes/{quote_id}", response_model=QuotePublicView)
def get_quote_public(quote_id: str):
    q = QUOTES.get(quote_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")

    t = q["totals"]
    return QuotePublicView(
        quote_id=quote_id,
        customer_name=q["customer_name"],
        customer_email=q["customer_email"],
        subtotal=t["subtotal"],
        vat=t["vat"],
        total=t["total"],
        status=q["status"],
    )


@app.get("/admin/quotes/{quote_id}/cutting-list", response_model=CuttingList)
def get_cutting_list_admin(quote_id: str, _role=Depends(require_role("admin"))):
    cl = CUTTING_LISTS.get(quote_id)
    if not cl:
        raise HTTPException(status_code=404, detail="Cutting list not found")
    return CuttingList(**cl)


@app.post("/admin/cutting-list/from-order", response_model=CuttingList)
def cutting_list_from_order(payload: OrderListRequest, _role=Depends(require_role("admin"))):
    parts, edging_summary, hardware_summary = generate_parts_and_counts(payload.material_code, payload.units)
    board_summary = estimate_boards_needed_multi(parts)
    totals = calculate_quote_totals_multi(board_summary)

    internal_id = str(uuid4())
    return CuttingList(
        quote_id=internal_id,
        parts=parts,
        board_summary=board_summary,
        edging_summary=edging_summary,
        hardware_summary=hardware_summary,
        internal_costing=totals,
    )


@app.post("/payments/initiate", response_model=PaymentInitiateResponse)
def initiate_payment(payload: PaymentInitiateRequest):
    q = QUOTES.get(payload.quote_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")
    if q["status"] in ("paid", "ordered"):
        raise HTTPException(status_code=400, detail="Quote already paid/ordered")

    payment_reference = f"PAY-{uuid4()}"
    PAYMENTS[payment_reference] = {
        "payment_reference": payment_reference,
        "quote_id": payload.quote_id,
        "status": "pending",
    }

    # Replace with real provider later (PayFast/Ozow/Yoco/etc.)
    pay_url = f"https://payments.example.com/pay/{payment_reference}"
    return PaymentInitiateResponse(payment_reference=payment_reference, pay_url=pay_url)


@app.post("/payments/webhook")
async def payment_webhook(req: Request):
    body = await req.json()
    payload = WebhookPaymentPayload(**body)

    payment = PAYMENTS.get(payload.payment_reference)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment reference not found")

    payment["status"] = payload.status
    quote_id = payment["quote_id"]

    if payload.status == "paid":
        if quote_id in QUOTES:
            QUOTES[quote_id]["status"] = "paid"

            order_id = str(uuid4())
            ORDERS[order_id] = {"order_id": order_id, "quote_id": quote_id, "status": "new"}

            QUOTES[quote_id]["status"] = "ordered"
            return {"ok": True, "order_id": order_id}

        return {"ok": False, "message": "Quote missing"}

    return {"ok": True, "message": "Payment not successful"}


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    o = ORDERS.get(order_id)
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"order_id": o["order_id"], "quote_id": o["quote_id"], "status": o["status"]}
