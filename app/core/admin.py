import os
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status

from app.core.auth import get_current_user_id

load_dotenv()

ADMIN_USER_ID = os.environ.get("ADMIN_USER_ID")


def require_admin(user_id: UUID = Depends(get_current_user_id)) -> UUID:
    if ADMIN_USER_ID is None or str(user_id) != ADMIN_USER_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el admin puede hacer esto",
        )
    return user_id
