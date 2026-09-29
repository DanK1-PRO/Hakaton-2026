from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Role = Literal["trainee", "instructor", "administrator"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class IncidentInput(StrictModel):
    caller_number: str = Field(default="", max_length=30)
    name: str = Field(default="", max_length=150)
    address: str = Field(min_length=1, max_length=500)
    incident_type_id: int
    comments: str = Field(default="", max_length=2048)


class IncidentEdit(IncidentInput):
    version: int = Field(ge=1)


class ReactionInput(StrictModel):
    status: Literal["accepted", "rejected", "responding", "arrived", "working", "completed", "refused"]
    comment: str = Field(default="", max_length=2048)
    version: int = Field(ge=1)


class SessionInput(StrictModel):
    scenario_id: str


class CommunicationInput(StrictModel):
    action: Literal["ring", "answer", "hangup"]


class FeedbackInput(StrictModel):
    comment: str = Field(min_length=1, max_length=2048)
    verdict: Literal["confirmed", "corrected", "review_required"]


class UserInput(StrictModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    name: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=12, max_length=128)
    role: Role


class EvaluationRequest(StrictModel):
    schema_version: Literal["1.0"] = "1.0"
    session_id: str
    card: dict
    actions: list[dict]
    reference: dict
    timing: dict


class EvaluationResult(StrictModel):
    schema_version: Literal["1.0"] = "1.0"
    session_id: str
    model_version: str
    reference_version: str
    mode: Literal["mock", "local", "fallback"]
    score: float | None = Field(default=None, ge=0, le=10, allow_inf_nan=False)
    critical_errors: list[str] = Field(default_factory=list)
    field_errors: list[dict] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    timing: dict = Field(default_factory=dict)
    routing_assessment: dict = Field(default_factory=dict)
    comment_quality: dict = Field(default_factory=dict)
    explanation: str


class ScenarioGenerateInput(StrictModel):
    incident_type_id: int
    count: int = Field(default=1, ge=1, le=3)
    difficulty: Literal["easy", "medium", "hard"] | None = None


class ScenarioImportInput(StrictModel):
    items: list[dict] = Field(min_length=1, max_length=10)
