"""ajout table section_history

Revision ID: b40b57910c00
Revises: 63731eab6de8
Create Date: 2026-09-11 21:37:07.692420

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b40b57910c00'
down_revision: Union[str, Sequence[str], None] = '63731eab6de8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None: 
   op.create_table( 'section_history', sa.Column('id', sa.Integer(), primary_key=True, index=True), sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False), sa.Column('changed_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True), sa.Column('previous_section', sa.String(), nullable=True), sa.Column('new_section', sa.String(), nullable=False), sa.Column('changed_at', sa.DateTime(), nullable=True), )

def downgrade() -> None:
    """Downgrade schema."""
    pass
