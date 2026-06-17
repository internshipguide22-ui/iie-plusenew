from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, re_path
from django.views.static import serve
from IIE import settings
from rest_framework_simplejwt.views import TokenRefreshView
from connect import api_views as v
from connect.api_views import add_fee_payment, admin_fee_payment_requests, create_fee_payment_request, forgot_password, generate_bill, process_fee_payment_request, reset_password, student_fee_details,admin_fee_list

from connect.api_views import (
    get_test_questions,
    quiz_result_details,
    student_assigned_tests,
    student_take_test,
    student_test_results,
    student_quizzes,
    student_take_quiz,
    get_session_doubt_responses,
    test_results,
    update_announcement,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── AUTH ─────────────────────────────────────────────────────────────────
    path('api/auth/login/', v.LoginView.as_view()),
    path('api/auth/logout/', v.LogoutView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),

    # ── DASHBOARDS ────────────────────────────────────────────────────────────
    path('api/dashboard/admin/', v.AdminDashboardView.as_view()),
    path('api/dashboard/employee/', v.EmployeeDashboardView.as_view()),
    path('api/dashboard/student/', v.StudentDashboardView.as_view()),
    path('api/dashboard/counselor/', v.CounselorDashboardView.as_view()),

    # ── ID GENERATORS ─────────────────────────────────────────────────────────
    path('api/generate/staff-id/', v.get_next_staff_id),
    path('api/generate/batch-number/', v.get_next_batch_number),
    path('api/generate/student-id/', v.get_next_student_id),

    # ── COURSES ───────────────────────────────────────────────────────────────
    path('api/courses/', v.CourseListCreateView.as_view()),
    path('api/courses/<int:pk>/', v.CourseDetailView.as_view()),

    # Admin gallery, vlogs, news, calendar, and referrals
    path('api/gallery/', v.GalleryItemListCreateView.as_view()),
    path('api/gallery/<int:pk>/', v.GalleryItemDetailView.as_view()),
    path('api/vlogs/', v.VlogItemListCreateView.as_view()),
    path('api/vlogs/<int:pk>/', v.VlogItemDetailView.as_view()),
    path('api/news/', v.NewsItemListCreateView.as_view()),
    path('api/news/<int:pk>/', v.NewsItemDetailView.as_view()),
    path('api/calendar-events/', v.CalendarEventListCreateView.as_view()),
    path('api/calendar-events/<int:pk>/', v.CalendarEventDetailView.as_view()),
    path('api/referrals/', v.ReferralListCreateView.as_view()),
    path('api/referrals/<int:pk>/', v.ReferralDetailView.as_view()),

    # ── EMPLOYEES ─────────────────────────────────────────────────────────────
    path('api/employees/', v.EmployeeListView.as_view()),
    path('api/employees/create/', v.EmployeeCreateView.as_view()),
    path('api/employees/me/', v.EmployeeProfileView.as_view()),
    path('api/employees/<int:pk>/', v.EmployeeDetailView.as_view()),
    path('api/trainers/', v.get_trainers),
    path('api/trainer-batches/<int:trainer_id>/', v.trainer_batches),
    path('api/mentors/', v.admin_view_mentors),

    # ── BATCHES ───────────────────────────────────────────────────────────────
    path('api/batches/', v.BatchListCreateView.as_view()),
    path('api/batches/create/', v.BatchCreateView.as_view()),
    path('api/batches/<int:pk>/', v.BatchDetailView.as_view()),
    path('api/batches/<int:batch_id>/students/', v.get_batch_students),
    path('api/batches/<int:batch_id>/sessions/', v.batch_sessions),
    path('api/batches/<int:batch_id>/sessions-logsheet/', v.get_batch_sessions_with_logsheet),
    path('api/batches/<int:batch_id>/attendance/', v.batch_attendance_records),
    path('api/batches/<int:batch_id>/extract-sessions/', v.extract_and_store_sessions),

    # ── STUDENTS ──────────────────────────────────────────────────────────────
    path('api/students/', v.StudentListView.as_view()),
    path('api/students/create/', v.StudentCreateView.as_view()),
    path('api/students/me/', v.StudentProfileView.as_view()),
    path('api/students/<int:pk>/', v.StudentDetailView.as_view()),
    path('api/students/<str:student_id>/assign-staff/', v.assign_staff_to_student),
    path('api/students/<str:student_id>/remove-staff/', v.remove_staff_from_student),
    path('api/students/<int:student_id>/request-completion/', v.request_completion),

    # ── ATTENDANCE ────────────────────────────────────────────────────────────
    path('api/attendance/', v.AttendanceListView),
    path('api/attendance/mark/', v.mark_attendance),

    # ── MATERIALS ─────────────────────────────────────────────────────────────
    path('api/materials/', v.StudyMaterialListView.as_view()),
    path('api/materials/upload/', v.StudyMaterialCreateView.as_view()),
    path('api/materials/<int:pk>/download/', v.download_material),
    path('api/materials/<int:pk>/delete/', v.delete_material),
    path('api/material-library/', v.material_library_list),
    path('api/material-library/upload/', v.material_library_upload),
    path('api/material-library/assign/', v.material_library_assign),
    path('api/material-library/<int:pk>/delete/', v.material_library_delete),

    # ── TESTS ─────────────────────────────────────────────────────────────────
    path('api/tests/', v.TestListCreateView.as_view()),
    path('api/tests/<int:pk>/', v.TestDetailView.as_view()),
    path('api/tests/<int:test_id>/add-question/', v.add_question),
    path('api/tests/<int:test_id>/take/', student_take_test, name='student-take-test'),
    path('api/tests/<int:test_id>/questions/', get_test_questions, name='get-test-questions'),
    path('api/assigned-tests/', v.AssignedTestListView.as_view()),
    path('api/student-tests/', student_assigned_tests, name='student-assigned-tests'),

    # ── TEST RESULTS (SEPARATED — student vs staff) ───────────────────────────
    path('api/test-results/', student_test_results, name='student-test-results'),   # student
    path('api/staff/test-results/', test_results, name='staff-test-results'),        # staff/admin

    # ── LEAVE ─────────────────────────────────────────────────────────────────
    path('api/staff-leave/', v.StaffLeaveListView.as_view()),
    path('api/staff-leave/<int:pk>/process/', v.process_staff_leave),
    path('api/staff/request-completion/<int:student_id>/', v.request_completion),
    path('api/staff/student-leave/', v.staff_student_leave_requests),
    path('api/staff/student-leave/<int:pk>/process/', v.staff_process_student_leave),
    path('api/student-leave/', v.StudentLeaveListView.as_view()),
    path('api/student-leave/<int:pk>/process/', v.process_student_leave),
    path('api/counselor-leave/', v.CounselorLeaveListView.as_view()),
    path('api/counselor-leave/<int:pk>/process/', v.process_counselor_leave),

    # ── SUPPORT ───────────────────────────────────────────────────────────────
    path('api/staff-support/', v.StaffSupportListView.as_view()),
    path('api/student-support/', v.StudentSupportListView.as_view()),
    path('api/counselor-support/', v.CounselorSupportListView.as_view()),

    # ── ADMIN OVERVIEW ────────────────────────────────────────────────────────
    path('api/admin/monitoring/employees/', v.admin_employee_monitoring),
    path('api/admin/monitoring/students/', v.admin_student_monitoring),
    path('api/admin/branch-attendance/', v.admin_branch_attendance),
    path('api/admin/materials-overview/', v.admin_materials_overview),
    path('api/admin/support-overview/', v.admin_support_overview),
    path('api/admin/support/<int:pk>/update/', v.update_support_status),

    # ── ADMIN SUPPORT ENDPOINTS ───────────────────────────────────────────────
    path('api/admin/staff-support/', v.AdminStaffSupportListView.as_view()),
    path('api/admin/staff-support/<int:id>/update/', v.AdminStaffSupportListView.as_view()),
    path('api/admin/staff-support/history/', v.AdminStaffSupportHistoryView.as_view()),
    path('api/admin/counselor-support/', v.AdminCounselorSupportListView.as_view()),
    path('api/admin/counselor-support/<int:id>/update/', v.AdminCounselorSupportListView.as_view()),
    path('api/admin/counselor-support/history/', v.AdminCounselorSupportHistoryView.as_view()),
    path('api/admin/student-support/', v.AdminStudentSupportListView.as_view()),
    path('api/admin/student-support/<int:id>/update/', v.AdminStudentSupportListView.as_view()),
    path('api/admin/student-support/history/', v.AdminStudentSupportHistoryView.as_view()),

    # ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
    path('api/announcements/', v.AnnouncementListView.as_view()),
    path('api/announcements/create/', v.AnnouncementCreateView.as_view()),
    path('api/announcements/<int:pk>/update/', v.update_announcement, name='update_announcement'),
    path('api/announcements/<int:pk>/toggle/', v.toggle_announcement),
    path('api/announcements/<int:pk>/delete/', v.delete_announcement),

    # ── COUNSELOR ANNOUNCEMENTS ───────────────────────────────────────────────
    path('api/counselor/announcements/', v.CounselorAnnouncementListView.as_view()),
    path('api/counselor/announcements/create/', v.CounselorAnnouncementCreateView.as_view()),
    path('api/counselor/announcements/<int:pk>/update/', v.counselor_update_announcement),
    path('api/counselor/announcements/<int:pk>/toggle/', v.counselor_toggle_announcement),
    path('api/counselor/announcements/<int:pk>/delete/', v.counselor_delete_announcement),

    # ── BRANCH ANNOUNCEMENTS (mentor + student) ──────────────────────────────
    path('api/branch-announcements/', v.branch_announcements),
    path('api/counselor/branch-batches/', v.counselor_branch_batches),
    path('api/counselor/branch-students/', v.counselor_branch_students),

    # ── COURSE TYPES ──────────────────────────────────────────────────────────
    path('api/course-types/', v.course_type_list),              # public dropdown
    path('api/admin/course-types/', v.admin_course_types),      # admin CRUD list+create
    path('api/admin/course-types/<int:pk>/', v.admin_course_type_detail),  # patch/delete

    # ── BRANCH ANNOUNCEMENTS (mentor & student) ───────────────────────────────

    # ── SESSIONS ──────────────────────────────────────────────────────────────
    path('api/sessions/student/', v.student_sessions),
    path('api/sessions/raise-doubt/', v.student_raise_doubt),
    path('api/sessions/staff-doubts/', v.get_staff_doubts_detail),
    path('api/sessions/<int:session_id>/staff-complete/', v.staff_mark_session_complete),
    path('api/sessions/<int:session_id>/staff-unmark/', v.staff_unmark_session),
    path('api/sessions/student-complete/', v.student_mark_completed),
    path('api/sessions/student-doubt/', v.student_raise_doubt),
    path('api/sessions/<int:session_id>/doubt-responses/', get_session_doubt_responses, name='session-doubt-responses'),

    # ── DOUBTS & NOTIFICATIONS ────────────────────────────────────────────────
    path('api/doubts/<int:progress_id>/reply/', v.staff_reply_doubt),
    path('api/doubts/staff/', v.get_staff_doubts_detail),
    path('api/notifications/student/', v.get_student_notifications),
    path('api/notifications/<int:notif_id>/read/', v.mark_notification_read),

    # ── QUIZ ──────────────────────────────────────────────────────────────────
    path('api/quiz/', v.QuizListView.as_view()),
    path('api/quiz/upload/', v.upload_quiz),
    path('api/quiz/staff-results/', v.staff_quiz_results),
    path('api/quiz/student/', student_quizzes, name='student-quizzes'),
    path('api/quiz/result/<int:attempt_id>/', quiz_result_details, name='quiz-result-details'),
    path('api/quiz/attempt/<int:attempt_id>/result/', v.quiz_result),
    path('api/quiz/<int:quiz_id>/take/', student_take_quiz, name='student-take-quiz'),
    path('api/quiz/<int:quiz_id>/toggle-publish/', v.toggle_quiz_publish),
    path('api/quiz/<int:quiz_id>/delete/', v.delete_quiz),

    # ── COMPLETED STUDENTS ────────────────────────────────────────────────────
    path('api/completed-students/', v.CompletedStudentListView.as_view()),
    path('api/completed-students/<int:student_id>/report/', v.download_completion_report, name='download-completion-report'),
    path('completed-students/<int:student_id>/report/', v.download_completion_report),

    # ── COMPLETION REQUESTS ───────────────────────────────────────────────────
    path('api/counselor/pending-requests/', v.counselor_pending_requests),
    path('api/counselor/approved-requests/', v.counselor_approved_requests, name='counselor_approved_requests'),
    path('api/counselor/requests/<int:pk>/process/', v.process_completion_request),
    path('api/counselor/requests/<int:request_id>/reassign/', v.counselor_reassign_student),
    path('api/counselor/students/', v.counselor_student_details),

    # ── ADMIN LEAVE ───────────────────────────────────────────────────────────
    path('api/admin/staff-leave/', v.admin_staff_leave),
    path('api/admin/staff-leave/<int:pk>/process/', v.admin_process_staff_leave),
    path('api/admin/counselor-leave/', v.admin_counselor_leave),
    path('api/admin/counselor-leave/<int:pk>/process/', v.admin_process_counselor_leave),

    # ── QUESTIONS ─────────────────────────────────────────────────────────────
    path('api/questions/<int:question_id>/update/', v.update_question, name='update_question'),
    path('api/questions/<int:question_id>/delete/', v.delete_question, name='delete_question'),


    # in urlpatterns:
    path('api/auth/forgot-password/', forgot_password),
    path('api/auth/reset-password/', reset_password),

    #Fee
    path('api/fees/', admin_fee_list),
    path('api/fees/<int:fee_id>/pay/', add_fee_payment),
    path('api/fees/<int:fee_id>/bill/', generate_bill),
    path('api/student/fee/', student_fee_details),



    path('api/fees/<int:fee_id>/request/', create_fee_payment_request),
    path('api/fees/payment-requests/', admin_fee_payment_requests),
    path('api/fees/payment-requests/<int:request_id>/process/', process_fee_payment_request),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
