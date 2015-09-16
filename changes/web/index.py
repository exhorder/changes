import changes
import urlparse

from changes.api.auth import get_current_user
from changes.config import statsreporter
from flask import render_template, redirect, current_app, request
from flask.views import MethodView


class IndexView(MethodView):
    custom_js = None

    def __init__(self, use_v2=False):
        self.use_v2 = use_v2
        super(MethodView, self).__init__()

    def get(self, path=''):
        # we automatically redirect some users hitting the homepage to v2
        if (request.path.strip('/') == '' and not request.args):
            current_user = get_current_user()
            current_username = (current_user.email.split('@')[0] if
                current_user else None)
            if current_username in current_app.config['NEW_UI_OPTIN_USERS']:
                return redirect('/v2/?optin=1')

        statsreporter.stats().incr('homepage_view')
        if current_app.config['SENTRY_DSN'] and False:
            parsed = urlparse.urlparse(current_app.config['SENTRY_DSN'])
            dsn = '%s://%s@%s/%s' % (
                parsed.scheme.rsplit('+', 1)[-1],
                parsed.username,
                parsed.hostname + (':%s' % (parsed.port,) if parsed.port else ''),
                parsed.path,
            )
        else:
            dsn = None

        # variables to ship down to the webapp
        use_another_host = current_app.config['WEBAPP_USE_ANOTHER_HOST']

        # if we have custom js, embed it in the html (making sure we
        # only do one file read in prod).
        fetch_custom_js = (current_app.config['WEBAPP_CUSTOM_JS'] and
            (current_app.debug or not IndexView.custom_js))

        if fetch_custom_js:
            IndexView.custom_js = open(current_app.config['WEBAPP_CUSTOM_JS']).read()

        # use new react code
        if self.use_v2:
            return render_template('webapp.html', **{
                'SENTRY_PUBLIC_DSN': dsn,
                'RELEASE_INFO': changes.get_revision_info(),
                'WEBAPP_USE_ANOTHER_HOST': use_another_host,
                'WEBAPP_CUSTOM_JS': IndexView.custom_js,
                'USE_PACKAGED_JS': not current_app.debug,
                'HAS_CUSTOM_CSS': current_app.config['WEBAPP_CUSTOM_CSS'],
                'IS_DEBUG': current_app.debug,
                'PHABRICATOR_HOST': current_app.config['PHABRICATOR_HOST']
            })

        return render_template('index.html', **{
            'SENTRY_PUBLIC_DSN': dsn,
            'VERSION': changes.get_version(),
            'WEBAPP_USE_ANOTHER_HOST': use_another_host
        })
