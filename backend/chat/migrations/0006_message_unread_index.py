from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0005_supportaimessage'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['receiver', 'is_read'], name='msg_receiver_isread_idx'),
        ),
    ]
