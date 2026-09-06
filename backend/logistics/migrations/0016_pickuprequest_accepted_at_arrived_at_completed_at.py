from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0015_pickuprequest_vehicle_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='pickuprequest',
            name='accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pickuprequest',
            name='arrived_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pickuprequest',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
