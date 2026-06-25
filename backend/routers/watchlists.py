from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/watchlists", tags=["watchlists"])

class WatchlistSchema(BaseModel):
    id: int
    name: str
    kind: str

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("", response_model=List[WatchlistSchema])
def list_watchlists(db: Session = Depends(get_db)):
    return db.query(models.Watchlist).all()
