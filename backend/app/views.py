from sqlalchemy import select
from .models import Action, Feedback, IncidentType, TrainingSession, Scenario, User
from .domain import TRANSITIONS, STATUS_LABELS, seconds_since


def event_view(item):
    return {
        "id": item.id,
        "kind": item.kind,
        "payload": item.payload,
        "created_at": item.created_at.isoformat(),
        "actor_id": item.actor_id,
    }


def incident_view(db, item, detail=False):
    kind = db.get(IncidentType, item.incident_type_id)
    session = db.get(TrainingSession, item.session_id) if item.session_id else None
    elapsed = seconds_since(item.created_at, item.acknowledged_at or (session.finished_at if session else None))
    result = {
        "id": item.id,
        "number": item.id[:8].upper(),
        "owner_id": item.owner_id,
        "session_id": item.session_id,
        "caller_number": item.caller_number,
        "name": item.name,
        "address": item.address,
        "incident_type_id": item.incident_type_id,
        "incident_type": kind.name,
        "comments": item.comments,
        "status": item.response_status,
        "status_label": STATUS_LABELS[item.response_status],
        "version": item.version,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
        "acknowledged_at": item.acknowledged_at.isoformat() if item.acknowledged_at else None,
        "acknowledgement_seconds": round(elapsed, 1),
        "overdue": elapsed > 30,
        "allowed_statuses": TRANSITIONS[item.response_status] if not session or session.status == "active" else [],
        "session_status": session.status if session else None,
        "finished_at": session.finished_at.isoformat() if session and session.finished_at else None,
    }
    if detail:
        events = db.scalars(
            select(Action).where(Action.incident_id == item.id).order_by(Action.created_at, Action.id)
        ).all()
        result["events"] = [event_view(e) for e in events]
        result["classification"] = kind.data
        result["evaluation"] = session.evaluation if session else None
        result["scenario"] = scenario_view(db.get(Scenario, session.scenario_id)) if session else None
        result["feedback"] = (
            [
                feedback_view(f)
                for f in db.scalars(
                    select(Feedback).where(Feedback.session_id == item.session_id).order_by(Feedback.created_at)
                )
            ]
            if session
            else []
        )
    return result


def feedback_view(item):
    return {
        "id": item.id,
        "comment": item.comment,
        "verdict": item.verdict,
        "author_id": item.author_id,
        "created_at": item.created_at.isoformat(),
    }


def scenario_view(s):
    return {
        "id": s.id,
        "title": s.title,
        "difficulty": s.difficulty,
        "prompt": s.data["prompt"],
        "source": s.data["source"],
        "service": s.data["service"],
        "briefing": s.data.get("briefing", []),
    }


def session_view(db, s):
    from .models import Incident

    incident = db.scalar(select(Incident).where(Incident.session_id == s.id))
    user = db.get(User, s.user_id)
    return {
        "id": s.id,
        "trainee": user.name,
        "user_id": s.user_id,
        "scenario": db.get(Scenario, s.scenario_id).title,
        "status": s.status,
        "started_at": s.started_at.isoformat(),
        "incident_id": incident.id if incident else None,
        "evaluation": s.evaluation,
        "feedback": [
            feedback_view(f)
            for f in db.scalars(select(Feedback).where(Feedback.session_id == s.id).order_by(Feedback.created_at))
        ],
    }
