"""
Revesta MySQL Database Setup Script
Run this ONCE to create the revesta_db database and revesta user.
Usage: python create_mysql_db.py [--root-password YOUR_ROOT_PASSWORD]

If MySQL root has no password (common for local dev), run without flag.
"""
import sys
import argparse

try:
    import MySQLdb
except ImportError:
    print("ERROR: mysqlclient not installed. Run: pip install mysqlclient")
    sys.exit(1)

parser = argparse.ArgumentParser()
parser.add_argument('--root-password', nargs='?', const='', default='', help='MySQL root password (blank if none)')
args = parser.parse_args()

DB_NAME = 'revesta_db'
DB_USER = 'revesta'
DB_PASSWORD = 'Lyonstudios00'

connection_params = {
    'host': '127.0.0.1',
    'user': 'root',
    'passwd': args.root_password,
    'connect_timeout': 10,
}

print(f"Connecting to MySQL as root (host=127.0.0.1)...")
try:
    conn = MySQLdb.connect(**connection_params)
    conn.autocommit(True)
    cursor = conn.cursor()
    
    # Create database
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    print(f"  ✓ Database '{DB_NAME}' created / already exists")
    
    # Create user for localhost
    try:
        cursor.execute(f"CREATE USER IF NOT EXISTS '{DB_USER}'@'localhost' IDENTIFIED BY '{DB_PASSWORD}';")
        print(f"  ✓ User '{DB_USER}'@'localhost' created")
    except Exception as e:
        print(f"  (User may already exist): {e}")

    # Create user for 127.0.0.1
    try:
        cursor.execute(f"CREATE USER IF NOT EXISTS '{DB_USER}'@'127.0.0.1' IDENTIFIED BY '{DB_PASSWORD}';")
        print(f"  ✓ User '{DB_USER}'@'127.0.0.1' created")
    except Exception as e:
        print(f"  (User may already exist): {e}")

    # Grant privileges
    cursor.execute(f"GRANT ALL PRIVILEGES ON `{DB_NAME}`.* TO '{DB_USER}'@'localhost';")
    cursor.execute(f"GRANT ALL PRIVILEGES ON `{DB_NAME}`.* TO '{DB_USER}'@'127.0.0.1';")
    cursor.execute("FLUSH PRIVILEGES;")
    print(f"  ✓ Privileges granted to '{DB_USER}' on '{DB_NAME}'")
    
    cursor.close()
    conn.close()
    print("\nMySQL setup complete! Now run:")
    print("  python manage.py migrate")
    print("  python manage.py loaddata sqlite_backup.json")

except MySQLdb.OperationalError as e:
    print(f"\nERROR: Could not connect to MySQL root: {e}")
    print("\nPlease try:")
    print("  python create_mysql_db.py --root-password YOUR_ROOT_PASSWORD")
    print("\nOR manually run setup_mysql.sql in MySQL Workbench / MySQL CLI:")
    print("  mysql -u root -p < setup_mysql.sql")
    sys.exit(1)
