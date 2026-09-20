from fastapi import HTTPException
from sqlalchemy import select
from .models import Action, Incident, TrainingSession, utcnow

STATUS_LABELS = {
    "added": "Добавлена",
    "received": "Получена службой",
    "accepted": "Принята",
    "rejected": "Не принята",
    "responding": "Начало реагирования",
    "arrived": "Прибытие",
    "working": "Проведение работ",
    "completed": "Работы завершены",
    "refused": "Отказ от выполнения работ",
}
TERMINAL = {"completed", "refused"}
# Memo pp.21-26 permits a choice of work stages after acceptance, not forced arrival.
TRANSITIONS = {
    "added": ["accepted", "rejected"],
    "received": ["accepted", "rejected"],
    "rejected": ["accepted"],
    "accepted": ["responding", "arrived", "working", "completed", "refused"],
    "responding": ["arrived", "working", "completed", "refused"],
    "arrived": ["working", "completed", "refused"],
    "working": ["completed", "refused"],
    "completed": [],
    "refused": [],
}


def seconds_since(start, end=None):
    from datetime import timezone

    return max(0, ((end or utcnow()).replace(tzinfo=timezone.utc) - start.replace(tzinfo=timezone.utc)).total_seconds())


def incident_for(db, id, user, write=False):
    incident = db.scalar(select(Incident).where(Incident.id == id, Incident.deleted.is_(False)).with_for_update())
    if not incident:
        raise HTTPException(404, "Карточка не найдена")
    if user.role == "trainee" and incident.owner_id != user.id:
        raise HTTPException(404, "Карточка не найдена")
    if write and incident.owner_id != user.id:
        raise HTTPException(403, "Изменять карточку может только её обучающийся")
    return incident


def editable(db, incident, version=None):
    if incident.response_status in TERMINAL:
        raise HTTPException(409, "Карточка закрыта для редактирования")
    if incident.session_id and db.get(TrainingSession, incident.session_id).status != "active":
        raise HTTPException(409, "Занятие завершено")
    if version is not None and version != incident.version:
        raise HTTPException(409, "Карточка изменена. Обновите данные перед сохранением")


def record(db, incident, user, kind, payload):
    db.add(Action(incident_id=incident.id, actor_id=user.id, kind=kind, payload=payload))
    incident.version += 1
    incident.updated_at = utcnow()


def close_call(db, incident, user):
    previous = db.scalar(
        select(Action)
        .where(Action.incident_id == incident.id, Action.kind == "communication")
        .order_by(Action.created_at.desc())
        .limit(1)
    )
    if previous and previous.payload["action"] != "hangup":
        record(db, incident, user, "communication", {"action": "hangup", "mode": "mock", "reason": "training_closed"})


def react(db, incident, user, request):
    editable(db, incident, request.version)
    if request.status not in TRANSITIONS[incident.response_status]:
        raise HTTPException(409, "Недопустимый переход статуса")
    if request.status in {"rejected", "refused"} and not request.comment:
        raise HTTPException(422, "Укажите причину отказа и сведения о передаче информации")
    if request.status in {"accepted", "rejected"} and not incident.acknowledged_at:
        incident.acknowledged_at = utcnow()
    incident.response_status = request.status
    record(db, incident, user, "reaction", {"status": request.status, "comment": request.comment})
    if request.status in TERMINAL:
        close_call(db, incident, user)
