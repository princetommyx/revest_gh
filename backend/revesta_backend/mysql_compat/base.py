"""
Custom MySQL/MariaDB backend for XAMPP's MariaDB 10.4 compatibility with Django 6.
Patches:
 - check_database_version_supported → no-op (Django 6 requires 10.6+)
 - DatabaseFeatures.can_return_* → False (RETURNING added in 10.5)
 - DatabaseOperations.fetch_returned_insert_rows → None (disable server-side RETURNING)
"""
from django.db.backends.mysql.base import DatabaseWrapper as MySQLDatabaseWrapper
from django.db.backends.mysql.features import DatabaseFeatures as MySQLFeatures
from django.db.backends.mysql.operations import DatabaseOperations as MySQLOperations


class DatabaseFeatures(MySQLFeatures):
    """Disable features not available in MariaDB 10.4."""
    can_return_columns_from_insert = False
    can_return_rows_from_bulk_insert = False
    has_native_uuid_field = False


class DatabaseOperations(MySQLOperations):
    """Remove RETURNING clause from INSERT statements."""

    def fetch_returned_insert_rows(self, cursor):
        return []

    def last_executed_query(self, cursor, sql, params):
        return super().last_executed_query(cursor, sql, params)


class DatabaseWrapper(MySQLDatabaseWrapper):
    """
    Django 6-compatible wrapper for XAMPP's MariaDB 10.4.
    Disables version gating and RETURNING clause support.
    """
    features_class = DatabaseFeatures
    ops_class = DatabaseOperations

    def check_database_version_supported(self):
        pass  # Skip version requirement check
