import os
import sys

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
    # Force SQLite for dumpdata regardless of settings/env vars
    os.environ['DATABASE_URL'] = 'sqlite:///db.sqlite3'
    
    # We must patch dj_database_url config to ONLY return sqlite if called.
    # It might be cached or processed differently in settings.py.
    # A cleaner way is to just temporarily modify settings.DATABASES
    import django
    django.setup()
    from django.conf import settings
    
    settings.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(settings.BASE_DIR, 'db.sqlite3'),
    }
    
    from django.core.management import execute_from_command_line
    args = [
        'manage.py', 'dumpdata', 
        '--natural-foreign', '--natural-primary', 
        '-e', 'contenttypes', '-e', 'auth.permission',
        '--indent', '2', 
        '-o', 'sqlite_backup_v3.json'
    ]
    print("Starting dumpdata from SQLite...")
    execute_from_command_line(args)
    print("Done dumping to sqlite_backup_v3.json.")
