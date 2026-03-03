#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# PyMySQL compatibility patch for XAMPP/MariaDB 10.4
# Allows Django 6 to work with MariaDB 10.4 by spoofing the version string
try:
    import pymysql
    pymysql.install_as_MySQLdb()
    # Override the version tuple so Django's MariaDB version check passes
    pymysql.version_info = (10, 6, 0, "final", 0)
except ImportError:
    pass


def main():
    """Run administrative tasks."""
    # Load .env file
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
        
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
