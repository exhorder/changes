import React, {PropTypes} from 'react';
import URI from 'urijs';
import _ from 'lodash';

import APINotLoaded from 'display/not_loaded';
import ChangesLinks from 'display/changes/links';
import SimpleTooltip from 'display/simple_tooltip';
import {AjaxError} from 'display/errors';
import {ChangesChart} from 'display/changes/charts';
import {Grid} from 'display/grid';
import {MissingBuildStatus, SingleBuildStatus} from 'display/changes/builds';
import {TimeText, display_duration} from 'display/time';
import {
  convert_status_and_result_to_condition,
  get_runnable_condition,
  get_runnable_condition_short_text,
  is_waiting,
  ConditionDot
} from 'display/changes/build_conditions';

import InteractiveData from 'pages/helpers/interactive_data';

import * as api from 'server/api';

import * as utils from 'utils/utils';

function getSkipReason(message) {
  let m = message.match(/^Queue skipped: (.*)$/m);
  return m && m[1];
}

const CommitsTab = React.createClass({
  propTypes: {
    // the project api response. Always loaded
    project: PropTypes.object,

    // InteractiveData...makes the chart interactive and paginates
    interactive: PropTypes.object.isRequired,

    // parent elem that has state
    pageElem: PropTypes.object.isRequired
  },

  getInitialState() {
    return {};
  },

  statics: {
    getEndpoint: function(project_slug) {
      return URI(`/api/0/projects/${project_slug}/commits/`)
        .query({all_builds: 1})
        .toString();
    }
  },

  componentDidMount: function() {
    if (!this.props.interactive.hasRunInitialize()) {
      var params = this.props.isInitialTab
        ? InteractiveData.getParamsFromWindowUrl()
        : null;
      params = params || {};
      if (!params['branch']) {
        params['branch'] = this.props.project.getReturnedData().repository.defaultBranch;
      }

      this.props.interactive.initialize(params || {});
    }

    // if we're revisiting this tab, let's restore the window url to the
    // current state
    if (api.isLoaded(this.props.interactive.getDataToShow())) {
      this.props.interactive.updateWindowUrl();
    }

    // TODO: maybe store this in parent state
    var repo_id = this.props.project.getReturnedData().repository.id;
    api.fetch(this, {branches: `/api/0/repositories/${repo_id}/branches`});
  },

  render() {
    var interactive = this.props.interactive;

    if (interactive.hasNotLoadedInitialData()) {
      return <APINotLoaded calls={interactive.getDataToShow()} />;
    }

    // we might be in the middle of / failed to load updated data
    var error_message = null;
    if (interactive.failedToLoadUpdatedData()) {
      error_message = (
        <AjaxError response={interactive.getDataForErrorMessage().response} />
      );
    }

    var style = interactive.isLoadingUpdatedData() ? {opacity: 0.5} : null;

    return (
      <div style={style}>
        <div className="floatR">
          {this.renderChart()}
        </div>
        {this.renderTableControls()}
        {error_message}
        {this.renderTable()}
        {this.renderPaging()}
      </div>
    );
  },

  renderTableControls() {
    var default_branch = this.props.project.getReturnedData().repository.defaultBranch;
    var current_params = this.props.interactive.getCurrentParams();
    let branchNames = null;
    if (
      api.isError(this.state.branches) &&
      this.state.branches.getStatusCode() === '422'
    ) {
      branchNames = [];
    } else if (!api.isLoaded(this.state.branches)) {
      branchNames = null;
    } else {
      branchNames = this.state.branches.getReturnedData().map(x => x.name);
    }
    let onBranchChange = evt => {
      this.props.interactive.updateWithParams({branch: evt.target.value}, true);
    };
    return (
      <div className="commitsControls">
        <BranchDropdown
          defaultBranch={default_branch}
          currentBranch={current_params.branch}
          branchNames={branchNames}
          onBranchChange={onBranchChange}
        />
      </div>
    );
  },

  renderChart() {
    var interactive = this.props.interactive;
    var dataToShow = interactive.getDataToShow().getReturnedData();

    var builds = dataToShow.map(commit => {
      if (commit.builds && commit.builds.length > 0) {
        return _.sortBy(commit.builds, b => b.dateCreated).reverse().find(() => true);
      } else {
        return {};
      }
    });

    var links = interactive.getPagingLinks({type: 'chart_paging'});
    var prevLink = interactive.hasPreviousPage() ? links[0] : '';
    var nextLink = interactive.hasNextPage() ? links[1] : '';

    return (
      <div className="commitsChart">
        {prevLink}
        <ChangesChart
          type="build"
          className="inlineBlock"
          runnables={builds}
          enableLatest={!interactive.hasPreviousPage()}
        />
        {nextLink}
      </div>
    );
  },

  renderTable() {
    var data_to_show = this.props.interactive.getDataToShow().getReturnedData(),
      project_info = this.props.project.getReturnedData();

    var grid_data = data_to_show.map(c => this.turnIntoRow(c, project_info));

    var cellClasses = [
      'buildWidgetCell',
      'wide easyClick',
      'bluishGray nowrap',
      'bluishGray nowrap',
      'nowrap',
      'nowrap',
      'nowrap'
    ];

    var headers = [
      'Result',
      'Name',
      'Time',
      'Tests Ran',
      'Author',
      'Commit',
      'Committed'
    ];

    if (project_info.containsActiveAutogeneratedPlan) {
      var cellClasses = [
        'buildWidgetCell',
        'buildWidgetCell',
        'wide easyClick',
        'bluishGray nowrap',
        'bluishGray nowrap',
        'nowrap',
        'nowrap',
        'nowrap'
      ];
      var headers = [
        'Revision',
        'Build',
        'Name',
        'Time',
        'Tests Ran',
        'Author',
        'Commit',
        'Committed'
      ];
    }

    return (
      <Grid
        colnum={headers.length}
        data={grid_data}
        cellClasses={cellClasses}
        headers={headers}
      />
    );
  },

  turnIntoRow(c, project_info) {
    var title = utils.truncate(utils.first_line(c.message));
    if (
      c.message.indexOf('!!skipthequeue') !== -1 ||
      c.message.indexOf('#skipthequeue') !== -1
    ) {
      // we used to use this

      // dropbox-specific logic: we have a commit queue (oh hey, you should
      // build one of those too)

      let label = 'This commit bypassed the commit queue';
      let skipreason = getSkipReason(c.message);
      if (skipreason) {
        label = (
          <div>
            {label}
            <br />Reason given: {skipreason}
          </div>
        );
      }
      title = (
        <span>
          {title}
          <SimpleTooltip label={label}>
            <i className="fa fa-fast-forward blue marginLeftS" />
          </SimpleTooltip>
        </span>
      );
    }

    var build_widget = null,
      duration = null,
      tests = null;
    if (c.builds && c.builds.length > 0) {
      var sorted_builds = _.sortBy(c.builds, b => b.dateCreated).reverse();
      var last_build = sorted_builds.find(() => true);

      build_widget = <SingleBuildStatus build={last_build} parentElem={this} />;

      duration = !is_waiting(get_runnable_condition(last_build))
        ? display_duration(last_build.duration / 1000)
        : null;

      tests = last_build.stats.test_count;

      title = (
        <a className="subtle" href={ChangesLinks.buildHref(last_build)}>
          {title}
        </a>
      );
    } else {
      build_widget = (
        <MissingBuildStatus
          project_slug={project_info.slug}
          commit_sha={c.sha}
          parentElem={this}
          selectiveTesting={project_info.containsActiveAutogeneratedPlan}
        />
      );
    }

    let revisionResultId = c.revisionResult ? c.revisionResult.result.id : 'unknown';
    let revisionCondition = convert_status_and_result_to_condition(
      c.status,
      revisionResultId
    );
    let label = get_runnable_condition_short_text(revisionCondition);
    // TODO: if there are any comments, show a comment icon on the right
    let row = [
      build_widget,
      title,
      duration,
      tests,
      ChangesLinks.author(c.author),
      ChangesLinks.phabCommit(c),
      <TimeText key={c.id} time={c.dateCommitted} />
    ];
    if (project_info.containsActiveAutogeneratedPlan) {
      let markup = (
        <SimpleTooltip label={label} placement="right">
          <span>
            <ConditionDot condition={revisionCondition} />
          </span>
        </SimpleTooltip>
      );
      row.unshift(markup);
    }
    return row;
  },

  renderPaging() {
    var links = this.props.interactive.getPagingLinks();
    return (
      <div className="marginBottomM marginTopM">
        {links}
      </div>
    );
  }
});

const BranchDropdown = ({defaultBranch, currentBranch, branchNames, onBranchChange}) => {
  let current_branch = currentBranch || defaultBranch;
  let branch_dropdown = null;
  if (!branchNames) {
    branch_dropdown = (
      <select disabled={true}>
        <option value={current_branch}>
          {current_branch}
        </option>
      </select>
    );
  } else if (branchNames.length == 0) {
    branch_dropdown = (
      <select disabled={true}>
        <option>No branches</option>
      </select>
    );
  } else {
    let options = branchNames.sort().map(n =>
      <option value={n} key={n}>
        {n}
      </option>
    );
    branch_dropdown = (
      <select onChange={onBranchChange} value={current_branch}>
        {options}
      </select>
    );
  }
  return (
    <div className="selectWrap">
      {branch_dropdown}
    </div>
  );
};

BranchDropdown.propTypes = {
  defaultBranch: PropTypes.string.isRequired,
  currentBranch: PropTypes.string,
  branchNames: PropTypes.array,
  onBranchChange: PropTypes.func.isRequired
};

export default CommitsTab;
