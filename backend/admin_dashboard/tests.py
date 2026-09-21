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


class AdminVisibilityTests(TestCase):
    """
    Two dashboard pages were permanently empty because their endpoints
    scope to the caller's own records - which for a staff account is
    nothing. Both had looked fine in code review; only opening the page
    showed it.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            username='boss', password='pw', role='ADMIN', is_staff=True)
        self.disposer = User.objects.create_user(
            username='disposer', password='pw', role='SELLER')
        self.collector = User.objects.create_user(
            username='collector', password='pw', role='COLLECTOR')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_an_admin_sees_every_pickup_not_just_their_own(self):
        from decimal import Decimal
        from logistics.models import PickupRequest

        for i in range(3):
            PickupRequest.objects.create(
                provider=self.disposer, material_type='Plastics',
                latitude=5.6, longitude=-0.18, actual_price=Decimal('20.00'))

        r = self.client.get('/api/v1/logistics/pickups/')
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        rows = body['results'] if isinstance(body, dict) else body
        self.assertEqual(len(rows), 3, 'admin saw only pickups they raised')

    def test_admin_transactions_lists_the_whole_platform(self):
        from decimal import Decimal
        from wallet.models import Wallet, Transaction

        wallet = Wallet.objects.create(user=self.disposer, balance=Decimal('100.00'))
        for i in range(4):
            Transaction.objects.create(
                wallet=wallet, amount=Decimal('10.00'),
                transaction_type='DEPOSIT', status='COMPLETED',
                description=f'seed {i}')

        r = self.client.get('/api/v1/admin/transactions/')
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertEqual(body['count'], 4)
        self.assertIn('results', body, 'the dashboard pager needs a count envelope')

    def test_a_transaction_row_carries_the_wallet_owner(self):
        """The dashboard table renders transaction.wallet.user.first_name."""
        from decimal import Decimal
        from wallet.models import Wallet, Transaction

        wallet = Wallet.objects.create(user=self.disposer, balance=Decimal('50.00'))
        Transaction.objects.create(
            wallet=wallet, amount=Decimal('10.00'),
            transaction_type='DEPOSIT', status='COMPLETED', description='x')

        row = self.client.get('/api/v1/admin/transactions/').json()['results'][0]
        self.assertIsNotNone(row['wallet'])
        self.assertEqual(row['wallet']['user']['username'], 'disposer')

    def test_a_non_admin_cannot_read_platform_transactions(self):
        client = APIClient()
        client.force_authenticate(user=self.disposer)
        self.assertIn(client.get('/api/v1/admin/transactions/').status_code, (401, 403))


class DashboardChartDataTests(TestCase):
    """
    The dashboard charts used to be hardcoded - a Jan-Sep growth curve and
    a Paper 400 / Plastic 300 / Metal 300 split - sitting next to real
    counters, with nothing marking them as invented.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            username='boss', password='pw', role='ADMIN', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def stats(self):
        r = self.client.get('/api/v1/users/admin/stats/')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_the_endpoint_the_dashboard_calls_returns_chart_data(self):
        body = self.stats()
        self.assertIn('signup_trend', body)
        self.assertIn('material_distribution', body)

    def test_the_trend_covers_six_months_ending_now(self):
        trend = self.stats()['signup_trend']
        self.assertEqual(len(trend), 6)
        from django.utils import timezone
        self.assertEqual(trend[-1]['month'], timezone.now().strftime('%Y-%m'))

    def test_the_trend_counts_real_signups(self):
        before = self.stats()['signup_trend'][-1]['value']
        User.objects.create_user(username='newbie', password='pw', role='SELLER')
        self.assertEqual(self.stats()['signup_trend'][-1]['value'], before + 1)

    def test_material_distribution_reflects_actual_listings(self):
        from decimal import Decimal
        from market.models import Listing

        seller = User.objects.create_user(username='s', password='pw', role='SELLER')
        for _ in range(3):
            Listing.objects.create(
                seller=seller, title='t', material_type='Plastics', description='d',
                quantity='1 bag', price=Decimal('5.00'), location='Accra')
        Listing.objects.create(
            seller=seller, title='t', material_type='Metals', description='d',
            quantity='1 bag', price=Decimal('5.00'), location='Accra')

        dist = {row['name']: row['value'] for row in self.stats()['material_distribution']}
        self.assertEqual(dist, {'Plastics': 3, 'Metals': 1})

    def test_the_charts_are_empty_when_there_is_nothing_to_show(self):
        """Better an empty chart than an invented one."""
        self.assertEqual(self.stats()['material_distribution'], [])
