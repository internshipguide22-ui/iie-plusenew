import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import './styles/global.css'

// ── Admin ──────────────────────────────────────────────────────────────────
import { StudentsList, EmployeesList, CoursesList, BatchesList, AdminCourseTypes } from './pages/admin/Lists'
import {
  AdminDashboard, AdminBranchAttendance, AdminMaterialsOverview,
  AdminSupportRequests, CompletedStudents, AdminAssignedStudents, ViewMentors,
  QuizResults, StaffDoubts, AdminTestResults,
  AdminMentorLeaveRequest, AdminMentorLeaveHistory,
  AdminCounselorLeaveRequest, AdminCounselorLeaveHistory,
  AdminMentorSupportRequest, AdminMentorSupportHistory,
  AdminCounselorSupportRequest, AdminCounselorSupportHistory,
  AdminStudentSupportRequest, AdminStudentSupportHistory, AdminAnnouncements, AdminFeeManagement,
  AdminCalendar, AdminGallery, AdminNews, AdminReferrals, AdminVlogs,
  AdminEmployeeMonitoring, AdminStudentMonitoring,
} from './pages/admin/AdminPages'

// ── Employee ───────────────────────────────────────────────────────────────
import {
  EmployeeDashboard, ViewBatches, MarkAttendance,
  StudyMaterials, MaterialLibrary, StaffLeaveApply, CounselorLeaveApply, StaffSupportRequest,
  CounselorSupportRequest, StudentLeaveRequests, StaffCompletedStudents,
  StaffAnnouncements, BranchAnnouncements, StaffDoubts as EmployeeDoubts, ViewStudents,
  StaffStudentLeaveRequests, StaffOwnLeaveHistory,
  CreateTest, ViewTests, TestResults, AddQuestions,
  UploadQuiz, ManageQuizzes, StaffQuizResults
} from './pages/employee/EmployeePages'

// ── Counselor ──────────────────────────────────────────────────────────────
import {
  CounselorDashboard, CounselorStudents, CounselorPendingRequests,
  CounselorApprovedRequests, CounselorCompletedStudents, CounselorAssignedStudents, CounselorFeeManagement,
  CounselorAnnouncements,
} from './pages/counselor/CounselorPages'

// ── Student ────────────────────────────────────────────────────────────────
import {
  StudentDashboard, StudentAttendance, StudentSessions, StudentNotifications,
  StudentQuizList, StudentTests, StudentLeave, StudentMaterials, StudentSupport, StudentFeeDetails,
} from './pages/student/StudentPages'

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  const role = (user.user_type === 'employee' && user.designation === 'counselor') ? 'counselor' : user.user_type
  if (allowedRoles && !allowedRoles.includes(role) && !allowedRoles.includes(user.user_type)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  if (!user) return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
  const defaultPath = user.user_type === 'admin' ? '/admin' : user.user_type === 'student' ? '/student' : user.designation === 'counselor' ? '/counselor' : '/employee'

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultPath} replace />} />

      {/* ── ADMIN ─────────────────────────────────────────────────── */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout role="admin" /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="courses/add" element={<CoursesList />} />
        <Route path="course-types" element={<AdminCourseTypes />} />
        <Route path="employees/add" element={<EmployeesList />} />
        <Route path="courses" element={<CoursesList />} />
        <Route path="employees" element={<EmployeesList />} />
        <Route path="mentors" element={<ViewMentors />} />
        <Route path="students" element={<StudentsList adminView />} />
        <Route path="assigned" element={<AdminAssignedStudents />} />
        <Route path="batches" element={<BatchesList />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="vlogs" element={<AdminVlogs />} />
        <Route path="news" element={<AdminNews />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="fees" element={<AdminFeeManagement />} />   {/* ← ADD inside /admin routes */}

        <Route path="monitoring/employees" element={<AdminEmployeeMonitoring />} />
        <Route path="monitoring/students" element={<AdminStudentMonitoring />} />

        {/* Support pages - USING ADMIN VERSIONS */}
        <Route path="staff-support" element={<AdminMentorSupportRequest />} />
        <Route path="staff-support-history" element={<AdminMentorSupportHistory />} />
        <Route path="counselor-support" element={<AdminCounselorSupportRequest />} />
        <Route path="counselor-support-history" element={<AdminCounselorSupportHistory />} />
        <Route path="student-support" element={<AdminStudentSupportRequest />} />
        <Route path="student-support-history" element={<AdminStudentSupportHistory />} />

        {/* Leave pages */}
        <Route path="staff-leave" element={<AdminMentorLeaveRequest />} />
        <Route path="staff-leave-history" element={<AdminMentorLeaveHistory />} />
        <Route path="counselor-leave" element={<AdminCounselorLeaveRequest />} />
        <Route path="counselor-leave-history" element={<AdminCounselorLeaveHistory />} />

        <Route path="attendance" element={<AdminBranchAttendance />} />
        <Route path="materials" element={<AdminMaterialsOverview />} />
        <Route path="test-results" element={<AdminTestResults />} />
        <Route path="quiz/upload" element={<UploadQuiz />} />
        <Route path="quiz" element={<ManageQuizzes />} />
        <Route path="quiz-results" element={<StaffQuizResults />} />
        <Route path="completed" element={<CompletedStudents />} />
      </Route>

      {/* ── EMPLOYEE ──────────────────────────────────────────────── */}
      {/* ── EMPLOYEE ──────────────────────────────────────────────── */}
      <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee']}><AppLayout role="employee" /></ProtectedRoute>}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="students" element={<ViewStudents />} />
        <Route path="attendance" element={<MarkAttendance />} />
        <Route path="batches" element={<ViewBatches />} />
        <Route path="doubts" element={<EmployeeDoubts />} />
        <Route path="announcements" element={<StaffAnnouncements />} />
        <Route path="branch-announcements" element={<BranchAnnouncements />} />

        {/* Leave Management Routes */}
        <Route path="student-leave/pending" element={<StaffStudentLeaveRequests />} />
        <Route path="student-leave/history" element={<StaffStudentLeaveRequests />} />
        <Route path="leave/history" element={<StaffOwnLeaveHistory />} />
        <Route path="leave" element={<StaffLeaveApply />} />
        <Route path="leave/apply" element={<StaffLeaveApply />} />

        <Route path="materials" element={<StudyMaterials />} />
        <Route path="materials/upload" element={<StudyMaterials />} />
        <Route path="material-library" element={<MaterialLibrary />} />

        {/* Test Routes */}
        <Route path="tests/create" element={<CreateTest />} />
        <Route path="tests/:testId/add-questions" element={<AddQuestions />} />
        <Route path="tests" element={<ViewTests />} />
        <Route path="test-results" element={<TestResults />} />

        {/* Quiz Routes - FIXED: Use StaffQuizResults for employee */}
        <Route path="quiz/upload" element={<UploadQuiz />} />
        <Route path="quiz" element={<ManageQuizzes />} />
        <Route path="quiz-results" element={<StaffQuizResults />} />  {/* ← Changed from QuizResults */}

        <Route path="support" element={<StaffSupportRequest />} />
        <Route path="support/new" element={<StaffSupportRequest />} />
        <Route path="completed" element={<StaffCompletedStudents />} />
      </Route>

      {/* ── COUNSELOR ─────────────────────────────────────────────── */}
      {/* ── COUNSELOR ─────────────────────────────────────────────── */}
      <Route path="/counselor" element={<ProtectedRoute allowedRoles={['counselor', 'employee']}><AppLayout role="counselor" /></ProtectedRoute>}>
        <Route index element={<CounselorDashboard />} />
        <Route path="add-batch" element={<BatchesList />} />
        <Route path="add-student" element={<StudentsList adminView />} />
        <Route path="students" element={<CounselorStudents />} />
        <Route path="/counselor/assigned-students" element={<CounselorAssignedStudents />} />
        <Route path="batches" element={<BatchesList staffView />} />
        <Route path="announcements" element={<CounselorAnnouncements />} />
        <Route path="admin-announcements" element={<StaffAnnouncements />} />
        <Route path="fees" element={<CounselorFeeManagement />} />
        <Route path="leave" element={<CounselorLeaveApply />} />
        <Route path="leave/apply" element={<CounselorLeaveApply />} />
        <Route path="support" element={<CounselorSupportRequest />} />
        <Route path="support/new" element={<CounselorSupportRequest />} />
        <Route path="pending" element={<CounselorPendingRequests />} />
        <Route path="approved" element={<CounselorApprovedRequests />} />
        <Route path="completed-students" element={<CounselorCompletedStudents />} />
      </Route>

      {/* ── STUDENT ───────────────────────────────────────────────── */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><AppLayout role="student" /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="announcements" element={<StaffAnnouncements />} />
        <Route path="branch-announcements" element={<BranchAnnouncements />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="sessions" element={<StudentSessions />} />

        {/* Test Routes - Fixed: Different paths for different features */}
        <Route path="tests" element={<StudentTests />} />        {/* For assigned tests */}
        <Route path="quiz" element={<StudentQuizList />} />      {/* For Excel quizzes */}

        <Route path="materials" element={<StudentMaterials />} />
        <Route path="leave" element={<StudentLeave />} />
        <Route path="leave/apply" element={<StudentLeave />} />
        <Route path="support" element={<StudentSupport />} />
        <Route path="support/new" element={<StudentSupport />} />
        <Route path="notifications" element={<StudentNotifications />} />
        <Route path="fee" element={<StudentFeeDetails />} />


      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
