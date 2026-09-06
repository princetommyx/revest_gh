import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('intelligence', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CollectorPerformanceSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True)),
                ('jobs_accepted', models.PositiveIntegerField(default=0)),
                ('jobs_completed', models.PositiveIntegerField(default=0)),
                ('jobs_cancelled', models.PositiveIntegerField(default=0)),
                ('avg_rating', models.FloatField(blank=True, null=True)),
                ('collector', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='performance_snapshots', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date'],
            },
        ),
        migrations.AddConstraint(
            model_name='collectorperformancesnapshot',
            constraint=models.UniqueConstraint(fields=('date', 'collector'), name='one_snapshot_per_collector_per_day'),
        ),
    ]
