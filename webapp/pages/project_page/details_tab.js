import React, {PropTypes} from 'react';
import URI from 'urijs';

import APINotLoaded from 'display/not_loaded';
import {InfoList, InfoItem} from 'display/info_list';

import * as api from 'server/api';

import * as utils from 'utils/utils';

var DetailsTab = React.createClass({
  propTypes: {
    // the API response from the fetch below
    details: PropTypes.object.isRequired,
    // the project api response
    project: PropTypes.object.isRequired,
    pageElem: PropTypes.object.isRequired
  },

  componentDidMount: function() {
    var slug = this.props.project.getReturnedData().slug;
    api.fetch(this.props.pageElem, {
      details: `/api/0/projects/${slug}/plans/`
    });
  },

  render: function() {
    if (!api.isLoaded(this.props.details)) {
      return <APINotLoaded calls={this.props.details} />;
    }

    var plans = this.props.details.getReturnedData();
    var project = this.props.project.getReturnedData();

    let editLink = null;
    const isAdmin =
      window.changesAuthData &&
      window.changesAuthData.user &&
      window.changesAuthData.user.isAdmin === true;
    if (isAdmin) {
      editLink = (
        <a className="topRightLink" href={`/admin_project/${project.slug}/`}>
          [edit]
        </a>
      );
    }

    var markup = _.map(plans, p =>
      <div className="marginBottomL">
        <b className="block">
          Build Plan: {p.name}
        </b>
        <InfoList>
          <InfoItem label="Infrastructure">
            {!_.isEmpty(p.steps) && p.steps[0].name}
          </InfoItem>
          <InfoItem label="Timeout">
            {!_.isEmpty(p.steps) && p.steps[0].options['build.timeout']}
          </InfoItem>
          <InfoItem label="Config:">
            <span />
          </InfoItem>
        </InfoList>
        <pre className="defaultPre">
          {!_.isEmpty(p.steps) && p.steps[0].data}
        </pre>
      </div>
    );

    return (
      <div>
        {editLink}
        {this.renderHeader(project, plans)}
        {markup}
      </div>
    );
  },

  renderHeader: function(project, plans) {
    var builds_on_diffs = project.options['phabricator.diff-trigger'] === '1';
    var builds_on_commits = project.options['build.commit-trigger'] === '1';

    var triggers = 'Does not automatically run';
    if (builds_on_commits && builds_on_diffs) {
      triggers = 'Diffs and Commits';
    } else if (builds_on_diffs) {
      triggers = 'Only diffs';
    } else if (builds_on_commits) {
      triggers = 'Only commits';
    }

    const missing_value_class = 'missingValue';
    var branches_option = project.options['build.branch-names'] || '*';
    var branches = branches_option === '*' ? 'any' : branches_option.replace(/ /g, ', ');

    var whitelist_option = project.options['build.file-whitelist'].trim();
    var whitelist_paths = 'No path filter';
    if (whitelist_option) {
      whitelist_paths = _.map(utils.split_lines(whitelist_option), line => {
        return (
          <div>
            <code>
              {line}
            </code>
          </div>
        );
      });
    }

    // Most projects should have a current snapshot, so it's worth the potential noise
    // to say one isn't set even when the build plan doesn't make it possible.
    var snapshot_info = 'None configured';
    var current_snapshot = project.options['snapshot.current'];
    if (current_snapshot) {
      snapshot_info = (
        <a href={URI(`/snapshot/${current_snapshot}/`)}>
          {current_snapshot.substring(0, 8)}
        </a>
      );
    }

    var notes = project.options['project.notes'];
    var notes_class = notes ? 'preText' : missing_value_class;

    var owners = project.options['project.owners'];
    var owners_class = owners ? '' : missing_value_class;

    var build_plans_class = plans.length === 0 ? missing_value_class : '';

    var test_retention_days = project.options['history.test-retention-days'];

    return (
      <div className="marginBottomL">
        <b>
          {project.name}
        </b>
        <InfoList>
          <InfoItem label="Description" valueClassName={notes_class}>
            {notes || 'Not specified.'}
          </InfoItem>
          <InfoItem label="Repository">
            {project.repository.url}
          </InfoItem>
          <InfoItem label="Owners" valueClassName={owners_class}>
            {owners || 'Not specified.'}
          </InfoItem>
          <InfoItem label="Builds for">
            {triggers}
          </InfoItem>
          <InfoItem label="On branches">
            {branches}
          </InfoItem>
          <InfoItem label="Touching paths">
            {whitelist_paths}
          </InfoItem>
          <InfoItem label="Current snapshot">
            {snapshot_info}
          </InfoItem>
          <InfoItem label="Build plans" valueClassName={build_plans_class}>
            {plans.length}
          </InfoItem>
          <InfoItem label="Keep tests for (days)">
            {test_retention_days}
          </InfoItem>
        </InfoList>
      </div>
    );

    // TODO: how many tests? how many commits in the last week?
  }
});

export default DetailsTab;
