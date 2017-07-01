import React, {PropTypes} from 'react';

import {AjaxError} from 'display/errors';

import * as api from 'server/api';

/*
 * Eas(ier) way to make post requests.
 */
var Request = React.createClass({
  propTypes: {
    parentElem: PropTypes.object.isRequired,
    name: PropTypes.string.isRequired,
    endpoint: PropTypes.string.isRequired,
    params: PropTypes.object,
    method: PropTypes.oneOf(['delete', 'post', 'get']).isRequired,
    promptText: PropTypes.string
  },

  render: function() {
    var parentElem = this.props.parentElem,
      name = this.props.name,
      endpoint = this.props.endpoint,
      child = React.Children.only(this.props.children);

    var stateKey = `_${this.props.method}Request_${name}`;
    var currentState = parentElem.state[stateKey];

    if (currentState && currentState.condition === 'loading') {
      return (
        <div>
          <i className="fa fa-spinner fa-spin" />
        </div>
      );
    } else if (api.isError(currentState)) {
      return <AjaxError response={currentState.response} />;
    } else if (api.isLoaded(currentState) && this.props.method !== 'get') {
      // reload to pick up the updates from the request
      window.location.reload();
    }

    var method = api.post;
    if (this.props.method === 'delete') {
      method = api.delete_;
    } else if (this.props.method === 'get') {
      method = api.fetch;
    }

    var onClick = evt => {
      if (!this.props.promptText || confirm(this.props.promptText)) {
        method(
          parentElem,
          {
            [stateKey]: endpoint
          },
          {
            [stateKey]: this.props.params
          }
        );
      }
    };

    return React.cloneElement(child, {onClick: onClick});
  }
});

export default Request;
