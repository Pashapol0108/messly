"""Add relationship to MessageReaction

Revision ID: 9de50a6bda7a
Revises: d21f0fd044ac
Create Date: 2024-11-25 00:02:33.175654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9de50a6bda7a'
down_revision: Union[str, None] = 'd21f0fd044ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###
