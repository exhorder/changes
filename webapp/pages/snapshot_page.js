import React, {PropTypes} from 'react';
import moment from 'moment';
import _ from 'underscore';

import ChangesLinks from 'display/changes/links';
import SectionHeader from 'display/section_header';
import {ChangesPage, APINotLoadedPage} from 'display/page_chrome';
import {Grid} from 'display/grid';
import {InfoList, InfoItem} from 'display/info_list';
import {SingleBuildStatus} from 'display/changes/builds';
import {TimeText} from 'display/time';

import * as api from 'server/api';

import * as utils from 'utils/utils';

/**
 * Page that shows the builds associated with a single snapshot, across all projects.
 */
var SnapshotPage = React.createClass({
  propTypes: {
    snapshotID: PropTypes.string.isRequired
  },

  getInitialState: function() {
    return {
      snapshotJobs: null,
      snapshotDetails: null
    };
  },

  componentDidMount: function() {
    var snapshotID = this.props.snapshotID;

    api.fetch(this, {
      snapshotDetails: `/api/0/snapshots/${snapshotID}/`,
      snapshotJobs: `/api/0/snapshots/${snapshotID}/jobs/`
    });
  },

  render: function() {
    if (!api.allLoaded([this.state.snapshotJobs, this.state.snapshotDetails])) {
      return (
        <APINotLoadedPage calls={[this.state.snapshotJobs, this.state.snapshotDetails]} />
      );
    }

    var details = this.state.snapshotDetails.getReturnedData();
    var snapshotDate = moment.utc(details.dateCreated).local().format('M/D/YY h:mm');
    utils.setPageTitle(`Snapshot - ${snapshotDate}`);

    var cellClasses = ['buildWidgetCell', 'wide easyClick', 'nowrap', 'nowrap'];
    var headers = ['Build', 'Name', 'Target', 'Started'];

    var grid_data = _.map(this.state.snapshotJobs.getReturnedData(), d => {
      return [
        <SingleBuildStatus build={d.build} parentElem={this} />,
        <a className="subtle" href={ChangesLinks.buildHref(d.build)}>
          {d.build.name}
        </a>,
        ChangesLinks.phab(d.build),
        <TimeText time={d.build.dateStarted} />
      ];
    });

    var source = details.source;
    var authorLink = ChangesLinks.author(source.revision.author, false);
    var commitLink = ChangesLinks.phabCommitHref(source.revision);
    var buildLink = ChangesLinks.buildHref(details.build);

    var projectInfo = ChangesLinks.project(details.build.project);

    var commitInfo = (
      <div>
        <a href={commitLink} target="_blank">
          {source.revision.sha.substring(0, 7)}
        </a>
        {': '}
        {utils.truncate(utils.first_line(source.revision.message))}
        {' (by '} {authorLink}
        {')'}
      </div>
    );

    var buildInfo = (
      <div>
        <a href={buildLink} target="_blank">
          {details.build.id}
        </a>
      </div>
    );

    var statusText = '';
    if (details.isActive) {
      statusText = 'Currently active';
    } else if (details.status.name == 'Active') {
      statusText = 'Ready to be activated';
    } else {
      statusText = details.status.name;
    }

    return (
      <ChangesPage>
        <SectionHeader>
          {details.name}
        </SectionHeader>
        <InfoList>
          <InfoItem label="Snapshot ID">
            {details.id}
          </InfoItem>
          <InfoItem label="Status">
            {statusText}
          </InfoItem>
          <InfoItem label="Project">
            {projectInfo}
          </InfoItem>
          <InfoItem label="Created from build">
            {buildInfo}
          </InfoItem>
          <InfoItem label="Based on commit">
            {commitInfo}
          </InfoItem>
        </InfoList>
        <div className="marginBottomM marginTopM paddingTopS">
          Recent runs with this snapshot
        </div>
        <Grid colnum={4} data={grid_data} cellClasses={cellClasses} headers={headers} />
      </ChangesPage>
    );
  }
});

export default SnapshotPage;
