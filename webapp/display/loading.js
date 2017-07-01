import React, {PropTypes} from 'react';
import _ from 'underscore';

import Examples from 'display/examples';

// Some playful loading messages
var loading_messages = [
  'Waiting for them bits',
  'Rolling, rolling, rolling',
  'Slow and steady wins the race',
  'Simon says... wait',
  'Important things are worth waiting for',
  "I'm a happy loading message! \\(^o^)/",
  'Mining bitcoi^W^WLoading Changes. Hang tight',
  'Reticulating splines...',
  'Grab a snickers.'
];

/*
 * Shows a random string from the above list of loading messages. Since its
 * random, it will change every time the state of the parent component changes!
 * Which I actually like, since its a natural way to show progress.
 */
export const RandomLoadingMessage = React.createClass({
  propTypes: {
    display: PropTypes.oneOf(['inline', 'block', 'inlineBlock'])

    // ...
    // transfers other properties to rendered <div />
  },

  getDefaultProps: function() {
    return {display: 'block'};
  },

  render: function() {
    var {className, ...props} = this.props;

    if (this.props.display === 'inline' || this.props.display === 'inlineBlock') {
      className = (className || '') + ' ' + this.props.display;
    }

    return (
      <div {...props} className={className}>
        {_.sample(loading_messages)}
      </div>
    );
  }
});

/*
 * When you have a part of the page that hasn't yet loaded, show a loading box.
 */
export const InlineLoading = React.createClass({
  propTypes: {
    // ...
    // transfers all properties to rendered <div />
  },

  render: function() {
    var {className, ...props} = this.props;
    className = (className || '') + ' inlineLoading nonFixedClass';

    return (
      <div {...props} className={className}>
        <i className="fa fa-spinner fa-spin marginRightS" />
        {_.sample(loading_messages)}
      </div>
    );
  }
});

Examples.add('Loading Messages', __ => {
  return [<RandomLoadingMessage />, <RandomLoadingMessage />, <InlineLoading />];
});
