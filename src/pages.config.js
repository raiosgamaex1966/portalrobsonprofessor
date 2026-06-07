/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AcceptInvite from './pages/AcceptInvite';
import Activities from './pages/Activities';
import ActivityView from './pages/ActivityView';
import Admin from './pages/Admin';
import AdminActivities from './pages/AdminActivities';
import AdminActivitySubmissions from './pages/AdminActivitySubmissions';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminBoards from './pages/AdminBoards';
import AdminClassStudents from './pages/AdminClassStudents';
import AdminClasses from './pages/AdminClasses';
import AdminDashboard from './pages/AdminDashboard';
import AdminDisciplineClasses from './pages/AdminDisciplineClasses';
import AdminDisciplines from './pages/AdminDisciplines';
import AdminExternalCourses from './pages/AdminExternalCourses';
import AdminForum from './pages/AdminForum';
import AdminForumCreate from './pages/AdminForumCreate';
import AdminMaterials from './pages/AdminMaterials';
import AdminMessages from './pages/AdminMessages';
import AdminPendingStudents from './pages/AdminPendingStudents';
import AdminProjectFiles from './pages/AdminProjectFiles';
import AdminProjects from './pages/AdminProjects';
import AdminResults from './pages/AdminResults';
import AdminSettings from './pages/AdminSettings';
import AdminSetup from './pages/AdminSetup';
import AdminStudentProfiles from './pages/AdminStudentProfiles';
import AdminTests from './pages/AdminTests';
import AdminUsers from './pages/AdminUsers';
import AdminVideos from './pages/AdminVideos';
import BoardView from './pages/BoardView';
import Boards from './pages/Boards';
import DisciplineMaterials from './pages/DisciplineMaterials';
import Forum from './pages/Forum';
import ForumTopic from './pages/ForumTopic';
import ForumTopics from './pages/ForumTopics';
import Home from './pages/Home';
import MaterialView from './pages/MaterialView';
import Materials from './pages/Materials';
import ProjectView from './pages/ProjectView';
import Projects from './pages/Projects';
import PublicRegister from './pages/PublicRegister';
import StudentDashboard from './pages/StudentDashboard';
import StudentExternalCourses from './pages/StudentExternalCourses';
import StudentMessages from './pages/StudentMessages';
import StudentProgress from './pages/StudentProgress';
import StudentRegistration from './pages/StudentRegistration';
import StudentVideos from './pages/StudentVideos';
import TakeTest from './pages/TakeTest';
import Tests from './pages/Tests';
import AdminExternalCourseSubmissions from './pages/AdminExternalCourseSubmissions';
import Chat from './pages/Chat';
import AdminChat from './pages/AdminChat';
import Appointments from './pages/Appointments';
import StudentQuizGenerator from './pages/StudentQuizGenerator';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StudentAiAgents from './pages/StudentAiAgents';
import StudentAiStudyRoom from './pages/StudentAiStudyRoom';
import AdminAiAgents from './pages/AdminAiAgents';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AcceptInvite": AcceptInvite,
    "Activities": Activities,
    "ActivityView": ActivityView,
    "Admin": Admin,
    "AdminActivities": AdminActivities,
    "AdminActivitySubmissions": AdminActivitySubmissions,
    "AdminAnnouncements": AdminAnnouncements,
    "AdminBoards": AdminBoards,
    "AdminClassStudents": AdminClassStudents,
    "AdminClasses": AdminClasses,
    "AdminDashboard": AdminDashboard,
    "AdminDisciplineClasses": AdminDisciplineClasses,
    "AdminDisciplines": AdminDisciplines,
    "AdminExternalCourses": AdminExternalCourses,
    "AdminForum": AdminForum,
    "AdminForumCreate": AdminForumCreate,
    "AdminMaterials": AdminMaterials,
    "AdminMessages": AdminMessages,
    "AdminPendingStudents": AdminPendingStudents,
    "AdminProjectFiles": AdminProjectFiles,
    "AdminProjects": AdminProjects,
    "AdminResults": AdminResults,
    "AdminSettings": AdminSettings,
    "AdminSetup": AdminSetup,
    "AdminStudentProfiles": AdminStudentProfiles,
    "AdminTests": AdminTests,
    "AdminUsers": AdminUsers,
    "AdminVideos": AdminVideos,
    "BoardView": BoardView,
    "Boards": Boards,
    "DisciplineMaterials": DisciplineMaterials,
    "Forum": Forum,
    "ForumTopic": ForumTopic,
    "ForumTopics": ForumTopics,
    "Home": Home,
    "MaterialView": MaterialView,
    "Materials": Materials,
    "ProjectView": ProjectView,
    "Projects": Projects,
    "PublicRegister": PublicRegister,
    "StudentDashboard": StudentDashboard,
    "StudentExternalCourses": StudentExternalCourses,
    "StudentMessages": StudentMessages,
    "StudentProgress": StudentProgress,
    "StudentRegistration": StudentRegistration,
    "StudentVideos": StudentVideos,
    "TakeTest": TakeTest,
    "Tests": Tests,
    "AdminExternalCourseSubmissions": AdminExternalCourseSubmissions,
    "Chat": Chat,
    "AdminChat": AdminChat,
    "Appointments": Appointments,
    "StudentQuizGenerator": StudentQuizGenerator,
    "ForgotPassword": ForgotPassword,
    "ResetPassword": ResetPassword,
    "StudentAiAgents": StudentAiAgents,
    "StudentAiStudyRoom": StudentAiStudyRoom,
    "AdminAiAgents": AdminAiAgents,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};