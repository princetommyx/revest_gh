from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0018_user_is_deactivated'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='acceptance_rate',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='completion_rate',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='cancellation_rate',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='avg_rating',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
