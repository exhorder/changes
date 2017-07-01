import React, {PropTypes} from 'react';
import _ from 'lodash';

import Request from 'display/request';
import SectionHeader from 'display/section_header';
import {Button} from 'display/button';
import ChangesLinks from 'display/changes/links';
import {ChangesPage, APINotLoadedPage} from 'display/page_chrome';
import {Grid, GridRow} from 'display/grid';
import {InfoList, InfoItem} from 'display/info_list';
import {SingleBuildStatus} from 'display/changes/builds';
import {get_runnable_condition, is_waiting} from 'display/changes/build_conditions';
import {TimeText, display_duration} from 'display/time';

import * as api from 'server/api';

import * as utils from 'utils/utils';
import custom_content_hook from 'utils/custom_content';

/**
 * Page that shows the builds associated with a single node, across all projects.
 */
var NodePage = React.createClass({
  propTypes: {
    nodeID: PropTypes.string.isRequired
  },

  getInitialState: function() {
    return {
      nodeJobs: null,
      nodeDetails: null
    };
  },

  componentDidMount: function() {
    var nodeID = this.props.nodeID;

    var detailsEndpoint = `/api/0/nodes/${nodeID}/`;
    var jobsEndpoint = `/api/0/nodes/${nodeID}/jobs/`;
    api.fetch(this, {
      nodeDetails: detailsEndpoint,
      nodeStatus: `/api/0/nodes/${nodeID}/status/`,
      nodeJobs: jobsEndpoint
    });
  },

  render: function() {
    if (!api.allLoaded([this.state.nodeJobs, this.state.nodeDetails])) {
      return <APINotLoadedPage calls={[this.state.nodeJobs, this.state.nodeDetails]} />;
    }

    var nodeID = this.props.nodeID;
    var node = this.state.nodeDetails.getReturnedData();
    utils.setPageTitle(node.name);

    var nodeStatusText = <span className="bluishGray">Loading...</span>;
    var toggleNodeButton = null;
    if (api.isLoaded(this.state.nodeStatus)) {
      const nodeStatus = this.state.nodeStatus.getReturnedData();
      console.log(nodeStatus);
      if (nodeStatus.offline === undefined) {
        nodeStatusText = <span className="bluishGray">Unknown</span>;
      } else {
        nodeStatusText = nodeStatus.offline
          ? <span className="red">Offline</span>
          : <span className="green">Online</span>;

        toggleNodeButton = (
          <div className="floatR">
            <Request
              parentElem={this}
              name="toggleNode"
              method="post"
              endpoint={`/api/0/nodes/${nodeID}/status/?toggle=1`}>
              <Button type="white">
                <span>
                  {nodeStatus.offline ? 'Bring Node Online' : 'Take Node Offline'}
                </span>
              </Button>
            </Request>
          </div>
        );
      }
    }

    var cellClasses = ['buildWidgetCell', 'nowrap', 'nowrap', 'nowrap', 'wide', 'nowrap'];
    var headers = ['Build', 'Duration', 'Target', 'Project', 'Name', 'Created'];

    var grid_data = _.map(this.state.nodeJobs.getReturnedData(), d => {
      var project_href = '/project/' + d.project.slug;
      let duration = !is_waiting(get_runnable_condition(d))
        ? display_duration(d.duration / 1000)
        : null;
      return new GridRow(d.id, [
        <SingleBuildStatus build={d.build} parentElem={this} />,
        duration,
        ChangesLinks.phab(d.build),
        <a href={project_href}>
          {d.project.name}
        </a>,
        d.build.name,
        <TimeText time={d.dateCreated} />
      ]);
    });

    var details = this.state.nodeDetails.getReturnedData();

    var extra_info_name = custom_content_hook('nodeInfoName'),
      extra_info_href = custom_content_hook('nodeInfo', null, details.name);

    var extra_info_markup = null;
    if (extra_info_name && extra_info_href) {
      var extra_info_markup = (
        <a
          className="external inlineBlock"
          style={{marginTop: 3}}
          target="_blank"
          href={extra_info_href}>
          {extra_info_name}
        </a>
      );
    }

    return (
      <ChangesPage>
        {toggleNodeButton}
        <SectionHeader>
          {details.name}
        </SectionHeader>
        <InfoList>
          <InfoItem label="Node ID">
            {details.id}
          </InfoItem>
          <InfoItem label="First Seen">
            <TimeText time={details.dateCreated} />
          </InfoItem>
          <InfoItem label="Status">
            {nodeStatusText}
          </InfoItem>
        </InfoList>
        {extra_info_markup}
        <div className="marginBottomM marginTopM paddingTopS">
          Recent runs on this node
        </div>
        <Grid
          colnum={headers.length}
          data={grid_data}
          cellClasses={cellClasses}
          headers={headers}
        />
      </ChangesPage>
    );
  }
});

export default NodePage;
