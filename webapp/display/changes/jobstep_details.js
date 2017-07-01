import React, {PropTypes} from 'react';
import _ from 'underscore';

import APINotLoaded from 'display/not_loaded';

import * as api from 'server/api';

/*
 * Shows artifacts for a jobstep
 */
export const JobstepDetails = React.createClass({
  propTypes: {
    jobstepID: PropTypes.string
  },

  getInitialState: function() {
    return {};
  },

  componentDidMount: function() {
    api.fetch(this, {
      details: `/api/0/jobsteps/${this.props.jobstepID}/artifacts/`
    });
  },

  render: function() {
    var {jobstepID, className, ...props} = this.props; // eslint-disable-line

    if (!api.isLoaded(this.state.details)) {
      return <APINotLoaded calls={this.state.details} />;
    }
    var details = this.state.details.getReturnedData();

    className = (className || '') + ' jobstepDetails';

    return (
      <div {...props} className={className}>
        {this.renderArtifacts(details.artifacts)}
      </div>
    );
  },

  renderArtifacts(artifacts) {
    var markup = [];
    if (artifacts.length > 0) {
      markup.push(<div className="lb marginTopM">Artifacts</div>);
      _.each(artifacts, a => {
        if (a.url) {
          markup.push(
            <div>
              <a className="external" target="_blank" href={a.url}>
                {a.name}
              </a>
            </div>
          );
        } else {
          // if there's no URL don't add a link
          markup.push(
            <div>
              {a.name}
            </div>
          );
        }
      });
    }

    return markup;
  }
});
