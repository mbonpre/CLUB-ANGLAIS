"""ajout section users account_requests assessment_questions

Revision ID: 63731eab6de8
Revises: 7b43f0d5ba18
Create Date: 2026-09-11 09:05:37.055947

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '63731eab6de8'
down_revision: Union[str, Sequence[str], None] = '7b43f0d5ba18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
section_enum = postgresql.ENUM('debate', 'interpretation', 'news', 'drama', name='section')


def upgrade() -> None:
     bind = op.get_bind()
     section_enum.create(bind, checkfirst=True)
     section_col = sa.Enum('debate', 'interpretation', 'news', 'drama', name='section', create_type=False)
     op.add_column('users', sa.Column('section', section_col, nullable=True))
     op.add_column('account_requests', sa.Column('section', section_col, nullable=True)) 
     op.add_column('assessment_questions', sa.Column('section', section_col, nullable=True))



def downgrade() -> None: 
    op.drop_column('assessment_questions', 'section')
    op.drop_column('account_requests', 'section')
    op.drop_column('users', 'section') 
    section_enum.drop(op.get_bind(), checkfirst=True)
