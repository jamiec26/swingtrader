import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import engine, Base, SessionLocal
from db import models
from routers import scan, signals, risk, plans, portfolio, journal, account, watchlists

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# Auto-create SQLite database tables on startup
logger.info("Initializing database tables...")
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Kagi Trading Workstation API",
    description="Backend API for managing scans, Kagi chart triggers, and portfolio risk calculations",
    version="0.1.0"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database with initial default data
def seed_database():
    db = SessionLocal()
    try:
        # 1. Seed Account
        acc = db.query(models.Account).filter(models.Account.id == 1).first()
        if not acc:
            logger.info("Seeding default account...")
            acc = models.Account(
                id=1,
                balance=248500.0,
                risk_pct=1.0,
                max_heat=6.0,
                leverage=1,
                cfd_mult=1.0,
                base_currency="USD"
            )
            db.add(acc)
            db.commit()

        # 2. Seed Watchlists
        wl = db.query(models.Watchlist).first()
        if not wl:
            logger.info("Seeding default watchlists...")
            db.add(models.Watchlist(name="Core Equity Universe", kind="manual"))
            db.add(models.Watchlist(name="Global Macro Watch", kind="manual"))
            db.add(models.Watchlist(name="Major Cryptocurrencies", kind="manual"))
            db.commit()
            
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

seed_database()

# Mount routers
app.include_router(scan.router)
app.include_router(signals.router)
app.include_router(risk.router)
app.include_router(plans.router)
app.include_router(portfolio.router)
app.include_router(journal.router)
app.include_router(account.router)
app.include_router(watchlists.router)

@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Kagi Trading Workstation backend is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
