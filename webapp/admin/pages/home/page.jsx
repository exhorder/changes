import React, {PropTypes} from 'react';
import idx from 'idx';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import URI from 'urijs';

import APINotLoaded from 'display/not_loaded';
import SectionHeader from 'display/section_header';
import {ChangesPage, APINotLoadedPage} from 'display/page_chrome';
import ChangesLinks from 'display/changes/links';
import * as FieldGroupMarkup from 'display/field_group';
import {FlashMessage, FAILURE} from 'display/flash';
import {Grid} from 'display/grid';
import Request from 'display/request';
import {Tabs, MenuUtils} from 'display/menus';
import {TimeText} from 'display/time';

import InteractiveData from 'pages/helpers/interactive_data';

import * as api from 'server/api';

import * as utils from 'utils/utils';

export default React.createClass({
  mixins: [LinkedStateMixin],

  menuItems: [
    'Projects',
    'New Project',
    'Repositories',
    'New Repository',
    'Users',
    'Message'
  ],

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
    this.initialTab = selectedItemFromHash || 'Projects';

    this.setState({
      selectedItem: this.initialTab,
      repositoriesInteractive: InteractiveData(
        this,
        'repositoriesInteractive',
        '/api/0/repositories/?status='
      ),
      usersInteractive: InteractiveData(this, 'usersInteractive', '/api/0/users/')
    });
  },

  componentDidMount: function() {
    api.fetch(this, {
      projects: '/api/0/projects/?status=',
      message: '/api/0/messages/'
    });

    var interactives = [this.state.repositoriesInteractive, this.state.usersInteractive];

    interactives.forEach(interactive => {
      if (!interactive.hasRunInitialize()) {
        interactive.initialize({});
      }
    });
  },

  render: function() {
    if (!api.isLoaded(this.state.projects)) {
      return <APINotLoadedPage calls={this.state.projects} />;
    }

    let title = 'Admin Panel';
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
      case 'Projects':
        content = this.renderProjects();
        break;
      case 'New Project':
        content = <NewProjectFieldGroup />;
        break;
      case 'Repositories':
        content = this.renderRepositories();
        break;
      case 'New Repository':
        content = <NewRepoFieldGroup />;
        break;
      case 'Users':
        content = this.renderUsers();
        break;
      case 'Message':
        if (!api.isLoaded(this.state.message)) {
          return <APINotLoadedPage calls={this.state.message} />;
        }
        content = (
          <AdminMessageFieldGroup message={this.state.message.getReturnedData()} />
        );
        break;
      default:
        throw 'unreachable';
    }

    return (
      <ChangesPage highlight="Projects">
        <SectionHeader>
          {title}
        </SectionHeader>
        {menu}
        <div className="marginTopS">
          {content}
        </div>
      </ChangesPage>
    );
  },

  renderProjects: function() {
    if (!api.isLoaded(this.state.projects)) {
      return <APINotLoadedPage calls={this.state.projects} />;
    }
    let projects = this.state.projects.getReturnedData();

    let rows = [];
    projects.forEach(project => {
      rows.push([
        ChangesLinks.projectAdmin(project),
        project.status.name,
        <TimeText time={project.dateCreated} />
      ]);
    });

    return (
      <div>
        <Grid
          colnum={3}
          className="marginBottomM marginTopM"
          data={rows}
          headers={['Name', 'Status', 'Creation Date']}
        />
      </div>
    );
  },

  renderRepositories: function() {
    var interactive = this.state.repositoriesInteractive;
    if (interactive.hasNotLoadedInitialData()) {
      return <APINotLoaded calls={interactive.getDataToShow()} />;
    }

    let repositories = interactive.getDataToShow().getReturnedData();
    let rows = [];
    repositories.forEach(repository => {
      rows.push([
        ChangesLinks.repositoryAdmin(repository),
        repository.status.name,
        repository.backend.name,
        <TimeText time={repository.dateCreated} />
      ]);
    });

    var pagingLinks = interactive.getPagingLinks({
      use_next_previous: true
    });
    return (
      <div>
        <Grid
          colnum={4}
          className="marginBottomM marginTopM"
          data={rows}
          headers={['Name', 'Status', 'Backend', 'Created']}
        />
        <div className="marginTopM marginBottomM">
          {pagingLinks}
        </div>
      </div>
    );
  },

  renderUsers: function() {
    var interactive = this.state.usersInteractive;
    if (interactive.hasNotLoadedInitialData()) {
      return <APINotLoaded calls={interactive.getDataToShow()} />;
    }

    let users = interactive.getDataToShow().getReturnedData();
    let rows = [];

    users.forEach(user => {
      let params = {};
      let isAdmin = user.isAdmin ? 'Yes' : 'No';
      params['is_admin'] = !user.isAdmin;
      let endpoint = `/api/0/users/${user.id}/`;
      let post = (
        <Request
          parentElem={this}
          name="make_admin"
          endpoint={endpoint}
          method="post"
          params={params}>
          <span>
            {isAdmin}
          </span>
        </Request>
      );

      let projects =
        user.project_permissions == null ? '' : user.project_permissions.join(', ');
      rows.push([user.email, <TimeText time={user.dateCreated} />, post, projects]);
    });

    var pagingLinks = interactive.getPagingLinks({
      use_next_previous: true
    });
    return (
      <div>
        <Grid
          colnum={4}
          className="marginBottomM marginTopM"
          data={rows}
          headers={['Email', 'Created', 'Admin?', 'Projects With Admin Access']}
        />
        <div className="marginTopM marginBottomM">
          {pagingLinks}
        </div>
      </div>
    );
  }
});

let NewProjectFieldGroup = React.createClass({
  mixins: [LinkedStateMixin, FieldGroupMarkup.DiffFormMixin],

  getInitialState: function() {
    return {};
  },

  getFieldNames: function() {
    return ['name', 'repository'];
  },

  saveSettings: function() {
    let state = this.state;
    let project_params = {
      name: state.name,
      repository: state.repository
    };

    let saveCallback = FieldGroupMarkup.redirectCallback(this, project => {
      this.updateSavedFormState();
      return URI(ChangesLinks.projectAdminHref(project));
    });

    api.make_api_ajax_post(
      '/api/0/projects/',
      project_params,
      saveCallback,
      saveCallback
    );
  },

  componentDidMount: function() {
    this.updateSavedFormState();
  },

  render: function() {
    let form = [
      {
        sectionTitle: 'New Project',
        fields: [
          {type: 'text', display: 'Name', link: 'name'},
          {type: 'text', display: 'Repository', link: 'repository'}
        ]
      }
    ];

    let fieldMarkup = FieldGroupMarkup.create(form, 'Save Project', this, []);
    let error = this.state.error;
    if (error) {
      error = JSON.parse(error);
      if (error.error !== undefined) {
        error = error.error;
      }
    }

    let errorMessage = error ? <FlashMessage message={error} type={FAILURE} /> : null;
    return (
      <div>
        <div>
          {fieldMarkup}
        </div>
        {errorMessage}
      </div>
    );
  }
});

let NewRepoFieldGroup = React.createClass({
  mixins: [LinkedStateMixin, FieldGroupMarkup.DiffFormMixin],

  getInitialState: function() {
    return {};
  },

  getFieldNames: function() {
    return ['url', 'backend'];
  },

  saveSettings: function() {
    let repo_params = {
      url: this.state.url,
      backend: this.state.backend
    };

    let saveCallback = FieldGroupMarkup.redirectCallback(this, repo => {
      this.updateSavedFormState();
      return URI(ChangesLinks.repositoryAdminHref(repo));
    });

    api.make_api_ajax_post(
      '/api/0/repositories/',
      repo_params,
      saveCallback,
      saveCallback
    );
  },

  componentDidMount: function() {
    this.updateSavedFormState();
  },

  render: function() {
    let backendOptions = {Unknown: 'unknown', Git: 'git', Mercurial: 'hg'};
    let form = [
      {
        sectionTitle: 'New Repository',
        fields: [
          {type: 'text', display: 'URL', link: 'url'},
          {
            type: 'select',
            display: 'Backend',
            link: 'backend',
            options: backendOptions
          }
        ]
      }
    ];

    let fieldMarkup = FieldGroupMarkup.create(form, 'Create Repository', this, []);
    return (
      <div>
        {fieldMarkup}
      </div>
    );
  }
});

let AdminMessageFieldGroup = React.createClass({
  mixins: [LinkedStateMixin, FieldGroupMarkup.DiffFormMixin],

  propTypes: {
    message: PropTypes.object.isRequired
  },

  getInitialState: function() {
    return {
      messageText: idx(this.props.message, _ => _.message) || '',
      error: ''
    };
  },

  getFieldNames: function() {
    return ['messageText'];
  },

  saveSettings: function() {
    let message_params = {
      message: this.state.messageText
    };
    var saveCallback = (response, was_success) => {
      if (was_success) {
        this.setState({error: ''}, this.updateSavedFormState);
      } else {
        this.setState({error: response.responseText});
      }
    };

    api.make_api_ajax_post(
      '/api/0/messages/',
      message_params,
      saveCallback,
      saveCallback
    );
  },

  componentDidMount: function() {
    this.updateSavedFormState();
  },

  form: [
    {
      sectionTitle: 'Message',
      fields: [{type: 'text', display: '', link: 'messageText'}]
    }
  ],

  render: function() {
    let fieldMarkup = FieldGroupMarkup.create(this.form, 'Save Message', this);
    let error = this.state.error;
    return (
      <div>
        <div>
          {fieldMarkup}
        </div>
        <div>
          {error}
        </div>
      </div>
    );
  }
});
