from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_jobapplication'),
    ]

    operations = [
        migrations.AddField(
            model_name='jobapplication',
            name='cv',
            field=models.FileField(blank=True, null=True, upload_to='applications/cvs/'),
        ),
    ]
