import django.db.models.deletion
import django.core.validators
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('logistics', '0016_pickuprequest_accepted_at_arrived_at_completed_at'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Rating',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score', models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('comment', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('pickup_request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ratings', to='logistics.pickuprequest')),
                ('ratee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ratings_received', to=settings.AUTH_USER_MODEL)),
                ('rater', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ratings_given', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='rating',
            constraint=models.UniqueConstraint(fields=('pickup_request', 'rater'), name='one_rating_per_job_per_rater'),
        ),
    ]
