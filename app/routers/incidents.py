# incidents.py
from fastapi import APIRouter, HTTPException, status
from fastapi import Depends
from ..main import get_current_user

router = APIRouter(prefix="/incidents", tags=["incidents"])

@router.get("/")
async def list_incidents(user=Depends(get_current_user)):
    # TODO: implement listing logic
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")

@router.post("/")
async def create_incident(payload: dict, user=Depends(get_current_user)):
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")

@router.get("/{incident_id}")
async def get_incident(incident_id: int, user=Depends(get_current_user)):
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")