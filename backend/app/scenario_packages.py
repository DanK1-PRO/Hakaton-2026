"""Shared validation for reviewed/generated scenario packages."""

from typing import Literal

from pydantic import BaseModel, Field

from .schemas import IncidentInput


class ScenarioReference(BaseModel):
    version: str = Field(min_length=1)
    address: str = Field(min_length=1)
    incident_type_id: int
    expected_actions: list[
        Literal["accepted", "rejected", "responding", "arrived", "working", "completed", "refused"]
    ] = Field(min_length=1)


class ScenarioPackage(BaseModel):
    schema_version: Literal["1.0"]
    id: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=300)
    difficulty: Literal["easy", "medium", "hard"]
    service: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    briefing: list[str]
    card: IncidentInput
    reference: ScenarioReference
    source: dict


def validate_packages(items, classifier_ids):
    if not isinstance(items, list) or not items:
        raise ValueError("Ожидался непустой список сценариев")
    ids = set()
    for item in items:
        case = ScenarioPackage.model_validate(item)
        if case.id in ids:
            raise ValueError("Повторяющийся идентификатор сценария: " + case.id)
        ids.add(case.id)
        if case.card.incident_type_id not in classifier_ids or case.reference.incident_type_id not in classifier_ids:
            raise ValueError("Тип происшествия не найден в классификаторе: " + case.id)
        if not case.source.get("type") or not case.source.get("status"):
            raise ValueError("Не заполнен источник сценария (source): " + case.id)
    return items
