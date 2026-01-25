"""add balance_charts to users

Revision ID: add_balance_charts
Revises: add_display_name
Create Date: 2026-01-26

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_balance_charts'
down_revision = 'add_display_name'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add balance_charts column to users table with default 0
    op.add_column('users', sa.Column('balance_charts', sa.Numeric(10, 2), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'balance_charts')

