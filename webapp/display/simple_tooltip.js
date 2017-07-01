import React, {PropTypes} from 'react';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';

/*
 * A react-bootstrap tooltip with less boilerplate
 *
 * Note: if its not working for some reason, try wrapping your content in a
 * span (e.g. an onlyChild warning)
 */
var SimpleTooltip = React.createClass({
  propTypes: {
    // the content for the tooltip; should be text, but
    // markup is allowed.
    label: PropTypes.node,
    // left, right, top, bottom
    placement: PropTypes.string
  },

  getDefaultProps() {
    return {
      placement: 'bottom'
    };
  },

  render: function() {
    var tooltip = (
      <Tooltip>
        {this.props.label}
      </Tooltip>
    );

    return (
      <OverlayTrigger placement={this.props.placement} overlay={tooltip}>
        {this.props.children}
      </OverlayTrigger>
    );
  }
});

export default SimpleTooltip;
