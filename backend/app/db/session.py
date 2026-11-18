from app.db.database import Database, db


async def get_db() -> Database:
    """FastAPI dependency returning the initialized asyncpg Database pool wrapper."""
    return db
