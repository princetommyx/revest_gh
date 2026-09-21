"""
Tests for the wallet: the shape of what /me returns, and the guards that
stand between a balance and a withdrawal.

Two of these pin bugs that shipped. `wallet/me/` exists because the list
route is paginated - the client was reading `data[0]` off a
{count, next, previous, results} envelope and getting undefined, so every
balance rendered as GHS 0.00. And the withdrawal guards are the only thing
between a compromised session and someone's money, so each one gets a test
rather than a comment.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from wallet.models import Wallet, Transaction, SystemConfig
from wallet.services import WalletService

User = get_user_model()

BASE = '/api/v1/wallet'


def aged_user(username, role='SELLER', days=10):
    """
    A user old enough to clear the 48h new-account withdrawal cooldown.
    date_joined is auto_now_add, so it has to be written after creation.
    """
    user = User.objects.create_user(username=username, password='pw', role=role)
    User.objects.filter(pk=user.pk).update(
        date_joined=timezone.now() - timezone.timedelta(days=days))
    user.refresh_from_db()
    return user


class WalletEndpointTests(TestCase):

    def setUp(self):
        self.user = aged_user('holder')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_me_returns_one_wallet_object_not_a_paginated_envelope(self):
        """
        Regression: the client used to read the list route, which pagination
        wraps in {count, results: [...]}. Unwrapping `data[0]` off that
        envelope yielded undefined and every balance showed as 0.00.
        `me/` must return the wallet object itself.
        """
        Wallet.objects.create(user=self.user, balance=Decimal('137.50'))

        r = self.client.get(f'{BASE}/me/')
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()

        self.assertNotIn('results', body, 'me/ is paginated - the client unwrap will break')
        self.assertNotIn('count', body)
        self.assertEqual(Decimal(str(body['balance'])), Decimal('137.50'))

    def test_me_creates_a_wallet_for_a_user_who_has_never_had_one(self):
        self.assertFalse(Wallet.objects.filter(user=self.user).exists())

        r = self.client.get(f'{BASE}/me/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Decimal(str(r.json()['balance'])), Decimal('0.00'))
        self.assertTrue(Wallet.objects.filter(user=self.user).exists())

    def test_a_wallet_is_private_to_its_owner(self):
        Wallet.objects.create(user=self.user, balance=Decimal('500.00'))
        intruder = aged_user('intruder')
        other_client = APIClient()
        other_client.force_authenticate(user=intruder)

        body = other_client.get(f'{BASE}/me/').json()
        self.assertEqual(Decimal(str(body['balance'])), Decimal('0.00'),
                         "another user's balance leaked through me/")

    def test_the_wallet_endpoints_reject_anonymous_callers(self):
        anon = APIClient()
        self.assertIn(anon.get(f'{BASE}/me/').status_code, (401, 403))


class WithdrawalGuardTests(TestCase):
    """
    Every branch that can refuse a withdrawal. These are the only thing
    standing between a session and real money leaving the platform.
    """

    def setUp(self):
        self.user = aged_user('earner')
        self.wallet = Wallet.objects.create(user=self.user, balance=Decimal('1000.00'))
        WalletService.set_pin(self.wallet, '1234')
        self.wallet.refresh_from_db()
        # set_pin starts a 24h cooldown; these tests are about the other
        # guards, so age it out deliberately.
        Wallet.objects.filter(pk=self.wallet.pk).update(
            last_pin_change=timezone.now() - timezone.timedelta(days=2))
        self.wallet.refresh_from_db()

    def withdraw(self, amount, pin='1234'):
        return WalletService.request_withdrawal(
            user=self.user, amount=amount, phone_number='233201234567',
            network='MTN', account_name='Test User', pin=pin)

    def test_a_valid_withdrawal_debits_the_balance_and_records_it(self):
        txn = self.withdraw(Decimal('100.00'))
        self.wallet.refresh_from_db()

        self.assertEqual(self.wallet.balance, Decimal('900.00'))
        self.assertEqual(txn.amount, Decimal('-100.00'), 'withdrawals are stored negative')
        self.assertEqual(txn.transaction_type, 'WITHDRAWAL')
        self.assertEqual(txn.status, 'PENDING')

    def test_a_wrong_pin_is_refused_and_moves_no_money(self):
        with self.assertRaises(ValueError):
            self.withdraw(Decimal('100.00'), pin='9999')

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('1000.00'))
        self.assertFalse(Transaction.objects.filter(wallet=self.wallet).exists())

    def test_you_cannot_withdraw_more_than_you_have(self):
        with self.assertRaises(ValueError):
            self.withdraw(Decimal('5000.00'))

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('1000.00'))

    def test_the_per_transaction_limit_is_enforced(self):
        self.wallet.balance = Decimal('100000.00')
        self.wallet.save()

        over = self.wallet.transaction_withdrawal_limit + Decimal('1.00')
        with self.assertRaises(ValueError):
            self.withdraw(over)

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('100000.00'))

    def test_the_daily_limit_counts_earlier_withdrawals(self):
        self.wallet.balance = Decimal('100000.00')
        self.wallet.save()

        per_txn = self.wallet.transaction_withdrawal_limit
        daily = self.wallet.daily_withdrawal_limit

        drawn = Decimal('0.00')
        while drawn + per_txn <= daily:
            self.withdraw(per_txn)
            drawn += per_txn

        # The next one crosses the daily ceiling even though it is within
        # the per-transaction limit.
        with self.assertRaises(ValueError):
            self.withdraw(per_txn)

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('100000.00') - drawn)

    def test_a_frozen_wallet_cannot_withdraw(self):
        self.wallet.is_frozen = True
        self.wallet.save()

        with self.assertRaises(ValueError):
            self.withdraw(Decimal('10.00'))

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('1000.00'))

    def test_a_brand_new_account_is_held_for_48_hours(self):
        fresh = User.objects.create_user(username='justjoined', password='pw', role='SELLER')
        wallet = Wallet.objects.create(user=fresh, balance=Decimal('1000.00'))
        WalletService.set_pin(wallet, '1234')
        Wallet.objects.filter(pk=wallet.pk).update(
            last_pin_change=timezone.now() - timezone.timedelta(days=2))

        with self.assertRaises(ValueError):
            WalletService.request_withdrawal(
                user=fresh, amount=Decimal('10.00'), phone_number='233201234567',
                network='MTN', account_name='Fresh', pin='1234')

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('1000.00'))

    def test_a_recent_pin_change_holds_withdrawals_for_24_hours(self):
        """Stops a stolen session from setting a new PIN and cashing out."""
        Wallet.objects.filter(pk=self.wallet.pk).update(last_pin_change=timezone.now())

        with self.assertRaises(ValueError):
            self.withdraw(Decimal('10.00'))

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('1000.00'))

    def test_an_unverified_collector_cannot_withdraw(self):
        collector = aged_user('unverified_collector', role='COLLECTOR')
        wallet = Wallet.objects.create(user=collector, balance=Decimal('1000.00'))
        WalletService.set_pin(wallet, '1234')
        Wallet.objects.filter(pk=wallet.pk).update(
            last_pin_change=timezone.now() - timezone.timedelta(days=2))

        with self.assertRaises(ValueError):
            WalletService.request_withdrawal(
                user=collector, amount=Decimal('10.00'), phone_number='233201234567',
                network='MTN', account_name='Unverified', pin='1234')

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('1000.00'))

    def test_withdrawals_can_be_disabled_platform_wide(self):
        SystemConfig.objects.update_or_create(
            key='GLOBAL_WITHDRAWAL_ENABLED', defaults={'value': 'false'})

        with self.assertRaises(ValueError):
            self.withdraw(Decimal('10.00'))

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('1000.00'))


class MonetizationSwitchTests(TestCase):
    """
    The master switch every payout path is gated on: escrow locks,
    completion payouts, commission. It is a data row rather than a code
    constant so the business position can change without a deploy, which
    means a test is the only thing recording what that position currently
    is.
    """

    def test_migrations_leave_monetization_on(self):
        """
        Current intent, set by wallet migration 0010. If someone flips this
        off again, this test is where they should say so - silently
        disabling every payout is not a change that should slip through.
        """
        self.assertTrue(WalletService.monetization_enabled())
        self.assertEqual(
            SystemConfig.objects.get(key='MONETIZATION_ENABLED').value, 'true')

    def test_it_fails_closed_when_the_row_is_missing(self):
        """
        A missing row must mean off, not on. Moving real money because a
        config row failed to seed is the wrong way to fail.
        """
        SystemConfig.objects.filter(key='MONETIZATION_ENABLED').delete()
        self.assertFalse(WalletService.monetization_enabled())

    def test_it_reads_the_stored_value(self):
        SystemConfig.objects.update_or_create(
            key='MONETIZATION_ENABLED', defaults={'value': 'true'})
        self.assertTrue(WalletService.monetization_enabled())

        SystemConfig.objects.update_or_create(
            key='MONETIZATION_ENABLED', defaults={'value': 'false'})
        self.assertFalse(WalletService.monetization_enabled())
