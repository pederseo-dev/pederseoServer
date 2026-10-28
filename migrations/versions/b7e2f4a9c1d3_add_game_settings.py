"""add game_settings (fecha de cierre del juego)

Revision ID: b7e2f4a9c1d3
Revises: a3c1d7e5b9f2
Create Date: 2026-10-28 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'b7e2f4a9c1d3'
down_revision: Union[str, Sequence[str], None] = 'a3c1d7e5b9f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('game_settings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('game_settings')
