"""
ReVesta Email Service Module

A modular, provider-agnostic email service for transactional emails.
Supports Gmail SMTP and Resend API with easy switching to SendGrid/SES in future.

Key features:
- Non-blocking background email sending
- Graceful error handling (email failures don't block auth)
- HTML and plain text email support
- Provider abstraction for easy migration
"""

import logging
import threading
from datetime import datetime
from typing import Optional, List, Dict, Any

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.auth import get_user_model

logger = logging.getLogger('revesta.email')
User = get_user_model()


# =============================================================================
# Email Provider Abstraction
# =============================================================================

class EmailProvider:
    """Base class for email providers. Extend for SendGrid, SES, etc."""
    
    def send(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        """Send an email. Returns True on success, False on failure."""
        raise NotImplementedError


class DjangoEmailProvider(EmailProvider):
    """
    Default provider using Django's email backend.
    Works with SMTP (Gmail) or custom backends (Resend).
    """
    
    def send(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        try:
            from_addr = from_email or settings.DEFAULT_FROM_EMAIL
            plain_text = text_content or strip_tags(html_content)
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=from_addr,
                to=to if isinstance(to, list) else [to],
                reply_to=[reply_to] if reply_to else None,
            )
            email.attach_alternative(html_content, "text/html")
            email.send(fail_silently=False)
            
            logger.info(f"✓ Email sent successfully: '{subject}' to {to}")
            return True
            
        except Exception as e:
            logger.error(f"✗ Failed to send email '{subject}' to {to}: {e}")
            return False


# Global provider instance - can be swapped for testing or provider migration
_email_provider: EmailProvider = DjangoEmailProvider()


def get_email_provider() -> EmailProvider:
    """Get the current email provider instance."""
    return _email_provider


def set_email_provider(provider: EmailProvider) -> None:
    """Set a custom email provider (useful for testing or provider switching)."""
    global _email_provider
    _email_provider = provider


# =============================================================================
# Core Email Sending Functions
# =============================================================================

def send_transactional_email(
    to: List[str],
    subject: str,
    template_name: str,
    context: Dict[str, Any],
    text_template_name: Optional[str] = None,
    from_email: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> bool:
    """
    Send a transactional email using templates.
    
    Args:
        to: List of recipient email addresses
        subject: Email subject line
        template_name: Path to HTML template (e.g., 'emails/welcome_email.html')
        context: Template context dictionary
        text_template_name: Optional path to plain text template
        from_email: Optional sender email (defaults to DEFAULT_FROM_EMAIL)
        reply_to: Optional reply-to address
        
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        # Add common context
        context.setdefault('current_year', datetime.now().year)
        context.setdefault('app_name', 'ReVesta')
        
        # Get app URL from settings
        app_url = 'https://revesta.app'
        if hasattr(settings, 'CORS_ALLOWED_ORIGINS') and settings.CORS_ALLOWED_ORIGINS:
            app_url = settings.CORS_ALLOWED_ORIGINS[0]
        context.setdefault('app_url', app_url)

        # Absolute URL for the logo mark shown in the email header - must be
        # absolute (not relative) since email clients fetch it over HTTP,
        # not from the site the email happens to be viewed on.
        backend_url = getattr(settings, 'BACKEND_URL', 'https://revest-gh.onrender.com')
        context.setdefault('logo_url', f'{backend_url}/static/users/emails/logo-mark-white.png')
        
        # Render templates
        html_content = render_to_string(template_name, context)
        
        text_content = None
        if text_template_name:
            try:
                text_content = render_to_string(text_template_name, context)
            except Exception as e:
                logger.warning(f"Could not render text template {text_template_name}: {e}")
        
        if not text_content:
            text_content = strip_tags(html_content)
        
        # Send via provider
        provider = get_email_provider()
        return provider.send(
            to=to if isinstance(to, list) else [to],
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            from_email=from_email,
            reply_to=reply_to,
        )
        
    except Exception as e:
        logger.error(f"Error preparing email '{subject}': {e}")
        return False


def send_email_async(
    to: List[str],
    subject: str,
    template_name: str,
    context: Dict[str, Any],
    **kwargs
) -> None:
    """
    Send an email in a background thread (non-blocking).
    Use this for emails that shouldn't block the main request.
    """
    def _send():
        try:
            send_transactional_email(to, subject, template_name, context, **kwargs)
        except Exception as e:
            logger.error(f"Background email failed: {e}")
    
    thread = threading.Thread(target=_send, daemon=True)
    thread.start()


# =============================================================================
# Specific Email Types
# =============================================================================

def send_welcome_email(user) -> None:
    """
    Send welcome email to newly registered user.
    Runs in background thread - won't block registration.
    
    Args:
        user: User model instance (or user ID)
    """
    def _send_task(user_id: int):
        try:
            user_obj = User.objects.get(pk=user_id)
            
            context = {
                'user_name': user_obj.username,
                'user_email': user_obj.email,
                'user_role': getattr(user_obj, 'role', 'SELLER'),
            }
            
            success = send_transactional_email(
                to=[user_obj.email],
                subject='Welcome to ReVesta! 🎉',
                template_name='emails/welcome_email.html',
                text_template_name='emails/welcome_email.txt',
                context=context,
            )
            
            if success:
                logger.info(f"Welcome email sent to {user_obj.email}")
            else:
                logger.warning(f"Welcome email may have failed for {user_obj.email}")
                
        except User.DoesNotExist:
            logger.error(f"Cannot send welcome email: User {user_id} not found")
        except Exception as e:
            logger.error(f"Error in welcome email task: {e}")
    
    # Get user ID (handle both User instance and ID)
    user_id = user.id if hasattr(user, 'id') else user
    
    # Run in background thread
    thread = threading.Thread(target=_send_task, args=(user_id,), daemon=True)
    thread.start()
    logger.debug(f"Welcome email task started for user {user_id}")


def send_login_alert(user) -> None:
    """
    Send login alert email to user after successful authentication.
    Runs in background thread - won't block login.
    
    Args:
        user: User model instance (or user ID)
    """
    def _send_task(user_id: int):
        try:
            user_obj = User.objects.get(pk=user_id)
            
            # Don't send login alerts to unverified emails or test accounts
            if not user_obj.email or '@example.com' in user_obj.email:
                logger.debug(f"Skipping login alert for {user_obj.email}")
                return
            
            current_time = datetime.now().strftime("%B %d, %Y at %I:%M %p UTC")
            
            context = {
                'user_name': user_obj.username,
                'user_email': user_obj.email,
                'login_time': current_time,
            }
            
            success = send_transactional_email(
                to=[user_obj.email],
                subject='New Login Detected - ReVesta',
                template_name='emails/login_alert.html',
                text_template_name='emails/login_alert.txt',
                context=context,
            )
            
            if success:
                logger.info(f"Login alert sent to {user_obj.email}")
            else:
                logger.warning(f"Login alert may have failed for {user_obj.email}")
            
            # Send SMS Alert
            if user_obj.phone_number:
                try:
                    from .sms_service import send_login_sms
                    send_login_sms(user_obj.phone_number, user_obj.username)
                except Exception as sms_error:
                    logger.error(f"Failed to send login SMS alert to {user_obj.phone_number}: {sms_error}")
                
        except User.DoesNotExist:
            logger.error(f"Cannot send login alert: User {user_id} not found")
        except Exception as e:
            logger.error(f"Error in login alert task: {e}")
    
    # Get user ID
    user_id = user.id if hasattr(user, 'id') else user
    
    # Run in background thread
    thread = threading.Thread(target=_send_task, args=(user_id,), daemon=True)
    thread.start()
    logger.debug(f"Login alert task started for user {user_id}")


def send_password_reset_email(user, otp_code: str, expires_in: str = "15 minutes") -> None:
    """
    Send the password reset verification code by email.
    Runs in background thread - won't block the reset request.

    Args:
        user: User model instance (or user ID)
        otp_code: The one-time code the user enters to reset their password
        expires_in: Human-readable expiry window shown in the email
    """
    def _send_task(user_id: int, code: str):
        try:
            user_obj = User.objects.get(pk=user_id)

            context = {
                'user_name': user_obj.username,
                'otp_code': code,
                'expires_in': expires_in,
            }

            success = send_transactional_email(
                to=[user_obj.email],
                subject='Reset Your Password - ReVesta',
                template_name='emails/password_reset.html',
                text_template_name='emails/password_reset.txt',
                context=context,
            )

            if success:
                logger.info(f"Password reset email sent to {user_obj.email}")
            else:
                logger.warning(f"Password reset email may have failed for {user_obj.email}")

        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")

    user_id = user.id if hasattr(user, 'id') else user
    thread = threading.Thread(target=_send_task, args=(user_id, otp_code), daemon=True)
    thread.start()


def send_login_otp_email(user, otp_code: str, expires_in: str = "10 minutes") -> None:
    """
    Send the login verification code by email.
    Runs in background thread - won't block the login request.

    Args:
        user: User model instance (or user ID)
        otp_code: The one-time code the user enters to finish signing in
        expires_in: Human-readable expiry window shown in the email
    """
    def _send_task(user_id: int, code: str):
        try:
            user_obj = User.objects.get(pk=user_id)

            context = {
                'user_name': user_obj.username,
                'otp_code': code,
                'expires_in': expires_in,
            }

            success = send_transactional_email(
                to=[user_obj.email],
                subject='Your ReVesta Login Code',
                template_name='emails/login_otp.html',
                text_template_name='emails/login_otp.txt',
                context=context,
            )

            if success:
                logger.info(f"Login OTP email sent to {user_obj.email}")
            else:
                logger.warning(f"Login OTP email may have failed for {user_obj.email}")

        except Exception as e:
            logger.error(f"Error sending login OTP email: {e}")

    user_id = user.id if hasattr(user, 'id') else user
    thread = threading.Thread(target=_send_task, args=(user_id, otp_code), daemon=True)
    thread.start()


def send_email_verification(user, otp_code: str, expires_in: str = "15 minutes") -> None:
    """
    Send an email-address verification code (e.g. after registering or
    changing an email address). Runs in background thread.

    Args:
        user: User model instance (or user ID)
        otp_code: The one-time code the user enters to verify their email
        expires_in: Human-readable expiry window shown in the email
    """
    def _send_task(user_id: int, code: str):
        try:
            user_obj = User.objects.get(pk=user_id)

            context = {
                'user_name': user_obj.username,
                'user_email': user_obj.email,
                'otp_code': code,
                'expires_in': expires_in,
            }

            success = send_transactional_email(
                to=[user_obj.email],
                subject='Verify Your Email - ReVesta',
                template_name='emails/email_verification.html',
                text_template_name='emails/email_verification.txt',
                context=context,
            )

            if success:
                logger.info(f"Verification email sent to {user_obj.email}")
            else:
                logger.warning(f"Verification email may have failed for {user_obj.email}")

        except Exception as e:
            logger.error(f"Error sending verification email: {e}")

    user_id = user.id if hasattr(user, 'id') else user
    thread = threading.Thread(target=_send_task, args=(user_id, otp_code), daemon=True)
    thread.start()


def send_success_email(
    user,
    title: str,
    message: str,
    details: Optional[List[Dict[str, str]]] = None,
    cta_label: Optional[str] = None,
    cta_url: Optional[str] = None,
) -> None:
    """
    Send a generic "success" confirmation email - e.g. payment received, a
    pickup completed, a payout sent. Runs in background thread.

    Args:
        user: User model instance (or user ID)
        title: Short headline, e.g. "Payment received"
        message: One-sentence summary, appended after "Hi {name}, "
        details: Optional list of {'label': ..., 'value': ...} rows shown
            as a summary table (e.g. amount, reference, date)
        cta_label: Optional button text
        cta_url: Optional button link - button only renders if this is set
    """
    def _send_task(user_id: int):
        try:
            user_obj = User.objects.get(pk=user_id)

            context = {
                'user_name': user_obj.username,
                'title': title,
                'message': message,
                'details': details,
                'cta_label': cta_label,
                'cta_url': cta_url,
            }

            success = send_transactional_email(
                to=[user_obj.email],
                subject=f'{title} - ReVesta',
                template_name='emails/generic_success.html',
                text_template_name='emails/generic_success.txt',
                context=context,
            )

            if success:
                logger.info(f"Success email '{title}' sent to {user_obj.email}")

        except Exception as e:
            logger.error(f"Error sending success email '{title}': {e}")

    user_id = user.id if hasattr(user, 'id') else user
    thread = threading.Thread(target=_send_task, args=(user_id,), daemon=True)
    thread.start()


def send_alert_email(
    user,
    title: str,
    message: str,
    severity: str = "warning",
    details: Optional[List[Dict[str, str]]] = None,
    cta_label: Optional[str] = None,
    cta_url: Optional[str] = None,
) -> None:
    """
    Send a generic account alert email - e.g. suspicious activity, a
    failed payout, a document rejected. Runs in background thread.

    Args:
        user: User model instance (or user ID)
        title: Short headline, e.g. "Payout failed"
        message: One-sentence summary, appended after "Hi {name}, "
        severity: 'info' | 'warning' | 'danger' - controls the badge color
        details: Optional list of {'label': ..., 'value': ...} rows
        cta_label: Optional button text
        cta_url: Optional button link - button only renders if this is set
    """
    def _send_task(user_id: int):
        try:
            user_obj = User.objects.get(pk=user_id)

            context = {
                'user_name': user_obj.username,
                'title': title,
                'message': message,
                'severity': severity,
                'details': details,
                'cta_label': cta_label,
                'cta_url': cta_url,
            }

            success = send_transactional_email(
                to=[user_obj.email],
                subject=f'{title} - ReVesta',
                template_name='emails/generic_alert.html',
                text_template_name='emails/generic_alert.txt',
                context=context,
            )

            if success:
                logger.info(f"Alert email '{title}' sent to {user_obj.email}")

        except Exception as e:
            logger.error(f"Error sending alert email '{title}': {e}")

    user_id = user.id if hasattr(user, 'id') else user
    thread = threading.Thread(target=_send_task, args=(user_id,), daemon=True)
    thread.start()


def send_message_notification_email(sender, receiver, content) -> None:
    """
    Send email notification for a new chat message.
    Runs in background thread.
    
    Args:
        sender: User model instance (sender)
        receiver: User model instance (receiver)
        content: Message content (string)
    """
    def _send_task(sender_name: str, receiver_id: int, msg_content: str):
        try:
            receiver_obj = User.objects.get(pk=receiver_id)
            
            # Don't send if no email or dummy email
            if not receiver_obj.email or '@example.com' in receiver_obj.email:
                return
                
            # Truncate content for privacy/preview
            preview = msg_content[:100] + ('...' if len(msg_content) > 100 else '')
            
            context = {
                'user_name': receiver_obj.first_name,
                'sender_name': sender_name,
                'message_content': preview,
            }
            
            success = send_transactional_email(
                to=[receiver_obj.email],
                subject=f'New Message from {sender_name}',
                template_name='emails/message_notification.html',
                text_template_name='emails/message_notification.txt',
                context=context,
            )
            
            if success:
                logger.info(f"Message notification sent to {receiver_obj.email}")
                
        except Exception as e:
            logger.error(f"Error sending message notification: {e}")
    
    sender_name = sender.first_name if hasattr(sender, 'first_name') else "ReVesta User"
    if hasattr(sender, 'role') and sender.role == 'ADMIN':
         sender_name = "ReVesta Support"

    receiver_id = receiver.id if hasattr(receiver, 'id') else receiver
    
    thread = threading.Thread(target=_send_task, args=(sender_name, receiver_id, content), daemon=True)
    thread.start()


# =============================================================================
# Email Health Check
# =============================================================================

def get_email_config_status() -> Dict[str, Any]:
    """
    Get current email configuration status for health checks.
    
    Returns:
        Dictionary with configuration details
    """
    config = {
        'backend': settings.EMAIL_BACKEND,
        'is_resend': 'resend' in settings.EMAIL_BACKEND.lower() if hasattr(settings, 'EMAIL_BACKEND') else False,
        'is_smtp': 'smtp' in settings.EMAIL_BACKEND.lower() if hasattr(settings, 'EMAIL_BACKEND') else False,
        'default_from_email': getattr(settings, 'DEFAULT_FROM_EMAIL', None),
    }
    
    if config['is_resend']:
        config['backend_type'] = 'Resend API'
        config['api_key_configured'] = bool(getattr(settings, 'RESEND_API_KEY', None))
    elif config['is_smtp']:
        config['backend_type'] = 'SMTP'
        config['smtp_host'] = getattr(settings, 'EMAIL_HOST', None)
        config['smtp_port'] = getattr(settings, 'EMAIL_PORT', None)
        config['smtp_user_configured'] = bool(getattr(settings, 'EMAIL_HOST_USER', None))
        config['smtp_password_configured'] = bool(getattr(settings, 'EMAIL_HOST_PASSWORD', None))
    else:
        config['backend_type'] = 'Other'
    
    return config
