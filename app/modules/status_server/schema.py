from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class ServerStatus(SQLModel, table=True):
    __tablename__ = "server_status"

    id: Optional[int] = Field(default=None, primary_key=True)
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusResponse(BaseModel):
    status: str
    database: str
    message: str
    timestamp: datetime
