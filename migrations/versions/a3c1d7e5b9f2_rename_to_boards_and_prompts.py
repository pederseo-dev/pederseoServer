"""rename mesa/item to board/prompt (instacam)

Las tablas viejas estaban vacías: se borran y se crean las nuevas en lugar de renombrarlas.

Revision ID: a3c1d7e5b9f2
Revises: 18967f44f3ff
Create Date: 2026-10-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a3c1d7e5b9f2'
down_revision: Union[str, Sequence[str], None] = '18967f44f3ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table('item_vote')
    op.drop_table('photo')
    op.drop_table('mesa_vote')
    op.drop_table('player')
    op.drop_table('mesa')
    op.drop_table('item')

    op.create_table('board',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('prompt',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('text', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('player',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('board_id', sa.Integer(), nullable=False),
    sa.Column('display_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.ForeignKeyConstraint(['board_id'], ['board.id'], ),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_table('board_vote',
    sa.Column('voter_id', sa.Uuid(), nullable=False),
    sa.Column('target_board_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['target_board_id'], ['board.id'], ),
    sa.ForeignKeyConstraint(['voter_id'], ['player.user_id'], ),
    sa.PrimaryKeyConstraint('voter_id')
    )
    op.create_table('photo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('prompt_id', sa.Integer(), nullable=False),
    sa.Column('board_id', sa.Integer(), nullable=False),
    sa.Column('uploaded_by', sa.Uuid(), nullable=False),
    sa.Column('url', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['board_id'], ['board.id'], ),
    sa.ForeignKeyConstraint(['prompt_id'], ['prompt.id'], ),
    sa.ForeignKeyConstraint(['uploaded_by'], ['player.user_id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('prompt_vote',
    sa.Column('voter_id', sa.Uuid(), nullable=False),
    sa.Column('prompt_id', sa.Integer(), nullable=False),
    sa.Column('photo_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['photo_id'], ['photo.id'], ),
    sa.ForeignKeyConstraint(['prompt_id'], ['prompt.id'], ),
    sa.ForeignKeyConstraint(['voter_id'], ['player.user_id'], ),
    sa.PrimaryKeyConstraint('voter_id', 'prompt_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('prompt_vote')
    op.drop_table('photo')
    op.drop_table('board_vote')
    op.drop_table('player')
    op.drop_table('prompt')
    op.drop_table('board')

    op.create_table('item',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('mesa',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('player',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('mesa_id', sa.Integer(), nullable=False),
    sa.Column('display_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.ForeignKeyConstraint(['mesa_id'], ['mesa.id'], ),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_table('mesa_vote',
    sa.Column('voter_id', sa.Uuid(), nullable=False),
    sa.Column('target_mesa_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['target_mesa_id'], ['mesa.id'], ),
    sa.ForeignKeyConstraint(['voter_id'], ['player.user_id'], ),
    sa.PrimaryKeyConstraint('voter_id')
    )
    op.create_table('photo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('mesa_id', sa.Integer(), nullable=False),
    sa.Column('uploaded_by', sa.Uuid(), nullable=False),
    sa.Column('url', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['item.id'], ),
    sa.ForeignKeyConstraint(['mesa_id'], ['mesa.id'], ),
    sa.ForeignKeyConstraint(['uploaded_by'], ['player.user_id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('item_vote',
    sa.Column('voter_id', sa.Uuid(), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('photo_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['item.id'], ),
    sa.ForeignKeyConstraint(['photo_id'], ['photo.id'], ),
    sa.ForeignKeyConstraint(['voter_id'], ['player.user_id'], ),
    sa.PrimaryKeyConstraint('voter_id', 'item_id')
    )
