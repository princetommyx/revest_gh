from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse

from users.sms_service import HubtelSMSService, send_otp_sms


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
