import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import AlumniDashboard from './pages/alumni/AlumniDashboard'
import BrowseJobs from './pages/alumni/BrowseJobs'
import Companies from './pages/alumni/Companies'
import SavedJobs from './pages/alumni/SavedJobs'
import Notifications from './pages/alumni/Notifications'
import ProfileSettings from './pages/alumni/ProfileSettings'
import FeedbackForm from './pages/alumni/FeedbackForm'
import AdminDashboard from './pages/admin/AdminDashboard'
import UploadModel from './pages/admin/UploadModel'
import Forecasting from './pages/admin/Forecasting'
import EmploymentComparison from './pages/admin/EmploymentComparison'
import PredictReport from './pages/admin/PredictReport'
import VoterConfig from './pages/admin/VoterConfig'
import AdminCompanies from './pages/admin/AdminCompanies'
import AdminJobs from './pages/admin/AdminJobs'
import Users from './pages/admin/Users'
import Feedbacks from './pages/admin/Feedbacks'

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Alumni routes */}
        <Route path="/alumni/dashboard"        element={<AlumniDashboard />} />
        <Route path="/alumni/browse-jobs"      element={<BrowseJobs />} />
        <Route path="/alumni/companies"        element={<Companies />} />
        <Route path="/alumni/saved-jobs"       element={<SavedJobs />} />
        <Route path="/alumni/notifications"    element={<Notifications />} />
        <Route path="/alumni/profile-settings" element={<ProfileSettings />} />
        <Route path="/alumni/feedback"         element={<FeedbackForm />} />

        {/* Admin routes */}
        <Route path="/admin/dashboard"             element={<AdminDashboard />} />
        <Route path="/admin/forecasting"           element={<Forecasting />} />
        <Route path="/admin/employment-comparison" element={<EmploymentComparison />} />
        <Route path="/admin/predict-report"        element={<PredictReport />} />
        <Route path="/admin/voter-config"          element={<VoterConfig />} />
        <Route path="/admin/companies"             element={<AdminCompanies />} />
        <Route path="/admin/jobs"                  element={<AdminJobs />} />
        <Route path="/admin/users"                 element={<Users />} />
        <Route path="/admin/feedbacks"             element={<Feedbacks />} />
        <Route path="/admin/upload-model"          element={<UploadModel />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  )
}
