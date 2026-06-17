import csv
import io
import re
import mimetypes
from html import escape
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from django.db import DatabaseError, IntegrityError, OperationalError
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
# Add this import at the top with your other imports
from django.contrib.auth.decorators import login_required
from datetime import datetime
import PyPDF2
from django.db import transaction  # Add this at the top of your views.py
from django.core.cache import cache
from django.conf import settings
from django.http import FileResponse, HttpResponse
import os
import random
import logging
import threading
import requests

# Logger for exception capture
logger = logging.getLogger(__name__)


def get_portal_url(request=None):
    configured_url = getattr(settings, 'APP_PORTAL_URL', '').rstrip('/')
    if configured_url:
        return configured_url
    if request is not None:
        return request.build_absolute_uri('/').rstrip('/')
    return ''

# ── BREVO EMAIL HELPER ───────────────────────────────────────────────────────
def send_brevo_email(to_email, subject, html_content, text_content=""):
    api_key = os.getenv('BREVO_API_KEY', getattr(settings, 'BREVO_API_KEY', ''))
    from_email = os.getenv('DEFAULT_FROM_EMAIL', getattr(settings, 'DEFAULT_FROM_EMAIL', ''))
    from_name = os.getenv('DEFAULT_FROM_NAME', getattr(settings, 'DEFAULT_FROM_NAME', 'IIE Connect'))

    if not api_key:
        raise RuntimeError('BREVO_API_KEY is not configured')
    if not from_email:
        raise RuntimeError('DEFAULT_FROM_EMAIL is not configured')

    recipients = to_email if isinstance(to_email, list) else [to_email]
    payload = {
        'sender': {'email': from_email, 'name': from_name},
        'to': [{'email': email} for email in recipients if email],
        'subject': subject,
        'htmlContent': html_content,
    }
    if text_content:
        payload['textContent'] = text_content

    response = requests.post(
        'https://api.brevo.com/v3/smtp/email',
        headers={
            'accept': 'application/json',
            'api-key': api_key,
            'content-type': 'application/json',
        },
        json=payload,
        timeout=20,
    )

    if response.status_code >= 400:
        logger.error(
            'Brevo email failed status=%s response=%s',
            response.status_code,
            response.text,
        )
        response.raise_for_status()

    print(f"Brevo email sent to {recipients}: {subject}")
    logger.info('Brevo email sent to %s subject=%s', recipients, subject)
    return response.json() if response.content else {}


def send_email_async(subject, message, recipient_list):
    """
    Send email asynchronously through Brevo HTTP API. Errors are logged but do
    not fail the caller.
    """
    def send_in_thread():
        try:
            send_brevo_email(
                to_email=recipient_list,
                subject=subject,
                html_content=f"<pre style=\"font-family: Arial, sans-serif; white-space: pre-wrap;\">{escape(message)}</pre>",
                text_content=message,
            )
        except Exception as e:
            print(f"Email error: {e}")
            logger.exception("Failed to send Brevo email to %s", recipient_list)

    thread = threading.Thread(target=send_in_thread, daemon=True)
    thread.start()


from .models import (
    Courses, Employee, Batches, Students,
    StudentAttendance, StudyMaterial, StudyMaterialAssignment, QuizTest, Question, AssignedTest, UserActivity,
    StaffLeaveRequest, StudentLeaveApplication, SupportRequest, StudentSupportRequest,
    CourseSession, StudentSessionStatus, Student_Session_Progress, DoubtResponse, SessionNotification,
    Announcement, CounselorLeaveRequest, CounselorSupportRequest,
    Quiz, QuizQuestion, QuizAttempt, QuizAnswer,
    CompletedStudent, SessionCompletionRequest, TestResult,FeePaymentRequest,
    GalleryItem, VlogItem, NewsItem, CalendarEvent, Referral,
)
from .serializers import (
    CourseSerializer, EmployeeSerializer,
    BatchSerializer, StudentSerializer,
    AttendanceSerializer, StudyMaterialSerializer, TestSerializer,
    QuestionSerializer, AssignedTestSerializer, StaffLeaveRequestSerializer,
    StudentLeaveApplicationSerializer, SupportRequestSerializer,
    StudentSupportRequestSerializer, CourseSessionSerializer,
    AnnouncementSerializer, CounselorLeaveRequestSerializer,
    CounselorSupportRequestSerializer, QuizSerializer, QuizQuestionSerializer,
    QuizAttemptSerializer, CompletedStudentSerializer,
    SessionCompletionRequestSerializer, LoginSerializer,
    GalleryItemSerializer, VlogItemSerializer, NewsItemSerializer,
    CalendarEventSerializer, ReferralSerializer, strip_unsupported_mysql_chars,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


def record_user_login(user, user_type, employee=None, student=None):
    now = timezone.now()
    try:
        UserActivity.objects.create(
            user=user,
            user_type=user_type,
            employee=employee,
            student=student,
            login_time=now,
            last_seen=now,
        )
    except Exception:
        logger.exception("Failed to record user login for user_id=%s", getattr(user, 'id', None))


def record_user_logout(user):
    try:
        activity = UserActivity.objects.filter(
            user=user,
            logout_time__isnull=True,
        ).order_by('-login_time').first()
        if activity:
            now = timezone.now()
            activity.logout_time = now
            activity.last_seen = now
            activity.save(update_fields=['logout_time', 'last_seen'])
    except Exception:
        logger.exception("Failed to record user logout for user_id=%s", getattr(user, 'id', None))


def is_admin_user(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.is_staff))


def apply_activity_date_filters(qs, params):
    date_from = parse_date(params.get('date_from') or '')
    date_to = parse_date(params.get('date_to') or '')
    if date_from:
        qs = qs.filter(login_time__date__gte=date_from)
    if date_to:
        qs = qs.filter(login_time__date__lte=date_to)
    return qs


def format_employee_activity(activity):
    employee = activity.employee
    return {
        'id': activity.id,
        'name': f"{employee.first_name} {employee.last_name or ''}".strip() if employee else activity.user.username,
        'email': employee.email if employee else activity.user.email,
        'staff_id': employee.staff_id if employee else '',
        'designation': employee.designation if employee else '',
        'branch': employee.branch if employee else '',
        'login_time': activity.login_time,
        'logout_time': activity.logout_time,
        'last_seen': activity.last_seen,
    }


def format_student_activity(activity):
    student = activity.student
    staff = student.assigned_staff if student else None
    return {
        'id': activity.id,
        'name': f"{student.first_name} {student.last_name or ''}".strip() if student else activity.user.username,
        'email': student.email if student else activity.user.email,
        'student_id': student.student_id if student else '',
        'branch': student.branch if student else '',
        'staff_id': staff.id if staff else None,
        'staff_name': f"{staff.first_name} {staff.last_name or ''}".strip() if staff else '',
        'login_time': activity.login_time,
        'logout_time': activity.logout_time,
        'last_seen': activity.last_seen,
    }


def generate_staff_id():
    """Generate unique Staff ID based on highest existing EMP number"""

    staff_ids = Employee.objects.values_list('staff_id', flat=True)

    max_num = 0

    for sid in staff_ids:
        match = re.search(r'EMP(\d+)', str(sid))
        if match:
            max_num = max(max_num, int(match.group(1)))

    return f"EMP{max_num + 1:04d}"

import re

def generate_batch_number(branch):
    """Generate unique branch-specific batch number using highest existing number"""
    branch_prefix_map = {
        '100ft': '100FT',
        'hopes': 'HOPES',
        'kuniyamuthur': 'KUNIYA',
        'kunniyamuthur': 'KUNIYA',
    }

    prefix = branch_prefix_map.get(branch.lower(), 'BAT')

    if prefix == 'BAT':
        pattern = 'BAT'
    else:
        pattern = f'{prefix}-BAT'

    existing_numbers = Batches.objects.filter(
        batch_number__startswith=pattern
    ).values_list('batch_number', flat=True)

    max_num = 0

    for batch_number in existing_numbers:
        match = re.search(r'BAT(\d+)$', str(batch_number))
        if match:
            max_num = max(max_num, int(match.group(1)))

    next_num = max_num + 1

    if prefix == 'BAT':
        return f'BAT{next_num:04d}'

    return f'{prefix}-BAT{next_num:03d}'

def generate_student_id(branch):
    branch_prefix_map = {
        '100ft': '100FT',
        'hopes': 'HOPES',
        'kuniyamuthur': 'KUNIYA',
        'kunniyamuthur': 'KUNIYA',
    }

    prefix = branch_prefix_map.get(branch.lower(), 'STU')
    pattern = f"{prefix}-STU"

    existing_ids = Students.objects.filter(
        student_id__startswith=pattern
    ).values_list('student_id', flat=True)

    max_number = 0

    for sid in existing_ids:
        match = re.search(r'STU(\d+)$', sid)
        if match:
            max_number = max(max_number, int(match.group(1)))

    next_number = max_number + 1
    return f"{prefix}-STU{next_number:03d}"

# ── AUTH ─────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        user_type = serializer.validated_data['user_type']
        user = authenticate(username=username, password=password)

        if user is None:
            return Response({'error': 'Invalid username or password.'}, status=401)

        if user_type == 'admin':
            if not (user.is_superuser or user.is_staff):
                return Response({'error': "No admin privileges."}, status=403)
            return Response({**get_tokens_for_user(user), 'user_type': 'admin', 'username': user.username, 'name': user.username})

        elif user_type == 'employee':
            try:
                employee = Employee.objects.get(user=user)
            except Employee.DoesNotExist:
                return Response({'error': 'Employee account not found.'}, status=403)
            record_user_login(user, 'employee', employee=employee)
            return Response({
                **get_tokens_for_user(user),
                'user_type': 'employee',
                'designation': employee.designation,
                'employee_id': employee.id,
                'name': f"{employee.first_name} {employee.last_name or ''}".strip(),
                'branch': employee.branch,
            })

        elif user_type == 'student':
            try:
                student = Students.objects.get(user=user)
            except Students.DoesNotExist:
                return Response({'error': 'Student account not found.'}, status=403)
            record_user_login(user, 'student', student=student)
            return Response({
                **get_tokens_for_user(user),
                'user_type': 'student',
                'student_id': student.student_id,
                'student_pk': student.id,
                'name': f"{student.first_name} {student.last_name or ''}".strip(),
            })

        return Response({'error': 'Invalid user type.'}, status=400)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        record_user_logout(request.user)
        try:
            token = RefreshToken(request.data.get('refresh', ''))
            token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Logged out successfully.'})


# ── DASHBOARD ─────────────────────────────────────────────────────────────────

class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        completed_ids = CompletedStudent.objects.values_list('original_student_id', flat=True)
        return Response({
            'student_count': Students.objects.exclude(student_id__in=completed_ids).count(),
            'mentor_count': Employee.objects.filter(designation__iexact='mentor').count(),
            'course_count': Courses.objects.count(),
            'batch_count': Batches.objects.count(),
            'completed_count': CompletedStudent.objects.count(),
            'counselor_count': Employee.objects.filter(designation__iexact='counselor').count(),
            'trainer_count': Employee.objects.filter(designation__iexact='trainer').count(),
            'next_staff_id': generate_staff_id(),
        })


class EmployeeDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            employee = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=404)

        completed_ids = CompletedStudent.objects.values_list('original_student_id', flat=True)
        my_batches = Batches.objects.filter(faculty=employee)
        today = timezone.now().date()
        announcements = Announcement.objects.filter(
            Q(recipient_type='all') | Q(recipient_type='staff') | Q(recipient_type='mentors'),
            is_published=True
        ).order_by('-created_at')[:5]

        return Response({
            'employee': EmployeeSerializer(employee).data,
            'my_batches_count': my_batches.count(),
            'my_students_count': Students.objects.filter(
                assigned_batch__faculty=employee
            ).exclude(student_id__in=completed_ids).count(),
            'today_classes_count': my_batches.filter(start_date__lte=today, end_date__gte=today).count(),
            'materials_count': StudyMaterial.objects.filter(uploaded_by=employee).count(),
            'completed_students_count': CompletedStudent.objects.filter(
                batch_number__in=my_batches.values_list('batch_number', flat=True)
            ).count(),
            'announcements_count': announcements.count(),
            'announcements': AnnouncementSerializer(announcements, many=True).data,
        })


class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            student = Students.objects.get(user=request.user)
        except Students.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)

        attendance = StudentAttendance.objects.filter(student=student)
        total_att = attendance.count()
        present_att = attendance.filter(status='Present').count()
        announcements = Announcement.objects.filter(
            Q(recipient_type='all') | Q(recipient_type='students'),
            is_published=True
        ).order_by('-created_at')[:5]

          # ── ADD THIS: Calculate completed sessions count ─────────────
        completed_sessions_count = Student_Session_Progress.objects.filter(
            student=student,
            completed=True
        ).count()
        # ─────────────────────────────────────────────────────────────

        # ── ADD THIS: Calculate total tests and quizzes ──────────────
        tests_count = TestResult.objects.filter(student=student).count()
        quizzes_count = QuizAttempt.objects.filter(student=student).count()
        materials_count = StudyMaterial.objects.filter(
            batch=student.assigned_batch
        ).count() if student.assigned_batch else 0
        # ─────────────────────────────────────────────────────────────


        return Response({
            'student': StudentSerializer(student).data,
            'attendance_percentage': round((present_att / total_att * 100) if total_att else 0, 1),
            'total_classes': total_att,
            'present_classes': present_att,
            'announcements': AnnouncementSerializer(announcements, many=True).data,
             # ── ADD THESE NEW FIELDS ─────────────────────────────────
            'completed_sessions_count': completed_sessions_count,
            'tests_count': tests_count,
            'quizzes_count': quizzes_count,
            'materials_count': materials_count,
        })


class CounselorDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            counselor = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        branch = counselor.branch or ''
        announcements = Announcement.objects.filter(
            Q(recipient_type='all') | Q(recipient_type='counselors') | Q(recipient_type='staff'),
            is_published=True
        ).order_by('-created_at')[:5]

        return Response({
            'counselor': EmployeeSerializer(counselor).data,
            'student_count': Students.objects.filter(branch=branch).count(),
            'mentor_count': Employee.objects.filter(branch=branch, designation__iexact='mentor').count(),
            'counselor_count': Employee.objects.filter(branch=branch, designation__iexact='counselor').count(),
            'course_count': Courses.objects.filter(batches__branch=branch).distinct().count(),
            'batch_count': Batches.objects.filter(branch=branch).count(),
            'pending_completion_requests': SessionCompletionRequest.objects.filter(counselor=counselor, status='pending').count(),
            'announcements': AnnouncementSerializer(announcements, many=True).data,
            'next_batch_id': generate_batch_number(branch) if branch else '',
            'next_student_id': generate_student_id(branch) if branch else '',
        })


# ── STAFF ID GENERATION ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_next_staff_id(request):
    return Response({'staff_id': generate_staff_id()})


# ── BATCH NUMBER GENERATION ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_next_batch_number(request):
    branch = request.query_params.get('branch', '')
    if not branch:
        return Response({'error': 'Branch is required'}, status=400)
    return Response({
        'batch_number': generate_batch_number(branch),
        'branch': branch,
    })


# ── STUDENT ID GENERATION ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_next_student_id(request):
    branch = request.query_params.get('branch', '')
    if not branch:
        return Response({'error': 'Branch is required'}, status=400)
    return Response({'student_id': generate_student_id(branch)})


# ── COURSES ──────────────────────────────────────────────────────────────────

class CourseListCreateView(generics.ListCreateAPIView):
    queryset = Courses.objects.all().order_by('-created_at')
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Courses.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class GalleryItemListCreateView(generics.ListCreateAPIView):
    queryset = GalleryItem.objects.all().order_by('-created_at')
    serializer_class = GalleryItemSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class GalleryItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = GalleryItem.objects.all()
    serializer_class = GalleryItemSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]


class VlogItemListCreateView(generics.ListCreateAPIView):
    queryset = VlogItem.objects.all().order_by('-created_at')
    serializer_class = VlogItemSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class VlogItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = VlogItem.objects.all()
    serializer_class = VlogItemSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]


class NewsItemListCreateView(generics.ListCreateAPIView):
    queryset = NewsItem.objects.all().order_by('-created_at')
    serializer_class = NewsItemSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class NewsItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = NewsItem.objects.all()
    serializer_class = NewsItemSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]


class CalendarEventListCreateView(generics.ListCreateAPIView):
    queryset = CalendarEvent.objects.all().order_by('event_date', 'event_time', '-created_at')
    serializer_class = CalendarEventSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        event_name = strip_unsupported_mysql_chars(data.get('event_name') or data.get('title') or '').strip()
        message = strip_unsupported_mysql_chars(data.get('message') or data.get('description') or '').strip()
        event_date = str(data.get('event_date') or data.get('date') or '').strip()
        event_time = str(data.get('event_time') or data.get('time') or '').strip()

        if event_name:
            data['event_name'] = event_name
        if not message and event_name:
            message = event_name
        if message:
            data['message'] = message

        if event_date:
            for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y'):
                try:
                    data['event_date'] = datetime.strptime(event_date, fmt).date().isoformat()
                    break
                except ValueError:
                    continue
            else:
                data['event_date'] = event_date

        if event_time:
            event_time = event_time.upper().replace('.', '').strip()
            parsed_time = None
            for fmt in ('%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M:%S %p'):
                try:
                    parsed_time = datetime.strptime(event_time, fmt).time()
                    break
                except ValueError:
                    continue
            data['event_time'] = parsed_time.strftime('%H:%M:%S') if parsed_time else event_time

        try:
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except OperationalError as exc:
            return Response({'error': f'Calendar database error: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except IntegrityError as exc:
            return Response({'error': f'Calendar save error: {exc}'}, status=status.HTTP_400_BAD_REQUEST)


class CalendarEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CalendarEvent.objects.all()
    serializer_class = CalendarEventSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]


class ReferralListCreateView(generics.ListCreateAPIView):
    queryset = Referral.objects.all().order_by('-created_at')
    serializer_class = ReferralSerializer
    parser_classes = [JSONParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAdminUser()]


class ReferralDetailView(generics.RetrieveDestroyAPIView):
    queryset = Referral.objects.all()
    serializer_class = ReferralSerializer
    permission_classes = [IsAdminUser]


# ── EMPLOYEES ────────────────────────────────────────────────────────────────

class EmployeeListView(generics.ListAPIView):
    queryset = Employee.objects.all().order_by('-created_at')
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        designation = self.request.query_params.get('designation')
        branch = self.request.query_params.get('branch')
        if designation:
            qs = qs.filter(designation__iexact=designation)
        if branch:
            qs = qs.filter(branch=branch)
        return qs



class EmployeeCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        data = request.data
        employee_name = data.get('employee_name', '').strip()
        email = data.get('email', '').strip().lower()
        mobile_no = data.get('mobile_no', '').strip()
        role = data.get('role', data.get('designation', '')).strip()
        branch = data.get('branch', '').strip()
        gender = data.get('gender', '').strip()
        date_of_birth = data.get('date_of_birth', '').strip()
        address = data.get('address', '').strip()
        photo = request.FILES.get('photo')
        id_proof = request.FILES.get('id_proof')

        if not all([employee_name, email, mobile_no, role, branch, date_of_birth]):
            return Response({'error': 'Please fill in all required fields.'}, status=400)

        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return Response({'error': 'Please enter a valid email address.'}, status=400)

        if User.objects.filter(username=email).exists():
            return Response({'error': 'This email is already registered!'}, status=400)
        if Employee.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists in employees!'}, status=400)
        if Employee.objects.filter(mobile_no=mobile_no).exists():
            return Response({'error': 'Mobile number already exists!'}, status=400)

        name_parts = employee_name.split(' ', 1)
        first_name = name_parts[0].strip()
        last_name = name_parts[1].strip() if len(name_parts) > 1 else ''
        staff_id = generate_staff_id()

        try:
            user = User.objects.create_user(
                username=email,
                password=mobile_no,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            employee = Employee.objects.create(
                user=user,
                staff_id=staff_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                mobile_no=mobile_no,
                date_of_birth=date_of_birth,
                designation=role,
                branch=branch,
                gender=gender,
                address=address,
                photo=photo if photo else None,
                id_proof=id_proof if id_proof else None,
            )

            # ── Send welcome email with login credentials (async) ─────────────
            try:
                branch_display = {
                    '100ft': '100 Feet Road',
                    'hopes': 'Hopes',
                    'kuniyamuthur': 'Kuniyamuthur',
                }.get(branch.lower(), branch.capitalize())
                portal_url = get_portal_url(request)

                send_email_async(
                    subject='Welcome to IIE Connect — Your Login Credentials',
                    message=f"""Dear {first_name},

Welcome to IIE Connect! Your account has been created successfully.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Portal URL  :  {portal_url}
  Username    :  {email}
  Password    :  {mobile_no}
  Staff ID    :  {staff_id}
  Role        :  {role.capitalize()}
  Branch      :  {branch_display}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please log in using the above credentials.
For security, we recommend changing your password after your first login.

If you have any trouble accessing your account, please contact your administrator.

Best regards,
IIE Connect Team
Indra Institute of Education
{portal_url}
""",
                    recipient_list=[email],
                )
                print(f"✅ Welcome email queued for {email}")
            except Exception as mail_err:
                print(f"⚠️ Welcome email queueing failed for {email}: {mail_err}")
            # ─────────────────────────────────────────────────────────

            return Response({
                'message': f"Employee '{first_name}' added successfully!",
                'staff_id': staff_id,
                'employee': EmployeeSerializer(employee).data,
                'next_staff_id': generate_staff_id(),
            }, status=201)

        except Exception as e:
            return Response({'error': str(e)}, status=400)


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def partial_update(self, request, *args, **kwargs):
        employee = self.get_object()
        new_email = request.data.get('email', '').strip().lower()

        # If email changed, update the Django User too
        if new_email and new_email != employee.email:
            # Check not already taken by another user
            if User.objects.filter(username=new_email).exclude(pk=employee.user.pk).exists():
                return Response({'error': 'This email is already registered!'}, status=400)
            employee.user.username = new_email
            employee.user.email = new_email
            employee.user.save()

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        employee = self.get_object()
        user = employee.user
        employee.delete()
        user.delete()
        return Response({'message': 'Employee deleted.'}, status=204)

class EmployeeProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            emp = Employee.objects.get(user=request.user)
            return Response(EmployeeSerializer(emp).data)
        except Employee.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


# ── BATCHES ──────────────────────────────────────────────────────────────────

class BatchListCreateView(generics.ListAPIView):
    queryset = Batches.objects.all().order_by('-created_at')
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Get faculty filter from query params
        faculty_id = self.request.query_params.get('faculty')
        if faculty_id:
            qs = qs.filter(faculty__id=faculty_id)
        
        # For non-admin users
        if not (user.is_superuser or user.is_staff):
            try:
                emp = Employee.objects.get(user=user)
                if emp.designation.lower() == 'counselor':
                    qs = qs.filter(branch=emp.branch)
                elif emp.designation.lower() in ['trainer', 'mentor']:
                    # If faculty filter not provided, filter by the logged-in staff
                    if not faculty_id:
                        qs = qs.filter(faculty=emp)
            except Employee.DoesNotExist:
                return qs.none()
        
        return qs

    def list(self, request, *args, **kwargs):
        """Override list to add student_count to each batch"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        
        # Add student_count to each batch
        for batch_data in data:
            try:
                batch = Batches.objects.get(id=batch_data['id'])
                student_count = Students.objects.filter(assigned_batch=batch).count()
                batch_data['student_count'] = student_count
            except Batches.DoesNotExist:
                batch_data['student_count'] = 0
        
        # Get total count for pagination if needed
        total_count = queryset.count()
        
        # Return in the same format as other list views
        return Response({
            'results': data,
            'count': total_count
        })
    
class BatchCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        data = request.data
        batch_number = data.get('batch_number', '').strip()
        course_type = data.get('course_type', '').strip()
        course_name_id = data.get('course_name', '').strip()
        faculty_id = data.get('faculty', '').strip()
        start_date = data.get('start_date', '').strip()
        end_date = data.get('end_date', '').strip()
        batch_timing = data.get('batch_timing', '').strip()
        branch = data.get('branch', '').strip()
        logsheet_file = request.FILES.get('logsheet_file')

        employee = None
        try:
            employee = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            pass

        if not batch_number and branch:
            batch_number = generate_batch_number(branch)

        missing = []
        if not batch_number: missing.append('Batch Number')
        if not course_type: missing.append('Course Type')
        if not course_name_id: missing.append('Course Name')
        if not faculty_id: missing.append('Faculty')
        if not start_date: missing.append('Start Date')
        if not end_date: missing.append('End Date')
        if not batch_timing: missing.append('Batch Timing')
        if not branch: missing.append('Branch')
        if missing:
            return Response({'error': f"Missing: {', '.join(missing)}"}, status=400)

        if employee and employee.designation.lower() == 'counselor':
            if branch != employee.branch:
                return Response({'error': f'You can only create batches for your own branch ({employee.branch})!'}, status=403)
            try:
                selected_faculty = Employee.objects.get(id=faculty_id)
                if selected_faculty.branch != employee.branch:
                    return Response({'error': 'Selected faculty is not from your branch!'}, status=403)
            except Employee.DoesNotExist:
                return Response({'error': 'Selected faculty not found!'}, status=404)

        if Batches.objects.filter(batch_number=batch_number).exists():
            return Response({'error': f"Batch number '{batch_number}' already exists!"}, status=400)

        try:
            course = Courses.objects.get(id=course_name_id)
            faculty = Employee.objects.get(id=faculty_id)
        except Courses.DoesNotExist:
            return Response({'error': 'Selected course not found!'}, status=404)
        except Employee.DoesNotExist:
            return Response({'error': 'Selected faculty not found!'}, status=404)

        batch = Batches(
            batch_number=batch_number,
            course_type=course_type,
            course_name=course,
            faculty=faculty,
            start_date=start_date,
            end_date=end_date,
            batch_timing=batch_timing,
            branch=branch,
        )
        if logsheet_file:
            batch.course_logsheet = logsheet_file
        batch.save()

        return Response({
            'message': f"Batch '{batch_number}' created successfully!",
            'batch': BatchSerializer(batch).data,
            'next_batch_number': generate_batch_number(branch),
        }, status=201)


class BatchDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Batches.objects.all()
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def partial_update(self, request, *args, **kwargs):
        batch = self.get_object()
        data = request.data

        # ── Update fields manually ────────────────────────────────────────
        if data.get('course_type'):
            batch.course_type = data.get('course_type')

        if data.get('course_name'):
            try:
                course = Courses.objects.get(id=data.get('course_name'))
                batch.course_name = course
            except Courses.DoesNotExist:
                return Response({'error': 'Course not found'}, status=404)

        if data.get('faculty'):
            try:
                faculty = Employee.objects.get(id=data.get('faculty'))
                batch.faculty = faculty
            except Employee.DoesNotExist:
                return Response({'error': 'Faculty not found'}, status=404)

        if data.get('start_date'):
            batch.start_date = data.get('start_date')

        if data.get('end_date'):
            batch.end_date = data.get('end_date')

        if data.get('batch_timing'):
            batch.batch_timing = data.get('batch_timing')

        if data.get('branch'):
            batch.branch = data.get('branch')

        if data.get('batch_number'):
            batch.batch_number = data.get('batch_number')

        # ── Handle logsheet file ──────────────────────────────────────────
        if request.FILES.get('course_logsheet'):
            batch.course_logsheet = request.FILES.get('course_logsheet')

        batch.save()

        return Response({
            'message': f"Batch '{batch.batch_number}' updated successfully!",
            'batch': BatchSerializer(batch).data,
        })

    def destroy(self, request, *args, **kwargs):
        batch = self.get_object()
        batch_number = batch.batch_number
        batch.delete()
        return Response({'message': f"Batch '{batch_number}' deleted successfully!"}, status=204)

# ── STUDENTS ─────────────────────────────────────────────────────────────────
class StudentListView(generics.ListAPIView):
    queryset = Students.objects.all().order_by('-created_at')
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()

        # ── Exclude ONLY FULLY COMPLETED students ────────────────────
        # Only exclude students who have a CompletedStudent record with completion_type='full'
        try:
            full_completed_ids = CompletedStudent.objects.filter(
                completion_type='full'
            ).values_list('original_student_id', flat=True)
        except DatabaseError as e:
            # Likely the production DB is missing the column; log and continue without excluding
            logger.exception("Database error while querying CompletedStudent.completion_type")
            full_completed_ids = []

        valid_student_ids = []
        valid_student_pks = []
        for cid in full_completed_ids:
            if not cid:
                continue
            cid_str = str(cid).strip()
            if cid_str.isdigit():
                valid_student_pks.append(int(cid_str))
            valid_student_ids.append(cid_str)

        if valid_student_ids or valid_student_pks:
            exclude_filter = Q()
            if valid_student_ids:
                exclude_filter |= Q(student_id__in=valid_student_ids)
            if valid_student_pks:
                exclude_filter |= Q(id__in=valid_student_pks)
            qs = qs.exclude(exclude_filter)
        # ─────────────────────────────────────────────────────────────

        assigned_staff = self.request.query_params.get('assigned_staff')
        if assigned_staff:
            try:
                assigned_staff_id = int(assigned_staff)
                qs = qs.filter(assigned_staff__id=assigned_staff_id)
            except (ValueError, TypeError):
                pass

        branch = self.request.query_params.get('branch')
        if branch:
            qs = qs.filter(branch__iexact=branch.strip())

        user = self.request.user
        if not (user.is_superuser or user.is_staff):
            try:
                emp = Employee.objects.get(user=user)
                if emp.designation.lower() == 'counselor':
                    qs = qs.filter(branch=emp.branch)
                elif emp.designation.lower() in ['trainer', 'mentor']:
                    qs = qs.filter(assigned_staff=emp)
            except Employee.DoesNotExist:
                return qs.none()

        return qs
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.exception("Unhandled exception in StudentListView.list")
            return Response({
                'error': 'Student list retrieval failed',
                'details': str(e),
                'view': 'StudentListView.list'
            }, status=500)
    
class StudentCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        data = request.data
        student_id_input = data.get('student_id', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        email = data.get('email', '').strip().lower()
        mobile_no = data.get('mobile_no', '').strip()
        date_of_birth = data.get('date_of_birth', '').strip()
        city = data.get('city', '').strip()
        state = data.get('state', '').strip()
        qualification = data.get('qualification', '').strip()
        course_name = data.get('course', '').strip()
        gender = data.get('gender', '').strip()
        branch = data.get('branch', '').strip()
        photo = request.FILES.get('photo')

        employee = None
        try:
            employee = Employee.objects.get(user=request.user)
        except Employee.DoesNotExist:
            pass

        if employee and employee.designation.lower() == 'counselor':
            if branch.lower() != employee.branch.lower():
                return Response({'error': f'You can only add students to your own branch ({employee.branch})!'}, status=403)

        if not student_id_input and branch:
            student_id_input = generate_student_id(branch)

        if not all([student_id_input, first_name, email, mobile_no, date_of_birth, city, state, qualification, course_name, branch]):
            return Response({'error': 'Please fill in all required fields.'}, status=400)

        if User.objects.filter(username=email).exists():
            return Response({'error': 'This email is already registered!'}, status=400)
        if Students.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists!'}, status=400)
        if Students.objects.filter(student_id=student_id_input).exists():
            return Response({'error': f"Student ID '{student_id_input}' already exists!"}, status=400)

        try:
            user = User.objects.create_user(
                username=email,
                password=mobile_no,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            student = Students.objects.create(
                user=user,
                student_id=student_id_input,
                email=email,
                first_name=first_name,
                last_name=last_name,
                mobile_no=mobile_no,
                date_of_birth=date_of_birth,
                city=city,
                state=state,
                qualification=qualification,
                course=course_name,
                gender=gender,
                branch=branch,
                photo=photo if photo else None,
            )

            # ── Send welcome email with login credentials (async) ─────────────
            try:
                branch_display = {
                    '100ft': '100 Feet Road',
                    'hopes': 'Hopes',
                    'kuniyamuthur': 'Kuniyamuthur',
                }.get(branch.lower(), branch.capitalize())
                portal_url = get_portal_url(request)

                send_email_async(
                    subject='Welcome to IIE Connect — Your Login Credentials',
                    message=f"""Dear {first_name},

Welcome to IIE Connect! Your student account has been created successfully.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Portal URL  :  {portal_url}
  Username    :  {email}
  Password    :  {mobile_no}
  Student ID  :  {student_id_input}
  Course      :  {course_name}
  Branch      :  {branch_display}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please log in using the above credentials.
For security, we recommend changing your password after your first login.

If you have any trouble accessing your account, please contact your counselor or administrator.

Best regards,
IIE Connect Team
Indra Institute of Education
{portal_url}
""",
                    recipient_list=[email],
                )
                print(f"✅ Welcome email queued for student {email}")
            except Exception as mail_err:
                print(f"⚠️ Welcome email queueing failed for {email}: {mail_err}")
            # ─────────────────────────────────────────────────────────

            return Response({
                'message': f"Student '{first_name}' added successfully!",
                'student_id': student_id_input,
                'student': StudentSerializer(student).data,
                'next_student_id': generate_student_id(branch),
            }, status=201)

        except Exception as e:
            if 'user' in locals():
                user.delete()

            return Response({'error': str(e)}, status=400)


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Students.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def partial_update(self, request, *args, **kwargs):
        student = self.get_object()
        new_email = request.data.get('email', '').strip().lower()

        # If email changed, update the Django User too
        if new_email and new_email != student.email:
            if User.objects.filter(username=new_email).exclude(pk=student.user.pk).exists():
                return Response({'error': 'This email is already registered!'}, status=400)
            student.user.username = new_email
            student.user.email = new_email
            student.user.save()

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        student = self.get_object()
        user = student.user
        student.delete()
        if user:
            user.delete()
        return Response({'message': 'Student deleted.'}, status=204)

class StudentProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            student = Students.objects.get(user=request.user)
            return Response(StudentSerializer(student).data)
        except Students.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


from .models import FeePayment, FeeTransaction

# ── When student is assigned to batch, create fee record ─────────────────────
# ── When student is assigned to batch, create fee record ─────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_staff_to_student(request, student_id):
    try:
        student = Students.objects.get(student_id=student_id)
        staff_id = request.data.get('staff_id')
        batch_id = request.data.get('batch_id')

        if staff_id:
            student.assigned_staff = Employee.objects.get(id=staff_id)

        if batch_id:
            batch = Batches.objects.get(id=batch_id)
            student.assigned_batch = batch

            sessions = CourseSession.objects.filter(batch=batch).order_by("session_number")

            # If this is a new batch and sessions are not created yet, extract from logsheet
            if not sessions.exists():
                print(f"⚠️ No sessions found for batch {batch.id}. Trying to extract from logsheet...")

                extracted_sessions = extract_sessions_from_logsheet(batch, debug=True)

                for item in extracted_sessions:
                    CourseSession.objects.update_or_create(
                        batch=batch,
                        session_number=item["session_number"],
                        defaults={
                            "title": item.get("title", ""),
                            "topics": item.get("topics", ""),
                            "session_enabled": True,
                        }
                    )

                sessions = CourseSession.objects.filter(batch=batch).order_by("session_number")
                print(f"✅ Sessions available for batch {batch.id}: {sessions.count()}")

            Student_Session_Progress.objects.filter(student=student).delete()
            StudentSessionStatus.objects.filter(student=student).delete()

            for session in sessions:
                Student_Session_Progress.objects.create(
                    student=student,
                    session=session,
                    completed=False,
                    staff_completed=False,
                    student_status="not_started"
                )
                StudentSessionStatus.objects.create(
                    student=student,
                    session=session,
                    staff_completed=False,
                    student_status="pending"
                )

            # ── Create fee record ─────────────────────────────────────────
            course_fee = batch.course_name.fee if batch.course_name and batch.course_name.fee else 0
            if course_fee:
                FeePayment.objects.get_or_create(
                    student=student,
                    batch=batch,
                    defaults={
                        'total_fee': course_fee,
                        'amount_paid': 0,
                        'balance': course_fee,
                        'is_fully_paid': False,
                    }
                )
            # ─────────────────────────────────────────────────────────────

        student.save()
        return Response({'message': 'Assigned successfully.', 'student': StudentSerializer(student).data})

    except (Students.DoesNotExist, Employee.DoesNotExist, Batches.DoesNotExist):
        return Response({'error': 'Not found'}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_staff_from_student(request, student_id):
    try:
        student = Students.objects.get(student_id=student_id)
        student.assigned_staff = None
        student.assigned_batch = None
        student.save()
        return Response({'message': 'Assignment removed.'})
    except Students.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ── ATTENDANCE ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def AttendanceListView(request):
    """Get attendance records - supports ?student=me for students"""
    user = request.user
    student_id = request.GET.get('student')
    batch_id = request.GET.get('batch')
    date = request.GET.get('date')
    
    # Start with base queryset
    qs = StudentAttendance.objects.all().order_by('-date')
    
    # Handle 'me' parameter for student
    if student_id == 'me':
        try:
            student = Students.objects.get(user=user)
            qs = qs.filter(student=student)
        except Students.DoesNotExist:
            return Response([])
    elif student_id:
        qs = qs.filter(student__id=student_id)
    
    # Apply other filters
    if batch_id:
        qs = qs.filter(batch__id=batch_id)
    if date:
        qs = qs.filter(date=date)
    
    # If user is a student (not admin/staff), only show their records
    # If user is a student (not admin/staff), only show their records
    if not (user.is_superuser or user.is_staff):
        try:
            student = Students.objects.get(user=user)
            qs = qs.filter(student=student)
        except Students.DoesNotExist:
        # Employee/counselor — allow access, don't restrict
            pass
    
    serializer = AttendanceSerializer(qs, many=True)
    return Response({'results': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_attendance(request):
    batch_id = request.data.get('batch_id')
    date = request.data.get('date')
    attendance_data = request.data.get('attendance', [])
    try:
        batch = Batches.objects.get(id=batch_id)
    except Batches.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=404)

    try:
        staff = Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=404)

    created = []
    for item in attendance_data:
        try:
            student = Students.objects.get(id=item['student_id'])
            att, _ = StudentAttendance.objects.update_or_create(
                student=student,
                date=date,
                defaults={
                    'batch': batch,
                    'staff': staff,
                    'status': item.get('status', 'Present'),
                    'remarks': item.get('remarks', ''),
                }
            )
            created.append(AttendanceSerializer(att).data)
        except Students.DoesNotExist:
            pass
    return Response({'message': f'{len(created)} records saved.', 'records': created})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def batch_attendance_records(request, batch_id):
    records = StudentAttendance.objects.filter(batch__id=batch_id).order_by('-date')
    return Response(AttendanceSerializer(records, many=True).data)


# ── STUDY MATERIALS ───────────────────────────────────────────────────────────

def _get_employee_for_request(request):
    try:
        return Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return None


def _assign_material_to_batch(material, batch_id, assigned_by):
    if not batch_id:
        raise ValueError('Target batch is required.')

    try:
        batch = Batches.objects.get(id=batch_id)
    except (Batches.DoesNotExist, ValueError, TypeError):
        raise Batches.DoesNotExist

    assignment, created = StudyMaterialAssignment.objects.get_or_create(
        material=material,
        batch=batch,
        defaults={'assigned_by': assigned_by},
    )
    return assignment, created


class StudyMaterialListView(generics.ListAPIView):
    queryset = StudyMaterial.objects.all().select_related('batch', 'uploaded_by').prefetch_related('assignments__batch').order_by('-uploaded_at')
    serializer_class = StudyMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        try:
            emp = Employee.objects.get(user=user)
            if not (user.is_superuser or user.is_staff):
                return qs.filter(uploaded_by=emp)
            return qs
        except Employee.DoesNotExist:
            try:
                student = Students.objects.get(user=user)
                if student.assigned_batch:
                    return qs.filter(
                        Q(batch=student.assigned_batch) |
                        Q(assignments__batch=student.assigned_batch)
                    ).distinct()
                return qs.none()
            except Students.DoesNotExist:
                return qs


class StudyMaterialCreateView(generics.CreateAPIView):
    serializer_class = StudyMaterialSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        if not request.data.get('batch'):
            return Response({'batch': ['Batch is required.']}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        emp = Employee.objects.get(user=self.request.user)
        material = serializer.save(uploaded_by=emp, is_library=False)
        try:
            _assign_material_to_batch(material, material.batch_id, emp)
        except Batches.DoesNotExist:
            pass
        headers = self.get_success_headers(serializer.data)
        return Response(
            StudyMaterialSerializer(material, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def material_library_list(request):
    emp = _get_employee_for_request(request)
    if not emp:
        return Response({'error': 'Only employees can access the material library.'}, status=status.HTTP_403_FORBIDDEN)

    qs = StudyMaterial.objects.filter(
        is_library=True,
        uploaded_by=emp,
    ).select_related('uploaded_by').prefetch_related('assignments__batch').order_by('-uploaded_at')

    search = request.query_params.get('search')
    branch = request.query_params.get('branch')
    batch = request.query_params.get('batch')

    if search:
        qs = qs.filter(title__icontains=search)
    if branch:
        qs = qs.filter(assignments__batch__branch=branch)
    if batch:
        qs = qs.filter(assignments__batch_id=batch)

    return Response(StudyMaterialSerializer(qs.distinct(), many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def material_library_upload(request):
    emp = _get_employee_for_request(request)
    if not emp:
        return Response({'error': 'Only employees can upload library materials.'}, status=status.HTTP_403_FORBIDDEN)
    if not request.data.get('file'):
        return Response({'file': ['File is required.']}, status=status.HTTP_400_BAD_REQUEST)

    serializer = StudyMaterialSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    material = serializer.save(uploaded_by=emp, is_library=True, batch=None)
    return Response(StudyMaterialSerializer(material, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def material_library_assign(request):
    emp = _get_employee_for_request(request)
    if not emp:
        return Response({'error': 'Only employees can assign library materials.'}, status=status.HTTP_403_FORBIDDEN)

    material_id = request.data.get('material') or request.data.get('material_id')
    batch_id = request.data.get('batch') or request.data.get('batch_id')

    if not material_id:
        return Response({'material': ['Library material is required.']}, status=status.HTTP_400_BAD_REQUEST)
    if not batch_id:
        return Response({'batch': ['Target batch is required.']}, status=status.HTTP_400_BAD_REQUEST)

    try:
        material = StudyMaterial.objects.get(id=material_id, is_library=True, uploaded_by=emp)
    except StudyMaterial.DoesNotExist:
        return Response({'error': 'Library material not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not material.file:
        return Response({'error': 'Material file is missing.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        file_path = material.file.path
    except (NotImplementedError, ValueError):
        file_path = None

    if file_path and not os.path.exists(file_path):
        return Response({'error': 'Material file is missing on server.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        assignment, created = _assign_material_to_batch(material, batch_id, emp)
    except Batches.DoesNotExist:
        return Response({'error': 'Selected batch is invalid.'}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'message': 'Material assigned.' if created else 'Material was already assigned to this batch.',
        'created': created,
        'assignment_id': assignment.id,
        'material': StudyMaterialSerializer(material, context={'request': request}).data,
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def material_library_delete(request, pk):
    emp = _get_employee_for_request(request)
    if not emp:
        return Response({'error': 'Only employees can delete library materials.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        material = StudyMaterial.objects.get(id=pk, is_library=True, uploaded_by=emp)
    except StudyMaterial.DoesNotExist:
        return Response({'error': 'Library material not found.'}, status=status.HTTP_404_NOT_FOUND)

    if material.assignments.exists():
        return Response({'error': 'Cannot delete a library material that is assigned to batches.'}, status=status.HTTP_400_BAD_REQUEST)

    material.delete()
    return Response({'message': 'Deleted.'}, status=204)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_material(request, pk):
    try:
        material = StudyMaterial.objects.get(id=pk)
    except StudyMaterial.DoesNotExist:
        return Response({'error': 'Material not found.'}, status=404)

    # Use persistent storage if uploaded files must survive deploys, restarts,
    # or rebuilds.
    if not material.file:
        return Response(
            {'error': 'File missing on server. Re-upload required or persistent storage required.'},
            status=404,
        )

    try:
        file_path = material.file.path
    except (NotImplementedError, ValueError):
        return Response(
            {'error': 'File missing on server. Re-upload required or persistent storage required.'},
            status=404,
        )

    if not os.path.exists(file_path):
        return Response(
            {'error': 'File missing on server. Re-upload required or persistent storage required.'},
            status=404,
        )

    filename = os.path.basename(material.file.name)
    content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
    file_handle = open(file_path, 'rb')
    response = FileResponse(
        file_handle,
        as_attachment=True,
        filename=filename,
        content_type=content_type,
    )
    response['Content-Length'] = str(os.path.getsize(file_path))
    return response


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_material(request, pk):
    try:
        StudyMaterial.objects.get(id=pk).delete()
        return Response({'message': 'Deleted.'}, status=204)
    except StudyMaterial.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ── TESTS ─────────────────────────────────────────────────────────────────────

class TestListCreateView(generics.ListCreateAPIView):
    serializer_class = TestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Superuser/Admin can see all tests
        if user.is_superuser or user.is_staff:
            return QuizTest.objects.all().order_by('-created_at')
        
        # Staff/Trainer/Mentor - Only see tests they created
        try:
            emp = Employee.objects.get(user=user)
            # Filter tests where created_by is the logged-in employee
            return QuizTest.objects.filter(created_by=emp).order_by('-created_at')
        except Employee.DoesNotExist:
            return QuizTest.objects.none()
    
    def perform_create(self, serializer):
        # When creating a test, automatically set created_by to the logged-in employee
        emp = Employee.objects.get(user=self.request.user)
        serializer.save(created_by=emp)

class TestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = QuizTest.objects.all()
    serializer_class = TestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        if user.is_superuser or user.is_staff:
            return QuizTest.objects.all()
        
        try:
            emp = Employee.objects.get(user=user)
            # Only allow access to tests created by this employee
            return QuizTest.objects.filter(created_by=emp)
        except Employee.DoesNotExist:
            return QuizTest.objects.none()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_question(request, test_id):
    try:
        test = QuizTest.objects.get(id=test_id)
    except QuizTest.DoesNotExist:
        return Response({'error': 'Test not found'}, status=404)

    data = request.data.copy()
    data['test'] = test.id

    required_fields = ['question_text', 'option1', 'option2', 'correct_answer']
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return Response(
            {'error': 'Missing required fields', 'missing_fields': missing_fields},
            status=400
        )

    serializer = QuestionSerializer(data=data)
    if serializer.is_valid():
        serializer.save(test=test)
        return Response(serializer.data, status=201)
    return Response({'error': 'Validation failed', 'details': serializer.errors}, status=400)


class AssignedTestListView(generics.ListCreateAPIView):
    queryset = AssignedTest.objects.all()
    serializer_class = AssignedTestSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_tests(request):
    try:
        student = Students.objects.get(user=request.user)
        if student.assigned_batch:
            assigned = AssignedTest.objects.filter(batch=student.assigned_batch)
            return Response(AssignedTestSerializer(assigned, many=True).data)
    except Students.DoesNotExist:
        pass
    return Response([])


# ── LEAVE ─────────────────────────────────────────────────────────────────────

class StaffLeaveListView(generics.ListCreateAPIView):
    queryset = StaffLeaveRequest.objects.all().order_by('-applied_at')
    serializer_class = StaffLeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not (user.is_superuser or user.is_staff):
            try:
                emp = Employee.objects.get(user=user)
                return qs.filter(staff=emp)
            except Employee.DoesNotExist:
                return qs.none()
        return qs

    def perform_create(self, serializer):
        emp = Employee.objects.get(user=self.request.user)
        serializer.save(staff=emp)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def process_staff_leave(request, pk):
    try:
        leave = StaffLeaveRequest.objects.get(id=pk)
        leave.status = request.data.get('status', leave.status)
        leave.save()
        return Response(StaffLeaveRequestSerializer(leave).data)
    except StaffLeaveRequest.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)



from datetime import datetime
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import StudentLeaveApplication, Students
from .serializers import StudentLeaveApplicationSerializer

class StudentLeaveListView(generics.ListCreateAPIView):
    serializer_class = StudentLeaveApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            student = Students.objects.get(user=user)
            return StudentLeaveApplication.objects.filter(student=student).order_by('-applied_at')
        except Students.DoesNotExist:
            return StudentLeaveApplication.objects.none()

    def get(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response({'results': serializer.data})
        except Exception as e:
            print(f"Error in get leaves: {e}")
            return Response({'results': []})

    def post(self, request, *args, **kwargs):
        try:
            print("=" * 50)
            print("POST request received to /student-leave/")
            print("Request data:", request.data)
            
            # Get student
            student = Students.objects.get(user=request.user)
            print(f"Student found: {student.first_name}")
            
            # Check assigned staff
            if not student.assigned_staff:
                print("No assigned staff found!")
                return Response({
                    'error': 'No staff assigned to you. Please contact administration.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"Assigned staff: {student.assigned_staff.first_name}")
            
            # Get form data
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            leave_type = request.data.get('leave_type')
            reason = request.data.get('reason')
            contact_info = request.data.get('contact_info', '')
            
            # Validate
            if not start_date:
                return Response({'error': 'Start date is required'}, status=status.HTTP_400_BAD_REQUEST)
            if not end_date:
                return Response({'error': 'End date is required'}, status=status.HTTP_400_BAD_REQUEST)
            if not reason:
                return Response({'error': 'Reason is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate days
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            number_of_days = (end - start).days + 1
            
            print(f"Leave dates: {start_date} to {end_date} = {number_of_days} days")
            
            # Create leave application
            leave = StudentLeaveApplication.objects.create(
                student=student,
                assigned_staff=student.assigned_staff,
                start_date=start_date,
                end_date=end_date,
                number_of_days=number_of_days,
                leave_type=leave_type,
                reason=reason,
                contact_info=contact_info,
                status='pending'
            )
            
            print(f"Leave application created successfully! ID: {leave.id}")
            
            # Return response
            serializer = self.get_serializer(leave)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Students.DoesNotExist:
            print("Student not found for this user")
            return Response({
                'error': 'Student profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def process_student_leave(request, pk):
    try:
        leave = StudentLeaveApplication.objects.get(id=pk)
        leave.status = request.data.get('status', leave.status)
        leave.save()
        return Response(StudentLeaveApplicationSerializer(leave).data)
    except StudentLeaveApplication.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ── SUPPORT ───────────────────────────────────────────────────────────────────

class StaffSupportListView(generics.ListCreateAPIView):
    queryset = SupportRequest.objects.all().order_by('-created_at')
    serializer_class = SupportRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not (user.is_superuser or user.is_staff):
            return qs.filter(staff=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(staff=self.request.user)


class StudentSupportListView(generics.ListCreateAPIView):
    queryset = StudentSupportRequest.objects.all().order_by('-created_at')
    serializer_class = StudentSupportRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not (user.is_superuser or user.is_staff):
            return qs.filter(student=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class CounselorSupportListView(generics.ListCreateAPIView):
    queryset = CounselorSupportRequest.objects.all().order_by('-created_at')
    serializer_class = CounselorSupportRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if not (self.request.user.is_superuser or self.request.user.is_staff):
            return qs.filter(counselor=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(counselor=self.request.user)


# ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────


class AnnouncementListView(generics.ListAPIView):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return Announcement.objects.all().order_by('-created_at')
        try:
            emp = Employee.objects.get(user=user)
            if emp.designation == 'counselor':
                return Announcement.objects.filter(
                    Q(recipient_type='all') | Q(recipient_type='staff') | Q(recipient_type='counselors'),
                    is_published=True,
                    created_by__is_staff=True,   # only admin-created
                ).order_by('-created_at')
            return Announcement.objects.filter(
                Q(recipient_type='all') | Q(recipient_type='staff') | Q(recipient_type='mentors'),
                is_published=True,
                created_by__is_staff=True,   # only admin-created
            ).order_by('-created_at')
        except Employee.DoesNotExist:
            return Announcement.objects.filter(
                Q(recipient_type='all') | Q(recipient_type='students'),
                is_published=True,
                created_by__is_staff=True,   # only admin-created
            ).order_by('-created_at')


class AnnouncementCreateView(generics.CreateAPIView):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_announcement(request, pk):
    try:
        ann = Announcement.objects.get(id=pk)
        ann.is_published = not ann.is_published
        ann.save()
        return Response({'is_published': ann.is_published})
    except Announcement.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_announcement(request, pk):
    try:
        Announcement.objects.get(id=pk).delete()
        return Response(status=204)
    except Announcement.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ── COUNSELOR LEAVE ───────────────────────────────────────────────────────────

class CounselorLeaveListView(generics.ListCreateAPIView):
    queryset = CounselorLeaveRequest.objects.all().order_by('-applied_at')
    serializer_class = CounselorLeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not (user.is_superuser or user.is_staff):
            try:
                emp = Employee.objects.get(user=user)
                return qs.filter(counselor=emp)
            except Employee.DoesNotExist:
                return qs.none()
        return qs

    def perform_create(self, serializer):
        emp = Employee.objects.get(user=self.request.user)
        serializer.save(counselor=emp)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def process_counselor_leave(request, pk):
    try:
        leave = CounselorLeaveRequest.objects.get(id=pk)
        leave.status = request.data.get('status', leave.status)
        leave.save()
        return Response(CounselorLeaveRequestSerializer(leave).data)
    except CounselorLeaveRequest.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ── QUIZ ──────────────────────────────────────────────────────────────────────

class QuizListView(generics.ListAPIView):
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Admin can see all quizzes
        if user.is_superuser or user.is_staff:
            return Quiz.objects.all().order_by('-created_at')
        
        try:
            emp = Employee.objects.get(user=user)
            # Staff/Trainer/Mentor - Only see quizzes they uploaded
            return Quiz.objects.filter(created_by=emp).order_by('-created_at')
            
        except Employee.DoesNotExist:
            try:
                student = Students.objects.get(user=user)
                if student.assigned_batch:
                    # Students see published quizzes from their batch
                    return Quiz.objects.filter(
                        batch=student.assigned_batch, 
                        is_published=True
                    ).order_by('-created_at')
                return Quiz.objects.none()
            except Students.DoesNotExist:
                return Quiz.objects.none()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def upload_quiz(request):
    try:
        emp = Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=404)
    
    batch_id = request.data.get('batch')
    try:
        batch = Batches.objects.get(id=batch_id)
    except Batches.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=404)
    
    quiz = Quiz.objects.create(
        title=request.data.get('title', 'Quiz'),
        description=request.data.get('description', ''),
        batch=batch, 
        created_by=emp,
        duration_minutes=int(request.data.get('duration_minutes', 30)),
        passing_marks=int(request.data.get('passing_marks', 35)),
        source_file=request.FILES.get('source_file'),
    )
    
    questions_created = 0
    file = request.FILES.get('source_file')
    if file:
        try:
            file.seek(0)
            content = file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(content))
            
            for i, row in enumerate(reader, 1):
                question_text = row.get('Question') or row.get('question') or ''
                option_a = row.get('Option_1') or row.get('option_a') or ''
                option_b = row.get('Option_2') or row.get('option_b') or ''
                option_c = row.get('Option_3') or row.get('option_c') or ''
                option_d = row.get('Option_4') or row.get('option_d') or ''
                correct_answer_text = (row.get('Correct Answer') or row.get('correct_answer') or '').strip()
                
                # Function to find which option matches the correct answer text
                def find_correct_option(correct_text, opt_a, opt_b, opt_c, opt_d):
                    correct_text_lower = correct_text.lower().strip()
                    
                    # Check each option
                    if opt_a and opt_a.lower().strip() == correct_text_lower:
                        return 'A'
                    if opt_b and opt_b.lower().strip() == correct_text_lower:
                        return 'B'
                    if opt_c and opt_c.lower().strip() == correct_text_lower:
                        return 'C'
                    if opt_d and opt_d.lower().strip() == correct_text_lower:
                        return 'D'
                    
                    # If no match found, default to A
                    print(f"Warning: Could not match '{correct_text}' with any option")
                    return 'A'
                
                correct_answer = find_correct_option(correct_answer_text, option_a, option_b, option_c, option_d)
                
                print(f"Row {i}:")
                print(f"  Question: {question_text[:50]}")
                print(f"  Option A: {option_a}")
                print(f"  Option B: {option_b}")
                print(f"  Option C: {option_c}")
                print(f"  Option D: {option_d}")
                print(f"  Correct Answer Text: '{correct_answer_text}'")
                print(f"  Mapped to Option: {correct_answer}")
                print("-" * 40)
                
                QuizQuestion.objects.create(
                    quiz=quiz, 
                    question_number=i,
                    question_text=question_text,
                    option_a=option_a,
                    option_b=option_b,
                    option_c=option_c,
                    option_d=option_d,
                    correct_answer=correct_answer,
                    marks=int(row.get('marks', 1) or 1),
                )
                questions_created += 1
                
            quiz.total_questions = questions_created
            quiz.total_marks = questions_created
            quiz.save()
            
        except Exception as e:
            print(f"Error parsing CSV: {e}")
            import traceback
            traceback.print_exc()
            
    return Response({'message': 'Quiz created', 'quiz_id': quiz.id, 'questions': questions_created}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def take_quiz(request, quiz_id):
    try:
        student = Students.objects.get(user=request.user)
        quiz = Quiz.objects.get(id=quiz_id)
    except (Students.DoesNotExist, Quiz.DoesNotExist):
        return Response({'error': 'Not found'}, status=404)
    existing_count = QuizAttempt.objects.filter(student=student, quiz=quiz).count()
    if not quiz.allow_retake and existing_count >= quiz.max_attempts:
        return Response({'error': 'Max attempts reached'}, status=400)
    attempt = QuizAttempt.objects.create(
        quiz=quiz, student=student,
        attempt_number=existing_count + 1,
        submitted_at=timezone.now(), is_completed=True
    )
    answers = request.data.get('answers', {})
    score = 0
    for q in quiz.questions.all():
        selected = answers.get(str(q.id), '')
        is_correct = bool(selected) and selected.upper() == q.correct_answer.upper()
        marks = q.marks if is_correct else 0
        score += marks
        QuizAnswer.objects.create(attempt=attempt, question=q, selected_answer=selected, is_correct=is_correct, marks_obtained=marks)
    attempt.score = score
    attempt.percentage = round(score / max(quiz.total_marks, 1) * 100, 1)
    attempt.is_passed = score >= quiz.passing_marks
    attempt.save()
    return Response({'attempt_id': attempt.id, 'score': score, 'total': quiz.total_marks, 'percentage': attempt.percentage, 'is_passed': attempt.is_passed})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quiz_result(request, attempt_id):
    """Simple quiz result (for backward compatibility)"""
    try:
        attempt = QuizAttempt.objects.get(id=attempt_id)
        return Response(QuizAttemptSerializer(attempt).data)
    except QuizAttempt.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_quiz_publish(request, quiz_id):
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        quiz.is_published = not quiz.is_published
        if quiz.is_published:
            quiz.publish_date = timezone.now()
        quiz.save()
        return Response({'is_published': quiz.is_published})
    except Quiz.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)



@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_quiz(request, quiz_id):
    try:
        Quiz.objects.get(id=quiz_id).delete()
        return Response(status=204)
    except Quiz.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_quiz_results(request):
    try:
        emp = Employee.objects.get(user=request.user)
        batches = Batches.objects.filter(faculty=emp)
        attempts = QuizAttempt.objects.filter(
            quiz__batch__in=batches, 
            is_completed=True
        ).select_related('student', 'quiz').order_by('-submitted_at')
        
        data = []
        for attempt in attempts:
            data.append({
                'id': attempt.id,
                'student_name': f"{attempt.student.first_name} {attempt.student.last_name or ''}",
                'student_id': attempt.student.student_id,
                'quiz_title': attempt.quiz.title,
                'score': attempt.score,
                'total_marks': attempt.quiz.total_marks,
                'percentage': attempt.percentage,
                'passing_marks': attempt.quiz.passing_marks,
                'submitted_at': attempt.submitted_at,
                'batch_id': attempt.quiz.batch.id if attempt.quiz.batch else None,
                'batch_number': attempt.quiz.batch.batch_number if attempt.quiz.batch else None,
            })
        return Response({'results': data})
    except Employee.DoesNotExist:
        return Response({'results': []})
        
# ══════════════════════════════════════════════════════════════════════════════
# SESSIONS (UPDATED WORKING VERSION)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def batch_sessions(request, batch_id):
    sessions = CourseSession.objects.filter(batch__id=batch_id).order_by('session_number')
    return Response(CourseSessionSerializer(sessions, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_sessions(request):
    try:
        student = Students.objects.get(user=request.user)
        if not student.assigned_batch:
            return Response([])

        sessions = CourseSession.objects.filter(batch=student.assigned_batch).order_by('session_number')
        data = []

        for session in sessions:
            progress = Student_Session_Progress.objects.filter(student=student, session=session).first()
            status_obj = StudentSessionStatus.objects.filter(student=student, session=session).first()

            student_status = 'not_started'
            doubt_response = None
            has_response = False
            response_date = None

            # progress takes priority over status_obj
            if progress:
                student_status = progress.student_status
                latest_response = DoubtResponse.objects.filter(doubt=progress).order_by('-created_at').first()
                if latest_response:
                    has_response = True
                    doubt_response = latest_response.message
                    response_date = latest_response.created_at
            elif status_obj:
                student_status = status_obj.student_status

            # Use per-student progress flag, NOT global session.staff_completed
            student_progress_staff_done = progress.staff_completed if progress else False

            # If staff completed this for student but status not updated yet
            if student_progress_staff_done and student_status == 'not_started':
                student_status = 'pending'
                if progress:
                    progress.student_status = 'pending'
                    progress.save()

            data.append({
                'id': session.id,
                'session_number': session.session_number,
                'title': session.title,
                'topics': session.topics,
                'staff_completed': student_progress_staff_done,
                'student_status': student_status,
                'has_response': has_response,
                'doubt_response': doubt_response,
                'response_date': response_date,
                'student_confirmed_at': status_obj.student_confirmed_at if status_obj else None,
                'completed_date': session.completed_date,
            })

        return Response({'results': data})

    except Students.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)

        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_batch_sessions_with_logsheet(request, batch_id):
    try:
        batch = Batches.objects.get(id=batch_id)
        sessions = CourseSession.objects.filter(batch=batch).order_by('session_number')

        # Get active students in this batch
        active_students = Students.objects.filter(assigned_batch=batch)

        sessions_data = []
        for session in sessions:
            session_dict = CourseSessionSerializer(session).data

            if active_students.exists():
                # staff_completed = True only if ALL active students
                # have a progress record with staff_completed=True
                staff_done_count = Student_Session_Progress.objects.filter(
                    session=session,
                    student__in=active_students,
                    staff_completed=True
                ).count()
                session_dict['staff_completed'] = (staff_done_count == active_students.count() and active_students.count() > 0)
            else:
                # No active students — reset to False so staff sees fresh
                session_dict['staff_completed'] = False
                if session.staff_completed:
                    session.staff_completed = False
                    session.completed_date = None
                    session.save()

            sessions_data.append(session_dict)

        return Response({
            'batch': BatchSerializer(batch).data,
            'logsheet_url': (
    batch.course_logsheet.url
    if batch.course_logsheet
    else batch.course_name.course_logsheet.url
    if batch.course_name and batch.course_name.course_logsheet
    else None
),
            'sessions': sessions_data,
        })
    except Batches.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def staff_mark_session_complete(request, session_id):
    """Staff marks a session as completed - creates pending status for students"""
    try:
        emp = Employee.objects.get(user=request.user)
        session = CourseSession.objects.get(id=session_id)

        session.staff_completed = True
        session.completed_date = timezone.now()
        session.save()

        students = Students.objects.filter(assigned_batch=session.batch)

        for student in students:
            status_obj, created = StudentSessionStatus.objects.get_or_create(
                student=student, 
                session=session
            )
            status_obj.staff_completed = True
            status_obj.staff_completed_at = timezone.now()
            status_obj.status = 'pending'
            status_obj.save()
            
            progress, _ = Student_Session_Progress.objects.get_or_create(
                student=student, session=session
            )
            progress.staff_completed = True
            progress.staff_completed_at = timezone.now()
            progress.student_status = 'pending'
            progress.save()

            if student.user:
                SessionNotification.objects.create(
                    session=session,
                    from_user=request.user,
                    to_user=student.user,
                    notification_type='session_completed',
                    message=f"Session {session.session_number}: '{session.title}' has been completed by your trainer. Please confirm or raise a doubt.",
                    title=f"Session {session.session_number} Completed",
                    requires_action=True
                )

        return Response({
            'success': True,
            'message': f'Session {session.session_number} marked complete. {students.count()} students notified.'
        })
    except (Employee.DoesNotExist, CourseSession.DoesNotExist):
        return Response({'error': 'Not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def staff_unmark_session(request, session_id):
    try:
        session = CourseSession.objects.get(id=session_id)
        session.staff_completed = False
        session.completed_date = None
        session.save()
        StudentSessionStatus.objects.filter(session=session).update(
            staff_completed=False, status='pending'
        )
        return Response({'success': True, 'message': 'Session unmarked.'})
    except CourseSession.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_mark_completed(request):
    try:
        student = Students.objects.get(user=request.user)
        session = CourseSession.objects.get(id=request.data.get('session_id'))

        # Update StudentSessionStatus
        status_obj, _ = StudentSessionStatus.objects.get_or_create(
            student=student, session=session
        )
        
        if not status_obj.staff_completed and not session.staff_completed:
            return Response({'error': 'Trainer has not completed this session yet.'}, status=400)

        # Mark as completed by student
        status_obj.student_status = 'completed'
        status_obj.student_confirmed_at = timezone.now()
        status_obj.save()

        # Update Student_Session_Progress
        progress, _ = Student_Session_Progress.objects.get_or_create(
            student=student, session=session
        )
        progress.completed = True
        progress.completed_date = timezone.now()
        progress.student_status = 'completed'
        progress.student_confirmed_at = timezone.now()
        progress.save()

        # ========== CHECK IF ALL SESSIONS ARE COMPLETED ==========
        total_sessions = CourseSession.objects.filter(batch=student.assigned_batch).count()
        completed_sessions = Student_Session_Progress.objects.filter(
            student=student,
            session__batch=student.assigned_batch,  # ← only current batch
            completed=True
        ).count()

        is_course_completed = (total_sessions > 0 and completed_sessions == total_sessions)

        if is_course_completed:
            print(f"🎉 Student {student.first_name} has completed all {total_sessions} sessions!")
            
            current_trainer = student.assigned_staff

            # ── Calculate actual attendance percentage ────────────────────
            att_total = StudentAttendance.objects.filter(student=student).count()
            att_present = StudentAttendance.objects.filter(student=student, status='Present').count()
            att_pct = round((att_present / att_total * 100) if att_total > 0 else 0, 1)

            # ── Calculate actual average test score ───────────────────────
            test_results_qs = TestResult.objects.filter(student=student)
            avg_score = round(
                sum(t.percentage for t in test_results_qs) / test_results_qs.count(), 1
            ) if test_results_qs.count() > 0 else 0
            # ─────────────────────────────────────────────────────────────

            defaults = {
                'student_id': student.student_id,
                'email': student.email,
                'first_name': student.first_name,
                'last_name': student.last_name or '',
                'mobile_no': student.mobile_no,
                'date_of_birth': student.date_of_birth,
                'city': student.city,
                'state': student.state,
                'qualification': student.qualification,
                'course': student.course,
                'gender': student.gender,
                'branch': student.branch,
                'batch_number': student.assigned_batch.batch_number if student.assigned_batch else 'N/A',
                'batch_id': str(student.assigned_batch.id) if student.assigned_batch else 'N/A',
                'batch_start_date': student.assigned_batch.start_date if student.assigned_batch else timezone.now().date(),
                'batch_end_date': student.assigned_batch.end_date if student.assigned_batch else timezone.now().date(),
                'faculty_name': f"{current_trainer.first_name} {current_trainer.last_name or ''}" if current_trainer else 'N/A',
                'course_name': student.course,
                'completed_sessions_count': completed_sessions,
                'total_sessions_count': total_sessions,
                'attendance_percentage': att_pct,
                'average_test_score': avg_score,
                'completion_type': 'full',  # default for new records
                'completion_percentage': 100,
            }

            try:
                completed_student, created = CompletedStudent.objects.get_or_create(
                    original_student_id=str(student.id),
                    graduated_from_trainer=current_trainer,
                    defaults=defaults
                )
            except DatabaseError:
                # Likely the completion_type column is missing in production DB.
                logger.exception("Database error creating CompletedStudent with completion fields; retrying without completion fields")
                # Remove completion-specific fields and retry
                defaults.pop('completion_type', None)
                defaults.pop('completion_percentage', None)
                completed_student, created = CompletedStudent.objects.get_or_create(
                    original_student_id=str(student.id),
                    graduated_from_trainer=current_trainer,
                    defaults=defaults
                )
            student.is_fully_completed = True
            student.fully_completed_at = timezone.now()
            student.save()


            if created:
                print(f"✅ Created CompletedStudent record for trainer: {current_trainer.first_name if current_trainer else 'Unknown'}")
            else:
                # Update existing record to full completion
                try:
                    completed_student.completion_type = 'full'
                    completed_student.completion_percentage = 100
                    completed_student.save()
                    print(f"✅ Updated CompletedStudent record to full completion")
                except DatabaseError:
                    logger.exception("Database error updating CompletedStudent completion_type/completion_percentage")


            # ========== DELETE ALL PROGRESS RECORDS FOR THIS STUDENT ==========
            Student_Session_Progress.objects.filter(student=student).delete()
            StudentSessionStatus.objects.filter(student=student).delete()
            DoubtResponse.objects.filter(doubt__student=student).delete()
            
            # ========== Remove student from current batch and staff ==========
            old_batch = student.assigned_batch
            old_staff = student.assigned_staff
            
            student.assigned_batch = None
            student.assigned_staff = None
            student.save()
            print(f"✅ Removed student from batch '{old_batch.batch_number if old_batch else 'None'}' and staff")
            
            # ========== Send email notification to student (async) ==========
            if student.email:
                try:
                    send_email_async(
                        subject="🎉 Course Completed! Congratulations!",
                        message=f"""Dear {student.first_name},

CONGRATULATIONS! 🎉

You have successfully completed all {total_sessions} sessions of your course.

Course: {student.course}
Completed with Trainer: {current_trainer.first_name} {current_trainer.last_name or ''}
Completion Date: {timezone.now().strftime('%Y-%m-%d')}
Attendance: {att_pct}%
Average Test Score: {avg_score}%

You have been moved to the completed students list.
Your completion certificate will be available shortly.

Best regards,
IIE Connect Team
""",
                        recipient_list=[student.email],
                    )
                    print(f"✅ Completion email queued for student {student.email}")
                except Exception as e:
                    print(f"❌ Failed to queue email to student: {e}")
            
            return Response({
                'success': True, 
                'message': f'Congratulations! You have completed all {total_sessions} sessions!',
                'course_completed': True
            })
        
        # Notify trainer for individual session completion
        emp = session.batch.faculty
        if emp and emp.user:
            SessionNotification.objects.create(
                session=session,
                from_user=request.user,
                to_user=emp.user,
                notification_type='session_completed',
                message=f"{student.first_name} {student.last_name or ''} has confirmed completion of Session {session.session_number}: '{session.title}'.",
                title=f"Session {session.session_number} Confirmed by Student"
            )

        return Response({
            'success': True, 
            'message': 'Session marked as completed!',
            'course_completed': False
        })
    
    except (Students.DoesNotExist, CourseSession.DoesNotExist):
        return Response({'error': 'Not found'}, status=404)
    except Exception as e:
        print(f"Error in student_mark_completed: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=400)
    
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_raise_doubt(request):
    try:
        student = Students.objects.get(user=request.user)
        session = CourseSession.objects.get(id=request.data.get('session_id'))
        doubt_text = request.data.get('doubt_text', '').strip()

        if not doubt_text:
            return Response({'error': 'Please describe your doubt.'}, status=400)

        status_obj, _ = StudentSessionStatus.objects.get_or_create(
            student=student, session=session
        )
        status_obj.status = 'doubt'
        status_obj.save()

        progress, _ = Student_Session_Progress.objects.get_or_create(
            student=student, session=session
        )
        progress.has_doubt = True
        progress.doubt_description = doubt_text
        progress.doubt_raised_at = timezone.now()
        progress.doubt_resolved = False
        progress.student_status = 'doubt'
        progress.save()

        emp = session.batch.faculty
        if emp and emp.user:
            SessionNotification.objects.create(
                session=session,
                from_user=request.user,
                to_user=emp.user,
                notification_type='doubt_raised',
                message=f"{student.first_name} {student.last_name or ''} raised a doubt on Session {session.session_number}: '{session.title}'. Doubt: {doubt_text}",
                title=f"Doubt Raised — Session {session.session_number}",
                requires_action=True
            )

        return Response({'success': True, 'message': 'Doubt raised. Your trainer has been notified.'})
    
    except (Students.DoesNotExist, CourseSession.DoesNotExist):
        return Response({'error': 'Not found'}, status=404)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def staff_reply_doubt(request, progress_id):
    try:
        emp = Employee.objects.get(user=request.user)
        progress = Student_Session_Progress.objects.get(id=progress_id)
        reply_text = request.data.get('reply', '').strip()

        if not reply_text:
            return Response({'error': 'Reply cannot be empty.'}, status=400)

        # Create doubt response
        doubt_response = DoubtResponse.objects.create(
            doubt=progress,
            staff=emp,
            message=reply_text
        )
        
        print(f"✅ Doubt response saved with ID: {doubt_response.id}")

        # CRITICAL: Update progress - mark doubt as resolved
        progress.doubt_resolved = True
        progress.doubt_resolved_at = timezone.now()
        # IMPORTANT: Change status to 'pending' so student sees the response
        # DO NOT set completed = True
        # DO NOT set student_status = 'completed'
        progress.student_status = 'pending'  # ← This should be 'pending', NOT 'completed'
        progress.save()

        # Update StudentSessionStatus
        status_obj, _ = StudentSessionStatus.objects.get_or_create(
            student=progress.student, 
            session=progress.session
        )
        status_obj.student_status = 'pending'  # ← This should be 'pending'
        status_obj.save()

        # Send notification to student
        if progress.student.user:
            notification = SessionNotification.objects.create(
                session=progress.session,
                from_user=request.user,
                to_user=progress.student.user,
                notification_type='doubt_resolved',
                title=f"Doubt Resolved - Session {progress.session.session_number}",
                message=f"Your doubt has been answered: {reply_text}\n\nPlease review and click 'Mark as Completed'.",
                requires_action=True,
                is_read=False
            )
            print(f"✅ Notification sent to student: {notification.id}")

        return Response({
            'success': True, 
            'message': 'Reply sent. Student must manually click Mark as Completed.'
        })
        
    except Employee.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=404)
    except Student_Session_Progress.DoesNotExist:
        return Response({'error': 'Doubt not found'}, status=404)
    except Exception as e:
        print(f"Error in staff_reply_doubt: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_staff_doubts_detail(request):
    try:
        emp = Employee.objects.get(user=request.user)
        my_batches = Batches.objects.filter(faculty=emp)
        doubts = Student_Session_Progress.objects.filter(
            session__batch__in=my_batches,
            has_doubt=True
        ).select_related('student', 'session').order_by('-doubt_raised_at')

        data = []
        for d in doubts:
            replies = DoubtResponse.objects.filter(doubt=d).values('message', 'created_at', 'staff__first_name')
            data.append({
                'id': d.id,
                'student_name': f"{d.student.first_name} {d.student.last_name or ''}",
                'student_id': d.student.student_id,
                'session_number': d.session.session_number,
                'session_title': d.session.title,
                'doubt_text': d.doubt_description,
                'raised_at': d.doubt_raised_at.strftime('%d %b %Y, %H:%M') if d.doubt_raised_at else '',
                'is_resolved': d.doubt_resolved,
                'replies': list(replies),
            })
        return Response(data)
    except Employee.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_notifications(request):
    try:
        notifs = SessionNotification.objects.filter(
            to_user=request.user
        ).order_by('-created_at')[:50]
        data = [{
            'id': n.id,
            'type': n.notification_type,
            'title': n.title or '',
            'message': n.message,
            'is_read': n.is_read,
            'requires_action': n.requires_action,
            'created_at': n.created_at.strftime('%d %b %Y, %H:%M'),
            'session_id': n.session.id if n.session else None,
        } for n in notifs]
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notif_id):
    try:
        notif = SessionNotification.objects.get(id=notif_id, to_user=request.user)
        notif.is_read = True
        notif.save()
        return Response({'success': True})
    except SessionNotification.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ── COMPLETED STUDENTS ────────────────────────────────────────────────────────

class CompletedStudentListView(generics.ListAPIView):
    queryset = CompletedStudent.objects.all().order_by('-completion_date')
    serializer_class = CompletedStudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.is_superuser or user.is_staff:
            return qs

        branch_param = self.request.query_params.get('branch', '').strip()
        if branch_param:
            qs = qs.filter(branch__iexact=branch_param)

        emp = Employee.objects.filter(user=user).first()
        if emp and emp.designation.lower() == 'counselor':
            if emp.branch:
                return qs.filter(branch__iexact=emp.branch)
            return qs.none()

        student = Students.objects.filter(user=user).first()
        if student:
            return qs.filter(original_student_id=student.student_id)

        return qs.none()

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.exception("Unhandled exception in CompletedStudentListView.list")
            return Response({
                'error': 'Completed students retrieval failed',
                'details': str(e),
                'view': 'CompletedStudentListView.list'
            }, status=500)


# ── COMPLETION REQUESTS ───────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_completion(request, student_id):
    try:
        emp = Employee.objects.get(user=request.user)
        student = Students.objects.get(id=student_id)
        counselor = Employee.objects.get(id=request.data.get('counselor_id'))
        req = SessionCompletionRequest.objects.create(
            student=student, batch=student.assigned_batch,
            trainer=emp, counselor=counselor,
            topics_covered=request.data.get('topics_covered', ''),
            sessions_completed=request.data.get('sessions_completed', 0),
            total_sessions=request.data.get('total_sessions', 0),
            message=request.data.get('message', ''),
        )
        return Response({'message': 'Request submitted.', 'id': req.id}, status=201)
    except (Employee.DoesNotExist, Students.DoesNotExist):
        return Response({'error': 'Not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def counselor_pending_requests(request):
    try:
        counselor = Employee.objects.get(user=request.user)
        reqs = SessionCompletionRequest.objects.filter(
            counselor=counselor, 
            status='pending'
        ).select_related('student', 'batch', 'batch__course_name', 'trainer')
        
        data = []
        for req in reqs:
            # If batch is None, try to get from student's assigned_batch
            batch = req.batch
            if not batch and req.student.assigned_batch:
                batch = req.student.assigned_batch
                # Also check if that batch has a course_name
                if batch and not hasattr(batch, 'course_name_obj'):
                    batch.course_name_obj = batch.course_name
            
            data.append({
                'id': req.id,
                'student_name': f"{req.student.first_name} {req.student.last_name or ''}".strip(),
                'student_id': req.student.student_id,
                'trainer_name': f"{req.trainer.first_name} {req.trainer.last_name or ''}".strip(),
                # Get batch info with fallbacks:
                'batch_number': batch.batch_number if batch else req.student.assigned_batch.batch_number if req.student.assigned_batch else 'N/A',
                'course_name': batch.course_name.course_name if batch and batch.course_name else req.student.course if req.student.course else 'N/A',
                'course_type': batch.course_type if batch else 'N/A',
                'batch_timing': batch.batch_timing if batch else 'N/A',
                'branch': batch.branch if batch else req.student.branch,
                'sessions_completed': req.sessions_completed,
                'total_sessions': req.total_sessions,
                'topics_covered': req.topics_covered,
                'message': req.message,
                'created_at': req.created_at,
                'status': req.status,
            })
        
        return Response(data)
        
    except Employee.DoesNotExist:
        return Response({'error': 'Counselor not found'}, status=404)


# In api_views.py
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def counselor_approved_requests(request):
    try:
        counselor = Employee.objects.get(user=request.user)
        # Get both approved and reassigned requests
        reqs = SessionCompletionRequest.objects.filter(
            counselor=counselor
        ).exclude(status='pending').order_by('-reviewed_at')
        
        data = []
        for req in reqs:
            # For reassigned requests, show the new trainer name
            trainer_name = ""
            if req.status == 'reassigned' and req.new_trainer:
                trainer_name = f"{req.new_trainer.first_name} {req.new_trainer.last_name or ''}".strip()
            else:
                trainer_name = f"{req.trainer.first_name} {req.trainer.last_name or ''}".strip()
            
            data.append({
                'id': req.id,
                'student_name': f"{req.student.first_name} {req.student.last_name or ''}".strip(),
                'trainer_name': trainer_name,
                'old_trainer_name': f"{req.trainer.first_name} {req.trainer.last_name or ''}".strip() if req.status == 'reassigned' else None,
                'sessions_completed': req.sessions_completed,
                'total_sessions': req.total_sessions,
                'topics_covered': req.topics_covered,
                'message': req.message,
                'status': req.status,
                'counselor_notes': req.counselor_notes,
                'created_at': req.created_at,
                'reviewed_at': req.reviewed_at,
                'reassigned_at': req.reassigned_at if hasattr(req, 'reassigned_at') else None,
            })
        return Response(data)
    except Employee.DoesNotExist:
        return Response({'error': 'Counselor not found'}, status=404)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def process_completion_request(request, pk):
    try:
        req = SessionCompletionRequest.objects.get(id=pk)
        req.status = request.data.get('status', req.status)
        req.counselor_notes = request.data.get('notes', req.counselor_notes)
        req.reviewed_at = timezone.now()
        req.reviewed_by = request.user
        req.save()
        return Response(SessionCompletionRequestSerializer(req).data)
    except SessionCompletionRequest.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_batch_students(request, batch_id):
    students = Students.objects.filter(assigned_batch__id=batch_id)
    return Response(StudentSerializer(students, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_trainers(request):
    branch = request.query_params.get('branch')
    qs = Employee.objects.filter(designation__in=['trainer', 'mentor'])
    if branch:
        qs = qs.filter(branch=branch)
    return Response(EmployeeSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trainer_batches(request, trainer_id):
    batches = Batches.objects.filter(faculty__id=trainer_id)
    return Response(BatchSerializer(batches, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def counselor_student_details(request):
    try:
        counselor = Employee.objects.get(user=request.user)
        students = Students.objects.filter(branch=counselor.branch).select_related('assigned_batch', 'assigned_staff')
    except Employee.DoesNotExist:
        students = Students.objects.all().select_related('assigned_batch', 'assigned_staff')
    return Response(StudentSerializer(students, many=True).data)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def counselor_reassign_student(request, request_id):
    """Counselor reassigns a completion request/student to another counselor."""
    try:
        counselor = Employee.objects.get(user=request.user)
        completion_req = SessionCompletionRequest.objects.get(id=request_id, counselor=counselor)
        new_trainer_id = request.data.get('new_trainer_id')
        counselor_notes = request.data.get('notes', '')

        if not new_trainer_id:
            return Response({'error': 'Please select a counselor'}, status=400)

        try:
            # `new_trainer` stores the selected receiving counselor for this workflow.
            new_trainer = Employee.objects.get(id=new_trainer_id)
        except Employee.DoesNotExist:
            return Response({'error': 'Selected counselor not found'}, status=404)

        if (new_trainer.designation or '').lower() != 'counselor':
            return Response({'error': 'Selected employee must be a counselor'}, status=400)

        student = completion_req.student
        student_id_before = student.student_id

        print(
            "DEBUG counselor reassign current counselor: "
            f"id={counselor.id}, name={counselor.first_name} {counselor.last_name or ''}, "
            f"branch={counselor.branch}"
        )
        print(
            "DEBUG counselor reassign selected counselor: "
            f"id={new_trainer.id}, name={new_trainer.first_name} {new_trainer.last_name or ''}, "
            f"branch={new_trainer.branch}"
        )
        print(f"DEBUG counselor reassign student id before: {student_id_before}")

        with transaction.atomic():
            student.previous_trainer = completion_req.trainer
            student.previous_batch = completion_req.batch
            student.is_transferred = True
            student.branch = new_trainer.branch
            student.assigned_staff = None
            student.assigned_batch = None
            student.transfer_date = timezone.now()
            student.save()

            completion_req.counselor = new_trainer
            completion_req.new_trainer = new_trainer
            completion_req.counselor_notes = counselor_notes
            completion_req.reassigned_at = timezone.now()
            completion_req.save()

        student.refresh_from_db()
        print(f"DEBUG counselor reassign student id after: {student.student_id}")

        return Response({
            'success': True,
            'message': 'Student reassigned to counselor successfully',
            'details': {
                'student_name': f"{student.first_name} {student.last_name or ''}".strip(),
                'student_id': student.student_id,
                'receiving_counselor': f"{new_trainer.first_name} {new_trainer.last_name or ''}".strip(),
                'receiving_branch': new_trainer.branch,
            }
        })

    except SessionCompletionRequest.DoesNotExist:
        return Response({'error': 'Request not found'}, status=404)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=404)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quiz_staff_results_view(request):
    try:
        emp = Employee.objects.get(user=request.user)
        batches = Batches.objects.filter(faculty=emp)
        attempts = QuizAttempt.objects.filter(quiz__batch__in=batches, is_completed=True).order_by('-submitted_at')
        return Response(QuizAttemptSerializer(attempts, many=True).data)
    except Employee.DoesNotExist:
        return Response([])


# ── ADMIN: BRANCH-WISE ATTENDANCE OVERVIEW ────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_employee_monitoring(request):
    if not is_admin_user(request.user):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    params = request.query_params
    qs = UserActivity.objects.filter(user_type='employee').select_related('user', 'employee')
    qs = apply_activity_date_filters(qs, params)

    branch = params.get('branch')
    designation = params.get('designation')
    search = params.get('search')

    if branch:
        qs = qs.filter(employee__branch=branch)
    if designation:
        qs = qs.filter(employee__designation=designation)
    if search:
        qs = qs.filter(
            Q(employee__first_name__icontains=search) |
            Q(employee__last_name__icontains=search) |
            Q(employee__email__icontains=search) |
            Q(employee__staff_id__icontains=search) |
            Q(user__username__icontains=search)
        )

    records = [format_employee_activity(activity) for activity in qs.order_by('-login_time')]
    return Response({
        'results': records,
        'filters': {
            'branches': list(Employee.objects.exclude(branch__isnull=True).exclude(branch='').values_list('branch', flat=True).distinct().order_by('branch')),
            'designations': list(Employee.objects.exclude(designation__isnull=True).exclude(designation='').values_list('designation', flat=True).distinct().order_by('designation')),
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_student_monitoring(request):
    if not is_admin_user(request.user):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    params = request.query_params
    qs = UserActivity.objects.filter(user_type='student').select_related('user', 'student', 'student__assigned_staff')
    qs = apply_activity_date_filters(qs, params)

    branch = params.get('branch')
    staff = params.get('staff')
    search = params.get('search')

    if branch:
        qs = qs.filter(student__branch=branch)
    if staff and str(staff).isdigit():
        qs = qs.filter(student__assigned_staff_id=staff)
    if search:
        qs = qs.filter(
            Q(student__first_name__icontains=search) |
            Q(student__last_name__icontains=search) |
            Q(student__email__icontains=search) |
            Q(student__student_id__icontains=search) |
            Q(user__username__icontains=search)
        )

    staff_members = Employee.objects.order_by('first_name', 'last_name')
    records = [format_student_activity(activity) for activity in qs.order_by('-login_time')]
    return Response({
        'results': records,
        'filters': {
            'branches': list(Students.objects.exclude(branch__isnull=True).exclude(branch='').values_list('branch', flat=True).distinct().order_by('branch')),
            'staff': [
                {
                    'id': staff_member.id,
                    'name': f"{staff_member.first_name} {staff_member.last_name or ''}".strip(),
                    'branch': staff_member.branch,
                    'designation': staff_member.designation,
                }
                for staff_member in staff_members
            ],
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_branch_attendance(request):
    from django.db.models import Q, Avg
    branch = request.query_params.get('branch')
    staff_id = request.query_params.get('staff_id')

    branches = list(Employee.objects.values_list('branch', flat=True).distinct().order_by('branch'))
    branch_stats = {}
    for b in branches:
        branch_stats[b] = {
            'staff_count': Employee.objects.filter(branch=b).count(),
            'staff_with_batches': Employee.objects.filter(branch=b, batches__isnull=False).distinct().count(),
        }

    if not branch and not staff_id:
        total_staff = Employee.objects.count()
        staff_with_batches = Employee.objects.filter(batches__isnull=False).distinct().count()
        return Response({
            'view_mode': 'branches',
            'branches': branches,
            'branch_stats': branch_stats,
            'total_staff': total_staff,
            'staff_with_batches': staff_with_batches,
            'total_branches': len(branches),
            'total_students': Students.objects.count(),
            'total_batches': Batches.objects.count(),
            'total_attendance': StudentAttendance.objects.count(),
        })

    if branch and not staff_id:
        staff_list = Employee.objects.filter(branch=branch).order_by('first_name')
        attendance_data = []
        for staff in staff_list:
            batches = Batches.objects.filter(faculty=staff)
            if batches.exists():
                batch_data = []
                for batch in batches:
                    recent = list(StudentAttendance.objects.filter(batch=batch).select_related('student').order_by('-date')[:10])
                    batch_data.append({'batch': BatchSerializer(batch).data, 'attendance_count': len(recent)})
                attendance_data.append({
                    'staff': EmployeeSerializer(staff).data,
                    'batches': batch_data,
                    'batch_count': batches.count(),
                    'attendance_count': StudentAttendance.objects.filter(staff=staff).count(),
                })
        return Response({
            'view_mode': 'branch_staff',
            'branches': branches,
            'branch_stats': branch_stats,
            'branch_name': branch,
            'attendance_data': attendance_data,
            'staff_in_branch': staff_list.count(),
            'staff_with_batches': len(attendance_data),
        })

    if staff_id:
        try:
            staff = Employee.objects.get(id=staff_id)
            batches = Batches.objects.filter(faculty=staff)
            students = Students.objects.filter(
                Q(assigned_staff=staff) | Q(assigned_batch__faculty=staff)
            ).distinct()

            student_details = []
            for student in students:
                # ── Attendance ────────────────────────────────────────────
                att_qs = list(StudentAttendance.objects.filter(student=student).select_related('batch', 'staff').order_by('-date')[:50])
                total_att = len(att_qs)
                present_att = len([a for a in att_qs if a.status == 'Present'])
                att_pct = round((present_att / total_att * 100) if total_att > 0 else 0, 1)

                # ── Leave ─────────────────────────────────────────────────
                leave_qs = list(StudentLeaveApplication.objects.filter(student=student).order_by('-applied_at'))

                # ── Support ───────────────────────────────────────────────
                support_qs = list(StudentSupportRequest.objects.filter(student=student.user).order_by('-created_at'))

                # ── Test Results ──────────────────────────────────────────
                test_qs = list(TestResult.objects.filter(student=student).select_related('test').order_by('-submitted_at'))

                # ── Quiz Results ──────────────────────────────────────────
                quiz_qs = list(QuizAttempt.objects.filter(student=student).select_related('quiz').order_by('-submitted_at'))

                # ── Session Progress ──────────────────────────────────────
                progress_qs = Student_Session_Progress.objects.filter(student=student)
                total_sessions = progress_qs.count()
                sessions_completed = progress_qs.filter(completed=True).count()
                progress_pct = round((sessions_completed / total_sessions * 100) if total_sessions > 0 else 0, 1)
                doubts_count = progress_qs.filter(has_doubt=True).count()
                resolved_doubts = progress_qs.filter(doubt_resolved=True).count()
                last_progress = progress_qs.filter(completed=True).order_by('-completed_date').first()
                last_activity = last_progress.completed_date if last_progress else None
                # ─────────────────────────────────────────────────────────

                student_details.append({
                    'student': StudentSerializer(student).data,
                    'attendance_records': [{
                        'date': str(a.date),
                        'status': a.status,
                        'batch_number': a.batch.batch_number if a.batch else '',
                        'remarks': a.remarks or '-',
                        'marked_by': f"{a.staff.first_name} {a.staff.last_name}" if a.staff else '-'
                    } for a in att_qs],
                    'attendance_total': total_att,
                    'attendance_present': present_att,
                    'attendance_percentage': att_pct,
                    'test_results': [{
                        'test_name': t.test.title if t.test else '',
                        'score': t.score,
                        'percentage': t.percentage,
                        'submitted_at': str(t.submitted_at)[:10] if t.submitted_at else ''
                    } for t in test_qs],
                    'test_count': len(test_qs),
                    'average_score': round(sum(t.percentage for t in test_qs) / len(test_qs), 1) if test_qs else 0,
                    'leave_requests': [{
                        'leave_type': l.leave_type,
                        'start_date': str(l.start_date),
                        'end_date': str(l.end_date),
                        'status': l.status,
                        'reason': l.reason
                    } for l in leave_qs],
                    'leaves_count': len(leave_qs),
                    'support_requests': [{
                        'message': s.message,
                        'status': s.status,
                        'created_at': str(s.created_at)[:10] if s.created_at else ''
                    } for s in support_qs],
                    'support_count': len(support_qs),
                    # ── Session progress fields ───────────────────────────
                    'sessions_completed': sessions_completed,
                    'total_sessions': total_sessions,
                    'progress_percentage': progress_pct,
                    'doubts_count': doubts_count,
                    'resolved_doubts': resolved_doubts,
                    'last_activity': last_activity,
                    # ── Quiz Results ──────────────────────────────────────
                    'quiz_results': [{
                        'quiz_title': a.quiz.title if a.quiz else '—',
                        'score': a.score or 0,
                        'total_marks': a.quiz.total_marks if a.quiz else 0,
                        'percentage': float(a.percentage or 0),
                        'passing_marks': a.quiz.passing_marks if a.quiz else 50,
                        'submitted_at': str(a.submitted_at)[:10] if a.submitted_at else '',
                    } for a in quiz_qs],
                    'quiz_count': len(quiz_qs),
                })

            all_att = StudentAttendance.objects.filter(student__in=students)
            total_att_all = all_att.count()
            present_att_all = all_att.filter(status='Present').count()

            return Response({
                'view_mode': 'staff_details',
                'branches': branches,
                'branch_stats': branch_stats,
                'branch_name': staff.branch,
                'staff': EmployeeSerializer(staff).data,
                'student_details': student_details,
                'total_batches': batches.count(),
                'total_students': students.count(),
                'total_sessions': CourseSession.objects.filter(batch__in=batches).count(),
                'overall_attendance_total': total_att_all,
                'overall_attendance_present': present_att_all,
                'overall_attendance_percentage': round((present_att_all / total_att_all * 100) if total_att_all > 0 else 0, 1),
            })
        except Employee.DoesNotExist:
            pass

    return Response({'view_mode': 'branches', 'branches': branches, 'branch_stats': branch_stats})

# ── ADMIN: STUDY MATERIALS OVERVIEW ──────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_materials_overview(request):
    branch = request.query_params.get('branch')
    staff_id = request.query_params.get('staff_id')  # ADD THIS
    branches = list(Employee.objects.values_list('branch', flat=True).distinct())

    if branch and staff_id:
        # ── LEVEL 3: Materials for a specific staff member ──
        try:
            staff = Employee.objects.get(id=staff_id, branch=branch)
        except Employee.DoesNotExist:
            return Response({'branches': branches, 'materials': [], 'staff': None})

        materials = StudyMaterial.objects.filter(
            uploaded_by=staff
        ).select_related('batch', 'uploaded_by').prefetch_related('assignments__batch').order_by('-uploaded_at')

        materials_data = []
        for m in materials:
            materials_data.append(StudyMaterialSerializer(m, context={'request': request}).data)

        return Response({
            'branches': branches,
            'selected_branch': branch,
            'staff': {
                'id': staff.id,
                'first_name': staff.first_name,
                'last_name': staff.last_name or '',
                'designation': staff.designation,
                'email': staff.email,
            },
            'materials': materials_data,
        })

    if branch:
        # ── LEVEL 2: Staff list for a branch ──
        staff_members = Employee.objects.filter(
            branch=branch,
            designation__in=['mentor', 'trainer']
        ).order_by('first_name')

        staff_data = []
        for staff in staff_members:
            material_count = StudyMaterial.objects.filter(uploaded_by=staff).count()
            staff_data.append({
                'id': staff.id,
                'first_name': staff.first_name,
                'last_name': staff.last_name or '',
                'designation': staff.designation,
                'email': staff.email,
                'branch': staff.branch,
                'material_count': material_count,
            })

        return Response({
            'branches': branches,
            'selected_branch': branch,
            'staff_members': staff_data,
            'materials': [],
        })

    # ── LEVEL 1: Branch list ──
    return Response({
        'branches': branches,
        'selected_branch': None,
        'staff_members': [],
        'materials': [],
    })

# ── ADMIN: SUPPORT REQUESTS OVERVIEW ─────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_support_overview(request):
    support_type = request.query_params.get('type', 'staff')
    status_filter = request.query_params.get('status')

    if support_type == 'staff':
        qs = SupportRequest.objects.select_related('staff').order_by('-created_at')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response({'requests': SupportRequestSerializer(qs, many=True).data, 'type': 'staff'})
    elif support_type == 'student':
        qs = StudentSupportRequest.objects.select_related('student').order_by('-created_at')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response({'requests': StudentSupportRequestSerializer(qs, many=True).data, 'type': 'student'})
    elif support_type == 'counselor':
        qs = CounselorSupportRequest.objects.select_related('counselor').order_by('-created_at')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response({'requests': CounselorSupportRequestSerializer(qs, many=True).data, 'type': 'counselor'})

    return Response({'requests': [], 'type': support_type})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_support_status(request, pk):
    support_type = request.data.get('type', 'staff')
    new_status = request.data.get('status')
    try:
        if support_type == 'staff':
            obj = SupportRequest.objects.get(id=pk)
            obj.status = new_status
            obj.save()
            return Response({'success': True, 'status': obj.status})
        elif support_type == 'student':
            obj = StudentSupportRequest.objects.get(id=pk)
            obj.status = new_status
            obj.save()
            return Response({'success': True, 'status': obj.status})
        elif support_type == 'counselor':
            obj = CounselorSupportRequest.objects.get(id=pk)
            obj.status = new_status
            obj.save()
            return Response({'success': True, 'status': obj.status})
    except Exception as e:
        return Response({'error': str(e)}, status=404)


# ── ADMIN: SEPARATE SUPPORT ENDPOINTS ────────────────────────────────────────

class AdminStaffSupportListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        requests = SupportRequest.objects.select_related('staff').order_by('-created_at')
        data = []
        for req in requests:
            try:
                emp = Employee.objects.get(user=req.staff)
                if emp.designation.lower() != 'counselor':
                    data.append({
                        'id': req.id,
                        'staff_name': f"{emp.first_name} {emp.last_name or ''}",
                        'message': req.message,
                        'status': req.status,
                        'created_at': req.created_at,
                    })
            except Employee.DoesNotExist:
                data.append({
                    'id': req.id,
                    'staff_name': req.staff.username,
                    'message': req.message,
                    'status': req.status,
                    'created_at': req.created_at,
                })
        return Response({'results': data})
    
    def patch(self, request, id):
        try:
            req = SupportRequest.objects.get(id=id)
            req.status = request.data.get('status', req.status)
            req.save()
            return Response({'success': True, 'status': req.status})
        except SupportRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class AdminStaffSupportHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        requests = SupportRequest.objects.filter(status='resolved').select_related('staff').order_by('-created_at')
        data = []
        for req in requests:
            try:
                emp = Employee.objects.get(user=req.staff)
                if emp.designation.lower() != 'counselor':
                    data.append({
                        'id': req.id,
                        'staff_name': f"{emp.first_name} {emp.last_name or ''}",
                        'message': req.message,
                        'status': req.status,
                        'created_at': req.created_at,
                    })
            except Employee.DoesNotExist:
                pass
        return Response({'results': data})


class AdminCounselorSupportListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        requests = CounselorSupportRequest.objects.select_related('counselor').order_by('-created_at')
        data = []
        for req in requests:
            try:
                emp = Employee.objects.get(user=req.counselor)
                data.append({
                    'id': req.id,
                    'counselor_name': f"{emp.first_name} {emp.last_name or ''}",
                    'message': req.message,
                    'status': req.status,
                    'created_at': req.created_at,
                })
            except Employee.DoesNotExist:
                data.append({
                    'id': req.id,
                    'counselor_name': req.counselor.username,
                    'message': req.message,
                    'status': req.status,
                    'created_at': req.created_at,
                })
        return Response({'results': data})
    
    def patch(self, request, id):
        try:
            req = CounselorSupportRequest.objects.get(id=id)
            req.status = request.data.get('status', req.status)
            req.save()
            return Response({'success': True, 'status': req.status})
        except CounselorSupportRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class AdminCounselorSupportHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        requests = CounselorSupportRequest.objects.filter(status='resolved').select_related('counselor').order_by('-created_at')
        data = []
        for req in requests:
            try:
                emp = Employee.objects.get(user=req.counselor)
                data.append({
                    'id': req.id,
                    'counselor_name': f"{emp.first_name} {emp.last_name or ''}",
                    'message': req.message,
                    'status': req.status,
                    'created_at': req.created_at,
                })
            except Employee.DoesNotExist:
                pass
        return Response({'results': data})


class AdminStudentSupportListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        requests = StudentSupportRequest.objects.select_related('student').order_by('-created_at')
        data = []
        for req in requests:
            try:
                student = Students.objects.get(user=req.student)
                data.append({
                    'id': req.id,
                    'student_name': f"{student.first_name} {student.last_name or ''}",
                    'student_id': student.student_id,
                    'message': req.message,
                    'status': req.status,
                    'created_at': req.created_at,
                })
            except Students.DoesNotExist:
                data.append({
                    'id': req.id,
                    'student_name': req.student.username,
                    'message': req.message,
                    'status': req.status,
                    'created_at': req.created_at,
                })
        return Response({'results': data})
    
    def patch(self, request, id):
        try:
            req = StudentSupportRequest.objects.get(id=id)
            req.status = request.data.get('status', req.status)
            req.save()
            return Response({'success': True, 'status': req.status})
        except StudentSupportRequest.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class AdminStudentSupportHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        requests = StudentSupportRequest.objects.filter(status='resolved').select_related('student').order_by('-created_at')
        data = []
        for req in requests:
            try:
                student = Students.objects.get(user=req.student)
                data.append({
                    'id': req.id,
                    'student_name': f"{student.first_name} {student.last_name or ''}",
                    'student_id': student.student_id,
                    'message': req.message,
                    'status': req.status,
                    'created_at': req.created_at,
                })
            except Students.DoesNotExist:
                pass
        return Response({'results': data})


# ── ADMIN LEAVE MANAGEMENT ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_staff_leave(request):
    status_filter = request.query_params.get('status', '')
    history = request.query_params.get('history', 'false') == 'true'
    qs = StaffLeaveRequest.objects.select_related('staff').exclude(
        staff__designation__iexact='counselor'
    ).order_by('-applied_at')
    if status_filter:
        qs = qs.filter(status=status_filter)
    elif not history:
        qs = qs.filter(status='Pending')
    if history:
        qs = StaffLeaveRequest.objects.select_related('staff').exclude(
            staff__designation__iexact='counselor'
        ).exclude(status='Pending').order_by('-applied_at')
    data = []
    for l in qs:
        data.append({
            'id': l.id,
            'staff_name': f"{l.staff.first_name} {l.staff.last_name or ''}",
            'staff_designation': l.staff.designation,
            'staff_branch': l.staff.branch,
            'leave_type': l.leave_type,
            'start_date': str(l.start_date),
            'end_date': str(l.end_date),
            'no_of_days': l.no_of_days,
            'contact_info': l.contact_info or '',
            'reason': l.reason,
            'status': l.status,
            'applied_at': l.applied_at.strftime('%d %b %Y, %H:%M') if l.applied_at else '',
        })
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_process_staff_leave(request, pk):
    try:
        leave = StaffLeaveRequest.objects.get(id=pk)
        action = request.data.get('action')
        leave.status = 'Approved' if action == 'Accept' else 'Rejected'
        leave.save()
        return Response({'success': True, 'status': leave.status})
    except StaffLeaveRequest.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_counselor_leave(request):
    history = request.query_params.get('history', 'false') == 'true'
    qs = CounselorLeaveRequest.objects.select_related('counselor').order_by('-applied_at')
    if history:
        qs = qs.exclude(status='Pending')
    else:
        qs = qs.filter(status='Pending')
    data = []
    for l in qs:
        data.append({
            'id': l.id,
            'staff_name': f"{l.counselor.first_name} {l.counselor.last_name or ''}",
            'staff_designation': l.counselor.designation,
            'staff_branch': l.counselor.branch,
            'leave_type': l.leave_type,
            'start_date': str(l.start_date),
            'end_date': str(l.end_date),
            'no_of_days': l.no_of_days,
            'contact_info': l.contact_info or '',
            'reason': l.reason,
            'status': l.status,
            'applied_at': l.applied_at.strftime('%d %b %Y, %H:%M') if l.applied_at else '',
        })
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_process_counselor_leave(request, pk):
    try:
        leave = CounselorLeaveRequest.objects.get(id=pk)
        action = request.data.get('action')
        leave.status = 'Approved' if action == 'Accept' else 'Rejected'
        leave.save()
        return Response({'success': True, 'status': leave.status})
    except CounselorLeaveRequest.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


# ── PDF EXTRACTION ───────────────────────────────────────────────────────────

def extract_pdf_text(logsheet_path):
    """
    Extract text from PDF using available libraries.
    Tries pdfplumber first, falls back to PyPDF2.
    """
    full_text = ""
    
    # Try pdfplumber first (better for tables)
    try:
        import pdfplumber
        with pdfplumber.open(logsheet_path) as pdf:
            for page in pdf.pages:
                # Try to extract tables first
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for row in table:
                            full_text += " | ".join([str(cell or '') for cell in row]) + "\n"
                
                # Also extract regular text
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"
        
        if full_text.strip():
            return full_text
    except ImportError:
        pass  # pdfplumber not installed, will use PyPDF2
    except Exception as e:
        print(f"[EXTRACT] pdfplumber extraction failed: {e}, trying PyPDF2...")
    
    # Fallback to PyPDF2
    try:
        pdf_reader = PyPDF2.PdfReader(logsheet_path)
        for page in pdf_reader.pages:
            page_text = page.extract_text() or ''
            full_text += page_text + "\n"
    except Exception as e:
        print(f"[EXTRACT] PyPDF2 extraction failed: {e}")
        return ""
    
    return full_text


def parse_sessions_from_text(full_text, batch_id=None, debug=False):
    """
    Parse session information from extracted PDF text.
    Supports multiple formats: Session 1, Session-1, Module 1, Day 1, 1. Topic, tables, etc.
    
    Args:
        full_text: Raw text extracted from PDF
        batch_id: Batch ID for debug logging
        debug: Enable debug logging
        
    Returns:
        List of dicts with session_number, title, topics
    """
    if not full_text.strip():
        return []
    
    # Log first 2000 characters for debugging
    if debug:
        preview = full_text[:2000].replace('\n', '\\n')
        print(f"[EXTRACT] Batch {batch_id}: First 2000 chars:\n{preview}\n")
    
    lines = [line.strip() for line in full_text.splitlines() if line.strip()]
    sessions = {}  # Use dict to deduplicate by session_number
    
    # Pattern 1: "Session 1", "Session-1", "SESSION 1", "Module 1", "Day 1", etc.
    pattern1 = re.compile(
        r'^(?:Session|Module|Day|Chapter|Unit|Lesson|Topic)\s*[-:\s]?\s*(\d+)\s*[-:.\s]?\s*(.*)$',
        re.IGNORECASE
    )
    
    # Pattern 2: "1. Topic Name", "1) Topic Name", "1 - Topic Name", "1: Topic Name"
    pattern2 = re.compile(r'^(\d+)\s*[-.:)]\s+(.+)$')
    
    # Pattern 3: "Session 61: WEB ARCHITECTURE" - with number and colon
    pattern3 = re.compile(r'^(?:Session|Module|Day|Chapter|Unit)\s+(\d+)\s*:\s*(.+)$', re.IGNORECASE)
    
    # Pattern 4: Table format - pipe-separated with number in first column
    pattern4 = re.compile(r'^\s*(\d+)\s*\|\s*(.+)$')
    
    current_session_num = None
    current_content = []
    
    for line in lines:
        # Try pattern 1 (Session 1, Module-1, etc.)
        match = pattern1.match(line)
        if match:
            if current_session_num is not None:
                # Save previous session
                if current_session_num not in sessions:
                    sessions[current_session_num] = {
                        'session_number': current_session_num,
                        'content': current_content
                    }
            
            current_session_num = int(match.group(1))
            current_content = [match.group(2)] if match.group(2).strip() else []
            continue
        
        # Try pattern 3 (Session 61: Title)
        match = pattern3.match(line)
        if match:
            if current_session_num is not None:
                if current_session_num not in sessions:
                    sessions[current_session_num] = {
                        'session_number': current_session_num,
                        'content': current_content
                    }
            
            current_session_num = int(match.group(1))
            current_content = [match.group(2)] if match.group(2).strip() else []
            continue
        
        # Try pattern 2 (1. Topic or 1) Topic)
        match = pattern2.match(line)
        if match and current_session_num is None:
            # Only use pattern2 if we haven't found any explicit session markers yet
            num = int(match.group(1))
            if num not in sessions:
                sessions[num] = {
                    'session_number': num,
                    'content': [match.group(2)]
                }
            current_session_num = num
            current_content = []
            continue
        
        # Try pattern 4 (table format with pipes)
        match = pattern4.match(line)
        if match and current_session_num is None:
            num = int(match.group(1))
            if num not in sessions:
                sessions[num] = {
                    'session_number': num,
                    'content': [match.group(2)]
                }
            current_session_num = num
            current_content = []
            continue
        
        # Accumulate content for current session
        if current_session_num is not None:
            current_content.append(line)
    
    # Don't forget the last session
    if current_session_num is not None and current_session_num not in sessions:
        sessions[current_session_num] = {
            'session_number': current_session_num,
            'content': current_content
        }
    
    # If no explicit patterns found, try to extract numbered lines as sessions (fallback)
    if not sessions:
        if debug:
            print(f"[EXTRACT] Batch {batch_id}: No explicit session patterns found, using fallback approach")
        
        for line in lines:
            # Look for lines that start with just a number
            match = re.match(r'^(\d+)\s+(.+)$', line)
            if match:
                num = int(match.group(1))
                title = match.group(2).strip()
                
                # Only include if title looks meaningful (at least 3 chars, not just metadata)
                if len(title) >= 3 and not title.lower().startswith(('page', 'table', 'figure')):
                    if num not in sessions:
                        sessions[num] = {
                            'session_number': num,
                            'content': [title]
                        }
    
    # Convert to output format
    result = []
    for num in sorted(sessions.keys()):
        session_data = sessions[num]
        content = ' '.join(session_data['content']).strip()
        
        if not content:
            content = 'Course Content'
        
        # Extract title (first meaningful part)
        title_candidate = content.split('|')[0].split('-')[0].split('\n')[0].strip()
        if len(title_candidate) < 3:
            title_candidate = 'Course Content'
        
        # Truncate if too long
        if len(title_candidate) > 255:
            title_candidate = title_candidate[:252] + '...'
        
        title = f"Session {num}: {title_candidate}"
        topics = content[len(title_candidate):].strip() if content.startswith(title_candidate) else content
        
        result.append({
            'session_number': num,
            'title': title,
            'topics': topics[:500] if topics else ''  # Limit topics length
        })
    
    if debug:
        print(f"[EXTRACT] Batch {batch_id}: Parsed {len(result)} unique sessions")
    
    return result


def extract_sessions_from_logsheet(batch, debug=False):
    """
    Extract sessions from batch logsheet.
    If batch logsheet file is missing, fallback to course logsheet.
    """
    try:
        pdf_field = None
        source = None

        # 1. Try batch logsheet only if actual file exists
        if batch.course_logsheet:
            batch_path = getattr(batch.course_logsheet, "path", None)

            if debug:
                print(f"[EXTRACT] Batch {batch.id}: Checking batch.course_logsheet")
                print(f"[EXTRACT] Batch {batch.id}: Batch field={batch.course_logsheet.name}")
                print(f"[EXTRACT] Batch {batch.id}: Batch path={batch_path}")
                print(f"[EXTRACT] Batch {batch.id}: Batch file exists={os.path.exists(batch_path) if batch_path else False}")

            if batch_path and os.path.exists(batch_path):
                pdf_field = batch.course_logsheet
                source = "batch.course_logsheet"

        # 2. If batch file missing, fallback to course logsheet
        if not pdf_field and batch.course_name and batch.course_name.course_logsheet:
            course_path = getattr(batch.course_name.course_logsheet, "path", None)

            if debug:
                print(f"[EXTRACT] Batch {batch.id}: Checking course.course_logsheet fallback")
                print(f"[EXTRACT] Batch {batch.id}: Course field={batch.course_name.course_logsheet.name}")
                print(f"[EXTRACT] Batch {batch.id}: Course path={course_path}")
                print(f"[EXTRACT] Batch {batch.id}: Course file exists={os.path.exists(course_path) if course_path else False}")

            if course_path and os.path.exists(course_path):
                pdf_field = batch.course_name.course_logsheet
                source = "course.course_logsheet"

        if not pdf_field:
            if debug:
                print(f"[EXTRACT] Batch {batch.id}: No valid existing logsheet file found")
            return []

        logsheet_path = getattr(pdf_field, "path", None)

        if debug:
            print(f"[EXTRACT] Batch {batch.id}: Selected Source={source}")
            print(f"[EXTRACT] Batch {batch.id}: Selected Field name={pdf_field.name}")
            print(f"[EXTRACT] Batch {batch.id}: Selected Path={logsheet_path}")

        full_text = extract_pdf_text(logsheet_path)

        if not full_text.strip():
            if debug:
                print(f"[EXTRACT] Batch {batch.id}: No text extracted from PDF")
            return []

        if debug:
            print(f"[EXTRACT] Batch {batch.id}: Extracted {len(full_text)} chars from PDF")
            print(f"[EXTRACT] Batch {batch.id}: First 1000 chars:\n{full_text[:1000]}")

        sessions_data = parse_sessions_from_text(full_text, batch_id=batch.id, debug=debug)

        return sessions_data

    except Exception as e:
        print(f"[EXTRACT] ERROR Batch {batch.id}: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return []


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_and_store_sessions(request, batch_id):
    """
    Extract sessions from batch/course logsheet and store in database.
    Automatically uses course_logsheet if batch_logsheet is empty.
    """
    try:
        print(f"\n{'='*60}")
        print(f"[SESSION_EXTRACT] START: batch_id={batch_id}")
        print(f"{'='*60}")
        
        batch = Batches.objects.get(id=batch_id)
        print(f"[SESSION_EXTRACT] Batch {batch.id}: {batch.batch_number}")
        print(f"[SESSION_EXTRACT] Batch.course_logsheet: {batch.course_logsheet.name if batch.course_logsheet else 'EMPTY'}")
        print(f"[SESSION_EXTRACT] Course.course_logsheet: {batch.course_name.course_logsheet.name if batch.course_name and batch.course_name.course_logsheet else 'EMPTY'}")
        
        # Validate that a logsheet exists (batch or course)
        if not batch.course_logsheet and (not batch.course_name or not batch.course_name.course_logsheet):
            return Response({
                'error': 'No logsheet uploaded for this batch or course. Please upload a PDF logsheet first.'
            }, status=400)
        
        # ========== DELETE ALL EXISTING SESSIONS AND RELATED DATA ==========
        existing_sessions = CourseSession.objects.filter(batch=batch)
        existing_count = existing_sessions.count()
        
        if existing_count > 0:
            # Delete all related data first (important for clean slate)
            Student_Session_Progress.objects.filter(session__batch=batch).delete()
            StudentSessionStatus.objects.filter(session__batch=batch).delete()
            DoubtResponse.objects.filter(doubt__session__batch=batch).delete()
            SessionNotification.objects.filter(session__batch=batch).delete()
            
            # Delete the sessions themselves
            existing_sessions.delete()
            print(f"[SESSION_EXTRACT] Deleted {existing_count} old sessions and all related data")
        
        # Extract sessions from PDF (with debug logging)
        sessions_data = extract_sessions_from_logsheet(batch, debug=True)
        
        if not sessions_data:
            error_msg = (
                'Could not extract any sessions from the PDF logsheet. '
                'Supported formats: "Session 1", "Module-1", "Day 1", "1. Topic", "1) Topic", '
                '"1 - Topic", "1: Topic", "Session 61: WEB ARCHITECTURE", or table format with numbers. '
                'Check deployment logs for first 2000 characters of extracted PDF text.'
            )
            print(f"[SESSION_EXTRACT] ERROR: {error_msg}")
            return Response({'error': error_msg}, status=400)
        
        print(f"[SESSION_EXTRACT] Successfully extracted {len(sessions_data)} sessions")
        
        # ========== CREATE NEW SESSIONS ==========
        new_sessions = []
        for s in sessions_data:
            session = CourseSession.objects.create(
                batch=batch,
                session_number=s['session_number'],
                title=s['title'],
                topics=s.get('topics', ''),
                staff_completed=False,  # Fresh session - not completed by staff yet
                session_enabled=True
            )
            new_sessions.append(session)
            print(f"[SESSION_EXTRACT] Created Session {session.session_number}: {session.title}")
        
        # ========== CREATE FRESH PROGRESS FOR ALL ACTIVE STUDENTS ==========
        from .models import CompletedStudent
        completed_ids = CompletedStudent.objects.values_list('original_student_id', flat=True)
        completed_ids_int = []
        for cid in completed_ids:
            try:
                completed_ids_int.append(int(cid))
            except:
                pass
        
        # Get all active students in this batch (not completed)
        students = Students.objects.filter(
            assigned_batch=batch
        ).exclude(
            id__in=completed_ids_int
        )
        
        created_progress = 0
        for student in students:
            for session in new_sessions:
                # Create fresh progress for this student
                Student_Session_Progress.objects.create(
                    student=student,
                    session=session,
                    completed=False,
                    staff_completed=False,
                    student_status='not_started',
                    has_doubt=False,
                    doubt_resolved=False
                )
                
                StudentSessionStatus.objects.create(
                    student=student,
                    session=session,
                    staff_completed=False,
                    student_status='pending'
                )
                created_progress += 1
            print(f"[SESSION_EXTRACT] Created progress for {student.first_name} ({student.student_id})")
        
        print(f"\n[SESSION_EXTRACT] COMPLETE:")
        print(f"  ✅ Total sessions created: {len(new_sessions)}")
        print(f"  ✅ Active students: {students.count()}")
        print(f"  ✅ Progress records: {created_progress}")
        print(f"{'='*60}\n")
        
        return Response({
            'success': True,
            'message': f'Successfully extracted {len(new_sessions)} fresh sessions. Progress created for {students.count()} active students.',
            'sessions': CourseSessionSerializer(new_sessions, many=True).data,
            'total_sessions': len(new_sessions),
            'students_updated': students.count()
        })
        
    except Batches.DoesNotExist:
        print(f"[SESSION_EXTRACT] ERROR: Batch {batch_id} not found")
        return Response({'error': 'Batch not found.'}, status=404)
    except Exception as e:
        print(f"[SESSION_EXTRACT] ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)

# ── ADMIN: MENTORS LIST ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_view_mentors(request):
    designation = request.query_params.get('designation')
    branch = request.query_params.get('branch')
    qs = Employee.objects.all().order_by('first_name')
    if designation:
        qs = qs.filter(designation__iexact=designation)
    if branch:
        qs = qs.filter(branch=branch)
    return Response(EmployeeSerializer(qs, many=True).data)


# ── STAFF STUDENT LEAVE MANAGEMENT ───────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_student_leave_requests(request):
    """Staff views leave requests from their assigned students"""
    try:
        staff = Employee.objects.get(user=request.user)
        leaves = StudentLeaveApplication.objects.filter(
            assigned_staff=staff
        ).order_by('-applied_at')
        
        data = []
        for l in leaves:
            data.append({
                'id': l.id,
                'student_name': f"{l.student.first_name} {l.student.last_name or ''}",
                'student_id': l.student.student_id,
                'leave_type': l.leave_type,
                'start_date': l.start_date.strftime('%Y-%m-%d'),
                'end_date': l.end_date.strftime('%Y-%m-%d'),
                'number_of_days': l.number_of_days,
                'reason': l.reason,
                'contact_info': l.contact_info,
                'status': l.status,
                'applied_at': l.applied_at,
            })
        return Response({'results': data})
    except Employee.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=404)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def staff_process_student_leave(request, pk):
    """Staff approves or rejects student leave request"""
    try:
        staff = Employee.objects.get(user=request.user)
        leave = StudentLeaveApplication.objects.get(id=pk, assigned_staff=staff)
        
        new_status = request.data.get('status')
        remarks = request.data.get('remarks', '')
        
        if new_status not in ['approved', 'rejected']:
            return Response({'error': 'Invalid status'}, status=400)
        
        leave.status = new_status
        leave.staff_remarks = remarks
        leave.processed_at = timezone.now()
        leave.save()
        
        # Update student's used leave days if approved
        if new_status == 'approved':
            leave.student.update_used_leave_days()
        
        return Response({'success': True, 'status': leave.status})
    except Employee.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=404)
    except StudentLeaveApplication.DoesNotExist:
        return Response({'error': 'Leave request not found'}, status=404)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_quizzes(request):
    """Get quizzes available for the logged-in student with ALL options"""
    try:
        student = Students.objects.get(user=request.user)
        if not student.assigned_batch:
            return Response({'results': []})
        
        quizzes = Quiz.objects.filter(
            batch=student.assigned_batch,
            is_published=True
        ).order_by('-created_at')
        
        data = []
        for quiz in quizzes:
            attempts = QuizAttempt.objects.filter(student=student, quiz=quiz)
            best_score = attempts.filter(is_completed=True).order_by('-percentage').first()
            
            questions = quiz.questions.all().order_by('question_number')
            questions_data = []
            total_marks = 0
            for q in questions:
                questions_data.append({
                    'id': q.id,
                    'question_text': q.question_text,
                    'option_a': q.option_a or '',
                    'option_b': q.option_b or '',
                    'option_c': q.option_c or '',
                    'option_d': q.option_d or '',
                    'marks': q.marks,
                })
                total_marks += q.marks
            
            # If no questions, use default
            if total_marks == 0 and questions.count() > 0:
                total_marks = questions.count()
            
            data.append({
                'id': quiz.id,
                'title': quiz.title,
                'description': quiz.description,
                'total_questions': questions.count(),
                'total_marks': total_marks,  # Send calculated total_marks
                'duration_minutes': quiz.duration_minutes,
                'passing_marks': quiz.passing_marks,
                'max_attempts': quiz.max_attempts,
                'user_attempts': attempts.count(),
                'best_score': best_score.percentage if best_score else None,
                'questions': questions_data
            })
        
        return Response({'results': data})
    except Students.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_take_quiz(request, quiz_id):
    """Student submits quiz answers"""
    try:
        student = Students.objects.get(user=request.user)
        quiz = Quiz.objects.get(id=quiz_id, is_published=True)
        
        # Check if student is in the batch
        if student.assigned_batch != quiz.batch:
            return Response({'error': 'This quiz is not assigned to your batch'}, status=400)
        
        # Check attempt limit
        existing_attempts = QuizAttempt.objects.filter(student=student, quiz=quiz).count()
        if existing_attempts >= quiz.max_attempts and quiz.max_attempts > 0:
            return Response({'error': f'Maximum attempts ({quiz.max_attempts}) reached'}, status=400)
        
        answers_data = request.data.get('answers', {})
        questions = quiz.questions.all()
        
        # Debug prints
        print("=" * 60)
        print(f"QUIZ: {quiz.title}")
        print(f"Total questions in DB: {questions.count()}")
        
        # Calculate total_marks from questions
        total_marks = 0
        for q in questions:
            total_marks += q.marks
            print(f"Question {q.id}: marks = {q.marks}")
        
        print(f"Calculated TOTAL_MARKS: {total_marks}")
        print(f"Quiz.total_marks in DB: {quiz.total_marks}")
        print(f"Received answers: {answers_data}")
        print("=" * 60)
        
        # If total_marks is still 0, set default
        if total_marks == 0:
            total_marks = questions.count()  # Each question 1 mark
            print(f"WARNING: total_marks was 0, set to {total_marks}")
        
        # Calculate score
        score = 0
        correct_count = 0
        
        for question in questions:
            selected = answers_data.get(str(question.id), '')
            
            # Normalize for comparison
            selected_normalized = str(selected).strip().upper()
            correct_normalized = str(question.correct_answer).strip().upper()
            
            is_correct = selected_normalized == correct_normalized
            
            if is_correct:
                score += question.marks
                correct_count += 1
                print(f"Q{question.id}: CORRECT (+{question.marks})")
            else:
                print(f"Q{question.id}: WRONG (selected={selected_normalized}, correct={correct_normalized})")
        
        # Calculate percentage
        if total_marks > 0:
            percentage = round((score / total_marks) * 100, 1)
        else:
            percentage = 0
            
        is_passed = percentage >= quiz.passing_marks
        
        print(f"\nFINAL: score={score}, total_marks={total_marks}, percentage={percentage}%")
        print("=" * 60)
        
        # Save attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=student,
            attempt_number=existing_attempts + 1,
            score=score,
            percentage=percentage,
            is_passed=is_passed,
            is_completed=True,
            submitted_at=timezone.now()
        )
        
        # Also update quiz.total_marks for future reference
        if quiz.total_marks != total_marks:
            quiz.total_marks = total_marks
            quiz.total_questions = questions.count()
            quiz.save()
            print(f"Updated quiz.total_marks to {total_marks}")
        
        # Save answers
        for question in questions:
            selected = answers_data.get(str(question.id), '')
            selected_normalized = str(selected).strip().upper()
            correct_normalized = str(question.correct_answer).strip().upper()
            is_correct = selected_normalized == correct_normalized
            marks_obtained = question.marks if is_correct else 0
            
            QuizAnswer.objects.create(
                attempt=attempt,
                question=question,
                selected_answer=selected,
                is_correct=is_correct,
                marks_obtained=marks_obtained
            )
        
        return Response({
            'attempt_id': attempt.id,
            'score': score,
            'total_marks': total_marks,
            'percentage': percentage,
            'is_passed': is_passed,
            'correct_count': correct_count,
            'total_questions': questions.count()
        })
        
    except Students.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
    except Quiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=404)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quiz_result_details(request, attempt_id):
    """Get detailed quiz result with answers"""
    try:
        attempt = QuizAttempt.objects.get(id=attempt_id)
        
        # Check permission
        if attempt.student.user != request.user and not request.user.is_staff:
            return Response({'error': 'Access denied'}, status=403)
        
        answers = QuizAnswer.objects.filter(attempt=attempt).select_related('question')
        
        questions_details = []
        for answer in answers:
            q = answer.question
            # Get selected option text
            selected_option_text = ''
            if answer.selected_answer:
                if answer.selected_answer.upper() == 'A':
                    selected_option_text = q.option_a
                elif answer.selected_answer.upper() == 'B':
                    selected_option_text = q.option_b
                elif answer.selected_answer.upper() == 'C':
                    selected_option_text = q.option_c
                elif answer.selected_answer.upper() == 'D':
                    selected_option_text = q.option_d
            
            # Get correct option text
            correct_option_text = ''
            if q.correct_answer.upper() == 'A':
                correct_option_text = q.option_a
            elif q.correct_answer.upper() == 'B':
                correct_option_text = q.option_b
            elif q.correct_answer.upper() == 'C':
                correct_option_text = q.option_c
            elif q.correct_answer.upper() == 'D':
                correct_option_text = q.option_d
            
            questions_details.append({
                'question_text': q.question_text,
                'selected_answer': answer.selected_answer or '-',
                'selected_option_text': selected_option_text or 'Not answered',
                'correct_answer': q.correct_answer,
                'correct_option_text': correct_option_text or 'N/A',
                'is_correct': answer.is_correct,
                'marks': q.marks,
            })
        
        wrong_count = len([q for q in questions_details if not q['is_correct']])
        
        return Response({
            'quiz_title': attempt.quiz.title,
            'score': attempt.score,
            'total_marks': attempt.quiz.total_marks,
            'percentage': attempt.percentage,
            'is_passed': attempt.is_passed,
            'correct_count': sum(1 for a in answers if a.is_correct),
            'wrong_count': wrong_count,
            'total_questions': answers.count(),
            'questions': questions_details,
        })
    except QuizAttempt.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_assigned_tests(request):
    try:
        student = Students.objects.get(user=request.user)
    except Students.DoesNotExist:
        return Response([])

    if not student.assigned_batch:
        return Response([])

    # ── Only tests assigned to THIS student's batch ──
    assigned = AssignedTest.objects.filter(
        batch=student.assigned_batch
    ).select_related('test')

    data = []
    for a in assigned:
        test = a.test
        questions = Question.objects.filter(test=test)
        data.append({
            'id': a.id,
            'test_id': test.id,
            'test_title': test.title,
            'test_description': test.description,
            'total_questions': questions.count(),
            'assigned_date': a.assigned_date if hasattr(a, 'assigned_date') else None,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_test_results(request):
    try:
        student = Students.objects.get(user=request.user)
    except Students.DoesNotExist:
        return Response({'results': []})

    # ── Only results for THIS student ──
    results = TestResult.objects.filter(
        student=student
    ).select_related('test').order_by('-submitted_at')

    data = []
    for r in results:
        data.append({
            'id': r.id,
            'test_id': r.test.id,
            'test_title': r.test.title,
            'score': r.score,
            'total_questions': r.total_questions,
            'percentage': float(r.percentage),
            'submitted_at': r.submitted_at,
        })

    return Response({'results': data})



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_take_test(request, test_id):
    """Student submits test answers - ONE TIME ONLY"""
    try:
        student = Students.objects.get(user=request.user)
        test = QuizTest.objects.get(id=test_id)
        
        # Check if student is in a batch that has this test assigned
        if not student.assigned_batch:
            return Response({'error': 'You are not assigned to any batch'}, status=400)
        
        assigned_exists = AssignedTest.objects.filter(
            test=test,
            batch=student.assigned_batch
        ).exists()
        
        if not assigned_exists:
            return Response({'error': 'This test is not assigned to your batch'}, status=400)
        
        # ✅ ONE TIME ATTEMPT - Check if already taken
        if TestResult.objects.filter(student=student, test=test).exists():
            return Response({'error': 'You have already taken this test. Only one attempt allowed.'}, status=400)
        
        questions = Question.objects.filter(test=test)
        answers_data = request.data.get('answers', {})
        
        # Calculate score
        score = 0
        total_questions = questions.count()
        
        for question in questions:
            question_id = str(question.id)
            selected_value = answers_data.get(question_id, '')
            
            # Determine what the correct answer should be
            correct_text = ""
            if question.correct_answer in ['A', 'a', '1', question.option1]:
                correct_text = question.option1
            elif question.correct_answer in ['B', 'b', '2', question.option2]:
                correct_text = question.option2
            elif question.correct_answer in ['C', 'c', '3', question.option3]:
                correct_text = question.option3
            elif question.correct_answer in ['D', 'd', '4', question.option4]:
                correct_text = question.option4
            else:
                correct_text = question.correct_answer
            
            # Determine what the student selected
            selected_text = ""
            if selected_value in ['A', 'a', '1', 'option1']:
                selected_text = question.option1
            elif selected_value in ['B', 'b', '2', 'option2']:
                selected_text = question.option2
            elif selected_value in ['C', 'c', '3', 'option3']:
                selected_text = question.option3
            elif selected_value in ['D', 'd', '4', 'option4']:
                selected_text = question.option4
            else:
                selected_text = selected_value
            
            is_correct = selected_text.lower().strip() == correct_text.lower().strip()
            
            if is_correct:
                score += 1
        
        percentage = (score / total_questions * 100) if total_questions > 0 else 0
        is_passed = percentage >= 50
        
        # Save result
        result = TestResult.objects.create(
            student=student,
            test=test,
            score=score,
            total_questions=total_questions,
            percentage=percentage
        )
        
        return Response({
            'score': score,
            'total_questions': total_questions,
            'percentage': percentage,
            'is_passed': is_passed
        })
        
    except Students.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
    except QuizTest.DoesNotExist:
        return Response({'error': 'Test not found'}, status=404)
    except Exception as e:
        print(f"Error: {e}")
        return Response({'error': str(e)}, status=400)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_result_details(request, result_id):
    """Get detailed test result with answers"""
    try:
        result = TestResult.objects.get(id=result_id)
        
        # Check if the result belongs to the logged-in student
        if result.student.user != request.user:
            return Response({'error': 'Access denied'}, status=403)
        
        # Get the questions and answers
        test = result.test
        questions = Question.objects.filter(test=test)
        
        # You'll need to store answers in a separate model or parse from result
        # For now, return basic details
        return Response({
            'test_title': test.title,
            'score': result.score,
            'total_questions': result.total_questions,
            'percentage': result.percentage,
            'is_passed': result.percentage >= 50,
            'correct_count': result.score,
            'wrong_count': result.total_questions - result.score,
            'submitted_at': result.submitted_at,
        })
    except TestResult.DoesNotExist:
        return Response({'error': 'Result not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_questions(request, test_id):
    """Get questions for a specific test"""
    try:
        test = QuizTest.objects.get(id=test_id)
        questions = Question.objects.filter(test=test)
        data = [{
            'id': q.id,
            'question_text': q.question_text,
            'option1': q.option1,
            'option2': q.option2,
            'option3': q.option3,
            'option4': q.option4,
        } for q in questions]
        return Response({'count': len(data), 'questions': data})
    except QuizTest.DoesNotExist:
        return Response({'error': 'Test not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_test_questions(request, test_id):
    """Get questions for a specific test"""
    try:
        test = QuizTest.objects.get(id=test_id)
        questions = Question.objects.filter(test=test)
        
        questions_data = []
        for q in questions:
            # Determine the correct option letter based on stored correct_answer
            correct_option = "A"  # default
            if q.correct_answer in ["1", "A", q.option1]:
                correct_option = "A"
            elif q.correct_answer in ["2", "B", q.option2]:
                correct_option = "B"
            elif q.correct_answer in ["3", "C", q.option3]:
                correct_option = "C"
            elif q.correct_answer in ["4", "D", q.option4]:
                correct_option = "D"
            
            questions_data.append({
                'id': q.id,
                'question_text': q.question_text,
                'option1': q.option1,
                'option2': q.option2,
                'option3': q.option3 or '',
                'option4': q.option4 or '',
                'correct_answer': correct_option,  # Send letter for frontend reference
            })
        
        return Response({
            'test_id': test.id,
            'test_title': test.title,
            'total_questions': questions.count(),
            'questions': questions_data
        })
    except QuizTest.DoesNotExist:
        return Response({'error': 'Test not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_results(request):
    try:
        employee = Employee.objects.get(user=request.user)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=404)

    batch_id = request.query_params.get('batch_id')

    # ── Only show results for students assigned to THIS staff ──
    results = TestResult.objects.select_related(
        'student', 'test', 'student__assigned_batch'
    ).filter(
        student__assigned_staff=employee  # only THIS staff's students
    ).order_by('-submitted_at')

    if batch_id:
        results = results.filter(student__assigned_batch_id=batch_id)

    data = []
    for r in results:
        data.append({
            'id': r.id,
            'student_name': f"{r.student.first_name} {r.student.last_name}",
            'student_id': r.student.student_id,
            'batch_number': r.student.assigned_batch.batch_number if r.student.assigned_batch else '—',
            'batch_id': r.student.assigned_batch.id if r.student.assigned_batch else None,
            'test_title': r.test.title,
            'test_id': r.test.id,
            'score': r.score,
            'total_questions': r.total_questions,
            'percentage': float(r.percentage),
            'submitted_at': r.submitted_at,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_session_doubt_responses(request, session_id):
    """Get all doubt responses for a session"""
    try:
        student = Students.objects.get(user=request.user)
        session = CourseSession.objects.get(id=session_id)
        
        # Get the student's progress for this session
        progress = Student_Session_Progress.objects.filter(
            student=student, 
            session=session
        ).first()
        
        if not progress:
            return Response({'responses': [], 'has_response': False})
        
        # Get all responses for this doubt
        responses = DoubtResponse.objects.filter(
            doubt=progress
        ).select_related('staff').order_by('created_at')
        
        responses_data = []
        for response in responses:
            responses_data.append({
                'id': response.id,
                'staff_name': f"{response.staff.first_name} {response.staff.last_name or ''}",
                'message': response.message,
                'created_at': response.created_at,
            })
        
        return Response({
            'responses': responses_data,
            'has_response': len(responses_data) > 0,
            'session_title': session.title,
            'session_number': session.session_number
        })
        
    except Students.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
    except CourseSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)
    except Exception as e:
        print(f"Error in get_session_doubt_responses: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_progress_summary(request, student_id):
    """Get summary of student's progress for the current trainer"""
    try:
        trainer = Employee.objects.get(user=request.user)
        student = Students.objects.get(id=student_id, assigned_staff=trainer)
        
        batch = student.assigned_batch
        if not batch:
            return Response({'error': 'Student not assigned to any batch'}, status=400)
        
        total_sessions = CourseSession.objects.filter(batch=batch).count()
        completed_sessions = Student_Session_Progress.objects.filter(
            student=student,
            session__batch=batch,
            completed=True
        ).count()
        
        # Get details of completed sessions
        completed_details = []
        progress_records = Student_Session_Progress.objects.filter(
            student=student,
            session__batch=batch,
            completed=True
        ).select_related('session').order_by('session__session_number')
        
        for p in progress_records:
            completed_details.append({
                'session_number': p.session.session_number,
                'title': p.session.title,
                'completed_date': p.completed_date,
            })
        
        return Response({
            'student_name': f"{student.first_name} {student.last_name or ''}",
            'student_id': student.student_id,
            'batch_number': batch.batch_number,
            'total_sessions': total_sessions,
            'completed_sessions': completed_sessions,
            'remaining_sessions': total_sessions - completed_sessions,
            'completion_percentage': round((completed_sessions / total_sessions * 100), 1) if total_sessions > 0 else 0,
            'completed_sessions_details': completed_details,
            'logsheet_url': (
    batch.course_logsheet.url
    if batch.course_logsheet
    else batch.course_name.course_logsheet.url
    if batch.course_name and batch.course_name.course_logsheet
    else None
),
        })
        
    except Employee.DoesNotExist:
        return Response({'error': 'Trainer not found'}, status=404)
    except Students.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)



# from django.http import HttpResponse
# import json

# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def download_completion_report(request, student_id):
#     """Simple working version - returns text file for testing"""
#     try:
#         # Get the student
#         from .models import CompletedStudent
#         completed_student = CompletedStudent.objects.get(id=student_id)
        
#         # Create a simple text response
#         content = f"""
#         COMPLETION REPORT
#         =================
        
#         Student Name: {completed_student.first_name} {completed_student.last_name or ''}
#         Student ID: {completed_student.student_id}
#         Course: {completed_student.course_name or completed_student.course}
#         Batch: {completed_student.batch_number}
#         Branch: {completed_student.branch}
#         Start Date: {completed_student.batch_start_date}
#         Completion Date: {completed_student.completion_date}
#         Trainer: {completed_student.faculty_name}

#         """
        
#         response = HttpResponse(content, content_type='text/plain')
#         filename = f"completion_report_{completed_student.first_name}.txt"
#         response['Content-Disposition'] = f'attachment; filename="{filename}"'
#         return response
        
#     except CompletedStudent.DoesNotExist:
#         return Response({'error': f'Student with id {student_id} not found'}, status=404)
#     except Exception as e:
#         return Response({'error': str(e)}, status=500)


from django.http import HttpResponse
from io import BytesIO
import re

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_completion_report(request, student_id):
    """Generate a styled PDF completion report"""
    try:
        from .models import CompletedStudent
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER

        s = CompletedStudent.objects.get(id=student_id)
    except CompletedStudent.DoesNotExist:
        return Response({'error': f'Student {student_id} not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

    # ── Filename: StudentName_CourseName_Completion_Report.pdf ──────────────
    BLANK = '\u2014'

    def display(value):
        if value is None or value == '':
            return BLANK
        return str(value)

    student_name = f"{display(s.first_name)} {s.last_name or ''}".strip()
    course_name  = display(s.course_name or s.course or 'Course').strip()

    def safe(t):
        return re.sub(r'[^\w\s-]', '', t).replace(' ', '_')

    filename = f"{safe(student_name)}_{safe(course_name)}_Completion_Report.pdf"
    print(f"[COMPLETION_REPORT] completed_student_id={student_id}")
    print(f"[COMPLETION_REPORT] student_name={student_name}")

    # ── Colours ──────────────────────────────────────────────────────────────
    NAVY  = colors.HexColor('#0f1b2d')
    AMBER = colors.HexColor('#f4a940')
    TEAL  = colors.HexColor('#2ec4b6')
    SAGE  = colors.HexColor('#4caf81')
    SLATE = colors.HexColor('#8099b3')
    LIGHT = colors.HexColor('#f8fafc')
    WHITE = colors.white

    # ── Document ─────────────────────────────────────────────────────────────
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=18*mm, bottomMargin=18*mm,
    )
    W = A4[0] - 40*mm

    # ── Styles ───────────────────────────────────────────────────────────────
    title_style    = ParagraphStyle('T',  fontName='Helvetica-Bold',    fontSize=22, textColor=WHITE, alignment=TA_CENTER)
    subtitle_style = ParagraphStyle('S',  fontName='Helvetica',         fontSize=11, textColor=colors.HexColor('#fcd17a'), alignment=TA_CENTER)
    section_style  = ParagraphStyle('Se', fontName='Helvetica-Bold',    fontSize=11, textColor=NAVY, spaceAfter=6, spaceBefore=4)
    label_style    = ParagraphStyle('L',  fontName='Helvetica-Bold',    fontSize=9,  textColor=SLATE)
    value_style    = ParagraphStyle('V',  fontName='Helvetica',         fontSize=10, textColor=NAVY)
    congrats_style = ParagraphStyle('C',  fontName='Helvetica-Bold',    fontSize=13, textColor=SAGE, alignment=TA_CENTER)
    note_style     = ParagraphStyle('N',  fontName='Helvetica',         fontSize=9,  textColor=SLATE, alignment=TA_CENTER)
    footer_style   = ParagraphStyle('F',  fontName='Helvetica-Oblique', fontSize=8,  textColor=SLATE, alignment=TA_CENTER)

    def row(label, value):
        return [Paragraph(label.upper(), label_style), Paragraph(display(value), value_style)]

    def make_table(data):
        t = Table(data, colWidths=[W * 0.32, W * 0.68])
        t.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (0, -1), LIGHT),
            ('ROWBACKGROUNDS',(0, 0), (-1,-1), [WHITE, LIGHT]),
            ('GRID',          (0, 0), (-1,-1), 0.4, colors.HexColor('#e8e6e1')),
            ('TOPPADDING',    (0, 0), (-1,-1), 6),
            ('BOTTOMPADDING', (0, 0), (-1,-1), 6),
            ('LEFTPADDING',   (0, 0), (-1,-1), 10),
            ('RIGHTPADDING',  (0, 0), (-1,-1), 10),
        ]))
        return t

    story = []

    # ── Header banner ────────────────────────────────────────────────────────
    ht = Table(
        [[Paragraph('IIE CONNECT', title_style),
          Paragraph('Certificate of Course Completion', subtitle_style)]],
        colWidths=[W * 0.42, W * 0.58]
    )
    ht.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), NAVY),
        ('TOPPADDING',    (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ('LEFTPADDING',   (0,0), (-1,-1), 16),
        ('RIGHTPADDING',  (0,0), (-1,-1), 16),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(ht)
    story.append(Spacer(1, 10))

    # ── Congratulations strip ────────────────────────────────────────────────
    ct = Table([[Paragraph(f'Congratulations, {student_name}!', congrats_style)]], colWidths=[W])
    ct.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), colors.HexColor('#e8f8f0')),
        ('TOPPADDING',    (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING',   (0,0), (-1,-1), 14),
        ('RIGHTPADDING',  (0,0), (-1,-1), 14),
        ('BOX',           (0,0), (-1,-1), 1, SAGE),
    ]))
    story += [ct, Spacer(1, 4),
              Paragraph('This report confirms successful completion of the course programme.', note_style),
              Spacer(1, 12)]

    # ── Student Information ──────────────────────────────────────────────────
    story.append(Paragraph('Student Information', section_style))
    story.append(HRFlowable(width=W, thickness=2, color=AMBER, spaceAfter=6))
    story.append(make_table([
        row('Student Name',  student_name),
        row('Student ID',    s.student_id),
        row('Email',         s.email),
        row('Mobile',        s.mobile_no),
        row('Gender',        s.gender),
        row('Date of Birth', s.date_of_birth),
        row('City / State',  f"{display(s.city)} / {display(s.state)}"),
        row('Qualification', s.qualification),
        row('Branch',        s.branch),
    ]))
    story.append(Spacer(1, 14))

    # ── Course & Batch Details ───────────────────────────────────────────────
    c_sess = s.completed_sessions_count or 0
    t_sess = s.total_sessions_count or 0
    sess_text = f"{c_sess} / {t_sess}" + (f"  ({round(c_sess/t_sess*100)}%)" if t_sess else '')

    story.append(Paragraph('Course & Batch Details', section_style))
    story.append(HRFlowable(width=W, thickness=2, color=TEAL, spaceAfter=6))
    story.append(make_table([
        row('Course',          course_name),
        row('Batch Number',    s.batch_number),
        row('Batch Start',     s.batch_start_date),
        row('Batch End',       s.batch_end_date),
        row('Sessions Done',   sess_text),
        row('Trainer',         s.faculty_name),
        row('Completion Date', s.completion_date),
    ]))
    story.append(Spacer(1, 18))

    story.append(Paragraph('Performance Summary', section_style))
    story.append(HRFlowable(width=W, thickness=2, color=SAGE, spaceAfter=6))
    story.append(make_table([
        row('Sessions Completed',      sess_text),
        row('Attendance Percentage',   f"{display(s.attendance_percentage)}%"),
        row('Average Test Score',      f"{display(s.average_test_score)}%"),
    ]))
    story.append(Spacer(1, 18))

    # ── Footer ───────────────────────────────────────────────────────────────
    story.append(HRFlowable(width=W, thickness=1, color=SLATE, spaceAfter=6))
    story.append(Paragraph(
        'This is an auto-generated report from IIE Connect. For queries contact administration.',
        footer_style
    ))

    # ── Build & return ───────────────────────────────────────────────────────
    doc.build(story)
    buf.seek(0)

    pdf = buf.getvalue()
    print(f"[COMPLETION_REPORT] generated_pdf_size={len(pdf)}")

    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response['Content-Length'] = str(len(pdf))
    return response


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_announcement(request, pk):
    try:
        announcement = Announcement.objects.get(id=pk)
        serializer = AnnouncementSerializer(announcement, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    except Announcement.DoesNotExist:
        return Response({'error': 'Announcement not found'}, status=404)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_question(request, question_id):
    try:
        question = Question.objects.get(id=question_id)
        data = request.data
        
        question.question_text = data.get('question_text', question.question_text)
        question.option1 = data.get('option1', question.option1)
        question.option2 = data.get('option2', question.option2)
        question.option3 = data.get('option3', question.option3)
        question.option4 = data.get('option4', question.option4)
        question.correct_answer = data.get('correct_answer', question.correct_answer)
        question.save()
        
        return Response({'message': 'Question updated successfully'})
    except Question.DoesNotExist:
        return Response({'error': 'Question not found'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_question(request, question_id):
    try:
        question = Question.objects.get(id=question_id)
        question.delete()
        return Response({'message': 'Question deleted successfully'})
    except Question.DoesNotExist:
        return Response({'error': 'Question not found'}, status=404)




@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get('email', '').strip().lower()

    # ── DEBUG ─────────────────────────────────────────────────────────────
    all_users = User.objects.all()
    print(f"🔍 Looking for email: '{email}'")
    print(f"🔍 Total users in DB: {all_users.count()}")
    for u in all_users[:10]:
        print(f"   → username='{u.username}' | email='{u.email}'")
    # ─────────────────────────────────────────────────────────────────────

    if not email:
        return Response({'error': 'Email is required'}, status=400)

    user = None
    try:
        user = User.objects.get(username=email)
        print(f"✅ Found by username: {user.username}")
    except User.DoesNotExist:
        try:
            user = User.objects.get(email=email)
            print(f"✅ Found by email: {user.email}")
        except User.DoesNotExist:
            print(f"❌ Not found by username or email")

    if not user:
        return Response({'error': 'No account found with this email'}, status=404)

    # ── Generate OTP ──────────────────────────────────────────────────────
    otp = str(random.randint(100000, 999999))
    cache.set(f'otp_{email}', otp, timeout=600)
    print(f"✅ OTP generated: {otp} for {email}")

    # ── Send email (async) ────────────────────────────────────────────────────
    try:
        portal_url = get_portal_url(request)
        send_email_async(
            subject='IIE Connect — Password Reset OTP',
            message=f"""Dear {user.first_name or user.username},

Your OTP for password reset is:

    {otp}

This OTP is valid for 10 minutes.

If you did not request this, please ignore this email.

Best regards,
IIE Connect Team
{portal_url}
""",
            recipient_list=[email],
        )
        print(f"✅ OTP email queued for {email}")
    except Exception as e:
        print(f"❌ Email queueing error: {e}")

    return Response({'message': 'OTP sent successfully'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    email = request.data.get('email', '').strip().lower()
    otp = request.data.get('otp', '').strip()
    new_password = request.data.get('new_password', '').strip()

    print(f"🔍 Reset attempt: email='{email}' otp='{otp}'")

    if not all([email, otp, new_password]):
        return Response({'error': 'All fields are required'}, status=400)

    if len(new_password) < 6:
        return Response({'error': 'Password must be at least 6 characters'}, status=400)

    # ── Verify OTP ────────────────────────────────────────────────────────
    cached_otp = cache.get(f'otp_{email}')
    print(f"🔍 Cached OTP: '{cached_otp}' | Entered OTP: '{otp}'")

    if not cached_otp:
        return Response({'error': 'OTP has expired. Please request a new one'}, status=400)
    if cached_otp != otp:
        return Response({'error': 'Invalid OTP'}, status=400)

    # ── Reset password ────────────────────────────────────────────────────
    user = None
    try:
        user = User.objects.get(username=email)
    except User.DoesNotExist:
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            pass

    if not user:
        return Response({'error': 'User not found'}, status=404)

    user.set_password(new_password)
    user.save()
    cache.delete(f'otp_{email}')
    print(f"✅ Password reset for {email}")

    return Response({'message': 'Password reset successfully'})



# ── Fee Management Views ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_fee_details(request):
    try:
        student = Students.objects.get(user=request.user)
        fee = FeePayment.objects.filter(student=student).order_by('-created_at').first()
        if not fee:
            return Response({'fee': None})
        transactions = FeeTransaction.objects.filter(fee_payment=fee).order_by('-paid_at')
        return Response({
            'fee': {
                'id': fee.id,
                'total_fee': float(fee.total_fee),
                'amount_paid': float(fee.amount_paid),
                'balance': float(fee.balance),
                'is_fully_paid': fee.is_fully_paid,
                'batch_number': fee.batch.batch_number,
                'course_name': fee.batch.course_name.course_name if fee.batch.course_name else '—',
            },
            'transactions': [{
                'id': t.id,
                'amount': float(t.amount),
                'payment_mode': t.payment_mode,
                'notes': t.notes or '—',
                'paid_at': t.paid_at,
                'bill_generated': t.bill_generated,
            } for t in transactions]
        })
    except Students.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_fee_list(request):
    """Admin views all fee records"""
    fees = FeePayment.objects.select_related('student', 'batch').order_by('-created_at')
    branch = request.query_params.get('branch')
    if branch:
        fees = fees.filter(student__branch=branch)

    data = []
    for fee in fees:
        data.append({
            'id': fee.id,
            'student_name': f"{fee.student.first_name} {fee.student.last_name or ''}",
            'student_id': fee.student.student_id,
            'branch': fee.student.branch,
            'batch_number': fee.batch.batch_number,
            'course_name': fee.batch.course_name.course_name if fee.batch.course_name else '—',
            'total_fee': float(fee.total_fee),
            'amount_paid': float(fee.amount_paid),
            'balance': float(fee.balance),
            'is_fully_paid': fee.is_fully_paid,
            'created_at': fee.created_at,
        })
    return Response({'results': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_fee_payment(request, fee_id):
    try:
        user = request.user
        fee = FeePayment.objects.get(id=fee_id)

        # ── Allow admin and counselor ─────────────────────────────
        if not (user.is_superuser or user.is_staff):
            try:
                emp = Employee.objects.get(user=user)
                if emp.designation.lower() != 'counselor':
                    return Response({'error': 'Access denied'}, status=403)
                if fee.student.branch != emp.branch:
                    return Response({'error': 'Access denied — different branch'}, status=403)
            except Employee.DoesNotExist:
                return Response({'error': 'Access denied'}, status=403)
        # ─────────────────────────────────────────────────────────

        amount = float(request.data.get('amount', 0))
        payment_mode = request.data.get('payment_mode', 'cash')
        notes = request.data.get('notes', '')

        if amount <= 0:
            return Response({'error': 'Amount must be greater than 0'}, status=400)
        if amount > float(fee.balance):
            return Response({'error': f'Amount exceeds balance of ₹{fee.balance}'}, status=400)

        from decimal import Decimal
        transaction = FeeTransaction.objects.create(
            fee_payment=fee,
            amount=amount,
            payment_mode=payment_mode,
            notes=notes,
            collected_by=request.user,
        )

        fee.refresh_from_db()
        fee.amount_paid = fee.amount_paid + Decimal(str(amount))
        fee.balance = fee.total_fee - fee.amount_paid
        fee.is_fully_paid = fee.balance <= Decimal('0')
        fee.save()

        return Response({
            'success': True,
            'message': f'Payment of ₹{amount} recorded successfully!',
            'balance': float(fee.balance),
            'is_fully_paid': fee.is_fully_paid,
        })
    except FeePayment.DoesNotExist:
        return Response({'error': 'Fee record not found'}, status=404)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({'error': str(e)}, status=500)

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# Register a Unicode font
font_path = os.path.join(os.path.dirname(__file__), 'fonts', 'NotoSans-Regular.ttf')
font_bold_path = os.path.join(os.path.dirname(__file__), 'fonts', 'NotoSans-Bold.ttf')

if os.path.exists(font_path):
    pdfmetrics.registerFont(TTFont('NotoSans', font_path))
    pdfmetrics.registerFont(TTFont('NotoSans-Bold', font_bold_path))
    MAIN_FONT = 'NotoSans'
    BOLD_FONT = 'NotoSans-Bold'
else:
    MAIN_FONT = 'Helvetica'
    BOLD_FONT = 'Helvetica-Bold'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_bill(request, fee_id):
    """Generate PDF bill in IIE format"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from django.http import HttpResponse
        from io import BytesIO

        # ── Access control ────────────────────────────────────────
        # ── Access control ────────────────────────────────────────
        user = request.user
        if user.is_superuser or user.is_staff:
            fee = FeePayment.objects.select_related('student', 'batch').get(id=fee_id)
        else:
            try:
                emp = Employee.objects.get(user=user)
                if emp.designation.lower() == 'counselor':
                    fee = FeePayment.objects.select_related('student', 'batch').get(
                        id=fee_id, student__branch=emp.branch
                    )
                else:
                    return Response({'error': 'Access denied'}, status=403)
            except Employee.DoesNotExist:
                try:
                    student = Students.objects.get(user=user)
                    fee = FeePayment.objects.select_related('student', 'batch').get(id=fee_id, student=student)
                except Students.DoesNotExist:
                    return Response({'error': 'Access denied'}, status=403)

        transactions = FeeTransaction.objects.filter(fee_payment=fee).order_by('paid_at')

        # ── Colors ────────────────────────────────────────────────
        NAVY   = colors.HexColor('#1a237e')
        BLACK  = colors.black
        GRAY   = colors.HexColor('#555555')
        WHITE  = colors.white
        BORDER = colors.HexColor('#cccccc')
        LGRAY  = colors.HexColor('#f9f9f9')

        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4,
            leftMargin=15*mm, rightMargin=15*mm,
            topMargin=10*mm, bottomMargin=12*mm)
        W = A4[0] - 30*mm

        # ── Styles ────────────────────────────────────────────────
        inst_name_s = ParagraphStyle('IN', fontName=BOLD_FONT, fontSize=18, textColor=NAVY, alignment=TA_CENTER, spaceAfter=6)
        inst_addr_s = ParagraphStyle('IA', fontName=MAIN_FONT, fontSize=9, textColor=GRAY, alignment=TA_CENTER, leading=16, spaceAfter=4)
        label_s     = ParagraphStyle('L',  fontName=BOLD_FONT, fontSize=9.5, textColor=BLACK)
        value_s     = ParagraphStyle('V',  fontName=MAIN_FONT, fontSize=9.5, textColor=BLACK)
        footer_s    = ParagraphStyle('F',  fontName=MAIN_FONT, fontSize=8, textColor=GRAY, alignment=TA_RIGHT)
        note_s      = ParagraphStyle('N',  fontName=MAIN_FONT, fontSize=8, textColor=GRAY, alignment=TA_LEFT)

        story = []

        # ── Receipt & Date info ───────────────────────────────────
        receipt_no      = f"IIE{fee.student.branch.upper()[:3]}{fee.id:04d}"
        date_str        = fee.updated_at.strftime('%Y-%m-%d')
        received_amount = float(transactions.last().amount) if transactions.exists() else float(fee.amount_paid)
        already_paid    = float(fee.amount_paid) - received_amount

        # ── Logo ──────────────────────────────────────────────────
        # ── Logo ──────────────────────────────────────────────────
        from django.conf import settings

        logo_path = None
        possible_paths = [
            # Django app static folder
            os.path.join(os.path.dirname(__file__), 'static', 'IIE.png'),
            # Project root static folder  
            os.path.join(settings.BASE_DIR, 'static', 'IIE.png'),
            # Frontend assets
            os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'assets', 'IIE.png'),
            os.path.join(settings.BASE_DIR, 'frontend', 'src', 'assets', 'IIE.png'),
            # Absolute fallback
            r'C:\Users\vivek\OneDrive\Desktop\iie_connect_fullstack\frontend\src\assets\IIE.png',
        ]

        for p in possible_paths:
            p = os.path.normpath(p)
            print(f"Checking: {p} → {os.path.exists(p)}")
            if os.path.exists(p):
                logo_path = p
                break

        logo_cell = RLImage(logo_path, width=28*mm, height=28*mm) if logo_path else Paragraph('<b>IIE</b>', label_s)
        # ══════════════════════════════════════════════════════════
        # HEADER — Logo left, Institution center
        # ══════════════════════════════════════════════════════════
        inst_table = Table([
        [Paragraph('INDRA INSTITUTE OF EDUCATION', inst_name_s)],
        [Paragraph('65/1, Tatabad, 7th Street, Dr Rajendra Prasad Rd, near BEA,\nGandhipuram, Coimbatore - 641012', inst_addr_s)],
        [Paragraph('IT Training and Testing Services', inst_addr_s)],
        [Paragraph('Ph : +91-9159779111', inst_addr_s)],
        ], colWidths=[W * 0.80])
        inst_table.setStyle(TableStyle([
            ('TOPPADDING',    (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))

        header_t = Table([[logo_cell, inst_table]], colWidths=[W*0.20, W*0.80])
        header_t.setStyle(TableStyle([
            ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
            ('BOX',           (0,0), (-1,-1), 1, BORDER),
            ('TOPPADDING',    (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('LEFTPADDING',   (0,0), (-1,-1), 8),
            ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ]))
        story += [header_t, Spacer(1, 16)]

        # ══════════════════════════════════════════════════════════
        # MAIN DETAILS TABLE
        # ══════════════════════════════════════════════════════════
        LW = W * 0.20   # label col
        VW = W * 0.30   # value col

        def lbl(text): return Paragraph(f'<b>{text}</b>', label_s)
        def val(text): return Paragraph(str(text) if text else '—', value_s)

        # Calculate installments
        # ── Calculate installment rows ────────────────────────────
        total = float(fee.total_fee)
        num_transactions = transactions.count()

        # Build dynamic installment info for right side
        right_extra_rows = []
        for idx, t in enumerate(transactions, 1):
            right_extra_rows.append((f'{idx}{"st" if idx==1 else "nd" if idx==2 else "rd" if idx==3 else "th"} Fee:', f"Rs. {float(t.amount):,.0f}"))

        details_data = [
            [lbl('Date :'), val(date_str), lbl('Receipt No :'), val(receipt_no)],
            [lbl('Student Name :'), val(f"{fee.student.first_name} {fee.student.last_name or ''}"),
            lbl('Batch Date :'), val(str(fee.batch.start_date) if fee.batch.start_date else '—')],
            [lbl('Mobile No :'), val(fee.student.mobile_no or '—'),
            lbl('Course Fees :'), val(f"Rs. {total:,.0f}")],
            [lbl('Email ID :'), val(fee.student.email or '—'),
            lbl('Received Fees :'), val(f"Rs. {float(fee.amount_paid):,.0f}")],
            [lbl('Address:'), val(f"{fee.student.city or '—'},"),
            lbl(right_extra_rows[0][0] if len(right_extra_rows) > 0 else ''),
            val(right_extra_rows[0][1] if len(right_extra_rows) > 0 else '')],
            [Paragraph('', value_s), val(f"{fee.student.state or ''}"),
            lbl(right_extra_rows[1][0] if len(right_extra_rows) > 1 else ''),
            val(right_extra_rows[1][1] if len(right_extra_rows) > 1 else '')],
        ]

        # Add extra fee rows if more than 2 transactions
        for idx in range(2, len(right_extra_rows)):
            details_data.append([
                Paragraph('', value_s), Paragraph('', value_s),
                lbl(right_extra_rows[idx][0]),
                val(right_extra_rows[idx][1]),
            ])

        # Add course + balance row
        details_data.append([
            lbl('Course:'),
            val(fee.batch.course_name.course_name if fee.batch.course_name else '—'),
            lbl('Balance Due:'),
            val('Completely Paid' if fee.is_fully_paid else f"Rs. {float(fee.balance):,.0f}"),
        ])

        # Add status row
        details_data.append([
            Paragraph('', value_s), Paragraph('', value_s),
            lbl('Status:'),
            val('Completely Paid' if fee.is_fully_paid else 'Pending'),
        ])

        details_t = Table(details_data, colWidths=[LW, VW, LW, VW])
        details_t.setStyle(TableStyle([
        ('BOX',           (0,0), (-1,-1), 1, BORDER),
        ('LINEBELOW',     (0,0), (-1,-1), 0.3, BORDER),
        ('TOPPADDING',    (0,0), (-1,-1), 12),      # ← increased from 7
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),      # ← increased from 7
        ('LEFTPADDING',   (0,0), (-1,-1), 12),      # ← increased from 8
        ('RIGHTPADDING',  (0,0), (-1,-1), 12),      # ← increased from 8
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS',(0,0), (-1,-1), [WHITE, LGRAY]),
        ]))
        story += [details_t, Spacer(1, 16)]

        # ══════════════════════════════════════════════════════════
        # PAYMENT HISTORY (if multiple transactions)
        # ══════════════════════════════════════════════════════════
        if transactions.count() > 1:
            tx_data = [[
                Paragraph('<b>DATE</b>', label_s),
                Paragraph('<b>AMOUNT</b>', label_s),
                Paragraph('<b>MODE</b>', label_s),
                Paragraph('<b>NOTES</b>', label_s),
            ]]
            for t in transactions:
                tx_data.append([
                    val(t.paid_at.strftime('%Y-%m-%d')),
                    val(f"Rs. {float(t.amount):,.0f}"),
                    val(t.get_payment_mode_display()),
                    val(t.notes or '—'),
                ])
            tt = Table(tx_data, colWidths=[W*0.20, W*0.20, W*0.20, W*0.40])
            tt.setStyle(TableStyle([
                ('BOX',           (0,0), (-1,-1), 1, BORDER),
                ('LINEBELOW',     (0,0), (-1,-1), 0.3, BORDER),
                ('BACKGROUND',    (0,0), (-1,0), LGRAY),
                ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, LGRAY]),
                ('TOPPADDING',    (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('LEFTPADDING',   (0,0), (-1,-1), 8),
            ]))
            story += [tt, Spacer(1, 10)]

        # ══════════════════════════════════════════════════════════
        # FOOTER
        # ══════════════════════════════════════════════════════════
        story.append(HRFlowable(width=W, thickness=0.5, color=BORDER, spaceAfter=4))
        footer_data = [[
            Paragraph('* Fees once paid cannot be refunded.', note_s),
            Paragraph('This is computer generated bill no signature required.', footer_s),
        ]]
        footer_t = Table(footer_data, colWidths=[W*0.5, W*0.5])
        footer_t.setStyle(TableStyle([
            ('TOPPADDING',    (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(footer_t)

        # ── Build ─────────────────────────────────────────────────
        doc.build(story)
        buf.seek(0)
        transactions.update(bill_generated=True)

        student_name = f"{fee.student.student_id}_{fee.student.first_name}_{fee.student.last_name or ''}".strip('_')
        course_name  = fee.batch.course_name.course_name.replace(' ', '_') if fee.batch.course_name else 'Course'
        response = HttpResponse(buf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{student_name}_{course_name}.pdf"'
        return response

    except FeePayment.DoesNotExist:
        return Response({'error': 'Fee record not found'}, status=404)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def create_fee_payment_request(request, fee_id):
    """Counselor submits payment request to admin for approval"""
    try:
        user = request.user
        try:
            emp = Employee.objects.get(user=user)
            if emp.designation.lower() != 'counselor':
                return Response({'error': 'Access denied'}, status=403)
        except Employee.DoesNotExist:
            return Response({'error': 'Access denied'}, status=403)

        fee = FeePayment.objects.get(id=fee_id, student__branch=emp.branch)

        amount = request.data.get('amount')
        payment_mode = request.data.get('payment_mode', 'cash')
        notes = request.data.get('notes', '')
        screenshot = request.FILES.get('screenshot', None)

        if not amount or float(amount) <= 0:
            return Response({'error': 'Enter valid amount'}, status=400)
        if float(amount) > float(fee.balance):
            return Response({'error': f'Amount exceeds balance of ₹{fee.balance}'}, status=400)

        # Check if there's already a pending request
        existing = FeePaymentRequest.objects.filter(
            fee_payment=fee, status='pending'
        ).first()
        if existing:
            return Response({'error': 'A pending request already exists for this student'}, status=400)

        req = FeePaymentRequest.objects.create(
            student=fee.student,
            fee_payment=fee,
            amount=amount,
            payment_mode=payment_mode,
            notes=notes,
            screenshot=screenshot,
            status='pending',
        )

        # Notify admin via email (async)
        try:
            admins = User.objects.filter(is_superuser=True)
            admin_emails = list(admins.values_list('email', flat=True))
            if admin_emails:
                send_email_async(
                    subject=f'Fee Payment Request — {fee.student.first_name} {fee.student.last_name or ""}',
                    message=f"""Dear Admin,

Counselor {emp.first_name} {emp.last_name or ''} has submitted a payment request for:

Student    : {fee.student.first_name} {fee.student.last_name or ''} ({fee.student.student_id})
Branch     : {fee.student.branch}
Amount     : Rs. {amount}
Mode       : {payment_mode}
Notes      : {notes or 'N/A'}
Batch      : {fee.batch.batch_number}
Balance Due: Rs. {fee.balance}

Please review and approve/reject in the Fee Management → Payment Requests section.

Best regards,
IIE Connect System
""",
                    recipient_list=admin_emails,
                )
        except Exception as e:
            print(f"Email queueing error: {e}")

        return Response({
            'success': True,
            'message': 'Payment request submitted to admin for approval!',
            'request_id': req.id,
        })

    except FeePayment.DoesNotExist:
        return Response({'error': 'Fee record not found'}, status=404)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({'error': str(e)}, status=500)




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_fee_payment_requests(request):
    """Admin views all payment requests from students"""
    requests_qs = FeePaymentRequest.objects.select_related(
        'student', 'fee_payment', 'fee_payment__batch', 'fee_payment__batch__course_name'
    ).order_by('-requested_at')

    status_filter = request.query_params.get('status', 'pending')
    if status_filter:
        requests_qs = requests_qs.filter(status=status_filter)

    data = []
    for r in requests_qs:
        # ── Always fetch fresh balance from fee_payment ───────────
        fee_payment = r.fee_payment
        fee_payment.refresh_from_db()
        current_balance = float(fee_payment.balance)
        balance_after = max(current_balance - float(r.amount), 0)
        # ─────────────────────────────────────────────────────────

        # ── Screenshot URL ────────────────────────────────────────
        screenshot_url = None
        if r.screenshot:
            try:
                screenshot_url = request.build_absolute_uri(r.screenshot.url)
            except Exception:
                screenshot_url = None
        # ─────────────────────────────────────────────────────────

        data.append({
            'id': r.id,
            'student_name': f"{r.student.first_name} {r.student.last_name or ''}",
            'student_id': r.student.student_id,
            'branch': r.student.branch,
            'fee_id': fee_payment.id,
            'amount': float(r.amount),
            'payment_mode': r.payment_mode,
            'notes': r.notes,
            'status': r.status,
            'requested_at': r.requested_at,
            'batch_number': fee_payment.batch.batch_number,
            'course_name': fee_payment.batch.course_name.course_name if fee_payment.batch.course_name else '—',
            'current_balance': current_balance,
            'balance_after': balance_after,
            'screenshot': screenshot_url,   # ← ADD THIS
        })
    return Response({'results': data})



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_fee_payment_request(request, request_id):
    """Admin approves or rejects a student payment request"""
    try:
        pay_req = FeePaymentRequest.objects.get(id=request_id)
        action = request.data.get('action')  # 'approve' or 'reject'

        if action == 'approve':
            fee = pay_req.fee_payment
            from decimal import Decimal

            FeeTransaction.objects.create(
                fee_payment=fee,
                amount=pay_req.amount,
                payment_mode=pay_req.payment_mode,
                notes=pay_req.notes or 'Student payment request approved',
                collected_by=request.user,
                bill_generated=False,
            )

            # ── Force refresh and recalculate ─────────────────────
            fee.refresh_from_db()
            fee.amount_paid = fee.amount_paid + Decimal(str(pay_req.amount))
            fee.balance = fee.total_fee - fee.amount_paid
            fee.is_fully_paid = fee.balance <= Decimal('0')
            fee.save()
            # ─────────────────────────────────────────────────────

            # ── Mark request as approved ──────────────────────────
            pay_req.status = 'approved'
            pay_req.reviewed_at = timezone.now()
            pay_req.reviewed_by = request.user
            pay_req.save()
            # ─────────────────────────────────────────────────────

            # ── Notify student ────────────────────────────────────
            # ── Notify student (async) ────────────────────────────────
            try:
                send_email_async(
                    subject='Fee Payment Verified ✅',
                    message=f"""Dear {pay_req.student.first_name},

Your payment of Rs. {pay_req.amount} has been verified and recorded.

Remaining Balance: Rs. {fee.balance}
Status: {'Fully Paid' if fee.is_fully_paid else 'Partial Payment'}

Best regards,
IIE Connect Team
""",
                    recipient_list=[pay_req.student.email],
                )
            except Exception as e:
                print(f"Email queueing error: {e}")
            # ─────────────────────────────────────────────────────

            return Response({
                'success': True,
                'message': f'Payment of Rs. {pay_req.amount} approved and recorded!',
                'new_balance': float(fee.balance),
                'is_fully_paid': fee.is_fully_paid,
            })

        elif action == 'reject':
            pay_req.status = 'rejected'
            pay_req.reviewed_at = timezone.now()
            pay_req.reviewed_by = request.user
            pay_req.save()
            return Response({'success': True, 'message': 'Payment request rejected.'})

        return Response({'error': 'Invalid action'}, status=400)

    except FeePaymentRequest.DoesNotExist:
        return Response({'error': 'Request not found'}, status=404)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({'error': str(e)}, status=500)







# ── COUNSELOR ANNOUNCEMENTS ────────────────────────────────────────────────────

from connect.serializers import CounselorAnnouncementSerializer


class CounselorAnnouncementListView(generics.ListAPIView):
    serializer_class = CounselorAnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        counselor = Employee.objects.filter(user=user, designation__iexact='counselor').first()
        if not counselor:
            return Announcement.objects.none()
        return Announcement.objects.filter(created_by=user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.exception("Unhandled exception in CounselorAnnouncementListView.list")
            return Response({
                'error': 'Counselor announcements retrieval failed',
                'details': str(e),
                'view': 'CounselorAnnouncementListView.list'
            }, status=500)


class CounselorAnnouncementCreateView(generics.CreateAPIView):
    serializer_class = CounselorAnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        try:
            emp = Employee.objects.get(user=user, designation='counselor')
        except Employee.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only counselors can use this endpoint.")
        
        # Save the announcement first
        announcement = serializer.save(created_by=user)
        
        # Handle specific students
        specific_student_ids = self.request.data.get('specific_student_ids', [])
        if specific_student_ids:
            from connect.models import Students
            students = Students.objects.filter(id__in=specific_student_ids)
            announcement.specific_students.set(students)
        
        return announcement

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def counselor_update_announcement(request, pk):
    try:
        Employee.objects.get(user=request.user, designation='counselor')
        ann = Announcement.objects.get(id=pk, created_by=request.user)
        serializer = CounselorAnnouncementSerializer(ann, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    except Employee.DoesNotExist:
        return Response({'error': 'Permission denied'}, status=403)
    except Announcement.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def counselor_toggle_announcement(request, pk):
    try:
        Employee.objects.get(user=request.user, designation='counselor')
        ann = Announcement.objects.get(id=pk, created_by=request.user)
        ann.is_published = not ann.is_published
        ann.save()
        return Response({'is_published': ann.is_published})
    except Employee.DoesNotExist:
        return Response({'error': 'Permission denied'}, status=403)
    except Announcement.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def counselor_delete_announcement(request, pk):
    try:
        Employee.objects.get(user=request.user, designation='counselor')
        Announcement.objects.get(id=pk, created_by=request.user).delete()
        return Response(status=204)
    except Employee.DoesNotExist:
        return Response({'error': 'Permission denied'}, status=403)
    except Announcement.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)



# ── BRANCH ANNOUNCEMENTS (for mentor & student) ───────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def branch_announcements(request):
    try:
        user = request.user
        branch = None
        allowed_types = ['all']

        student = Students.objects.filter(user=user).first()
        if student:
            branch = student.branch
            allowed_types = ['all', 'students']
        else:
            emp = Employee.objects.filter(user=user).first()
            if emp:
                branch = emp.branch
                if emp.designation.lower() in ['mentor', 'trainer']:
                    allowed_types = ['all', 'mentors', 'staff']
                elif emp.designation.lower() == 'counselor':
                    allowed_types = ['all', 'counselors', 'staff']

        if not branch:
            return Response({'results': []})

        announcements = Announcement.objects.filter(
            is_published=True,
            recipient_type__in=allowed_types
        ).order_by('-created_at')

        visible = []
        for ann in announcements:
            creator_emp = Employee.objects.filter(user=ann.created_by).first()
            if creator_emp and (creator_emp.branch or '').strip().lower() == branch.strip().lower():
                visible.append(ann)

        serializer = CounselorAnnouncementSerializer(visible, many=True)
        return Response({'results': serializer.data, 'count': len(visible)})

    except Exception as e:
        logger.exception("Unhandled exception in branch_announcements")
        return Response({
            'error': 'Branch announcements retrieval failed',
            'details': str(e),
            'view': 'branch_announcements'
        }, status=500)
# ── COUNSELOR FORM HELPERS ────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def counselor_branch_batches(request):
    """Return batches in counselor's branch with trainer name for the announcement form."""
    try:
        emp = Employee.objects.get(user=request.user, designation='counselor')
        from connect.models import Batches
        
        # Fetch batches with related faculty (trainer) and course_name
        batches = Batches.objects.filter(branch=emp.branch).select_related('faculty', 'course_name')
        
        data = []
        for batch in batches:
            # Get trainer/faculty name
            trainer_name = "No trainer assigned"
            if batch.faculty:
                trainer_name = f"{batch.faculty.first_name} {batch.faculty.last_name or ''}".strip()
            
            # Get course name
            course_name = batch.course_name.course_name if batch.course_name else "—"
            
            # Get timing display
            timing_display = batch.get_batch_timing_display() if hasattr(batch, 'get_batch_timing_display') else batch.batch_timing
            
            data.append({
                'id': batch.id,
                'batch_number': batch.batch_number,
                'batch_timing': timing_display or batch.batch_timing,
                'trainer_name': trainer_name,
                'course_name': course_name,
                'display_text': f"{batch.batch_number} — {course_name} (Trainer: {trainer_name}) — {timing_display or batch.batch_timing}"
            })
        
        print(f"✅ Returning {len(data)} batches with trainer names")  # Debug log
        return Response(data)
        
    except Employee.DoesNotExist:
        return Response({'error': 'Permission denied'}, status=403)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def counselor_branch_students(request):
    """Return only active students (not fully completed) in counselor's branch.
    Partially completed (reassigned) students ARE included — they are still active.
    """
    try:
        emp = Employee.objects.get(user=request.user, designation='counselor')
        from connect.models import Students, CompletedStudent

        # Only FULLY completed students should be excluded
        try:
            fully_completed_emails = set(
                CompletedStudent.objects.filter(completion_type='full').values_list('email', flat=True)
            )
            fully_completed_sids = set(
                CompletedStudent.objects.filter(completion_type='full').values_list('original_student_id', flat=True)
            )
        except DatabaseError:
            logger.exception("Database error while querying CompletedStudent.completion_type in counselor_branch_students")
            fully_completed_emails = set()
            fully_completed_sids = set()

        all_students = Students.objects.filter(branch__iexact=emp.branch)

        batch_id = request.query_params.get('batch')
        if batch_id:
            all_students = all_students.filter(assigned_batch_id=batch_id)

        print(f"[DEBUG] branch={emp.branch}, total={all_students.count()}, fully_completed={len(fully_completed_emails)}")

        active = []
        for s in all_students:
            if s.email in fully_completed_emails or s.student_id in fully_completed_sids:
                continue
            active.append({
                'id':         s.id,
                'name':       f'{s.first_name} {s.last_name}'.strip(),
                'student_id': s.student_id,
            })

        print(f"[DEBUG] active count={len(active)}")
        return Response(active)
    except Employee.DoesNotExist:
        return Response({'error': 'Permission denied'}, status=403)



# ── COURSE TYPES ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_type_list(request):
    """List all active course types — used in dropdowns."""
    from connect.models import CourseType
    qs = CourseType.objects.filter(is_active=True).order_by('name')
    data = [{'id': ct.id, 'name': ct.name, 'value': ct.value} for ct in qs]
    return Response(data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_course_types(request):
    from connect.models import CourseType

    if request.method == 'GET':
        qs = CourseType.objects.all().order_by('name')
        data = [
            {
                'id': ct.id,
                'name': ct.name,
                'value': ct.value,
                'is_active': ct.is_active,
                'created_at': ct.created_at,
            }
            for ct in qs
        ]
        return Response(data)

    name = request.data.get('name', '').strip()
    value = request.data.get('value', '').strip().lower().replace(' ', '_')

    if not name:
        return Response({'error': 'Name is required'}, status=400)

    if not value:
        value = name.lower().replace(' ', '_').replace('&', 'and').replace('/', '_')

    value = value.replace('/', '_')

    if CourseType.objects.filter(value=value).exists():
        return Response({'error': 'A course type with this value already exists'}, status=400)

    if CourseType.objects.filter(name__iexact=name).exists():
        return Response({'error': 'A course type with this name already exists'}, status=400)

    ct = CourseType.objects.create(
        name=name,
        value=value,
        is_active=True
    )

    return Response({
        'id': ct.id,
        'name': ct.name,
        'value': ct.value,
        'is_active': ct.is_active,
        'created_at': ct.created_at,
    }, status=201)
@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_course_type_detail(request, pk):
    """Admin: toggle active / delete a course type."""
    from connect.models import CourseType
    try:
        ct = CourseType.objects.get(pk=pk)
    except CourseType.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if request.method == 'DELETE':
        ct.delete()
        return Response(status=204)

    # PATCH — toggle is_active or rename
    if 'is_active' in request.data:
        ct.is_active = request.data['is_active']
    if 'name' in request.data:
        ct.name = request.data['name'].strip()
    ct.save()
    return Response({'id': ct.id, 'name': ct.name, 'value': ct.value, 'is_active': ct.is_active})
