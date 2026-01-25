"""add ton_payments table and ton_wallet_address

Revision ID: add_ton_payments
Revises: add_balance_charts
Create Date: 2026-01-26

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_ton_payments'
down_revision = 'add_balance_charts'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add ton_wallet_address to users
    op.add_column('users', sa.Column('ton_wallet_address', sa.String(100), nullable=True))
    
    # Create ton_payments table
    op.create_table(
        'ton_payments',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('tg_id', sa.BigInteger, sa.ForeignKey('users.tg_id'), nullable=False),
        sa.Column('amount_ton', sa.Numeric(20, 9), nullable=False),
        sa.Column('charts_amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('payment_comment', sa.String(100), unique=True, nullable=False),
        sa.Column('from_wallet', sa.String(100), nullable=True),
        sa.Column('to_wallet', sa.String(100), nullable=False),
        sa.Column('tx_hash', sa.String(100), unique=True, nullable=True),
        sa.Column('tx_lt', sa.BigInteger, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('rate_used', sa.Numeric(10, 4), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('completed_at', sa.DateTime, nullable=True),
    )
    
    # Create index on status for faster queries
    op.create_index('ix_ton_payments_status', 'ton_payments', ['status'])
    op.create_index('ix_ton_payments_tg_id', 'ton_payments', ['tg_id'])


def downgrade() -> None:
    op.drop_index('ix_ton_payments_tg_id', 'ton_payments')
    op.drop_index('ix_ton_payments_status', 'ton_payments')
    op.drop_table('ton_payments')
    op.drop_column('users', 'ton_wallet_address')

