import sqlite3
import json
import os
import datetime

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        val = row[idx]
        if isinstance(val, bytes):
            # Try to decode bytes or just use string representation
            try:
                val = val.decode('utf-8')
            except UnicodeDecodeError:
                val = str(val)
        elif isinstance(val, datetime.datetime):
             val = val.isoformat()
        elif isinstance(val, datetime.date):
             val = val.isoformat()
             
        # Add basic serialization for other types if needed
        d[col[0]] = val
    return d

def export_sqlite_to_json(db_path, output_path):
    print(f"Connecting to {db_path}...")
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = dict_factory
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row['name'] for row in cursor.fetchall()]
    
    # Exclude system tables and auth permissions (which cause conflicts on load)
    exclude_tables = [
        'sqlite_sequence', 'django_migrations', 'django_content_type',
        'auth_permission', 'auth_group_permissions', 'auth_user_user_permissions'
    ]
    tables = [t for t in tables if t not in exclude_tables and not t.startswith('sqlite_')]

    all_data = []
    
    print(f"Found {len(tables)} tables to export.")
    pk_fields = {
        'users_user': 'id',
        'admin_dashboard_activitylog': 'id',
        'logistics_pickuprequest': 'id',
        'market_listing': 'id',
        'wallet_wallet': 'id',
        'wallet_transaction': 'id'
    }

    for table in tables:
        print(f"Exporting table: {table}...")
        cursor.execute(f"SELECT * FROM `{table}`")
        rows = cursor.fetchall()
        
        # Determine likely PK field (usually 'id')
        cursor.execute(f"PRAGMA table_info(`{table}`)")
        columns = cursor.fetchall()
        pk_field = 'id'
        for col in columns:
            if col['pk'] == 1:
                pk_field = col['name']
                break
                
        # Map SQLite tables to Django models
        table_mapping = {
            'django_admin_log': 'admin.logentry',
            'django_session': 'sessions.session',
            'auth_group': 'auth.group',
            'users_passwordresetotp': 'users.passwordresetotp',
            'users_loginotp': 'users.loginotp',
            'users_phoneverification': 'users.phoneverification',
            'users_notification': 'users.notification',
            'users_user': 'users.user',
            'users_user_groups': 'users.user_groups',
            'users_user_user_permissions': 'users.user_user_permissions',
            'users_identityverification': 'users.identityverification',
            'wallet_commissionrule': 'wallet.commissionrule',
            'wallet_systemconfig': 'wallet.systemconfig',
            'wallet_transaction': 'wallet.transaction',
            'wallet_wallet': 'wallet.wallet',
            'wallet_escrow': 'wallet.escrow',
            'logistics_pickuprequest': 'logistics.pickuprequest',
            'market_materialmarketprice': 'market.materialmarketprice',
            'market_trackaservicefee': 'market.trackaservicefee',
            'market_listing': 'market.listing',
            'chat_message': 'chat.message',
            'chat_supportsession': 'chat.supportsession',
            'admin_dashboard_systemmetrics': 'admin_dashboard.systemmetrics',
            'admin_dashboard_activitylog': 'admin_dashboard.activitylog',
            'admin_dashboard_adminnotification': 'admin_dashboard.adminnotification',
            'admin_dashboard_supportticket': 'admin_dashboard.supportticket',
            'admin_dashboard_promocard': 'admin_dashboard.promocard',
            'admin_dashboard_onboardingscreen': 'admin_dashboard.onboardingscreen',
        }
        
        model_name = table_mapping.get(table)
        if not model_name:
            # Fallback for generic format
            parts = table.split('_', 1)
            model_name = f"{parts[0]}.{parts[1]}" if len(parts) == 2 else table
            
        for row in rows:
            pk = row.pop(pk_field, None)
            
            # Basic type casting for foreign keys and bools that SQLite stores as 1/0
            for key, val in row.items():
                if isinstance(val, str):
                    row[key] = val
                    
            item = {
                "model": model_name,
                "pk": pk,
                "fields": row
            }
            all_data.append(item)

    print(f"Writing {len(all_data)} records to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)
        
    print("Export complete!")
    conn.close()

if __name__ == "__main__":
    db_file = os.path.join(os.path.dirname(__file__), 'db.sqlite3')
    out_file = os.path.join(os.path.dirname(__file__), 'sqlite_backup_direct.json')
    export_sqlite_to_json(db_file, out_file)
