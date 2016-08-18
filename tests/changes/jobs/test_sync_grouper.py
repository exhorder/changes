import mock
import pytest

from flask import current_app

from changes.config import db
from changes.jobs.sync_grouper import (
    _get_admin_emails_from_grouper, _sync_admin_users, sync_grouper
)
from changes.testutils import TestCase


class SyncGrouperAdminTestCase(TestCase):

    def test_get_admin_emails_from_grouper_correct(self):
        mock_groupy = mock.MagicMock()
        mock_groupy.permissions.get().groups = {
            'group1': mock.MagicMock(),
            'group2': mock.MagicMock(),
        }
        mock_groupy.permissions.get().groups['group1'].users = {
            'user1@dropbox.com': {'rolename': 'owner'},
            'user2@dropbox.com': {'rolename': 'member'},
            'user3@dropbox.com': {'rolename': 'member'},
        }
        mock_groupy.permissions.get().groups['group2'].users = {
            'user3@dropbox.com': {'rolename': 'member'},
            'user4@dropbox.com': {'rolename': 'member'},
        }
        with mock.patch('changes.jobs.sync_grouper.Groupy') as mock_groupy_init:
            mock_groupy_init.return_value = mock_groupy
            admin_usernames = _get_admin_emails_from_grouper()
        mock_groupy_init.assert_called_once_with(
            current_app.config['GROUPER_API_URL'])

        # can't use assert_called_once_with because we called it 3 times when
        # setting up the mock object itself
        mock_groupy.permissions.get.assert_called_with(
            current_app.config['GROUPER_PERMISSIONS_ADMIN'])
        assert admin_usernames == set([
            'user1@dropbox.com',
            'user2@dropbox.com',
            'user3@dropbox.com',
            'user4@dropbox.com',
        ])

    def test_get_admin_emails_from_grouper_np_owner(self):
        mock_groupy = mock.MagicMock()
        mock_groupy.permissions.get().groups = {
            'group1': mock.MagicMock(),
            'group2': mock.MagicMock(),
        }
        mock_groupy.permissions.get().groups['group1'].users = {
            'user1@dropbox.com': {'rolename': 'np-owner'},
            'user2@dropbox.com': {'rolename': 'member'},
            'user3@dropbox.com': {'rolename': 'member'},
        }
        mock_groupy.permissions.get().groups['group2'].users = {
            'user3@dropbox.com': {'rolename': 'member'},
            'user4@dropbox.com': {'rolename': 'member'},
        }
        with mock.patch('changes.jobs.sync_grouper.Groupy') as mock_groupy_init:
            mock_groupy_init.return_value = mock_groupy
            admin_usernames = _get_admin_emails_from_grouper()
        mock_groupy_init.assert_called_once_with(
            current_app.config['GROUPER_API_URL'])
        mock_groupy.permissions.get.assert_called_with(
            current_app.config['GROUPER_PERMISSIONS_ADMIN'])
        assert admin_usernames == set([
            'user2@dropbox.com',
            'user3@dropbox.com',
            'user4@dropbox.com',
        ])

    def test_sync_admin_users_correct(self):
        admin_user1 = self.create_user(
            email='user1@dropbox.com', is_admin=True)
        admin_user2 = self.create_user(
            email='user2@dropbox.com', is_admin=True)
        admin_user3 = self.create_user(
            email='user3@dropbox.com', is_admin=True)

        user4 = self.create_user(email='user4@dropbox.com', is_admin=False)
        user5 = self.create_user(email='user5@dropbox.com', is_admin=False)

        _sync_admin_users(
            set([u'user2@dropbox.com', u'user3@dropbox.com', u'user5@dropbox.com']))
        db.session.expire_all()

        assert admin_user1.is_admin is False

        assert admin_user2.is_admin is True

        assert admin_user3.is_admin is True

        assert user4.is_admin is False

        assert user5.is_admin is True

    def test_sync_grouper_stats_succeeded(self):
        with mock.patch('changes.jobs.sync_grouper._get_admin_emails_from_grouper'):
            with mock.patch('changes.jobs.sync_grouper._sync_admin_users'):
                with mock.patch('changes.jobs.sync_grouper.statsreporter') as mock_statsreporter:
                    sync_grouper()
        mock_statsreporter.stats().set_gauge.assert_called_once_with('grouper_sync_error', 0)

    def test_sync_grouper_stats_failure(self):
        with mock.patch('changes.jobs.sync_grouper._get_admin_emails_from_grouper') as mock_call:
            with mock.patch('changes.jobs.sync_grouper._sync_admin_users'):
                with mock.patch('changes.jobs.sync_grouper.statsreporter') as mock_statsreporter:
                    mock_call.side_effect = Exception
                    with pytest.raises(Exception):
                        sync_grouper()
        mock_statsreporter.stats().set_gauge.assert_called_once_with('grouper_sync_error', 1)
