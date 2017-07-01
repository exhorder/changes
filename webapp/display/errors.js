import React, {PropTypes} from 'react';

import Examples from 'display/examples';

/*
 * Renders a red error box
 */
export const Error = React.createClass({
  propTypes: {
    // ...
    // transfers all properties to rendered <div />
  },

  render: function() {
    var {className, ...props} = this.props;
    className = (className || '') + ' error';

    return (
      <div {...props} className={className}>
        {this.props.children}
      </div>
    );
  }
});

/*
 * Convenience class that takes an ajax response and renders an <Error />
 * TODO: handle multiple ajax responses?
 */
export const AjaxError = React.createClass({
  propTypes: {
    // the ajax response object (not the apiresponse wrapper! TODO: allow either?)
    response: PropTypes.object.isRequired

    // ...
    // transfers other properties to <Error /> (which transfers to <div />)
  },

  render: function() {
    var {response, ...props} = this.props;
    var response_status = response.status || null;
    var response_text = response.responseText.trim();
    // get rid of " at beginning and end
    var quote_trim = /^"+|"+$/g;
    response_text = response_text.replace(quote_trim, '');

    if (response_text === '') {
      response_text = null;
    }

    var status_titles = {
      '401': ' (NOT LOGGED IN)',
      '404': ' (NOT FOUND)'
    };

    var status_title = status_titles[response_status] || null;
    response_text = response_text || '';

    if (!response_status && !response_text) {
      response_text = <i>Empty response</i>;
    }

    return (
      <Error {...props}>
        <b>
          {response_status}
          {status_title}
        </b>
        <div>
          {response_text}
        </div>
      </Error>
    );
  }
});

/*
 * Renders a purple error box when someone is misuing a component. One of my
 * favorite classes: use this in a react component as an assert failure
 */
export const ProgrammingError = React.createClass({
  propTypes: {
    // ...
    // transfers all properties to rendered <div />
  },

  render: function() {
    var {className, ...props} = this.props;
    className = (className || '') + ' programmingError';

    return (
      <div {...props} className={className}>
        {this.props.children}
      </div>
    );
  }
});

Examples.add('Error', __ => {
  return [
    <Error>
      An error has occurred. Let{"'"}s be cryptic.
    </Error>
  ];
});
