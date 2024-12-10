"""Simplify Frienship

Revision ID: 21d6b2678cbf
Revises: 309d55208d86
Create Date: 2024-11-17 17:13:14.389076

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '21d6b2678cbf'
down_revision: Union[str, None] = '309d55208d86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index('ix_friend_requests_id', table_name='friend_requests')
    op.drop_table('friend_requests')
    op.drop_index('ix_friendships_id', table_name='friendships')
    op.drop_table('friendships')
    op.add_column('messages', sa.Column('file_url', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('messages', 'file_url')
    op.create_table('friendships',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user1_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('user2_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('status', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user1_id'], ['users.id'], name='friendships_user1_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user2_id'], ['users.id'], name='friendships_user2_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='friendships_pkey')
    )
    op.create_index('ix_friendships_id', 'friendships', ['id'], unique=False)
    op.create_table('friend_requests',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('sender_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('receiver_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('sent_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
    sa.Column('status', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['receiver_id'], ['users.id'], name='friend_requests_receiver_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['sender_id'], ['users.id'], name='friend_requests_sender_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='friend_requests_pkey')
    )
    op.create_index('ix_friend_requests_id', 'friend_requests', ['id'], unique=False)
    # ### end Alembic commands ###
