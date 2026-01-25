"""add display_name to users

Revision ID: add_display_name
Revises: add_custom_title
Create Date: 2026-01-25

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_display_name'
down_revision = 'add_custom_title'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add display_name column to users table
    op.add_column('users', sa.Column('display_name', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'display_name')

