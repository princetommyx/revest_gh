"""
Tests for the admin dashboard's list endpoints.

The dashboard asks for a page size on every list screen (10, 12 or 15
depending on the page) and derives its page count from it. DRF ignores
`page_size` unless the pagination class opts in, so those screens received
20 rows, computed more pages than existed, and the last page the UI
offered returned 404. These pin the contract the dashboard relies on.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()

USERS = '/api/v1/admin/users/'


class PaginationContractTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username='boss', password='pw', role='ADMIN', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        for i in range(25):
            User.objects.create_user(username=f'u{i}', password='pw', role='SELLER')

    def test_page_size_is_honoured(self):
        r = self.client.get(USERS, {'page': 1, 'page_size': 10})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(len(r.json()['results']), 10)

    def test_the_last_page_the_dashboard_computes_actually_exists(self):
        """
        The dashboard renders Math.ceil(count / page_size) pages. If the
        server pages at a different size, the tail of that range 404s.
        """
        page_size = 10
        first = self.client.get(USERS, {'page': 1, 'page_size': page_size}).json()
        last_page = -(-first['count'] // page_size)

        r = self.client.get(USERS, {'page': last_page, 'page_size': page_size})
        self.assertEqual(r.status_code, 200,
                         f'page {last_page} of {last_page} returned {r.status_code}')
        self.assertTrue(r.json()['results'])

    def test_page_size_is_capped(self):
        """An unbounded page_size turns a list route into a full export."""
        r = self.client.get(USERS, {'page': 1, 'page_size': 100000})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertLessEqual(len(r.json()['results']), 100)

    def test_the_default_page_size_still_applies_without_the_param(self):
        r = self.client.get(USERS)
        self.assertEqual(len(r.json()['results']), 20)

    def test_the_envelope_keeps_its_shape(self):
        body = self.client.get(USERS, {'page_size': 5}).json()
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, body)


class UserListFilterTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username='boss', password='pw', role='ADMIN', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        for i in range(3):
            User.objects.create_user(username=f'seller{i}', password='pw', role='SELLER')
        for i in range(2):
            User.objects.create_user(username=f'adm{i}', password='pw', role='ADMIN', is_staff=True)

    def roles_in(self, params):
        r = self.client.get(USERS, params)
        self.assertEqual(r.status_code, 200, r.content)
        return [u['role'] for u in r.json()['results']]

    def test_exclude_role_removes_that_role(self):
        """
        The dashboard splits app users from admins across two screens and
        sends exclude_role=ADMIN for the first. The parameter was accepted
        and ignored, so admins showed up in both lists.
        """
        self.assertNotIn('ADMIN', self.roles_in({'exclude_role': 'ADMIN'}))

    def test_exclude_role_keeps_everyone_else(self):
        roles = self.roles_in({'exclude_role': 'ADMIN'})
        self.assertEqual(roles.count('SELLER'), 3)

    def test_role_still_filters_positively(self):
        self.assertEqual(set(self.roles_in({'role': 'ADMIN'})), {'ADMIN'})

    def test_a_non_admin_cannot_list_users(self):
        intruder = User.objects.create_user(username='nosy', password='pw', role='SELLER')
        client = APIClient()
        client.force_authenticate(user=intruder)
        self.assertIn(client.get(USERS).status_code, (401, 403))
