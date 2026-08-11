from cryptography.fernet import Fernet
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def get_fernet():
    key = getattr(settings, 'FERNET_KEY', None)
    if not key:
        raise ValueError("FERNET_KEY mapping missing in settings.")
    return Fernet(key)

def encrypt_id_number(id_string: str) -> bytes:
    """Encrypt a plaintext ID string into bytes."""
    if not id_string:
        return b''
    try:
        fernet = get_fernet()
        return fernet.encrypt(id_string.encode('utf-8'))
    except Exception as e:
        logger.error(f"Failed to encrypt ID number: {e}")
        raise

def decrypt_id_number(encrypted_bytes: bytes) -> str:
    """Decrypt the bytes back to a plaintext ID string."""
    if not encrypted_bytes:
        return ''
    try:
        fernet = get_fernet()
        return fernet.decrypt(encrypted_bytes).decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to decrypt ID number: {e}")
        return "<Decryption Failed>"
