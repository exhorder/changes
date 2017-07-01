import React from 'react';
import URI from 'urijs';

import * as utils from 'utils/utils';

/*
 * Renders links to various pages. Usually returns anchor tags, but functions
 * ending in Href just return the URI (in case you need to customize.)
 */
var ChangesLinks = {
  author: function(author, subtle = false) {
    if (!author) {
      return 'unknown';
    }
    var classes = subtle ? 'subtle' : '';
    var author_href = `/author/${author.email}`;
    return (
      <a href={author_href} className={classes}>
        {utils.email_head(author.email)}
      </a>
    );
  },

  projectAdmin: function(project) {
    var href = ChangesLinks.projectAdminHref(project);
    return (
      <a href={href}>
        {project.name}
      </a>
    );
  },

  projectAdminHref: function(project) {
    return `/admin_project/${project.slug}/`;
  },

  projectPlanAdminHref: function(project) {
    return `/admin_project/${project.slug}#BuildPlans`;
  },

  project: function(project) {
    var href = ChangesLinks.projectHref(project);
    return (
      <a href={href}>
        {project.name}
      </a>
    );
  },

  flaky_test_history: function(test) {
    var href = `/project_test/${test.project_id}/${test.hash}/`;
    return (
      <a href={href}>
        {test.short_name}
      </a>
    );
  },

  projectHref: function(project, tab = null) {
    var href = `/project/${project.slug}/`;
    if (tab) {
      href += '#' + tab;
    }
    return href;
  },

  // renders the permalink url for an arbitrary build
  buildHref: function(build) {
    if (!build) {
      console.error('tried to render a build link without a build!');
      return '';
    }

    // three possibilities: this is a plain commit build, this is a diff build
    // from phabricator, or this is a build on an arbitrary code patch (e.g.
    // from arc test)

    if (!build.source.patch) {
      return URI(`/commit_source/${build.source.id}/`)
        .search({buildID: build.id})
        .toString();
    } else if (build.source.patch && build.source.data['phabricator.revisionID']) {
      return URI(`/diff/D${build.source.data['phabricator.revisionID']}`)
        .search({buildID: build.id})
        .toString();
    } else {
      return URI(`/single_build/${build.id}/`);
    }
  },

  // as above, but for the case where we have many builds pointing to the same
  // target
  buildsHref: function(builds) {
    if (!builds || builds.length === 0) {
      console.error('tried to render a link for an empty list of builds!');
      return '';
    }

    var build = builds[0];

    if (!build.source) {
      // this can happen occasionally. I think its if you committed a diff
      // within the last few seconds...
      return '';
    } else if (!build.source.patch) {
      return URI(`/commit_source/${build.source.id}/`).toString();
    } else if (build.source.patch && build.source.data['phabricator.revisionID']) {
      return URI(`/diff/D${build.source.data['phabricator.revisionID']}`).toString();
    } else {
      return URI(`/single_build/${build.id}/`);
    }
  },

  phab: function(build) {
    if (_.contains(build.tags, 'arc test')) {
      return '';
    } else if (build.source.patch) {
      return (
        <a
          className="external"
          href={build.source.data['phabricator.revisionURL']}
          target="_blank">
          {'D' + build.source.data['phabricator.revisionID']}
        </a>
      );
    } else {
      return ChangesLinks.phabCommit(build.source.revision);
    }
  },

  phabCommit: function(revision) {
    var label = revision.sha.substr(0, 7);
    return (
      <a
        className="external"
        href={ChangesLinks.phabCommitHref(revision)}
        target="_blank">
        {label}
      </a>
    );
  },

  phabCommitHref: function(revision) {
    if (revision.external && revision.external.link) {
      return revision.external.link;
    }

    // if we don't have a link, let's just let the phabricator search engine
    // find the commit for us. It automatically redirects when only one commit
    // matches the sha
    var phab_host = window.changesGlobals['PHABRICATOR_LINK_HOST'];
    return URI(phab_host).path('/search/').addSearch('query', revision.sha).toString();
  },

  repositoryAdmin: function(repository) {
    var href = ChangesLinks.repositoryAdminHref(repository);
    return (
      <a href={href}>
        {repository.url}
      </a>
    );
  },

  repositoryAdminHref: function(repository) {
    return `/admin_repository/${repository.id}`;
  },

  testHistoryHref(project, test_hash) {
    return `/project_test/${project.id}/${test_hash}`;
  },

  historyLink: function(project, test_hash) {
    return <a href={ChangesLinks.testHistoryHref(project, test_hash)}>History</a>;
  },

  snapshotImageHref: function(snapshotImage) {
    // We don't have a page for individual images, so we
    // link to the whole snapshot.
    return URI(`/snapshot/${snapshotImage.snapshot.id}/`);
  },

  // Link to a specific test in an individual build.
  buildTestHref: function(build_id, test) {
    return URI(`/build_test/${build_id}/${test.id}`);
  },

  jobstepChunkedLogHref(build_id, jobstep) {
    let logUrl = null;
    let logPriority = -1;
    jobstep.logSources.forEach(l => {
      l.urls.forEach(logSourceURL => {
        if (logSourceURL.type == 'chunked') {
          if (!logUrl || logPriority <= logSourceURL.priority) {
            logUrl = `/job_log/${build_id}/${l.job.id}/${l.id}/`;
            logPriority = logSourceURL.priority;
          }
        }
      });
    });
    return logUrl;
  },

  testsForBuildHref(build_id, testFailures = 0) {
    return `/build_tests/${build_id}` + (testFailures == 0 ? '#TestList' : '');
  }
};

export default ChangesLinks;
