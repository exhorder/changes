import React, {PropTypes} from 'react';

import {ChangesPage} from 'display/page_chrome';

import custom_content_hook from 'utils/custom_content';

var FourOhFourPage = React.createClass({
  getInitialTitle: function() {
    return this.props.badUrl ? 'Error' : 'Not Found';
  },

  propTypes: {
    badUrl: PropTypes.bool
  },

  getDefaultProps: function() {
    return {
      badUrl: false
    };
  },

  render: function() {
    var custom_image = custom_content_hook('custom404Image');

    var badurl_markup = null;
    if (this.props.badUrl) {
      // TODO: use a color css class
      badurl_markup = (
        <div className="marginTopM mediumGray">
          It seems like you tried to go to a legitimate page but didn{"'"}t provide the
          necessary attributes in the path.
        </div>
      );
    }

    if (custom_image) {
      var image_href = '/custom_image/' + custom_image;

      var content = (
        <center style={{marginTop: 24, display: 'block'}}>
          <div style={{fontSize: 48, marginBottom: 20}}>404</div>
          <img className="block" src={image_href} style={{width: '30%'}} />
          <div style={{fontSize: 18, marginTop: 20}}>
            You won{"'"}t find any changes here.
          </div>
          {badurl_markup}
        </center>
      );
    } else {
      var content = (
        <center style={{marginTop: 24, display: 'block'}}>
          <div style={{fontSize: 48, marginBottom: 20}}>404</div>
          <div style={{fontSize: 18}}>Page not found</div>
          {badurl_markup}
        </center>
      );
    }

    return (
      <ChangesPage>
        {content}
      </ChangesPage>
    );
  }
});

export default FourOhFourPage;
