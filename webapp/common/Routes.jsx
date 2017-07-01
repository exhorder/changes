import React from 'react';
import {Route, IndexRoute} from 'react-router';

import App from './App';

import AdminHomePage from '../admin/pages/home/page';
import AdminProjectDetailsPage from '../admin/pages/projectDetails/page';
import AdminRepoDetailsPage from '../admin/pages/repoDetails/page';

import AuthorDetailsPage from '../pages/authorDetails/page';
import HomePage from '../pages/home/page';
import ProjectDetailsPage from '../pages/projectDetails/page';
import ProjectListPage from '../pages/projectList/page';

export default (
  <Route path="/" component={App}>
    <IndexRoute component={HomePage} />
    <Route path="projects" component={ProjectListPage} />
    <Route path="projects/:projectSlug" component={ProjectDetailsPage} />
    <Route path="authors/:email" component={AuthorDetailsPage} />
    <Route path="admin" component={AdminHomePage} />
    <Route path="admin/projects/:projectSlug" component={AdminProjectDetailsPage} />
    <Route path="admin/repos/:repositoryID" component={AdminRepoDetailsPage} />
  </Route>
);

// var url_contains = {
//   commit_source: [CommitPage, 'sourceUUID'],
//   diff: [DiffPage, 'diff_id'],
//   single_build: [SingleBuildPage, 'buildID'],
//   build_test: [SingleBuildTestPage, 'buildID', 'testID'],
//   build_tests: [BuildTestsPage, 'buildID'],
//   project_test: [TestHistoryPage, 'projectUUID', 'testHash'],
//   job_log: [LogPage, 'buildID', 'jobID', 'logsourceID'],
//   author: [HomePage, 'author'], // TODO: don't just use the homepage
//   node: [NodePage, 'nodeID'],
//   snapshot: [SnapshotPage, 'snapshotID'],
//   infra_fails: [InfraFailsPage],
//   task_tree: [TaskTreePage, 'objectID'],
//   jobstep_summary: [JobstepSummaryPage],
//   code: [CodePage, 'sourceID'],
//   pusher: [PusherPage],
//   display_examples: [DisplayExamplesPage],
// };
