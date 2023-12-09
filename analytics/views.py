# Copyright (C) 2017 Semester.ly Technologies, LLC
#
# Semester.ly is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# Semester.ly is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

import json
import urllib.request
import urllib.error
import urllib.parse
import heapq
from dateutil import tz
from datetime import timedelta, datetime
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse
from django.template import RequestContext
from django.views.decorators.csrf import csrf_exempt
from django.http import Http404
from django.db.models import Count
from rest_framework import generics
from rest_framework.response import Response
from student.models import Student

from student.utils import get_student
from student.models import *
from analytics.models import *
from analytics.serializers import UIErrorLogSerializer
from timetable.models import Semester
from parsing.schools.active import ACTIVE_SCHOOLS


to_zone = tz.gettz("America/New_York")


def view_analytics_dashboard(request):
    student = get_student(request)
    if student and student.user.is_staff:
        total_signups = number_timetables(Timetable=Student)
        total_calendar_exports = number_timetables(Timetable=CalendarExport)
        unique_users_calendar_exports = number_timetables(
            Timetable=CalendarExport, distinct="student"
        )
        return render(
            request,
            "analytics_dashboard.html",
            {
                "total_timetables": number_timetables(),
                "total_shared_timetables": number_timetables(Timetable=SharedTimetable),
                "total_personal_timetables": number_timetables(
                    Timetable=PersonalTimetable
                ),
                "total_signups": total_signups,
                "total_calendar_exports": total_calendar_exports,
                "unique_users_calendar_exports": unique_users_calendar_exports,
                "num_users_by_class_year": json.dumps(number_students_by_year()),
                "num_users_by_major": json.dumps(number_students_by_major()),
                "signups_per_day": number_timetables_per_hour(
                    Timetable=Student, start_delta_days=31, interval_delta_hours=24
                ),
                "jhu_most_popular_courses": json.dumps(
                    most_popular_courses(n=5, school="jhu", Table=PersonalTimetable)
                ),
            },
        )
    else:
        raise Http404


def save_analytics_timetable(courses, semester, school, student=None):
    """Create an analytics time table entry."""
    analytics_timetable = AnalyticsTimetable.objects.create(
        semester=semester, school=school, time_created=datetime.now(), student=student
    )
    analytics_timetable.courses.add(*courses)
    analytics_timetable.save()


def save_analytics_course_search(
    query, courses, semester, school, student=None, advanced=False
):
    """Create an analytics course search entry."""
    course_search = AnalyticsCourseSearch.objects.create(
        query=query,
        semester=semester,
        school=school,
        student=student,
        is_advanced=advanced,
    )
    course_search.courses.add(*courses)
    course_search.save()


def number_timetables(**parameters):
    """
    Get the number of timetables filtered by any parameters.
    Use Timetable to specify the table to filter.
    """
    Timetable = (
        parameters.pop("Timetable") if "Timetable" in parameters else AnalyticsTimetable
    )

    timetables = Timetable.objects.all()
    if "time_start" in parameters and "time_end" in parameters:
        timetables = timetables.filter(
            time_created__range=(
                parameters.pop("time_start"),
                parameters.pop("time_end"),
            )
        )
    if "distinct" in parameters:
        timetables = timetables.distinct(parameters.pop("distinct"))
    timetables = timetables.filter(
        **{param: val for (param, val) in parameters.items() if val is not None}
    )
    return timetables.count()


def number_timetables_per_hour(
    Timetable=AnalyticsTimetable,
    school=None,
    start_delta_days=1,
    interval_delta_hours=1,
):
    """
    Get the number of time tables created each hour.
    Can be used for analytics or shared time tables.
    """
    # TODO: Change start and end time. Currently set for past 24 hours.
    time_end = datetime.now()
    length = timedelta(days=start_delta_days)
    time_start = time_end - length

    time_delta = timedelta(hours=interval_delta_hours)
    num_timetables = []
    while time_start < time_end:
        num_timetables.append(
            number_timetables(
                Timetable=Timetable,
                school=school,
                time_start=time_start,
                time_end=time_start + time_delta,
            )
        )
        time_start += time_delta
    return num_timetables


def number_timetables_per_semester():
    num_timetables = {}
    for semester in Semester.objects.distinct():
        num_timetables[str(semester)] = number_timetables(semester=semester)
    return num_timetables


def number_of_reactions(max_only=False):
    """
    Get the the number of uses for each reaction.
    If max_only is true, return only the reaction with the most uses.
    """
    # TODO: Could be modified for max AND number of each reaction.
    num_reactions = {}
    reaction_list = Reaction.REACTION_CHOICES
    for title, text in reaction_list:
        reaction = None
        reactions = Reaction.objects.filter(title=title)
        num_reactions[title] = len(reactions)
    if max_only:
        return max(iter(num_reactions.keys()), key=num_reactions.get)
    else:
        return num_reactions


def most_popular_courses(n, school, Table=AnalyticsTimetable, semester=None):
    """
    Get the top n most popular courses searched (AnalyticsCourseSearch) or in
    timetable (AnalyticsTimetable).
    """
    if semester is None:
        course_counts = (
            Table.objects.filter(school=school)
            .values("courses")
            .annotate(count=Count("courses"))
            .order_by("-count", "courses")
        )
    else:
        course_counts = (
            Table.objects.filter(school=school, semester=semester)
            .values("courses")
            .annotate(count=Count("courses"))
            .order_by("-count", "courses")
        )
    course_ids = [cc["courses"] for cc in course_counts[:n]]
    course_list = [course.name for course in Course.objects.filter(pk__in=course_ids)]
    return course_list


def number_students_by_year():
    """Get the number of students by class year."""
    count_class_years = (
        Student.objects.values("class_year")
        .annotate(count=Count("id"))
        .order_by("class_year")
    )
    return {
        class_year["class_year"]: class_year["count"]
        for class_year in count_class_years
    }


def number_students_by_major(top_majors=25):
    """Get the number of students by major, condensing small majors
    into an 'Other' category and displaying only the top majors."""
    count_majors = (
        Student.objects.values("major").annotate(count=Count("id")).order_by("-count")
    )
    other_count = 0
    for major in count_majors[top_majors:]:
        other_count += major["count"]
    top_majors_count = {
        major["major"]: major["count"] for major in count_majors[:top_majors]
    }
    top_majors_count["Other"] = other_count
    return top_majors_count


def number_students_by_school():
    result = {}
    for school in ACTIVE_SCHOOLS:
        ids = (
            PersonalTimetable.objects.filter(school=school)
            .values_list("student", flat=True)
            .distinct()
        )
        students = Student.objects.filter(id__in=ids) | Student.objects.filter(
            school=school
        )
        result[school] = students.count()
    return result


class UIErrorLogCreateView(generics.CreateAPIView):
    serializer_class = UIErrorLogSerializer
    queryset = UIErrorLog.objects.all()
