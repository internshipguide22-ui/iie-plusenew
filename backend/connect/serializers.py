from django.contrib.auth.models import User
from rest_framework import serializers
from .models import (
    Courses, Employee, Batches, Students,
    StudentAttendance, StudyMaterial, QuizTest, Question, AssignedTest,
    StaffLeaveRequest, StudentLeaveApplication, SupportRequest, StudentSupportRequest,
    CourseSession, SessionCompletion, DailySessionCompletion,
    SessionNotification, StudentSessionStatus, Student_Session_Progress,
    DoubtResponse, Announcement, AnnouncementView, CounselorLeaveRequest,
    CounselorSupportRequest, Quiz, QuizQuestion, QuizAttempt, QuizAnswer,
    CompletedStudent, SessionCompletionRequest, TrainerSessionReport, TestResult,
    CounselorAnnouncement, GalleryItem, NewsItem, CalendarEvent, Referral, VlogItem
)


def strip_unsupported_mysql_chars(value):
    """Remove 4-byte unicode chars such as emojis for older MySQL utf8 columns."""
    return ''.join(ch for ch in str(value or '') if ord(ch) <= 0xFFFF)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Courses
        fields = '__all__'


class GalleryItemSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = GalleryItem
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'created_at']


class VlogItemSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = VlogItem
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'created_at']


class NewsItemSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = NewsItem
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'created_at']


class CalendarEventSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = CalendarEvent
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'created_at']

    def validate_event_name(self, value):
        value = strip_unsupported_mysql_chars(value).strip()
        if len(value) < 2:
            raise serializers.ValidationError('Event name must be at least 2 characters.')
        return value

    def validate_message(self, value):
        value = strip_unsupported_mysql_chars(value).strip()
        if len(value) < 2:
            raise serializers.ValidationError('Message must be at least 2 characters.')
        return value


class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = '__all__'
        read_only_fields = ['created_at']

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters.')
        return value

    def validate_mobile(self, value):
        cleaned = ''.join(ch for ch in value if ch.isdigit())
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise serializers.ValidationError('Enter a valid mobile number.')
        return cleaned


class EmployeeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'


# connect/serializers.py
# connect/serializers.py
from .models import Batches, Courses

class BatchSerializer(serializers.ModelSerializer):
    course_name_display = serializers.SerializerMethodField()
    faculty_name = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    course_fee = serializers.SerializerMethodField()   # ← ADD THIS

    class Meta:
        model = Batches
        fields = '__all__'

    def get_course_name_display(self, obj):
        try:
            if obj.course_name:
                if hasattr(obj.course_name, 'title'):
                    return obj.course_name.title
                elif hasattr(obj.course_name, 'name'):
                    return obj.course_name.name
                elif hasattr(obj.course_name, 'course_name'):
                    return obj.course_name.course_name
                else:
                    return str(obj.course_name)
            elif hasattr(obj, 'course') and obj.course:
                if hasattr(obj.course, 'title'):
                    return obj.course.title
                elif hasattr(obj.course, 'name'):
                    return obj.course.name
                else:
                    return str(obj.course)
        except Exception as e:
            print(f"Error getting course name: {e}")
        return '—'

    def get_faculty_name(self, obj):
        if obj.faculty:
            return f"{obj.faculty.first_name} {obj.faculty.last_name or ''}".strip()
        return '—'

    def get_student_count(self, obj):
        return Students.objects.filter(assigned_batch=obj).count()

    def get_course_fee(self, obj):   # ← ADD THIS
        try:
            if obj.course_name and hasattr(obj.course_name, 'fee') and obj.course_name.fee:
                return obj.course_name.fee
        except Exception:
            pass
        return None
    

class StudentSerializer(serializers.ModelSerializer):
    assigned_staff_name = serializers.SerializerMethodField()
    assigned_batch_number = serializers.CharField(source='assigned_batch.batch_number', read_only=True)

    class Meta:
        model = Students
        fields = '__all__'

    def get_assigned_staff_name(self, obj):
        if obj.assigned_staff:
            return f"{obj.assigned_staff.first_name} {obj.assigned_staff.last_name or ''}"
        return None

class AttendanceSerializer(serializers.ModelSerializer):
    batch_number = serializers.SerializerMethodField()
    marked_by = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    student_id_display = serializers.SerializerMethodField()

    class Meta:
        model = StudentAttendance
        fields = '__all__'

    def get_batch_number(self, obj):
        return obj.batch.batch_number if obj.batch else '—'

    def get_marked_by(self, obj):
        if obj.staff:
            return f"{obj.staff.first_name} {obj.staff.last_name or ''}".strip()
        return '—'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name or ''}".strip()
        return '—'

    def get_student_id_display(self, obj):
        return obj.student.student_id if obj.student else '—'

class StudyMaterialSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = StudyMaterial
        fields = '__all__'
        extra_kwargs = {
            'uploaded_by': {'read_only': True},
        }

    def get_uploaded_by_name(self, obj):
        return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name or ''}"


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'


class TestSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizTest
        fields = ['id', 'title', 'description', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['created_by', 'created_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name or ''}"
        return None

class AssignedTestSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.test_name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)

    class Meta:
        model = AssignedTest
        fields = '__all__'


class StaffLeaveRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffLeaveRequest
        fields = '__all__'
        extra_kwargs = {
            'staff': {'read_only': True},
        }

    def get_staff_name(self, obj):
        return f"{obj.staff.first_name} {obj.staff.last_name or ''}"


class StudentLeaveApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentLeaveApplication
        fields = ['id', 'student', 'student_name', 'student_id', 'assigned_staff', 
                  'leave_type', 'start_date', 'end_date', 'number_of_days', 
                  'reason', 'contact_info', 'status', 'applied_at', 'processed_at', 
                  'staff_remarks']
    
    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name or ''}".strip()
    
    def get_student_id(self, obj):
        return obj.student.student_id

class SupportRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportRequest
        fields = '__all__'
        extra_kwargs = {
            'staff': {'read_only': True},
        }

    def get_staff_name(self, obj):
        try:
            return obj.staff.username
        except Exception:
            return ''


class StudentSupportRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentSupportRequest
        fields = '__all__'
        extra_kwargs = {
            'student': {'read_only': True},
        }

    def get_student_name(self, obj):
        try:
            return obj.student.username
        except Exception:
            return ''


class CourseSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseSession
        fields = '__all__'


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Announcement
        fields = '__all__'
        extra_kwargs = {
            'created_by': {'read_only': True},
        }


class CounselorLeaveRequestSerializer(serializers.ModelSerializer):
    counselor_name = serializers.SerializerMethodField()

    class Meta:
        model = CounselorLeaveRequest
        fields = '__all__'
        extra_kwargs = {
            'counselor': {'read_only': True},
        }

    def get_counselor_name(self, obj):
        return f"{obj.counselor.first_name} {obj.counselor.last_name or ''}"


class CounselorSupportRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CounselorSupportRequest
        fields = '__all__'
        extra_kwargs = {
            'counselor': {'read_only': True},
        }


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = '__all__'


class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = '__all__'
        extra_kwargs = {
            'created_by': {'read_only': True},
        }

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name or ''}"
        return None


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name or ''}"


class QuizAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAnswer
        fields = '__all__'


class CompletedStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompletedStudent
        fields = '__all__'


class SessionCompletionRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    trainer_name = serializers.SerializerMethodField()

    class Meta:
        model = SessionCompletionRequest
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name or ''}"

    def get_trainer_name(self, obj):
        return f"{obj.trainer.first_name} {obj.trainer.last_name or ''}"


class TestResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestResult
        fields = '__all__'


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    user_type = serializers.ChoiceField(choices=['admin', 'employee', 'student'])


 
class CounselorAnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    specific_batch_name = serializers.SerializerMethodField()
    specific_student_names = serializers.SerializerMethodField()
    
    # Add this new field
    specific_batch_details = serializers.SerializerMethodField()

    class Meta:
        model = CounselorAnnouncement
        fields = '__all__'
        extra_kwargs = {
            'created_by': {'read_only': True},
            'branch': {'read_only': True},
        }

    def get_specific_batch_name(self, obj):
        return obj.specific_batch.batch_number if obj.specific_batch else None
    
    def get_specific_batch_details(self, obj):
        if obj.specific_batch:
            return {
                'id': obj.specific_batch.id,
                'batch_number': obj.specific_batch.batch_number,
                'course_name': obj.specific_batch.course_name.course_name if obj.specific_batch.course_name else None,
                'batch_timing': obj.specific_batch.batch_timing,
                'trainer_name': f"{obj.specific_batch.faculty.first_name} {obj.specific_batch.faculty.last_name or ''}".strip() if obj.specific_batch.faculty else None,
            }
        return None

    def get_specific_student_names(self, obj):
        return [
            {'id': s.id, 'name': f'{s.first_name} {s.last_name}', 'student_id': s.student_id}
            for s in obj.specific_students.all()
        ]
