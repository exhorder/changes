from __future__ import absolute_import, division, unicode_literals

from flask import Response
from sqlalchemy.orm import joinedload

from changes.api.base import APIView
from changes.models import Build, Project, Revision, Source


class ProjectCommitDetailsAPIView(APIView):
    def _get_project(self, project_id):
        project = Project.query.options(
            joinedload(Project.repository),
        ).filter_by(slug=project_id).first()
        if project is None:
            project = Project.query.options(
                joinedload(Project.repository),
            ).get(project_id)
        return project

    def get(self, project_id, commit_id):
        project = self._get_project(project_id)
        if not project:
            return Response(status=404)

        repo = project.repository
        revision = Revision.query.filter(
            Revision.repository_id == repo.id,
            Revision.sha == commit_id,
        ).join(Revision.author).first()
        if not revision:
            return Response(status=404)

        build_list = list(Build.query.options(
            joinedload('author'),
        ).join(
            Source, Source.id == Build.source_id,
        ).filter(
            Build.project_id == project.id,
            Source.revision_sha == revision.sha,
            Source.patch == None,  # NOQA
        ).order_by(Build.date_created.desc()))[:100]

        context = {
            'repository': repo,
            'commit': revision,
            'builds': build_list,
        }

        return self.respond(context)

    def get_stream_channels(self, project_id, commit_id):
        return [
            'revisions:{0}:*'.format(commit_id),
        ]
