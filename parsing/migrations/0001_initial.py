# -*- coding: utf-8 -*-
# Generated by Django 1.9.2 on 2017-08-04 04:09


from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("timetable", "0019_merge"),
    ]

    operations = [
        migrations.CreateModel(
            name="DataUpdate",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("school", models.CharField(max_length=100)),
                ("last_updated", models.DateTimeField(auto_now=True)),
                (
                    "reason",
                    models.CharField(default=b"Scheduled Update", max_length=200),
                ),
                (
                    "update_type",
                    models.CharField(
                        choices=[
                            (b"C", b"courses"),
                            (b"T", b"textbooks"),
                            (b"E", b"evaluations"),
                            (b"M", b"miscellaneous"),
                        ],
                        default=b"M",
                        max_length=1,
                    ),
                ),
                (
                    "semester",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="timetable.Semester",
                    ),
                ),
            ],
        ),
    ]
