import React, {PropTypes} from 'react';
import {Popover, OverlayTrigger, Tooltip} from 'react-bootstrap';
import _ from 'underscore';

import ChangesLinks from 'display/changes/links';
import {Button} from 'display/button';
import {ProgrammingError} from 'display/errors';
import Request from 'display/request';
import {buildSummaryText} from 'display/changes/build_text';
import {
  COND_NO_BUILDS,
  get_runnable_condition,
  get_runnable_condition_icon,
  get_runnables_summary_condition,
  ConditionDot
} from 'display/changes/build_conditions';

import * as api from 'server/api';

/*
 * Shows the status of many builds run for a single code change (e.g. a commit
 * or diff.) Despite the name, this widget can also handle showing a single
 * build...you use this for any interface where you might be showing builds
 * from more than one project.
 */
export const ManyBuildsStatus = React.createClass({
  propTypes: {
    builds: PropTypes.array
  },

  render: function() {
    var builds = this.props.builds;

    if (builds.length === 0) {
      return get_runnable_condition_icon(COND_NO_BUILDS);
    }

    // If this is a diff, we only want to look at builds that ran on the last
    // code change
    var builds_for_last_code_change = buildsForLastCodeChange(builds);

    // grab the latest builds for each project
    var builds_by_project = _.groupBy(builds_for_last_code_change, b => b.project.slug);
    var latest_builds = _.map(builds_by_project, builds => {
      return _.chain(builds).sortBy(b => b.dateCreated).last().value();
    });

    // TOOD: how to order projects? Right now, I do it alphabetically by project name...
    // I think that makes this easiest to instantly parse every time someone views this.
    latest_builds = _.sortBy(latest_builds, b => b.project.name);

    var tooltip_markup = _.map(latest_builds, b => {
      var subtext = buildSummaryText(b, true);

      return (
        <div style={{textAlign: 'left'}} key={b.id}>
          <div style={{display: 'inline-block', paddingTop: 10, paddingRight: 5}}>
            <ConditionDot condition={get_runnable_condition(b)} />
          </div>
          <div style={{verticalAlign: 'top', display: 'inline-block'}}>
            <div>
              {b.project.name}
            </div>
            <span className="mediumGray">
              {subtext}
            </span>
          </div>
        </div>
      );
    });

    var tooltip = (
      <Tooltip>
        {tooltip_markup}
      </Tooltip>
    );

    var summary_condition = get_runnables_summary_condition(latest_builds);

    var multiIndicator = latest_builds.length > 1;

    var builds_href = ChangesLinks.buildsHref(latest_builds);

    return (
      <OverlayTrigger placement="right" overlay={tooltip}>
        <a className="buildStatus" href={builds_href}>
          <ConditionDot condition={summary_condition} multiIndicator={multiIndicator} />
        </a>
      </OverlayTrigger>
    );
  }
});

/*
 * Shows the status of a single build. This tooltip can go into more details
 * than ManyBuildsStatus (showing the names of the failing tests)
 */
export const SingleBuildStatus = React.createClass({
  MAX_TESTS_IN_TOOLTIP: 15,

  propTypes: {
    build: PropTypes.object,
    placement: PropTypes.string,
    parentElem: PropTypes.object
  },

  render: function() {
    var build = this.props.build;
    var condition = get_runnable_condition(build);
    var href = ChangesLinks.buildHref(build);

    var error_count = build.failures
      ? _.filter(build.failures, f => f.id !== 'test_failures').length
      : 0; // if its 0, we don't know whether there are 0 failures or if the
    // backend didn't return this info
    var dotNum = null;
    if (error_count > 0) {
      dotNum = 'E';
    } else if (build.stats['test_failures'] > 0) {
      dotNum = build.stats['test_failures'];
    }

    // TODO: could show error messages in tooltip...
    var tooltip = this.getStandardTooltip();
    if (build.stats['test_failures'] > 0) {
      tooltip = this.getFailedTestsTooltip();
    }

    var dot = <ConditionDot condition={condition} num={dotNum} />;

    var widget = (
      <a className="buildStatus" href={href}>
        {dot}
      </a>
    );

    if (tooltip) {
      return (
        <div>
          <OverlayTrigger placement={this.props.placement || 'right'} overlay={tooltip}>
            <div>
              {widget}
            </div>
          </OverlayTrigger>
        </div>
      );
    }

    return widget;
  },

  getStandardTooltip() {
    return (
      <Tooltip>
        {this.getTooltipHeader()}
      </Tooltip>
    );
  },

  getTooltipHeader() {
    var build = this.props.build;

    var subtext = buildSummaryText(build, true);

    return (
      <div style={{textAlign: 'left'}}>
        <div style={{display: 'inline-block', paddingTop: 10, paddingRight: 5}}>
          <ConditionDot condition={get_runnable_condition(build)} />
        </div>
        <div style={{verticalAlign: 'top', display: 'inline-block'}}>
          <div>
            {build.project.name}
          </div>
          <span className="mediumGray">
            {subtext}
          </span>
        </div>
      </div>
    );
  },

  getFailedTestsTooltip: function() {
    var elem = this.props.parentElem,
      build = this.props.build;

    var state_key = '_build_widget_failed_tests';

    // make sure parentElem has a state object
    // TODO: we could silently add this ourselves if missing
    if (!elem.state && elem.state !== {}) {
      return (
        <Popover>
          {' '}<ProgrammingError>
            Programming Error: The parentElem of BuildWidget must implement
            getInitialState()! Just return{' {}'}
          </ProgrammingError>{' '}
        </Popover>
      );
    }

    if (elem.state[state_key] && api.isLoaded(elem.state[state_key][build.id])) {
      var data = elem.state[state_key][build.id].getReturnedData();
      var tests = data.testFailures.tests.slice(0, this.MAX_TESTS_IN_TOOLTIP);
      var list = _.map(tests, t => {
        return (
          <div key={'test-id-key:' + t.id}>
            {t.shortName}
          </div>
        );
      });

      if (tests.length < build.stats['test_failures']) {
        list.push(
          <div className="marginTopS" key="tests-more-key">
            {' '}<em>
              Showing {tests.length} out of {build.stats['test_failures']} test failures
            </em>{' '}
          </div>
        );
      }

      return (
        <Tooltip key={+new Date()}>
          {this.getTooltipHeader()}
          <div style={{textAlign: 'left', marginTop: 10, marginLeft: 25}}>
            <span className="bb">Failed Tests:</span>
            {list}
          </div>
        </Tooltip>
      );
    } else {
      // we want to fetch more build information and show a list of failed
      // tests on hover. To do this, we'll create an anonymous react element
      // that does data fetching on mount
      var data_fetcher_defn = React.createClass({
        componentDidMount() {
          if (!elem.state[state_key] || !elem.state[state_key][build.id]) {
            api.fetchMap(elem, state_key, {
              [build.id]: `/api/0/builds/${build.id}/`
            });
          }
        },

        render() {
          return <span />;
        }
      });

      var data_fetcher = React.createElement(data_fetcher_defn, {
        elem: elem,
        buildID: build.id
      });

      return (
        <Tooltip>
          {this.getTooltipHeader()}
          {data_fetcher}
          <div style={{textAlign: 'left', marginTop: 10, marginLeft: 25}}>
            Loading failed test list
          </div>
        </Tooltip>
      );
    }
  }
});

/*
 * Shows the status for a missing build. In practice, this is merely a button
 * that allows the user to create a new build for the corresponding commit.
 */
export const MissingBuildStatus = React.createClass({
  propTypes: {
    project_slug: PropTypes.string,
    commit_sha: PropTypes.string,
    parentElem: PropTypes.object,
    selectiveTesting: PropTypes.bool
  },

  defaultPropts: {
    selectiveTesting: false
  },

  render: function() {
    var buttonName = 'createBuild_' + this.props.commit_sha;
    var tooltip = <Tooltip>Create a new build for this commit.</Tooltip>;
    var project = this.props.project_slug;
    var commit = this.props.commit_sha;
    var selectiveTesting = this.props.selectiveTesting ? 'true' : 'false';
    var build_widget = (
      <div>
        <Request
          parentElem={this.props.parentElem}
          name={buttonName}
          endpoint={`/api/0/builds/?project=${project}&sha=${commit}&cause=manual&selective_testing=${selectiveTesting}`}
          method="post">
          <OverlayTrigger placement="right" overlay={tooltip}>
            <Button type="white" className="iconButton">
              <i className="fa fa-cogs blue" />
            </Button>
          </OverlayTrigger>
        </Request>
      </div>
    );
    return build_widget;
  }
});

// if a list of builds is for a differential diff, filter them so that we only
// have the builds for the latest update. Its safe to run this on non-diffs...we'll
// just return the original list
//
// we won't know about the latest update if no builds have run for it (instead
// returning builds for the second-latest update), but I think that's fine
export const buildsForLastCodeChange = function(builds) {
  var revision_ids = [];
  var diff_ids = [];

  // we only do something if every build is from the same phabricator revision
  // id
  _.each(builds, build => {
    var build_revision_id =
      build.source.patch && build.source.data['phabricator.revisionID'];

    // must be from a phabricator revision
    if (!build_revision_id) {
      return builds;
    }

    revision_ids.push(build.source.data['phabricator.revisionID']);
    diff_ids.push(build.source.data['phabricator.diffID']);
  });

  revision_ids = _.uniq(revision_ids);
  diff_ids = _.uniq(diff_ids).sort().reverse();

  if (revision_ids.length > 1) {
    return builds;
  }

  var latest_diff_id = diff_ids[0];
  return _.filter(builds, b => b.source.data['phabricator.diffID'] === latest_diff_id);
};
