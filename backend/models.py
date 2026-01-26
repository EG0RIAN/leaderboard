from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey, Integer, Numeric, Text, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR
from datetime import datetime
import uuid
from backend.database import Base


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36), storing as
    stringified hex values.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresUUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            return value


class User(Base):
    __tablename__ = "users"
    
    tg_id = Column(BigInteger, primary_key=True)
    username = Column(String, nullable=True)  # Original Telegram username
    first_name = Column(String, nullable=True)  # Original Telegram first name
    last_name = Column(String, nullable=True)
    display_name = Column(String(50), nullable=True)  # Custom display name set by user
    language_code = Column(String, nullable=True)
    is_premium = Column(Boolean, nullable=True)
    photo_url = Column(String, nullable=True)
    custom_title = Column(String(50), nullable=True)  # Short title shown in leaderboard list
    custom_text = Column(String(200), nullable=True)  # Description shown in profile modal
    custom_link = Column(String(500), nullable=True)  # Custom link shown in profile modal
    balance_charts = Column(Numeric(10, 2), default=0, nullable=False)  # Internal balance of charts
    ton_wallet_address = Column(String(100), nullable=True)  # Connected TON wallet address
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    referrer_id = Column(BigInteger, ForeignKey("users.tg_id"), nullable=True)
    is_blocked = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    referrer = relationship("User", remote_side=[tg_id], backref="referrals")
    donations = relationship("Donation", back_populates="user")
    payments = relationship("Payment", back_populates="user")


class Donation(Base):
    __tablename__ = "donations"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tg_id = Column(BigInteger, ForeignKey("users.tg_id"), nullable=False)
    stars_amount = Column(Integer, nullable=False)
    tons_amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    week_key = Column(String, nullable=False, index=True)  # Format: "2026-W03"
    payment_id = Column(GUID(), ForeignKey("payments.id"), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="donations")
    payment = relationship("Payment", back_populates="donation")


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tg_id = Column(BigInteger, ForeignKey("users.tg_id"), nullable=False)
    invoice_id = Column(String, unique=True, nullable=True)  # Telegram invoice ID
    telegram_payment_charge_id = Column(String, unique=True, nullable=True)  # Unique payment ID from Telegram
    stars_amount = Column(Integer, nullable=False)
    tons_amount = Column(Numeric(10, 2), nullable=True)
    rate_used = Column(Numeric(10, 4), nullable=True)  # Rate at payment time
    status = Column(String, nullable=False, default="created")  # created, paid, failed, canceled, expired
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    raw_payload = Column(JSON, nullable=True)
    context_json = Column(JSON, nullable=True)  # preset_id, screen, etc.
    
    # Relationships
    user = relationship("User", back_populates="payments")
    donation = relationship("Donation", back_populates="payment", uselist=False)


class TonPayment(Base):
    """Tracks TON blockchain payments"""
    __tablename__ = "ton_payments"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tg_id = Column(BigInteger, ForeignKey("users.tg_id"), nullable=False)
    
    # Payment details
    amount_ton = Column(Numeric(20, 9), nullable=False)  # TON amount (9 decimals)
    charts_amount = Column(Numeric(10, 2), nullable=True)  # Converted charts amount
    
    # Unique comment for identifying the payment
    payment_comment = Column(String(100), unique=True, nullable=False)
    
    # Wallet addresses
    from_wallet = Column(String(100), nullable=True)  # Sender wallet
    to_wallet = Column(String(100), nullable=False)  # Our receiving wallet
    
    # Transaction details
    tx_hash = Column(String(100), unique=True, nullable=True)  # Blockchain tx hash
    tx_lt = Column(BigInteger, nullable=True)  # Logical time
    
    # Status: pending, completed, expired, failed
    status = Column(String(20), nullable=False, default="pending")
    
    # Rate at time of payment
    rate_used = Column(Numeric(10, 4), nullable=True)  # Charts per TON
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # When the payment expires
    completed_at = Column(DateTime, nullable=True)
    
    # Relationship
    user = relationship("User", backref="ton_payments")


class Setting(Base):
    __tablename__ = "settings"
    
    key = Column(String, primary_key=True)
    value_json = Column(JSON, nullable=False)


# Task types: subscribe_channel, join_chat, open_app
class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    type = Column(String(30), nullable=False)  # subscribe_channel, join_chat, open_app
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    charts_reward = Column(Numeric(10, 2), nullable=False)
    config = Column(JSON, nullable=True)  # channel_username, invite_link, app_url, chat_id, etc.
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class TaskCompletion(Base):
    __tablename__ = "task_completions"
    __table_args__ = (UniqueConstraint("tg_id", "task_id", name="uq_task_completion_user_task"),)
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tg_id = Column(BigInteger, ForeignKey("users.tg_id"), nullable=False)
    task_id = Column(GUID(), ForeignKey("tasks.id"), nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

