from django.db import migrations


def enable_monetization(apps, schema_editor):
    SystemConfig = apps.get_model('wallet', 'SystemConfig')
    SystemConfig.objects.update_or_create(
        key='MONETIZATION_ENABLED',
        defaults={
            'value': 'true',
            'description': 'Master switch for in-app money movement on pickup jobs (escrow, payouts, commission). See WalletService.monetization_enabled().',
        },
    )


def disable_monetization(apps, schema_editor):
    SystemConfig = apps.get_model('wallet', 'SystemConfig')
    SystemConfig.objects.filter(key='MONETIZATION_ENABLED').update(value='false')


class Migration(migrations.Migration):

    dependencies = [
        ('wallet', '0009_alter_transaction_transaction_type_escrow'),
    ]

    operations = [
        migrations.RunPython(enable_monetization, disable_monetization),
    ]
