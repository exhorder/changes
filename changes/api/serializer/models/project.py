from changes.api.serializer import Serializer, register
from changes.models.project import Project
from changes.utils.http import build_uri


@register(Project)
class ProjectSerializer(Serializer):
    def serialize(self, instance):
        return {
            'id': instance.id.hex,
            'slug': instance.slug,
            'name': instance.name,
            'dateCreated': instance.date_created,
            'link': build_uri('/projects/{0}/'.format(instance.slug)),
        }
