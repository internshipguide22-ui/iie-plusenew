from django.db import migrations


def ensure_course_type_table(apps, schema_editor):
    CourseType = apps.get_model('connect', 'CourseType')
    existing_tables = schema_editor.connection.introspection.table_names()
    if CourseType._meta.db_table not in existing_tables:
        schema_editor.create_model(CourseType)


class Migration(migrations.Migration):

    dependencies = [
        ('connect', '0008_merge_material_library_quiz_branch'),
    ]

    operations = [
        migrations.RunPython(ensure_course_type_table, migrations.RunPython.noop),
    ]
