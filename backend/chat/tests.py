"""
Tests for the chat inbox: unread counts and the read-marking that clears
them.

`unread_count` was hardcoded to 0 behind a stale TODO while the client
already had the full unread UI, so the "Unread" tab could never show
anything. Nothing marked messages read either, so counting alone would
have produced a number that only ever grew. Both halves are pinned here.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from chat.models import Message

User = get_user_model()

BASE = '/api/v1/chat/messages'


class UnreadCountTests(TestCase):

    def setUp(self):
        self.me = User.objects.create_user(username='me', password='pw', role='SELLER')
        self.alice = User.objects.create_user(username='alice', password='pw', role='COLLECTOR')
        self.bob = User.objects.create_user(username='bob', password='pw', role='COLLECTOR')

        self.client = APIClient()
        self.client.force_authenticate(user=self.me)

        for i in range(3):
            Message.objects.create(sender=self.alice, receiver=self.me, content=f'a{i}')
        Message.objects.create(sender=self.me, receiver=self.alice, content='mine')
        Message.objects.create(sender=self.bob, receiver=self.me, content='b0')

    def inbox(self, client=None):
        r = (client or self.client).get(f'{BASE}/conversations/')
        self.assertEqual(r.status_code, 200, r.content)
        return {row['contact_username']: row['unread_count'] for row in r.json()}

    def test_the_inbox_reports_unread_per_contact(self):
        self.assertEqual(self.inbox(), {'alice': 3, 'bob': 1})

    def test_your_own_messages_are_never_unread_to_you(self):
        """The outgoing message to alice must not inflate alice's count."""
        Message.objects.create(sender=self.me, receiver=self.alice, content='another')
        self.assertEqual(self.inbox()['alice'], 3)

    def test_opening_a_thread_clears_only_that_contact(self):
        r = self.client.get(f'{BASE}/with/{self.alice.id}/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.inbox(), {'alice': 0, 'bob': 1})

    def test_the_thread_response_reflects_the_read_state_it_just_set(self):
        """
        Marking read has to happen before the queryset is evaluated,
        otherwise the response carries values from a moment ago.
        """
        body = self.client.get(f'{BASE}/with/{self.alice.id}/').json()
        from_alice = [m for m in body if m['sender']['id'] == self.alice.id]
        self.assertTrue(from_alice)
        self.assertTrue(all(m['is_read'] for m in from_alice))

    def test_opening_a_thread_does_not_touch_your_outgoing_messages(self):
        """
        Their read state belongs to the other side - it is what alice's
        own inbox counts.
        """
        self.client.get(f'{BASE}/with/{self.alice.id}/')
        self.assertEqual(
            Message.objects.filter(sender=self.me, receiver=self.alice, is_read=False).count(), 1)

    def test_mark_read_clears_a_thread_without_fetching_it(self):
        """The live-message path: it arrived on an already-open thread."""
        r = self.client.post(f'{BASE}/mark-read/', {'user_id': self.alice.id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['marked_read'], 3)
        self.assertEqual(self.inbox(), {'alice': 0, 'bob': 1})

    def test_mark_read_is_idempotent(self):
        self.client.post(f'{BASE}/mark-read/', {'user_id': self.alice.id}, format='json')
        again = self.client.post(f'{BASE}/mark-read/', {'user_id': self.alice.id}, format='json')
        self.assertEqual(again.json()['marked_read'], 0)

    def test_mark_read_requires_a_user_id(self):
        self.assertEqual(
            self.client.post(f'{BASE}/mark-read/', {}, format='json').status_code, 400)

    def test_mark_read_cannot_clear_someone_elses_inbox(self):
        """
        Scoped to receiver=caller. Bob calling it must not mark the
        messages sitting in my inbox as read.
        """
        bob_client = APIClient()
        bob_client.force_authenticate(user=self.bob)
        bob_client.post(f'{BASE}/mark-read/', {'user_id': self.bob.id}, format='json')

        self.assertEqual(self.inbox(), {'alice': 3, 'bob': 1})

    def test_a_blocked_contact_leaves_the_inbox_entirely(self):
        from moderation.models import BlockedUser
        BlockedUser.objects.create(blocker=self.me, blocked=self.alice)

        self.assertNotIn('alice', self.inbox())
