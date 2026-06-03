"""add batch_id and vendor uix

Revision ID: 35g99bcb82b5
Revises: 24f88aca71a4
Create Date: 2026-05-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '35g99bcb82b5'
down_revision: Union[str, Sequence[str], None] = '24f88aca71a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add batch_id to bills
    op.add_column('bills', sa.Column('batch_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_bills_batch_id'), 'bills', ['batch_id'], unique=False)
    
    # Add updated_at to bills
    op.add_column('bills', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Add vendor unique constraint
    op.create_unique_constraint('uix_org_vendor_name', 'vendors', ['org_id', 'name'])


def downgrade() -> None:
    # Drop vendor unique constraint
    op.drop_constraint('uix_org_vendor_name', 'vendors', type_='unique')
    
    # Drop updated_at from bills
    op.drop_column('bills', 'updated_at')
    
    # Drop batch_id from bills
    op.drop_index(op.f('ix_bills_batch_id'), table_name='bills')
    op.drop_column('bills', 'batch_id')
