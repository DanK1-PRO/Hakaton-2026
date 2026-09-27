import csv
import io
import anyio
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..auth import current_user, staff, admin, authenticate, token_for, user_view, passwords
from ..db import get_db
from ..models import User, IncidentType, Incident, Scenario, TrainingSession, Action, Feedback, utcnow
from ..schemas import (
    IncidentInput,
    IncidentEdit,
    ReactionInput,
    SessionInput,
    CommunicationInput,
    FeedbackInput,
    UserInput,
    EvaluationRequest,
)
from ..domain import incident_for, editable, record, react, close_call, seconds_since, STATUS_LABELS
from ..views import incident_view, scenario_view, session_view
from ..ml_gateway import gateway

router = APIRouter(prefix="/api/v1")


@router.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate(db, form.username, form.password)
    if not user:
        raise HTTPException(401, "Неверная почта или пароль")
    return {"access_token": token_for(user), "token_type": "bearer", "user": user_view(user)}


@router.get("/auth/me")
def me(user=Depends(current_user)):
    return user_view(user)


@router.get("/reference/statuses")
def statuses(user=Depends(current_user)):
    return STATUS_LABELS


@router.get("/incident-types")
def types(
    q: str = "", limit: int = Query(50, ge=1, le=2000), db: Session = Depends(get_db), user=Depends(current_user)
):
    query = select(IncidentType)
    if q:
        query = query.where(IncidentType.name.ilike(f"%{q}%") | IncidentType.external_code.ilike(f"%{q}%"))
    return [
        {"id": x.id, "external_code": x.external_code, "name": x.name}
        for x in db.scalars(query.order_by(IncidentType.id).limit(limit))
    ]


@router.get("/incidents")
def incidents(
    q: str = "",
    status: str = "",
    type_id: int | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    sort: str = "newest",
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    query = select(Incident).where(Incident.deleted.is_(False))
    if user.role == "trainee":
        query = query.where(Incident.owner_id == user.id)
    if q:
        query = query.where(
            Incident.address.ilike(f"%{q}%")
            | Incident.comments.ilike(f"%{q}%")
            | Incident.caller_number.ilike(f"%{q}%")
            | Incident.id.ilike(f"%{q}%")
        )
    if status:
        query = query.where(Incident.response_status == status)
    if type_id:
        query = query.where(Incident.incident_type_id == type_id)
    count = db.scalar(select(func.count()).select_from(query.subquery()))
    query = query.order_by(Incident.created_at.asc() if sort == "oldest" else Incident.created_at.desc(), Incident.id)
    return {
        "items": [incident_view(db, x) for x in db.scalars(query.offset((page - 1) * size).limit(size))],
        "total": count,
    }


@router.post("/incidents", status_code=201)
def create(data: IncidentInput, db: Session = Depends(get_db), user=Depends(current_user)):
    if not db.get(IncidentType, data.incident_type_id):
        raise HTTPException(422, "Тип происшествия отсутствует в классификаторе")
    incident = Incident(**data.model_dump(), owner_id=user.id, version=1)
    db.add(incident)
    db.flush()
    record(db, incident, user, "created", {"source": "manual_training"})
    db.commit()
    return incident_view(db, incident, True)


@router.get("/incidents/{id}")
def detail(id: str, db: Session = Depends(get_db), user=Depends(current_user)):
    return incident_view(db, incident_for(db, id, user), True)


@router.post("/incidents/{id}/open")
def open_card(id: str, db: Session = Depends(get_db), user=Depends(current_user)):
    incident = incident_for(db, id, user, True)
    if incident.response_status == "added":
        editable(db, incident)
        incident.response_status = "received"
        record(db, incident, user, "opened", {"status": "received"})
        db.commit()
    return incident_view(db, incident, True)


@router.patch("/incidents/{id}")
def edit(id: str, data: IncidentEdit, db: Session = Depends(get_db), user=Depends(current_user)):
    incident = incident_for(db, id, user, True)
    editable(db, incident, data.version)
    if not db.get(IncidentType, data.incident_type_id):
        raise HTTPException(422, "Тип происшествия отсутствует в классификаторе")
    for key, value in data.model_dump(exclude={"version"}).items():
        setattr(incident, key, value)
    record(db, incident, user, "updated", data.model_dump(exclude={"version"}))
    db.commit()
    return incident_view(db, incident, True)


@router.delete("/incidents/{id}", status_code=204)
def delete(id: str, db: Session = Depends(get_db), user=Depends(current_user)):
    incident = incident_for(db, id, user, True)
    if incident.session_id:
        raise HTTPException(409, "Учебная карточка сохраняется в журнале занятия")
    incident.deleted = True
    record(db, incident, user, "deleted", {})
    db.commit()
    return Response(status_code=204)


@router.post("/incidents/{id}/reaction")
def reaction(id: str, data: ReactionInput, db: Session = Depends(get_db), user=Depends(current_user)):
    incident = incident_for(db, id, user, True)
    react(db, incident, user, data)
    db.commit()
    return incident_view(db, incident, True)


@router.post("/incidents/{id}/communication")
def communication(id: str, data: CommunicationInput, db: Session = Depends(get_db), user=Depends(current_user)):
    incident = incident_for(db, id, user, True)
    editable(db, incident)
    previous = db.scalar(
        select(Action)
        .where(Action.incident_id == id, Action.kind == "communication")
        .order_by(Action.created_at.desc())
        .limit(1)
    )
    state = previous.payload["action"] if previous else "hangup"
    allowed = {"hangup": ["ring"], "ring": ["answer", "hangup"], "answer": ["hangup"]}
    if data.action not in allowed[state]:
        raise HTTPException(409, "Недопустимое действие телефонного тренажёра")
    record(db, incident, user, "communication", {"action": data.action, "mode": "mock"})
    db.commit()
    return incident_view(db, incident, True)


EXPECTED_HINTS = {
    "accepted": "Принять",
    "rejected": "Не принимать",
}


@router.get("/scenarios")
def scenarios(db: Session = Depends(get_db), user=Depends(current_user)):
    items = []
    for s in db.scalars(select(Scenario).order_by(Scenario.id)):
        view = scenario_view(s)
        expected = (s.data.get("reference") or {}).get("expected_actions") or []
        first = expected[0] if expected else None
        view["expected_hint"] = EXPECTED_HINTS.get(first)
        items.append(view)
    return items


@router.post("/simulation/sessions", status_code=201)
def start(data: SessionInput, db: Session = Depends(get_db), user=Depends(current_user)):
    scenario = db.get(Scenario, data.scenario_id)
    if not scenario:
        raise HTTPException(404, "Сценарий не найден")
    db.scalar(select(User).where(User.id == user.id).with_for_update())
    active = db.scalar(
        select(TrainingSession).where(TrainingSession.user_id == user.id, TrainingSession.status == "active")
    )
    if active:
        existing = db.scalar(select(Incident).where(Incident.session_id == active.id))
        return incident_view(db, existing, True)
    session = TrainingSession(user_id=user.id, scenario_id=scenario.id)
    db.add(session)
    db.flush()
    card = scenario.data["card"]
    incident = Incident(owner_id=user.id, session_id=session.id, version=1, **card)
    db.add(incident)
    db.flush()
    record(db, incident, user, "incoming", {"source": "scenario", "scenario_id": scenario.id, "mode": "message"})
    db.commit()
    return incident_view(db, incident, True)


@router.post("/simulation/sessions/{id}/finish")
def finish(id: str, db: Session = Depends(get_db), user=Depends(current_user)):
    session = db.scalar(select(TrainingSession).where(TrainingSession.id == id).with_for_update())
    if not session or (user.role == "trainee" and session.user_id != user.id):
        raise HTTPException(404, "Занятие не найдено")
    if session.status == "finished":
        return session.evaluation
    incident = db.scalar(select(Incident).where(Incident.session_id == id).with_for_update())
    now = utcnow()
    close_call(db, incident, user)
    reference = db.get(Scenario, session.scenario_id).data["reference"]
    detail = incident_view(db, incident, True)
    reaction_actions = db.scalars(
        select(Action).where(Action.incident_id == incident.id, Action.kind == "reaction").order_by(Action.created_at)
    ).all()
    first_response = next(
        (action for action in reaction_actions if action.payload.get("comment", "").strip()),
        None,
    )
    timing = {
        "elapsed_seconds": round(seconds_since(session.started_at, now), 1),
        "acknowledgement_seconds": round(seconds_since(incident.created_at, incident.acknowledged_at), 1)
        if incident.acknowledged_at
        else None,
        "acknowledgement_deadline_seconds": 30,
        "first_response_seconds": round(seconds_since(incident.created_at, first_response.created_at), 1)
        if first_response
        else None,
        "first_response_deadline_seconds": 180,
    }
    request = EvaluationRequest(
        session_id=id, card=detail, actions=detail["events"], reference=reference, timing=timing
    )
    # The synchronous DB lock stays in a worker thread while the ML call waits.
    result = anyio.run(gateway.evaluate, request)
    session.evaluation = result.model_dump()
    session.status = "finished"
    session.finished_at = now
    record(db, incident, user, "finished", {"mode": result.mode})
    db.commit()
    return session.evaluation


@router.get("/simulation/sessions")
def sessions(db: Session = Depends(get_db), user=Depends(current_user)):
    query = select(TrainingSession).order_by(TrainingSession.started_at.desc()).limit(200)
    if user.role == "trainee":
        query = query.where(TrainingSession.user_id == user.id)
    return [session_view(db, s) for s in db.scalars(query)]


@router.post("/instructor/sessions/{id}/feedback", status_code=201)
def feedback(id: str, data: FeedbackInput, db: Session = Depends(get_db), user=Depends(staff)):
    session = db.get(TrainingSession, id)
    if not session:
        raise HTTPException(404, "Занятие не найдено")
    if session.status != "finished":
        raise HTTPException(409, "Сначала завершите занятие")
    db.add(Feedback(session_id=id, author_id=user.id, **data.model_dump()))
    db.commit()
    return session_view(db, session)


@router.get("/instructor/report.csv")
def report(db: Session = Depends(get_db), user=Depends(staff)):
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["Занятие", "Обучающийся", "Сценарий", "Состояние", "Ошибки", "Замечания преподавателя"])
    for s in db.scalars(select(TrainingSession).order_by(TrainingSession.started_at.desc())):
        view = session_view(db, s)
        row = [
            s.id,
            view["trainee"],
            view["scenario"],
            s.status,
            len((s.evaluation or {}).get("critical_errors", [])),
            " | ".join(f["comment"] for f in view["feedback"]),
        ]
        writer.writerow(["'" + str(v) if str(v).startswith(("=", "+", "-", "@", "\t", "\r")) else v for v in row])
    return Response(
        "\ufeff" + stream.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="training-report.csv"'},
    )


@router.get("/ml/status")
async def ml_status(user=Depends(current_user)):
    return await gateway.status()


@router.get("/admin/users")
def users(db: Session = Depends(get_db), user=Depends(admin)):
    return [user_view(u) | {"active": u.active} for u in db.scalars(select(User).order_by(User.email))]


@router.post("/admin/users", status_code=201)
def add_user(data: UserInput, db: Session = Depends(get_db), user=Depends(admin)):
    if db.scalar(select(User).where(User.email == data.email.lower())):
        raise HTTPException(409, "Пользователь с такой почтой уже существует")
    new = User(email=data.email.lower(), name=data.name, role=data.role, password_hash=passwords.hash(data.password))
    db.add(new)
    db.commit()
    return user_view(new)
