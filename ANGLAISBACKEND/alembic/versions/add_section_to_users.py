"""add section column to users

Revision ID: a1b2c3d4e5f6
Revises: c90b17d7b816
Create Date: 2026-09-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'b40b57910c00'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    section_enum = sa.Enum('debate', 'interpretation', 'news', 'drama', name='section')
    section_enum.create(op.get_bind(), checkfirst=True)
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('section', section_enum, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('section')
    sa.Enum(name='section').drop(op.get_bind(), checkfirst=True)