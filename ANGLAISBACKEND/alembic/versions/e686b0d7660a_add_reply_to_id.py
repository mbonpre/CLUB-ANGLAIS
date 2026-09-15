"""add reply_to_id

Revision ID: e686b0d7660a
Revises: a1b2c3d4e5f6
Create Date: 2026-09-14 19:20:40.672173

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e686b0d7660a'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    with op.batch_alter_table('messages') as batch_op:
        batch_op.add_column(sa.Column('reply_to_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_messages_reply_to_id', 'messages', ['reply_to_id'], ['id'], ondelete='SET NULL'
        )

    with op.batch_alter_table('room_messages') as batch_op:
        batch_op.add_column(sa.Column('reply_to_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_room_messages_reply_to_id', 'room_messages', ['reply_to_id'], ['id'], ondelete='SET NULL'
        )


def downgrade():
    with op.batch_alter_table('room_messages') as batch_op:
        batch_op.drop_constraint('fk_room_messages_reply_to_id', type_='foreignkey')
        batch_op.drop_column('reply_to_id')

    with op.batch_alter_table('messages') as batch_op:
        batch_op.drop_constraint('fk_messages_reply_to_id', type_='foreignkey')
        batch_op.drop_column('reply_to_id')