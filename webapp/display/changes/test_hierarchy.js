import React, {PropTypes} from 'react';
import _ from 'underscore';

import APINotLoaded from 'display/not_loaded';
import ChangesLinks from 'display/changes/links';
import {Grid, GridRow} from 'display/grid';

import InteractiveData from 'pages/helpers/interactive_data';
import {display_duration} from 'display/time';

// An interactive test hierarchy explorer, first rendering top-level
// directories/packages with aggregate test counts and duration, with the ability
// to navigate into them recursively.
export const TestHierarchy = React.createClass({
  propTypes: {
    projectID: PropTypes.string.isRequired,
    buildID: PropTypes.string.isRequired
  },

  getInitialState() {
    return {parent: ''};
  },

  componentWillMount() {
    let params = '';
    if (this.props.buildID) {
      params = `?build_id=${this.props.buildID}`;
    }
    this.setState({
      groupsInteractive: InteractiveData(
        this,
        'groupsInteractive',
        `/api/0/projects/${this.props.projectID}/testgroups/${params}`
      )
    });
  },

  componentDidMount() {
    this.state.groupsInteractive.initialize(InteractiveData.getParamsFromWindowUrl());
  },

  render() {
    let testgroups = this.state.groupsInteractive;
    if (testgroups.hasNotLoadedInitialData()) {
      return <APINotLoaded calls={[testgroups.getDataToShow()]} />;
    }
    let data = testgroups.getDataToShow().getReturnedData();
    let newPath = p => testgroups.updateWithParams({parent: p});
    let parent = testgroups.getCurrentParams()['parent'] || '';
    let root = {path: '', name: 'All'};
    let trailItems = _.map([root].concat(data.trail), (trailelt, idx) => {
      let name = trailelt.name;
      if (trailelt.path != parent) {
        name = (
          <a onClick={() => newPath(trailelt.path)}>
            {name}
          </a>
        );
      }
      let sep = '';
      if (idx != 0) {
        sep = <span style={{margin: '0.2em'}}>&rarr;</span>;
      }
      return (
        <span key={trailelt.path}>
          {sep}
          {name}
        </span>
      );
    });
    let trailMarkup = (
      <div className="defaultPre">
        {trailItems}
      </div>
    );

    let groupName = g => {
      if (g.numTests <= 1) {
        if (g.id) {
          return (
            <a
              className="external"
              target="_blank"
              href={ChangesLinks.buildTestHref(this.props.buildID, g)}>
              {g.name}
            </a>
          );
        }
        return (
          <span>
            {g.name}
          </span>
        );
      }
      return (
        <a onClick={() => newPath(g.path)}>
          {g.name}
        </a>
      );
    };
    let headers = ['', 'Tests', 'Duration'];
    let cellClasses = ['wide', 'nowrap', 'nowrap'];
    let groups = _.map(data.groups, g => {
      return new GridRow(g.path, [
        groupName(g),
        g.numTests,
        <Duration millis={g.totalDuration} />
      ]);
    });

    var contentStyle = testgroups.isLoadingUpdatedData() ? {opacity: 0.5} : null;
    return (
      <div>
        <div style={contentStyle}>
          {trailMarkup}
          <Grid
            colnum={headers.length}
            headers={headers}
            cellClasses={cellClasses}
            data={groups}
          />
        </div>
      </div>
    );
  }
});

// Simple human-readable rendering of a millisecond unix time.
const Duration = ({millis}) =>
  <span title={`${millis / 1000} seconds`}>
    {display_duration(millis / 1000)}
  </span>;
Duration.propTypes = {millis: PropTypes.number.isRequired};
