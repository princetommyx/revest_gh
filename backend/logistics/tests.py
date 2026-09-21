"""
Tests for the pickup lifecycle and the money that moves with it.

This app had no coverage at all, and it is where the costliest silent
failures have lived: a float default on Wallet.balance that made every
payout raise TypeError (so disposers were never paid and the collector saw
an error on a state change that had actually succeeded), and a refund
branch that compared payment_method against a value the app never writes
(so cancelled digital jobs left escrow HELD forever).

Each test below pins one of those behaviours.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from logistics.models import PickupRequest
from wallet.models import Wallet, Transaction, Escrow, SystemConfig

User = get_user_model()

BASE = '/api/v1/logistics/pickups'


def enable_monetization(on=True):
    SystemConfig.objects.update_or_create(
        key='MONETIZATION_ENABLED', defaults={'value': 'true' if on else 'false'}
    )


class PickupFixtureMixin:
    def setUp(self):
        self.disposer = User.objects.create_user(
            username='disposer', password='pw', role='SELLER')
        self.collector = User.objects.create_user(
            username='collector', password='pw', role='COLLECTOR')
        self.other = User.objects.create_user(
            username='other', password='pw', role='COLLECTOR')

        self.as_disposer = APIClient()
        self.as_disposer.force_authenticate(user=self.disposer)
        self.as_collector = APIClient()
        self.as_collector.force_authenticate(user=self.collector)
        self.as_other = APIClient()
        self.as_other.force_authenticate(user=self.other)

    def make_job(self, **kwargs):
        defaults = dict(
            provider=self.disposer,
            material_type='Plastics',
            track_type='A',
            latitude=5.6037,
            longitude=-0.1870,
            actual_price=Decimal('50.00'),
        )
        defaults.update(kwargs)
        return PickupRequest.objects.create(**defaults)


class PickupLifecycleTests(PickupFixtureMixin, TestCase):
    """The state machine: PENDING -> ACCEPTED -> ARRIVED -> COMPLETED."""

    def test_happy_path_moves_through_every_state(self):
        job = self.make_job()

        r = self.as_collector.post(f'{BASE}/{job.id}/accept/')
        self.assertEqual(r.status_code, 200, r.content)
        job.refresh_from_db()
        self.assertEqual(job.status, 'ACCEPTED')
        self.assertEqual(job.collector, self.collector)
        self.assertIsNotNone(job.accepted_at)

        r = self.as_collector.post(f'{BASE}/{job.id}/arrive/')
        self.assertEqual(r.status_code, 200, r.content)
        job.refresh_from_db()
        self.assertEqual(job.status, 'ARRIVED')
        self.assertIsNotNone(job.arrived_at)

        r = self.as_collector.post(f'{BASE}/{job.id}/complete/')
        self.assertEqual(r.status_code, 200, r.content)
        job.refresh_from_db()
        self.assertEqual(job.status, 'COMPLETED')
        self.assertIsNotNone(job.completed_at)

    def test_a_job_cannot_be_accepted_twice(self):
        job = self.make_job()
        self.assertEqual(self.as_collector.post(f'{BASE}/{job.id}/accept/').status_code, 200)

        # 404 rather than 400: once taken, the job leaves every other
        # collector's board, so get_object() cannot find it for them. That
        # is the stronger answer - it does not confirm the job exists.
        r = self.as_other.post(f'{BASE}/{job.id}/accept/')
        self.assertEqual(r.status_code, 404)
        job.refresh_from_db()
        self.assertEqual(job.collector, self.collector, 'second accept stole the job')

    def test_you_cannot_accept_your_own_request(self):
        job = self.make_job(provider=self.collector)
        r = self.as_collector.post(f'{BASE}/{job.id}/accept/')
        self.assertEqual(r.status_code, 400)
        job.refresh_from_db()
        self.assertEqual(job.status, 'PENDING')

    def test_arrive_requires_an_accepted_job(self):
        job = self.make_job()
        r = self.as_collector.post(f'{BASE}/{job.id}/arrive/')
        self.assertEqual(r.status_code, 400)
        job.refresh_from_db()
        self.assertEqual(job.status, 'PENDING')

    def test_the_provider_cannot_mark_their_own_job_arrived(self):
        """
        The provider can see the job, so they reach the collector check
        rather than a 404. Only the assigned collector may advance it.
        """
        job = self.make_job()
        self.as_collector.post(f'{BASE}/{job.id}/accept/')

        r = self.as_disposer.post(f'{BASE}/{job.id}/arrive/')
        self.assertEqual(r.status_code, 403)
        job.refresh_from_db()
        self.assertEqual(job.status, 'ACCEPTED')

    def test_an_uninvolved_collector_cannot_see_or_advance_the_job(self):
        job = self.make_job()
        self.as_collector.post(f'{BASE}/{job.id}/accept/')

        r = self.as_other.post(f'{BASE}/{job.id}/arrive/')
        self.assertEqual(r.status_code, 404)
        job.refresh_from_db()
        self.assertEqual(job.status, 'ACCEPTED')

    def test_complete_requires_arrival(self):
        job = self.make_job()
        self.as_collector.post(f'{BASE}/{job.id}/accept/')

        r = self.as_collector.post(f'{BASE}/{job.id}/complete/')
        self.assertEqual(r.status_code, 400)
        job.refresh_from_db()
        self.assertEqual(job.status, 'ACCEPTED')


class PickupCancellationTests(PickupFixtureMixin, TestCase):

    def test_provider_can_cancel_a_pending_job(self):
        job = self.make_job()
        r = self.as_disposer.post(f'{BASE}/{job.id}/cancel/')
        self.assertEqual(r.status_code, 200, r.content)
        job.refresh_from_db()
        self.assertEqual(job.status, 'CANCELLED')

    def test_an_unrelated_user_cannot_cancel(self):
        job = self.make_job()
        self.as_collector.post(f'{BASE}/{job.id}/accept/')

        # 404, not 403: an accepted job is off every other collector's
        # board, so it is not theirs to find, let alone cancel.
        r = self.as_other.post(f'{BASE}/{job.id}/cancel/')
        self.assertEqual(r.status_code, 404)
        job.refresh_from_db()
        self.assertEqual(job.status, 'ACCEPTED')

    def test_a_completed_job_cannot_be_cancelled(self):
        job = self.make_job()
        self.as_collector.post(f'{BASE}/{job.id}/accept/')
        self.as_collector.post(f'{BASE}/{job.id}/arrive/')
        self.as_collector.post(f'{BASE}/{job.id}/complete/')

        r = self.as_disposer.post(f'{BASE}/{job.id}/cancel/')
        self.assertEqual(r.status_code, 400)
        job.refresh_from_db()
        self.assertEqual(job.status, 'COMPLETED')

    def test_cancelling_a_digital_job_refunds_the_escrow(self):
        """
        Regression: the refund branch compared payment_method against
        'DIGITAL_WALLET', which this app never writes - it writes 'DIGITAL'.
        Every digitally-paid cancellation skipped the refund and left the
        escrow HELD forever.
        """
        job = self.make_job(payment_method='DIGITAL')
        escrow = Escrow.objects.create(
            pickup=job, payer=self.disposer, amount=Decimal('50.00'), status='HELD')
        wallet, _ = Wallet.objects.get_or_create(user=self.disposer)
        opening = wallet.balance

        r = self.as_disposer.post(f'{BASE}/{job.id}/cancel/')
        self.assertEqual(r.status_code, 200, r.content)

        wallet.refresh_from_db()
        escrow.refresh_from_db()
        self.assertEqual(wallet.balance, opening + Decimal('50.00'))
        self.assertEqual(escrow.status, 'REFUNDED')
        self.assertTrue(
            Transaction.objects.filter(wallet=wallet, transaction_type='REFUND').exists())


class MonetizationOffTests(PickupFixtureMixin, TestCase):
    """
    Revesta takes and pays nothing while monetization is off - the two
    parties settle physically. Completing a job must not move money.
    """

    def setUp(self):
        super().setUp()
        enable_monetization(False)

    def test_completion_moves_no_money(self):
        job = self.make_job(track_type='A', payment_method='DIGITAL')
        Escrow.objects.create(
            pickup=job, payer=self.disposer, amount=Decimal('50.00'), status='HELD')

        self.as_collector.post(f'{BASE}/{job.id}/accept/')
        self.as_collector.post(f'{BASE}/{job.id}/arrive/')
        self.as_collector.post(f'{BASE}/{job.id}/complete/')

        collector_wallet, _ = Wallet.objects.get_or_create(user=self.collector)
        self.assertEqual(collector_wallet.balance, Decimal('0.00'))
        self.assertEqual(
            Escrow.objects.get(pickup=job).status, 'HELD',
            'escrow was released even though monetization is off')

    def test_arrive_on_track_b_still_succeeds(self):
        """
        Track B arrival triggers an early payout. When that payout blows up,
        the status change has already been committed - the collector must
        not be shown an error for a transition that really happened.
        """
        job = self.make_job(track_type='B', waste_price=Decimal('40.00'))
        self.as_collector.post(f'{BASE}/{job.id}/accept/')

        r = self.as_collector.post(f'{BASE}/{job.id}/arrive/')
        self.assertEqual(r.status_code, 200, r.content)
        job.refresh_from_db()
        self.assertEqual(job.status, 'ARRIVED')


class MonetizationOnTests(PickupFixtureMixin, TestCase):

    def setUp(self):
        super().setUp()
        enable_monetization(True)

    def test_track_a_completion_splits_escrow_80_20(self):
        job = self.make_job(track_type='A')
        Escrow.objects.create(
            pickup=job, payer=self.disposer, amount=Decimal('100.00'), status='HELD')
        platform = User.objects.create_user(username='revesta', password='pw', role='ADMIN')

        self.as_collector.post(f'{BASE}/{job.id}/accept/')
        self.as_collector.post(f'{BASE}/{job.id}/arrive/')
        r = self.as_collector.post(f'{BASE}/{job.id}/complete/')
        self.assertEqual(r.status_code, 200, r.content)

        collector_wallet = Wallet.objects.get(user=self.collector)
        platform_wallet = Wallet.objects.get(user=platform)
        self.assertEqual(collector_wallet.balance, Decimal('80.00'))
        self.assertEqual(platform_wallet.balance, Decimal('20.00'))

        escrow = Escrow.objects.get(pickup=job)
        self.assertEqual(escrow.status, 'RELEASED')
        self.assertEqual(escrow.payee, self.collector)

    def test_payout_arithmetic_survives_a_freshly_created_wallet(self):
        """
        Regression: Wallet's DecimalFields defaulted to floats, so the first
        arithmetic on a row created by get_or_create raised
        "unsupported operand type(s) for +=: 'float' and 'Decimal'".
        Every payout to a user who had never held a balance failed, which
        is every disposer's first job.
        """
        self.assertFalse(Wallet.objects.filter(user=self.collector).exists())

        job = self.make_job(track_type='A')
        Escrow.objects.create(
            pickup=job, payer=self.disposer, amount=Decimal('100.00'), status='HELD')

        self.as_collector.post(f'{BASE}/{job.id}/accept/')
        self.as_collector.post(f'{BASE}/{job.id}/arrive/')
        self.as_collector.post(f'{BASE}/{job.id}/complete/')

        wallet = Wallet.objects.get(user=self.collector)
        self.assertIsInstance(wallet.balance, Decimal)
        self.assertEqual(wallet.balance, Decimal('80.00'))


class WalletDefaultsTests(TestCase):
    """
    The field defaults themselves, independent of any endpoint. A float
    default is invisible until the first arithmetic, which is why this
    reached production.
    """

    def test_new_wallet_fields_are_decimals(self):
        user = User.objects.create_user(username='fresh', password='pw', role='SELLER')
        wallet, created = Wallet.objects.get_or_create(user=user)
        self.assertTrue(created)

        for field in ('balance', 'daily_withdrawal_limit', 'transaction_withdrawal_limit'):
            with self.subTest(field=field):
                self.assertIsInstance(
                    getattr(wallet, field), Decimal,
                    f'{field} is not a Decimal before any save/refresh')

        # The operation that actually broke in production.
        wallet.balance += Decimal('10.00')
        self.assertEqual(wallet.balance, Decimal('10.00'))


class JobBoardVisibilityTests(PickupFixtureMixin, TestCase):

    def test_you_can_see_a_job_you_raised_but_not_accept_it(self):
        """
        A recycler who books a collector is the provider on that job, but
        their role puts them on the collector board. They must still see it
        (to track the collector coming) while being refused the accept -
        otherwise they end up provider and collector on one record, and
        every screen showing "the disposer" shows them.
        """
        mine = self.make_job(provider=self.collector)
        theirs = self.make_job(provider=self.disposer)

        r = self.as_collector.get(f'{BASE}/', {'lat': 5.6037, 'lon': -0.1870})
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        ids = {row['id'] for row in (body if isinstance(body, list) else body['results'])}
        self.assertIn(theirs.id, ids)
        self.assertIn(mine.id, ids, 'a job you raised should stay trackable')

        refused = self.as_collector.post(f'{BASE}/{mine.id}/accept/')
        self.assertEqual(refused.status_code, 400)
        mine.refresh_from_db()
        self.assertIsNone(mine.collector)

    def test_a_blocked_disposers_job_is_hidden_from_the_board(self):
        from moderation.models import BlockedUser

        job = self.make_job(provider=self.disposer)
        BlockedUser.objects.create(blocker=self.collector, blocked=self.disposer)

        r = self.as_collector.get(f'{BASE}/', {'lat': 5.6037, 'lon': -0.1870})
        body = r.json()
        ids = {row['id'] for row in (body if isinstance(body, list) else body['results'])}
        self.assertNotIn(job.id, ids)
