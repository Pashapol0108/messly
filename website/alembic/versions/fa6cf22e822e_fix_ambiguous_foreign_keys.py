"""Fix ambiguous foreign keys

Revision ID: fa6cf22e822e
Revises: c4e888014b78
Create Date: 2024-11-17 15:42:01.194501

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa6cf22e822e'
down_revision: Union[str, None] = 'c4e888014b78'
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
