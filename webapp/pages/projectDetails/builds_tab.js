import React, {PropTypes} from 'react';
import _ from 'lodash';

import APINotLoaded from 'display/not_loaded';
import ChangesLinks from 'display/changes/links';
import {AjaxError} from 'display/errors';
import {ChangesChart} from 'display/changes/charts';
import {Grid, GridRow} from 'display/grid';
import {Menu1} from 'display/menus';
import {SingleBuildStatus} from 'display/changes/builds';
import {TimeText, display_duration} from 'display/time';
import {get_build_cause} from 'display/changes/build_text';
import {get_runnable_condition, is_waiting} from 'display/changes/build_conditions';

import InteractiveData from 'pages/helpers/interactive_data';

import * as api from 'server/api';

var BuildsTab = React.createClass({
  propTypes: {
    // the project api response
    project: PropTypes.object,

    // state is handled by parent so that its preserved if someone selects
    // another tab
    myState: PropTypes.object,

    // The InteractiveData object for this chart
    interactive: PropTypes.object,

    // parent elem that has state
    pageElem: PropTypes.object.isRequired
  },

  statics: {
    getEndpoint: function(slug) {
      return `/api/0/projects/${slug}/builds/`;
    }
  },

  getInitialState: function() {
    return {};
  },

  componentDidMount: function() {
    if (!this.props.interactive.hasRunInitialize()) {
      var params = this.props.isInitialTab
        ? InteractiveData.getParamsFromWindowUrl()
        : null;
      params = params || {};

      this.props.interactive.initialize(params || {});
    }

    // if this table has data to render, let's make sure the window url is
    // correct
    if (api.isLoaded(this.props.interactive.getDataToShow())) {
      this.props.interactive.updateWindowUrl();
    }
  },

  render: function() {
    var interactive = this.props.interactive;

    if (interactive.hasNotLoadedInitialData()) {
      return <APINotLoaded calls={interactive.getDataToShow()} />;
    }

    var data_to_show = interactive.getDataToShow();

    var links = this.props.interactive.getPagingLinks({type: 'chart_paging'});
    var prevLink = interactive.hasPreviousPage() ? links[0] : '';
    var nextLink = interactive.hasNextPage() ? links[1] : '';
    var chart = (
      <div className="buildsChart">
        {prevLink}
        <ChangesChart
          type="build"
          className="marginRightS inlineBlock"
          runnables={data_to_show.getReturnedData()}
          enableLatest={!interactive.hasPreviousPage()}
        />
        {nextLink}
      </div>
    );

    var data = data_to_show.getReturnedData().map(build => {
      var target = ChangesLinks.phab(build);

      var duration = !is_waiting(get_runnable_condition(build))
        ? display_duration(build.duration / 1000)
        : null;

      var tests = build.stats.test_count;

      return new GridRow(build.id, [
        <SingleBuildStatus build={build} parentElem={this} />,
        <a className="subtle" href={ChangesLinks.buildHref(build)}>
          {build.name}
        </a>,
        duration,
        tests,
        target,
        get_build_cause(build),
        ChangesLinks.author(build.author),
        <TimeText key={build.id} time={build.dateStarted} />
      ]);
    });

    var cellClasses = [
      'buildWidgetCell',
      'wide easyClick',
      'bluishGray nowrap',
      'bluishGray nowrap',
      'nowrap',
      'nowrap',
      'nowrap',
      'nowrap'
    ];

    var headers = [
      'Result',
      'Name',
      'Time',
      'Tests Ran',
      'Target',
      'Cause',
      'By',
      'Started'
    ];

    var error_message = null;
    if (interactive.failedToLoadUpdatedData()) {
      error_message = (
        <AjaxError response={interactive.getDataForErrorMessage().response} />
      );
    }

    var style = interactive.isLoadingUpdatedData() ? {opacity: 0.5} : null;

    return (
      <div>
        <div style={style}>
          <div className="floatR">
            {chart}
          </div>
          {this.renderControls()}
          {error_message}
          <Grid colnum={8} cellClasses={cellClasses} data={data} headers={headers} />
        </div>
        {this.renderPaging()}
      </div>
    );
  },

  renderControls: function(commits) {
    var items = [
      'All',
      'Commits Only',
      'Commit Queue Only',
      'Diffs/arc test only',
      'Snapshot only'
    ];

    var params_for_items = {
      All: {
        patches_only: null,
        tag: null
      },
      'Commits Only': {
        patches_only: null,
        tag: 'commit'
      },
      'Commit Queue Only': {
        patches_only: null,
        tag: 'commit-queue'
      },
      'Diffs/arc test only': {
        patches_only: 1,
        tag: null
      },
      'Snapshot only': {
        patches_only: null,
        tag: ['snapshot', 'test-snapshot']
      }
    };

    var current_params = this.props.interactive.getCurrentParams();
    var selected_item = items[0];
    _.each(params_for_items, (params, item) => {
      var is_selected = true;
      _.each(params, (v, k) => {
        if (current_params[k] + '' !== v + '') {
          is_selected = false;
        }
      });
      if (is_selected) {
        selected_item = item;
      }
    });

    var onclick = item =>
      this.props.interactive.updateWithParams(params_for_items[item], true);

    return (
      <Menu1
        className="marginBottomS buildsControls"
        items={items}
        selectedItem={selected_item}
        onClick={onclick}
      />
    );
  },

  renderPaging: function(commits) {
    var links = this.props.interactive.getPagingLinks();
    return (
      <div className="marginTopM marginBottomM">
        {links}
      </div>
    );
  }
});

export default BuildsTab;
