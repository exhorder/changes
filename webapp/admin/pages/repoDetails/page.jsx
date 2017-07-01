import React, {PropTypes} from 'react';
import LinkedStateMixin from 'react-addons-linked-state-mixin';

import SectionHeader from 'display/section_header';
import {ChangesPage, APINotLoadedPage} from 'display/page_chrome';
import ChangesLinks from 'display/changes/links';
import * as FieldGroupMarkup from 'display/field_group';
import {Grid} from 'display/grid';
import {Tabs, MenuUtils} from 'display/menus';

import * as api from 'server/api';

import * as utils from 'utils/utils';

const ProjectList = React.createClass({
  propTypes: {
    projects: PropTypes.array.isRequired
  },

  getInitialState: function() {
    return {};
  },

  render: function() {
    let rows = this.props.projects.map(project => {
      return [ChangesLinks.projectAdmin(project)];
    });

    return <Grid colnum={1} data={rows} headers={['Projects']} />;
  }
});

export default React.createClass({
  menuItems: ['Settings', 'Projects'],

  getInitialState: function() {
    return {
      selectedItem: null // set in componentWillMount
    };
  },

  componentWillMount: function() {
    let selectedItemFromHash = MenuUtils.selectItemFromHash(
      window.location.hash,
      this.menuItems
    );

    // when we first came to this page, which tab was shown? Used by the
    // initial data fetching within tabs
    this.initialTab = selectedItemFromHash || 'Settings';
    this.setState({selectedItem: this.initialTab});
  },

  componentDidMount: function() {
    let repositoryID = this.props.params.repositoryID;
    api.fetch(this, {
      repository: `/api/0/repositories/${repositoryID}`,
      projects: `/api/0/repositories/${repositoryID}/projects`
    });
  },

  render: function() {
    if (!api.isLoaded(this.state.repository)) {
      return <APINotLoadedPage calls={this.state.repository} />;
    }
    let repository = this.state.repository.getReturnedData();

    let title = repository.url;
    utils.setPageTitle(title);

    // render menu
    let selectedItem = this.state.selectedItem;

    let menu = (
      <Tabs
        items={this.menuItems}
        selectedItem={selectedItem}
        onClick={MenuUtils.onClick(this, selectedItem)}
      />
    );

    let content = null;
    switch (selectedItem) {
      case 'Settings':
        content = <RepositorySettingsFieldGroup repository={repository} />;
        break;
      case 'Projects':
        if (!api.isLoaded(this.state.projects)) {
          return <APINotLoadedPage calls={this.state.projects} />;
        }
        content = <ProjectList projects={this.state.projects.getReturnedData()} />;
        break;
      default:
        throw 'unreachable';
    }

    return (
      <ChangesPage highlight="Repository Settings">
        <SectionHeader>
          {title}
        </SectionHeader>
        {menu}
        <div className="marginTopS">
          {content}
        </div>
      </ChangesPage>
    );
  }
});

let RepositorySettingsFieldGroup = React.createClass({
  mixins: [LinkedStateMixin, FieldGroupMarkup.DiffFormMixin],

  propTypes: {
    repository: PropTypes.object.isRequired
  },

  getInitialState: function() {
    return {};
  },

  getFieldNames: function() {
    return ['url', 'backend', 'status', 'username', 'privateKeyFile', 'callsign'];
  },

  saveSettings: function() {
    let state = this.state;
    let params = {
      url: state.url,
      backend: state.backend,
      status: state.status,
      'auth.username': state.username,
      'auth.private-key-file': state.privateKeyFile,
      'phabricator.callsign': state.callsign
    };

    let endpoints = {
      _postRequest_repository: `/api/0/repositories/${this.props.repository.id}/`
    };
    params = {
      _postRequest_repository: params
    };

    api.post(this, endpoints, params);
  },

  componentDidMount: function() {
    let repository = this.props.repository;
    this.setState(
      {
        url: repository.url,
        status: repository.status.id,
        backend: repository.backend.id,
        username: repository.options['auth.username'],
        privateKeyFile: repository.options['auth.private-key-file'],
        callsign: repository.options['phabricator.callsign']
      },
      this.updateSavedFormState
    );
  },

  render: function() {
    let form = [
      {
        sectionTitle: 'Basics',
        fields: [
          {type: 'text', display: 'URL', link: 'url'},
          {
            type: 'select',
            options: {Active: 'active', Inactive: 'inactive'},
            display: 'Status',
            link: 'status'
          },
          {
            type: 'select',
            options: {Unknown: 'unknown', Git: 'git', Mercurial: 'hg'},
            display: 'Backend',
            link: 'backend'
          }
        ]
      },
      {
        sectionTitle: 'Credentials',
        fields: [
          {
            type: 'text',
            display: 'Username',
            link: 'username',
            placeholder: 'Defaults to vcs backend.'
          },
          {
            type: 'text',
            display: 'Private Key File',
            link: 'privateKeyFile',
            placeholder: 'i.e. ~/.ssh/id_rsa.'
          }
        ]
      },
      {
        sectionTitle: 'Phabricator',
        fields: [{type: 'text', display: 'Callsign', link: 'callsign'}]
      }
    ];

    return FieldGroupMarkup.create(form, 'Save Repository', this);
  }
});
