from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from database import Base


class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, unique=True, index=True)
    status = Column(String, default="not verified") 

class DatabaseInstance(Base):
    __tablename__ = "databases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    db_type = Column(String, index=True)
    user_port = Column(Integer, index=True)
    internal_port = Column(Integer, index=True)
    status = Column(String, index=True)
    env_vars = Column(JSON, default={})  # Add this line to store environment variables
    created_at = Column(DateTime(timezone=True), server_default=func.now())
