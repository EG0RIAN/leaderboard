"""add custom_link to users

Revision ID: add_custom_link
Revises: 7ac08e2cd2b9
Create Date: 2026-01-24

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_custom_link'
down_revision = '7ac08e2cd2b9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add custom_link column to users table
    op.add_column('users', sa.Column('custom_link', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'custom_link')

