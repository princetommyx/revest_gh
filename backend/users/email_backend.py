"""
Custom Django email backend using Resend API.
Bypasses SMTP port restrictions on cloud hosting platforms.
"""
import resend
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings
import logging
import traceback

logger = logging.getLogger(__name__)


class ResendBackend(BaseEmailBackend):
    """
    Email backend that uses Resend API instead of SMTP.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Validate API key exists
        if not hasattr(settings, 'RESEND_API_KEY') or not settings.RESEND_API_KEY:
            logger.error("RESEND_API_KEY is not configured in settings!")
            raise ValueError("RESEND_API_KEY must be set in environment variables")
        
        resend.api_key = settings.RESEND_API_KEY
        logger.info(f"ResendBackend initialized with API key (length: {len(settings.RESEND_API_KEY)})")

    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of
        emails sent.
        """
        if not email_messages:
            logger.warning("send_messages called with no messages")
            return 0

        logger.info(f"Attempting to send {len(email_messages)} email(s) via Resend")
        sent_count = 0
        
        for idx, message in enumerate(email_messages):
            try:
                logger.info(f"Processing email {idx + 1}/{len(email_messages)}: {message.subject} to {message.to}")
                
                # Resend expects a specific format
                # Use Resend's sandbox email (works without domain verification)
                params = {
                    "from": "onboarding@resend.dev",
                    "to": message.to,
                    "subject": message.subject,
                    "reply_to": "revesta3@gmail.com",
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
                        logger.debug(f"Using HTML content from alternatives (length: {len(html_content)})")
                    else:
                        params["html"] = message.body
                        logger.debug(f"Using HTML content from body (length: {len(message.body)})")
                else:
                    params["text"] = message.body
                    logger.debug(f"Using plain text content (length: {len(message.body)})")

                # Log the params (without full content)
                logger.info(f"Sending via Resend with params: from={params['from']}, to={params['to']}, subject={params['subject']}")

                # Send via Resend
                response = resend.Emails.send(params)
                sent_count += 1
                logger.info(f"✓ Email sent successfully via Resend to {message.to}. Response: {response}")

            except Exception as e:
                error_msg = f"Failed to send email via Resend: {str(e)}"
                logger.error(error_msg)
                logger.error(f"Full traceback: {traceback.format_exc()}")
                logger.error(f"Email details - Subject: {message.subject}, To: {message.to}, From: {message.from_email}")
                
                if not self.fail_silently:
                    raise

        logger.info(f"Email sending complete. Sent {sent_count}/{len(email_messages)} emails successfully")
        return sent_count
