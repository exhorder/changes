import React, {PropTypes} from 'react';
import URI from 'urijs';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';

import {ChangesPage, APINotLoadedPage} from 'display/page_chrome';
import {ProgrammingError} from 'display/errors';
import {Tabs, MenuUtils} from 'display/menus';

import BuildsTab from './builds_tab';
import CommitsTab from './commits_tab';
import DetailsTab from './details_tab';
import TestsTab from './tests_tab';
import InteractiveData from 'pages/helpers/interactive_data';

import * as api from 'server/api';

import * as utils from 'utils/utils';

export default React.createClass({
  getInitialState() {
    return {
      selectedItem: null, // we set this in componentWillMount
      project: null,
      commits: null,
      flakyTests: null,
      quarantineTasks: null,
      details: null,

      // Keep the state for the commit tab here (and send it via props.) This
      // preserves the state if the user clicks to another tab
      commitsState: {},

      // same, but for builds state
      buildsInteractive: {}
    };
  },

  menuItems: ['Commits', 'Builds', 'Tests', 'Details'],

  componentWillMount() {
    // if our url contains a hash, show that tab
    var selected_item_from_hash = MenuUtils.selectItemFromHash(
      window.location.hash,
      this.menuItems
    );

    this.initialTab = selected_item_from_hash || 'Commits';

    // initialize our paging objects. Data fetching still doesn't happen
    // till componentDidMount (either ours or the subcomponent.)
    this.setState({
      selectedItem: this.initialTab,
      buildsInteractive: InteractiveData(
        this,
        'buildsInteractive',
        BuildsTab.getEndpoint(this.props.params.projectSlug)
      ),
      commitsInteractive: InteractiveData(
        this,
        'commitsInteractive',
        CommitsTab.getEndpoint(this.props.params.projectSlug)
      )
    });
  },

  componentDidMount() {
    var slug = this.props.params.projectSlug;

    // grab the initial project data needed to render anything. We also eagerly
    // grab some data for our tabs so that they load faster
    api.fetch(this, {
      project: `/api/0/projects/${slug}`
    });
  },

  render: function() {
    if (!api.isLoaded(this.state.project)) {
      return <APINotLoadedPage calls={this.state.project} />;
    }

    utils.setPageTitle(
      this.state.project.getReturnedData().name + ' - ' + this.state.selectedItem
    );

    // render menu
    var selected_item = this.state.selectedItem;
    var onClick = item => {
      if (item === selected_item) {
        return;
      }

      window.history.replaceState(
        null,
        'changed tab',
        URI(window.location.href).search('').hash(item.replace(/ /g, '')).toString()
      );
      this.setState({selectedItem: item});
    };
    var menu = (
      <Tabs items={this.menuItems} selectedItem={selected_item} onClick={onClick} />
    );

    var content = null;
    switch (selected_item) {
      case 'Commits':
        content = (
          <CommitsTab
            project={this.state.project}
            interactive={this.state.commitsInteractive}
            isInitialTab={this.initialTab === 'Commits'}
            pageElem={this}
          />
        );
        break;
      case 'Builds':
        content = (
          <BuildsTab
            project={this.state.project}
            interactive={this.state.buildsInteractive}
            isInitialTab={this.initialTab === 'Builds'}
            pageElem={this}
          />
        );
        break;
      case 'Tests':
        content = (
          <TestsTab
            project={this.state.project}
            flakyTests={this.state.flakyTests}
            quarantineTasks={this.state.quarantineTasks}
            pageElem={this}
          />
        );
        break;
      case 'Details':
        content = (
          <DetailsTab
            project={this.state.project}
            details={this.state.details}
            pageElem={this}
          />
        );
        break;
      default:
        content = (
          <ProgrammingError>
            Unknown tab {selected_item}
          </ProgrammingError>
        );
    }

    var padding_classes = 'paddingLeftL paddingRightL';
    return (
      <ChangesPage bodyPadding={false}>
        {this.renderProjectInfo(this.state.project.getReturnedData())}
        <div className={padding_classes}>
          {menu}
          {content}
        </div>
      </ChangesPage>
    );
  },

  renderProjectInfo: function(project_info) {
    var branches_option = project_info.options['build.branch-names'] || '*';
    if (branches_option === '*') {
      var branches = 'all branches';
    } else if (branches_option.split(' ').length === 1) {
      var branches = `only on ${branches_option} branch`;
    } else {
      var branches = 'branches: ' + branches_option.replace(/ /g, ', ');
    }

    var whitelist_msg = '';
    var whitelist_option = project_info.options['build.file-whitelist'];
    if (whitelist_option) {
      var whitelist_paths = utils.split_lines(whitelist_option);
      var whitelist_tooltip = (
        <Tooltip>
          {whitelist_paths.map(p =>
            <div>
              {p}
            </div>
          )}
        </Tooltip>
      );

      whitelist_msg = (
        <span style={{fontWeight: 600}}>
          Builds are only run for changes that touch{' '}
          <OverlayTrigger placement="bottom" overlay={whitelist_tooltip}>
            <span style={{borderBottom: '1px dotted #777'}}>certain paths</span>
          </OverlayTrigger>
          {'.'}
        </span>
      );
    }

    let inactive_warning = null;
    if (project_info.status.id == 'inactive') {
      inactive_warning = (
        <span className="inactiveWarning">[This project is inactive]</span>
      );
    }

    return (
      <div style={{padding: 20}}>
        <div className="nonFixedClass">
          <b>
            {project_info.name}
          </b>
          <tt>
            {' '}(arc test {project_info.slug})
          </tt>
          {inactive_warning}
        </div>
        <span style={{fontWeight: 600}}>Repository:</span> {project_info.repository.url}{' '}
        {' ('}
        {branches}
        {')'}
        <div>{whitelist_msg}</div>
      </div>
    );
  }
});
