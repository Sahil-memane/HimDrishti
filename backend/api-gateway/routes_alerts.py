"""
HimDrishti API Gateway — Alert Routes
GET   /api/alerts/{voyage_id}
PATCH /api/alerts/{alert_id}/acknowledge
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from db import get_db
from models import User, Voyage, Alert
from schemas import AlertOut, AlertAckResponse
from auth import get_current_user

router = APIRouter()


@router.get("/alerts/{voyage_id}", response_model=List[AlertOut])
def get_alerts(
    voyage_id: UUID,
    acknowledged: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List alerts for a voyage. Optionally filter by acknowledged status."""
    voyage = db.query(Voyage).filter(Voyage.voyage_id == voyage_id).first()
    if not voyage:
        raise HTTPException(status_code=404, detail="Voyage not found")

    if voyage.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(Alert).filter(Alert.voyage_id == voyage_id)
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)

    alerts = query.order_by(Alert.triggered_at.desc()).all()
    return [AlertOut.model_validate(a) for a in alerts]


@router.patch("/alerts/{alert_id}/acknowledge", response_model=AlertAckResponse)
def acknowledge_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Acknowledge a specific alert."""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Check ownership via the alert's parent voyage
    voyage = db.query(Voyage).filter(Voyage.voyage_id == alert.voyage_id).first()
    if voyage.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not the voyage owner")

    alert.acknowledged = True
    db.commit()
    db.refresh(alert)

    return AlertAckResponse(alert_id=alert.alert_id, acknowledged=alert.acknowledged)
