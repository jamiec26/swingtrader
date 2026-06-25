from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/account", tags=["account"])

class AccountSchema(BaseModel):
    id: int
    balance: float
    risk_pct: float
    max_heat: float
    leverage: int
    cfd_mult: float
    base_currency: str

    class Config:
        orm_mode = True
        from_attributes = True

class AccountUpdateSchema(BaseModel):
    balance: Optional[float] = None
    risk_pct: Optional[float] = None
    max_heat: Optional[float] = None
    leverage: Optional[int] = None
    cfd_mult: Optional[float] = None
    base_currency: Optional[str] = None

def get_or_create_default_account(db: Session) -> models.Account:
    account = db.query(models.Account).filter(models.Account.id == 1).first()
    if not account:
        account = models.Account(
            id=1,
            balance=248500.0,
            risk_pct=1.0,
            max_heat=6.0,
            leverage=1,
            cfd_mult=1.0,
            base_currency="USD"
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    return account

@router.get("", response_model=AccountSchema)
def get_account(db: Session = Depends(get_db)):
    return get_or_create_default_account(db)

@router.put("", response_model=AccountSchema)
def update_account(data: AccountUpdateSchema, db: Session = Depends(get_db)):
    account = get_or_create_default_account(db)
    
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)
        
    db.commit()
    db.refresh(account)
    return account
