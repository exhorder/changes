import uuid

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, String, LargeBinary

from buildbox.config import db
from buildbox.db.types.guid import GUID


class Patch(db.Model):
    __tablename__ = 'patch'

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    repository_id = Column(GUID, ForeignKey('repository.id'), nullable=False)
    project_id = Column(GUID, ForeignKey('project.id'), nullable=False)
    parent_revision_sha = Column(String(40), nullable=False)
    label = Column(String(64), nullable=False)
    url = Column(String(200), nullable=False)
    diff = Column(LargeBinary)
    date_created = Column(DateTime, default=datetime.utcnow)
