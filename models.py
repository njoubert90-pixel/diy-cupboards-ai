from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


KitchenStyle = Literal["gallery", "parallel", "lshape", "ushape"]
RunMode = Literal["base", "wall", "tall"]


class RoomFeature(BaseModel):
	label: str = ""
	wall: Optional[str] = None
	offset_mm: int = Field(default=0, ge=0)
	width_mm: int = Field(default=0, ge=0)
	height_mm: int = Field(default=0, ge=0)
	note: str = ""


class RoomSpecUpsertRequest(BaseModel):
	room_width_mm: int = Field(ge=1000)
	room_depth_mm: int = Field(ge=1000)
	ceiling_height_mm: int = Field(default=2700, ge=1800)
	doors: List[RoomFeature] = Field(default_factory=list)
	windows: List[RoomFeature] = Field(default_factory=list)
	water_points: List[RoomFeature] = Field(default_factory=list)
	electrical_points: List[RoomFeature] = Field(default_factory=list)


class RoomSpecResponse(RoomSpecUpsertRequest):
	project_id: str
	updated_at: datetime


class ProjectCreateRequest(BaseModel):
	name: str = Field(min_length=1, max_length=120)
	customer_name: str = ""
	customer_email: str = ""
	kitchen_style: KitchenStyle = "gallery"


class ProjectPatchRequest(BaseModel):
	name: Optional[str] = Field(default=None, min_length=1, max_length=120)
	customer_name: Optional[str] = None
	customer_email: Optional[str] = None
	kitchen_style: Optional[KitchenStyle] = None
	status: Optional[Literal["draft", "quoted", "approved", "ordered", "in_production", "installed", "completed"]] = None


class ProjectResponse(BaseModel):
	id: str
	name: str
	customer_name: str
	customer_email: str
	kitchen_style: KitchenStyle
	status: str
	created_at: datetime
	updated_at: datetime


class LayoutRun(BaseModel):
	mode: RunMode
	run_width_mm: int = Field(ge=0)
	sequence: List[str] = Field(default_factory=list)
	left_filler_mm: int = Field(default=0, ge=0)
	right_filler_mm: int = Field(default=0, ge=0)


class LayoutSaveRequest(BaseModel):
	name: str = Field(min_length=1, max_length=120)
	kitchen_style: KitchenStyle
	runs: List[LayoutRun] = Field(default_factory=list)
	note: str = ""


class LayoutResponse(LayoutSaveRequest):
	id: str
	project_id: str
	created_at: datetime


class QuoteCabinetLine(BaseModel):
	cabinet_key: str
	qty: int = Field(ge=1)


class QuoteHardwareLine(BaseModel):
	hardware_key: str
	qty: int = Field(ge=1)


class QuoteLayoutMeta(BaseModel):
	kitchen_style: KitchenStyle
	room_width_mm: int = Field(default=0, ge=0)
	left_filler_mm: int = Field(default=0, ge=0)
	right_filler_mm: int = Field(default=0, ge=0)
	cabinet_run_mm: int = Field(default=0, ge=0)
	total_run_with_fillers_mm: int = Field(default=0, ge=0)
	remaining_space_mm: int = Field(default=0)


class ProjectQuoteCreateRequest(BaseModel):
	customer_name: str = ""
	customer_email: str = ""
	cabinets: List[QuoteCabinetLine] = Field(default_factory=list)
	hardware: List[QuoteHardwareLine] = Field(default_factory=list)
	layout: QuoteLayoutMeta


class ProjectQuoteResponse(BaseModel):
	id: str
	project_id: str
	customer_name: str
	customer_email: str
	cabinets: List[QuoteCabinetLine]
	hardware: List[QuoteHardwareLine]
	layout: QuoteLayoutMeta
	subtotal: float
	vat: float
	total: float
	created_at: datetime
