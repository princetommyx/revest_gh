"""
Custom Django email backend using Resend API.
Bypasses SMTP port restrictions on cloud hosting platforms.
"""
import resend
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class ResendBackend(BaseEmailBackend):
    """
    Email backend that uses Resend API instead of SMTP.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        resend.api_key = settings.RESEND_API_KEY

    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of
        emails sent.
        """
        if not email_messages:
            return 0

        sent_count = 0
        for message in email_messages:
            try:
                # Resend expects a specific format
                # Use Resend's sandbox email (works without domain verification)
                params = {
                    "from": "onboarding@resend.dev",
                    "to": message.to,
                    "subject": message.subject,
                }

                # Add HTML or plain text body
                if message.content_subtype == 'html' or hasattr(message, 'alternatives'):
                    # Check for HTML in alternatives
                    html_content = None
                    if hasattr(message, 'alternatives'):
                        for content, mimetype in message.alternatives:
                            if mimetype == 'text/html':
                                html_content = content
                                break
                    
                    if html_content:
                        params["html"] = html_content
                    else:
                        params["html"] = message.body
                else:
                    params["text"] = message.body

                # Send via Resend
                resend.Emails.send(params)
                sent_count += 1
                logger.info(f"Email sent via Resend to {message.to}")

            except Exception as e:
                logger.error(f"Failed to send email via Resend: {str(e)}")
                if not self.fail_silently:
                    raise

        return sent_count
