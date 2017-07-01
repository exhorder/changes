import React, {PropTypes} from 'react';
import _ from 'underscore';

import moment from 'moment';

import classNames from 'classnames';

import APINotLoaded from 'display/not_loaded';
import SectionHeader from 'display/section_header';
import SimpleTooltip from 'display/simple_tooltip';
import {AjaxError} from 'display/errors';
import {InfoList, InfoItem} from 'display/info_list';
import ChangesLinks from 'display/changes/links';
import {ChangesPage, APINotLoadedPage} from 'display/page_chrome';
import {Grid, GridRow} from 'display/grid';
import {Tabs, MenuUtils} from 'display/menus';
import {TestDetails} from 'display/changes/test_details';

import {
  get_runnable_condition,
  get_runnable_condition_short_text,
  ConditionDot
} from 'display/changes/build_conditions';

import InteractiveData from 'pages/helpers/interactive_data';

import {TestHierarchy} from 'display/changes/test_hierarchy';

import * as api from 'server/api';

import * as utils from 'utils/utils';

// Tab names.
const SHARDING = 'Sharding';
const NOT_PASSING_TESTS = 'Not Passing Tests';
const TEST_LIST = 'Test List';
const TEST_HIERARCHY = 'Test Hierarchy';
const TARGET_LIST = 'Target List';

export const BuildTestsPage = React.createClass({
  menuItems: [SHARDING, NOT_PASSING_TESTS, TEST_LIST, TEST_HIERARCHY, TARGET_LIST],

  propTypes: {
    buildID: PropTypes.string.isRequired
  },

  getInitialState: function() {
    return {
      selectedItem: null, // set in componentWillMount

      // Not Passing tab
      expandedTests: {}, // expand for more details
      uncheckedResults: {}, // checkboxes to filter by statuses

      expandedAllTests: {},
      expandedAllTargets: {},

      queryValue: InteractiveData.getParamsFromWindowUrl()['query'] || null
    };
  },

  componentWillMount: function() {
    var selectedItemFromHash = MenuUtils.selectItemFromHash(
      window.location.hash,
      this.menuItems
    );

    // when we first came to this page, which tab was shown? Used by the
    // initial data fetching within tabs
    this.initialTab = selectedItemFromHash || NOT_PASSING_TESTS;

    this.setState({selectedItem: this.initialTab});

    this.setState({
      testList: InteractiveData(
        this,
        'testList',
        `/api/0/builds/${this.props.buildID}/tests/`
      ),
      targetList: InteractiveData(
        this,
        'targetList',
        `/api/0/builds/${this.props.buildID}/targets/`
      )
    });
  },

  componentDidMount: function() {
    _.each([['testList', TEST_LIST], ['targetList', TARGET_LIST]], tabs => {
      var [stateKey, tabName] = tabs;
      var params = {};
      if (this.initialTab === tabName) {
        var params = InteractiveData.getParamsFromWindowUrl();
      }
      this.state[stateKey].initialize(params);
    });

    api.fetch(this, {
      buildInfo: `/api/0/builds/${this.props.buildID}`,
      failedTests: `/api/0/builds/${this.props.buildID}/tests/failures`
    });
  },

  render: function() {
    if (!api.isLoaded(this.state.buildInfo)) {
      return <APINotLoadedPage calls={this.state.buildInfo} />;
    }
    var buildInfo = this.state.buildInfo.getReturnedData();

    var buildTitle = `${buildInfo.project.name} Build`;
    var pageTitle = 'Tests for ' + buildTitle;
    utils.setPageTitle(pageTitle);

    // render menu
    var selectedItem = this.state.selectedItem;

    var menu = (
      <Tabs
        items={this.menuItems}
        selectedItem={selectedItem}
        onClick={MenuUtils.onClick(this, selectedItem)}
      />
    );

    var content = null;
    switch (selectedItem) {
      case SHARDING:
        content = <ShardingTab build={buildInfo} />;
        break;
      case NOT_PASSING_TESTS:
        content = this.renderFailed();
        break;
      case TEST_LIST:
        content = this.renderAllTests();
        break;
      case TEST_HIERARCHY:
        content = (
          <TestHierarchy buildID={this.props.buildID} projectID={buildInfo.project.id} />
        );
        break;
      case TARGET_LIST:
        content = this.renderAllTargets();
        break;
      default:
        throw 'unreachable';
    }

    return (
      <ChangesPage highlight="Projects">
        <SectionHeader>
          Tests for <a href={ChangesLinks.buildHref(buildInfo)}>{buildTitle}</a>
        </SectionHeader>
        {menu}
        <div className="marginTopS">
          {content}
        </div>
      </ChangesPage>
    );
  },

  renderFailed: function() {
    if (!api.isLoaded(this.state.failedTests)) {
      return <APINotLoaded state={this.state.failedTests} />;
    }
    var failedTests = this.state.failedTests.getReturnedData();

    if (!failedTests) {
      return <div>Empty</div>;
    }

    var project = this.state.buildInfo.getReturnedData().project;

    var rows = [];
    _.each(failedTests, test => {
      // skip 'quarantined_passed' tests
      if (test.result.indexOf('passed') >= 0) {
        return;
      } else if (this.state.uncheckedResults[test.result]) {
        return;
      }

      var onClick = __ => {
        this.setState(
          utils.update_key_in_state_dict(
            'expandedTests',
            test.test_id,
            !this.state.expandedTests[test.test_id]
          )
        );
      };

      var expandLabel = !this.state.expandedTests[test.test_id] ? 'Expand' : 'Collapse';

      var markup = (
        <div>
          {test.shortName} <a onClick={onClick}>{expandLabel}</a>
          <div className="subText">{test.name}</div>
        </div>
      );

      var capitalizedResult = test.result.charAt(0).toUpperCase() + test.result.slice(1);

      var color = 'bluishGray';
      if (test.result.indexOf('failed') >= 0) {
        color = 'red';
      }

      let testRow = new GridRow(test.test_id, [
        markup,
        <span className={color}>
          {capitalizedResult}
        </span>,
        ChangesLinks.historyLink(project, test.hash)
      ]);
      rows.push(testRow);

      if (this.state.expandedTests[test.test_id]) {
        rows.push(
          GridRow.oneItem(
            test.test_id + ':expanded',
            <TestDetails testID={test.test_id} buildID={this.props.buildID} />
          )
        );
      }
    });

    var tests_by_result = _.groupBy(failedTests, t => t.result);
    var result_markup = _.map(tests_by_result, (tests, result) => {
      // as above, skip 'quarantined_passed' tests
      if (result.indexOf('passed') >= 0) {
        return;
      }

      var sentence = utils.plural(tests.length, 'test(s) ' + result);
      // render the number ourselves
      var rest_of_words = _.rest(sentence.split(' ')).join(' ');

      let onChange = evt => {
        this.setState(
          utils.update_key_in_state_dict(
            'uncheckedResults',
            result,
            !this.state.uncheckedResults[result]
          )
        );
      };

      var isChecked = !this.state.uncheckedResults[result];
      return (
        <div className="marginTopS" key={result}>
          <label>
            <input type="checkbox" checked={isChecked} onChange={onChange} />
            <span className="marginLeftXS lb">{tests.length}</span> {rest_of_words}
          </label>
        </div>
      );
    });

    return (
      <div>
        {result_markup}
        <Grid
          colnum={3}
          className="marginBottomM marginTopM"
          cellClasses={['wide', 'nowrap', 'nowrap']}
          data={rows}
          headers={['Name', 'Result', 'Links']}
        />
      </div>
    );
  },

  renderAllTests() {
    let interactive = this.state.testList;

    // we want to update the window url whenever the user switches tabs
    interactive.updateWindowUrl();

    if (interactive.hasNotLoadedInitialData()) {
      return <APINotLoaded calls={interactive.getDataToShow()} />;
    }

    let project = this.state.buildInfo.getReturnedData().project;

    let tests = interactive.getDataToShow().getReturnedData();

    var rows = [];
    _.each(tests, test => {
      var onClick = __ => {
        this.setState(
          utils.update_key_in_state_dict(
            'expandedAllTests',
            test.id,
            !this.state.expandedAllTests[test.id]
          )
        );
      };

      var expandLabel = !this.state.expandedAllTests[test.id] ? 'Expand' : 'Collapse';

      var markup = (
        <div>
          {test.shortName} <a onClick={onClick}>{expandLabel}</a>
          <div className="subText">{test.name}</div>
        </div>
      );

      let color = 'bluishGray';
      if (test.result.id.indexOf('failed') >= 0) {
        color = 'red';
      }
      let rowData = new GridRow(test.id, [
        markup,
        <span className={color}>
          {test.result.name}
        </span>,
        <span>
          {moment.duration(test.duration).asSeconds()}s
        </span>,
        test.numRetries,
        ChangesLinks.historyLink(project, test.hash)
      ]);
      rows.push(rowData);

      if (this.state.expandedAllTests[test.id]) {
        let expanded = GridRow.oneItem(
          test.id + ':expanded',
          <TestDetails testID={test.id} buildID={this.props.buildID} />
        );
        rows.push(expanded);
      }
    });

    var errorMessage = null;
    if (interactive.failedToLoadUpdatedData()) {
      errorMessage = (
        <AjaxError response={interactive.getDataForErrorMessage().response} />
      );
    }
    var style = interactive.isLoadingUpdatedData() ? {opacity: 0.5} : null;

    var pagingLinks = interactive.getPagingLinks({use_next_previous: true});

    let currentReverse = interactive.getCurrentParams()['reverse'] == 'true';
    let currentSort = interactive.getCurrentParams()['sort'] || 'duration';

    let switchSort = (sortKey, rev) => {
      // We use 'true' for true and null for false when saving 'reverse' value,
      // because this maps accurately to what we'd see in the URL and in data pulled
      // from the URL; null means "unset" (which defaults to false in the API), and the
      // there is no way to set a non-string URL parameter, so 'true' (which the API recognizes
      // as a bool) is stored/read as a string consistently.
      let storedRev = rev ? 'true' : null;
      interactive.updateWithParams({sort: sortKey, reverse: storedRev}, true);
    };

    const sortHeader = (text, key) => {
      let caret = null;
      let newRev = currentReverse;
      if (currentSort == key) {
        newRev = !currentReverse;
        caret = (
          <i
            className={classNames({
              fa: true,
              'fa-caret-down': !currentReverse,
              'fa-caret-up': currentReverse
            })}
            style={{marginLeft: '4px'}}
          />
        );
      }

      return (
        <div
          onClick={() => switchSort(key, newRev)}
          className={classNames({
            menuItem: true,
            selectedMenuItem: key == currentSort
          })}>
          {text}
          {caret}
        </div>
      );
    };

    let headers = [
      sortHeader('Name', 'name'),
      'Result',
      sortHeader('Duration', 'duration'),
      sortHeader('Retries', 'retries'),
      'History'
    ];

    let searchOnChange = evt => this.setState({queryValue: evt.target.value.trim()});
    let updateInteractive = evt => {
      interactive.updateWithParams({query: this.state.queryValue || null}, true);
      evt.preventDefault();
      return false;
    };
    return (
      <div style={style}>
        {errorMessage}
        <div style={{float: 'right'}}>
          <form onSubmit={updateInteractive}>
            <label>
              {'Filter: '}
              <input
                type="text"
                onChange={searchOnChange}
                value={this.state.queryValue || ''}
              />
            </label>
          </form>
        </div>
        <Grid
          colnum={headers.length}
          className="marginBottomM marginTopM"
          data={rows}
          headers={headers}
        />
        <div className="marginTopM marginBottomM">
          {pagingLinks}
        </div>
      </div>
    );
  },
  renderAllTargets() {
    let interactive = this.state.targetList;

    // we want to update the window url whenever the user switches tabs
    interactive.updateWindowUrl();

    if (interactive.hasNotLoadedInitialData()) {
      return <APINotLoaded calls={interactive.getDataToShow()} />;
    }

    let targets = interactive.getDataToShow().getReturnedData();
    var rows = [];
    _.each(targets, target => {
      var onClick = __ => {
        this.setState(
          utils.update_key_in_state_dict(
            'expandedAllTargets',
            target.id,
            !this.state.expandedAllTargets[target.id]
          )
        );
      };
      var expandLabel = !this.state.expandedAllTargets[target.id]
        ? 'Explain'
        : 'Collapse';
      var button =
        target.messages.length == 0
          ? null
          : <a onClick={onClick}>
              {expandLabel}
            </a>;
      var targetCondition = get_runnable_condition(target);
      var label = get_runnable_condition_short_text(targetCondition);
      var markup = (
        <div>
          <SimpleTooltip label={label} placement="right">
            <span>
              <ConditionDot condition={targetCondition} />
            </span>
          </SimpleTooltip>
          {target.name} {button}
        </div>
      );
      let rowData = new GridRow(target.id, [
        markup,
        <span>
          {target.status.name}
        </span>,
        <span>
          {target.resultSource.name}
        </span>,
        <span>
          {moment.duration(target.duration).asSeconds()}s
        </span>
      ]);
      rows.push(rowData);

      if (this.state.expandedAllTargets[target.id]) {
        let messageDisplays = _.map(target.messages, message => {
          return (
            <p key={message.id} className="targetMessage">
              {message.text}
            </p>
          );
        });
        let expanded = GridRow.oneItem(
          target.id + ':expanded',
          <div>
            {messageDisplays}
          </div>
        );
        rows.push(expanded);
      }
    });
    var errorMessage = null;
    if (interactive.failedToLoadUpdatedData()) {
      errorMessage = (
        <AjaxError response={interactive.getDataForErrorMessage().response} />
      );
    }
    var style = interactive.isLoadingUpdatedData() ? {opacity: 0.5} : null;

    var pagingLinks = interactive.getPagingLinks({use_next_previous: true});

    let currentReverse = interactive.getCurrentParams()['reverse'] == 'true';
    let currentSort = interactive.getCurrentParams()['sort'] || 'duration';

    let switchSort = (sortKey, rev) => {
      // We use 'true' for true and null for false when saving 'reverse' value,
      // because this maps accurately to what we'd see in the URL and in data pulled
      // from the URL; null means "unset" (which defaults to false in the API), and the
      // there is no way to set a non-string URL parameter, so 'true' (which the API recognizes
      // as a bool) is stored/read as a string consistently.
      let storedRev = rev ? 'true' : null;
      interactive.updateWithParams({sort: sortKey, reverse: storedRev}, true);
    };

    const sortHeader = (text, key) => {
      let caret = null;
      let newRev = currentReverse;
      if (currentSort == key) {
        newRev = !currentReverse;
        caret = (
          <i
            className={classNames({
              fa: true,
              'fa-caret-down': !currentReverse,
              'fa-caret-up': currentReverse
            })}
            style={{marginLeft: '4px'}}
          />
        );
      }

      return (
        <div
          onClick={() => switchSort(key, newRev)}
          className={classNames({
            menuItem: true,
            selectedMenuItem: key == currentSort
          })}>
          {text}
          {caret}
        </div>
      );
    };

    let headers = [
      sortHeader('Name', 'name'),
      'Status',
      'Result From',
      sortHeader('Duration', 'duration')
    ];
    let searchOnChange = evt => this.setState({queryValue: evt.target.value.trim()});
    let updateInteractive = evt => {
      interactive.updateWithParams({query: this.state.queryValue || null}, true);
      evt.preventDefault();
      return false;
    };

    return (
      <div style={style}>
        {errorMessage}
        <div style={{float: 'right'}}>
          <form onSubmit={updateInteractive}>
            <label>
              {'Filter: '}
              <input
                type="text"
                onChange={searchOnChange}
                value={this.state.queryValue || ''}
              />
            </label>
          </form>
        </div>
        <Grid
          colnum={headers.length}
          className="marginBottomM marginTopM"
          data={rows}
          headers={headers}
        />
        <div className="marginTopM marginBottomM">
          {pagingLinks}
        </div>
      </div>
    );
  }
});

var ShardingTab = React.createClass({
  propTypes: {
    build: PropTypes.object.isRequired
  },

  getInitialState: function() {
    var jobPhases = {};
    _.each(this.props.build.jobs, j => {
      jobPhases[j.id] = null;
    });

    return {
      jobPhases: jobPhases,
      // TODO: move to parent...
      expandedShards: {}
    };
  },

  componentDidMount: function() {
    // phases/jobsteps info
    var jobIDs = _.map(this.props.build.jobs, j => j.id);

    var endpoint_map = {};
    _.each(jobIDs, id => {
      endpoint_map[id] = `/api/0/jobs/${id}/phases?test_counts=1`;
    });

    // TODO: don't refetch every time (cache on parent)
    api.fetchMap(this, 'jobPhases', endpoint_map);
  },

  render: function() {
    var build = this.props.build;
    var jobIDs = _.map(build.jobs, j => j.id);

    var phasesCalls = _.chain(this.state.jobPhases).pick(jobIDs).values().value();

    if (!api.allLoaded(phasesCalls)) {
      return <APINotLoaded calls={phasesCalls} />;
    }

    var markup = [];
    _.each(jobIDs, jobID => {
      var job = _.filter(build.jobs, j => j.id === jobID)[0];
      markup.push(
        <SectionHeader>
          {job.name}
        </SectionHeader>
      );
      var rows = [];
      _.each(this.state.jobPhases[jobID].getReturnedData(), phase => {
        // Filter out steps with missing weights and then sort by descending weight.
        var steps = _.sortBy(
          _.filter(phase.steps, step => step.data.weight),
          step => -step.data.weight
        );
        _.each(steps, step => {
          var onClick = evt => {
            this.setState(
              utils.update_key_in_state_dict(
                'expandedShards',
                step.node.name,
                !this.state.expandedShards[step.node.name]
              )
            );
          };

          var expandLabel = !this.state.expandedShards[step.node.name]
            ? 'See Raw Data'
            : 'Collapse';
          let links = [];
          let logHref = ChangesLinks.jobstepChunkedLogHref(this.props.build.id, step);
          if (logHref) {
            links.push(
              <a className="marginRightM" href={logHref}>
                Log
              </a>
            );
          }
          links.push(
            <a className="marginRightM" onClick={onClick}>
              {expandLabel}
            </a>
          );
          let tests = step.data.tests === undefined ? step.data.targets : step.data.tests;
          rows.push([step.node && step.node.name, step.data.weight, tests.length, links]);

          if (this.state.expandedShards[step.node.name]) {
            rows.push(
              GridRow.oneItem(
                null,
                <pre className="defaultPre">
                  {JSON.stringify(step.data, null, 2)}
                </pre>
              )
            );
          }

          rows.push(
            GridRow.oneItem(
              null,
              <div>
                <b>Files:</b>
                <pre>
                  {tests.join('\n')}
                </pre>
              </div>
            )
          );
        });
      });
      markup.push(
        <Grid
          colnum={4}
          headers={['Node', 'Shard Weight', 'File Count', 'Links']}
          cellClasses={['wide', 'nowrap', 'nowrap', 'nowrap']}
          data={rows}
        />
      );
    });

    return (
      <div>
        <div style={{backgroundColor: '#FFFBCC'}} className="marginBottomL">
          This is very much a work-in-progress
        </div>
        {markup}
      </div>
    );
  }
});

export const SingleBuildTestPage = React.createClass({
  propTypes: {
    buildID: PropTypes.string.isRequired,
    testID: PropTypes.string.isRequired
  },

  getInitialState: function() {
    return {};
  },

  componentDidMount: function() {
    api.fetch(this, {
      buildInfo: `/api/0/builds/${this.props.buildID}/`,
      test: `/api/0/tests/${this.props.testID}/`
    });
  },

  render: function() {
    if (!api.isLoaded(this.state.buildInfo)) {
      return <APINotLoadedPage calls={this.state.buildInfo} />;
    }
    if (!api.isLoaded(this.state.test)) {
      return <APINotLoadedPage calls={this.state.test} />;
    }
    let buildInfo = this.state.buildInfo.getReturnedData();
    let test = this.state.test.getReturnedData();

    let buildTitle = `${buildInfo.project.name} Build`;
    let pageTitle = `Test ${test.shortName} for ${buildTitle}`;
    utils.setPageTitle(pageTitle);
    let infoItems = [
      <InfoItem label="Name">
        {test.name}
      </InfoItem>,
      <InfoItem label="Result">
        {test.result.name} ({ChangesLinks.historyLink(buildInfo.project, test.hash)})
      </InfoItem>
    ];

    let retryCountStyle = {};
    if (
      test.numRetries > 0 &&
      (test.result.id == 'passed' || test.result.id == 'quarantined_passed')
    ) {
      // Make retries needed for pass look like a bad thing, because they generally are.
      retryCountStyle = {color: 'red'};
    }
    let retryCount = (
      <div style={retryCountStyle}>
        {test.numRetries}
      </div>
    );
    let retriesDoc = (
      <div>
        Number of times the test was rerun to see if it would pass.<br />
        Passing tests should pass the first time and need no retries.
      </div>
    );
    infoItems.push(
      <InfoItem label="Retries" tooltip={retriesDoc}>
        {retryCount}
      </InfoItem>
    );

    let info = (
      <div>
        <InfoList className="marginTopM">
          {infoItems}
        </InfoList>
      </div>
    );
    let testDetails = (
      <TestDetails testID={this.props.testID} buildID={this.props.buildID} />
    );

    return (
      <ChangesPage highlight="Projects">
        <SectionHeader>
          Test {test.shortName} for{' '}
          <a href={ChangesLinks.buildHref(buildInfo)}>{buildTitle}</a>
        </SectionHeader>
        <div className="marginTopS">
          {info}
          {testDetails}
        </div>
      </ChangesPage>
    );
  }
});
