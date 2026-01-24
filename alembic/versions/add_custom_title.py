"""add custom_title to users and extend custom_text

Revision ID: add_custom_title
Revises: add_custom_link
Create Date: 2026-01-24

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_custom_title'
down_revision = 'add_custom_link'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add custom_title column
    op.add_column('users', sa.Column('custom_title', sa.String(50), nullable=True))
    
    # Note: custom_text already exists, we just extended the model length to 200
    # SQLite doesn't enforce string length, so no migration needed for that


def downgrade() -> None:
    op.drop_column('users', 'custom_title')

