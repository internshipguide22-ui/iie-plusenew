from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0006_quiz_management_enhancements'),
    ]

    operations = [
        migrations.AlterField(
            model_name='quiz',
            name='batch',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='quizzes',
                to='connect.batches',
            ),
        ),
    ]
