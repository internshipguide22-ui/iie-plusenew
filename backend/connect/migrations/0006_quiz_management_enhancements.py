from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0005_calendarevent'),
    ]

    operations = [
        migrations.AddField(
            model_name='quiz',
            name='category',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='quiz',
            name='start_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='quiz',
            name='end_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='quiz',
            name='shuffle_questions',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='quiz',
            name='shuffle_options',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='quiz',
            name='number_of_questions',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='quizattempt',
            name='total_questions',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='quizattempt',
            name='attempted_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='quizattempt',
            name='correct_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='quizattempt',
            name='wrong_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='quizattempt',
            name='question_order',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='quizattempt',
            name='option_orders',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='quizattempt',
            name='auto_submitted',
            field=models.BooleanField(default=False),
        ),
    ]
