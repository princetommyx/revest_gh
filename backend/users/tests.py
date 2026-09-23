from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse

from django.contrib.auth import get_user_model

from users.sms_service import HubtelSMSService, send_otp_sms

User = get_user_model()


@override_settings(HUBTEL_CLIENT_ID=None, HUBTEL_CLIENT_SECRET=None)
class UnconfiguredSmsTests(TestCase):
    """
    A deployment with no Hubtel credentials - a local dev server, or an
    environment nobody set the secrets on. It must say so rather than
    reporting a message it never sent.
    """

    def test_service_reports_itself_unconfigured(self):
        self.assertFalse(HubtelSMSService().is_configured)

    def test_dispatch_reports_failure_instead_of_pretending(self):
        self.assertFalse(send_otp_sms('0201234567', '123456'))

    def test_nothing_is_sent_over_the_network(self):
        with patch('users.sms_service.requests.get') as get:
            send_otp_sms('0201234567', '123456')
        get.assert_not_called()

    def test_health_check_says_sms_will_not_be_delivered(self):
        response = self.client.get(reverse('sms_health'))

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body['sms_configured'])
        self.assertIn('HUBTEL_CLIENT_ID', body['hint'])

    def test_health_check_never_leaks_the_credentials(self):
        response = self.client.get(reverse('sms_health'))

        self.assertNotIn('client_secret', response.json())
        self.assertNotIn('client_id', response.json())


@override_settings(HUBTEL_CLIENT_ID='id', HUBTEL_CLIENT_SECRET='secret')
class ConfiguredSmsTests(TestCase):
    def test_service_reports_itself_configured(self):
        self.assertTrue(HubtelSMSService().is_configured)

    def test_dispatch_reports_success_and_calls_hubtel(self):
        with patch('users.sms_service.requests.get') as get:
            get.return_value.status_code = 200
            get.return_value.text = 'ok'
            dispatched = send_otp_sms('0201234567', '123456')
            # Sending is threaded, so wait for the worker before asserting.
            for thread in __import__('threading').enumerate():
                if thread is not __import__('threading').current_thread():
                    thread.join(timeout=5)

        self.assertTrue(dispatched)
        self.assertTrue(get.called)

    def test_health_check_confirms_credentials_are_present(self):
        body = self.client.get(reverse('sms_health')).json()

        self.assertTrue(body['sms_configured'])
        self.assertIn('present', body['hint'])

    def test_a_local_number_is_normalised_to_ghana_format(self):
        with patch('users.sms_service.requests.get') as get:
            get.return_value.status_code = 200
            get.return_value.text = 'ok'
            HubtelSMSService().send('0201234567', 'hi')

        self.assertIn('to=233201234567', get.call_args[0][0])


class ProfileUpdateTests(TestCase):
    """
    Profile edits.

    UserProfileView.update wrapped super().update() in a blanket
    `except Exception` that returned 500 "Could not update profile. Please
    try again." DRF's ValidationError is an Exception, so every rejected
    field came back as that message - a user whose phone number was already
    registered to someone else could only ever see "please try again", and
    retrying could never work. The block was written to make failures
    diagnosable and did the opposite.
    """

    def setUp(self):
        from rest_framework.test import APIClient

        self.collector = User.objects.create_user(
            username='driver', password='pw', role='COLLECTOR')
        self.other = User.objects.create_user(
            username='someone', password='pw', role='SELLER',
            phone_number='233201234501')

        self.client = APIClient()
        self.client.force_authenticate(user=self.collector)

    def test_a_collector_can_update_their_details(self):
        r = self.client.patch(
            '/api/v1/users/profile/',
            {'first_name': 'Kofi', 'last_name': 'Mensah', 'city': 'Tema'},
            format='json')
        self.assertEqual(r.status_code, 200, r.content)

        self.collector.refresh_from_db()
        self.assertEqual(self.collector.first_name, 'Kofi')
        self.assertEqual(self.collector.city, 'Tema')

    def test_a_taken_phone_number_is_a_400_naming_the_field(self):
        r = self.client.patch(
            '/api/v1/users/profile/',
            {'phone_number': '0201234501'},
            format='json')

        self.assertEqual(r.status_code, 400, 'validation error surfaced as a server error')
        self.assertIn('phone_number', r.json())

    def test_keeping_your_own_phone_number_is_allowed(self):
        """The uniqueness check must exclude the user being edited."""
        self.collector.phone_number = '233209999999'
        self.collector.save()

        r = self.client.patch(
            '/api/v1/users/profile/',
            {'phone_number': '0209999999'},
            format='json')
        self.assertEqual(r.status_code, 200, r.content)

    def test_a_phone_number_is_normalised_on_save(self):
        r = self.client.patch(
            '/api/v1/users/profile/',
            {'phone_number': '0208887777'},
            format='json')
        self.assertEqual(r.status_code, 200, r.content)

        self.collector.refresh_from_db()
        self.assertEqual(self.collector.phone_number, '233208887777')

    def test_collector_fields_are_returned_for_a_collector(self):
        r = self.client.get('/api/v1/users/profile/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIn('vehicle_type', r.json())

    def test_another_users_profile_is_not_reachable(self):
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=self.other)
        r = client.patch('/api/v1/users/profile/', {'first_name': 'Nope'}, format='json')

        # The route always resolves to the caller, so this edits `other`,
        # never the collector.
        self.assertEqual(r.status_code, 200, r.content)
        self.collector.refresh_from_db()
        self.assertNotEqual(self.collector.first_name, 'Nope')
