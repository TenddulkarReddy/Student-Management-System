const API_BASE = "http://localhost:5000/api";

async function handleResponse(response, defaultErrorMessage) {
    let data;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const errorMsg = (data && data.error) ? data.error : defaultErrorMessage;
        throw new Error(errorMsg);
    }
    return data;
}

// ----------------------------------------------------
// AUTHENTICATION & SESSION MANAGEMENT
// ----------------------------------------------------

function clearAllSessions() {
    sessionStorage.removeItem("studentHubAdmin");
    sessionStorage.removeItem("studentHubFaculty");
    sessionStorage.removeItem("studentHubUser");
}

// Student Session
function getLoggedInStudent() {
    const raw = sessionStorage.getItem("studentHubUser");
    return raw ? JSON.parse(raw) : null;
}

function setLoggedInStudent(student) {
    sessionStorage.setItem("studentHubUser", JSON.stringify(student));
}

async function loginStudent(id, password) {
    const res = await fetch(`${API_BASE}/students/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password })
    });
    const data = await handleResponse(res, "Student login failed");
    return data.student;
}

async function updateStudentPassword(studentId, currentPassword, newPassword) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
    });
    return await handleResponse(res, "Failed to update student password");
}

// Faculty Session
function getLoggedInFaculty() {
    const raw = sessionStorage.getItem("studentHubFaculty");
    return raw ? JSON.parse(raw) : null;
}

function setLoggedInFaculty(faculty) {
    sessionStorage.setItem("studentHubFaculty", JSON.stringify(faculty));
}

async function loginFaculty(username, password) {
    const res = await fetch(`${API_BASE}/faculty/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    const data = await handleResponse(res, "Faculty login failed");
    return data.faculty;
}

async function fetchAllFaculty() {
    const res = await fetch(`${API_BASE}/faculty/all?t=${Date.now()}`);
    return await handleResponse(res, "Failed to fetch faculty list");
}

async function createFaculty(username, password, name, department, subject) {
    const res = await fetch(`${API_BASE}/faculty/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name, department, subject })
    });
    return await handleResponse(res, "Failed to create faculty member");
}

async function removeFaculty(id) {
    const res = await fetch(`${API_BASE}/faculty/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
    return await handleResponse(res, "Failed to delete faculty member");
}

async function updateFacultyPassword(username, currentPassword, newPassword) {
    const res = await fetch(`${API_BASE}/faculty/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, currentPassword, newPassword })
    });
    return await handleResponse(res, "Failed to update faculty password");
}

async function fetchFacultyClasses(facultyName) {
    const res = await fetch(`${API_BASE}/faculty/classes/${encodeURIComponent(facultyName)}?t=${Date.now()}`);
    return await handleResponse(res, "Failed to fetch class roster");
}

async function updateFacultyGrade(allocationId, attendance, marks) {
    const res = await fetch(`${API_BASE}/faculty/grade/${encodeURIComponent(allocationId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance, marks })
    });
    return await handleResponse(res, "Failed to record evaluation");
}

// Administrator Operations
function setAdminSession(admin) {
    sessionStorage.setItem("studentHubAdmin", JSON.stringify(admin));
}

function getLoggedInAdmin() {
    const raw = sessionStorage.getItem("studentHubAdmin");
    return raw ? JSON.parse(raw) : null;
}

async function loginAdmin(username, password) {
    const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    return await handleResponse(res, "Administrator login failed");
}

async function fetchAllAdmins() {
    const res = await fetch(`${API_BASE}/admin/all?t=${Date.now()}`);
    return await handleResponse(res, "Failed to load administrator directory");
}

async function createAdmin(username, password, name, department) {
    const res = await fetch(`${API_BASE}/admin/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name, department })
    });
    return await handleResponse(res, "Failed to create coordinator account");
}

async function removeAdmin(id) {
    const res = await fetch(`${API_BASE}/admin/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
    return await handleResponse(res, "Failed to remove administrator account");
}

async function updateAdminPassword(username, currentPassword, newPassword) {
    const res = await fetch(`${API_BASE}/admin/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, currentPassword, newPassword })
    });
    return await handleResponse(res, "Failed to update administrator password");
}

// ----------------------------------------------------
// STUDENTS & ACADEMIC DATA
// ----------------------------------------------------

async function fetchStudents() {
    const res = await fetch(`${API_BASE}/students?t=${Date.now()}`);
    return await handleResponse(res, "Failed to fetch student directory");
}

async function createStudent(studentData) {
    const res = await fetch(`${API_BASE}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData)
    });
    return await handleResponse(res, "Failed to enroll student");
}

async function deleteStudent(id) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
    return await handleResponse(res, "Failed to delete student record");
}

async function fetchCatalogCourses(department, year) {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(department)}/${encodeURIComponent(year)}?t=${Date.now()}`);
    return await handleResponse(res, "Failed to fetch curriculum catalog");
}

async function fetchStudentRegisteredCourses(studentId) {
    const res = await fetch(`${API_BASE}/student-courses/${encodeURIComponent(studentId)}?t=${Date.now()}`);
    return await handleResponse(res, "Failed to fetch registered courses");
}

async function saveStudentCourseRegistration(studentId, selectedCourses) {
    const res = await fetch(`${API_BASE}/student-courses/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, selectedCourses })
    });
    return await handleResponse(res, "Failed to save registration");
}

async function fetchStudentAcademicSummary(studentId) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/academics-summary?t=${Date.now()}`);
    return await handleResponse(res, "Failed to fetch student academic summary");
}

async function fetchCohortSummary(department) {
    const res = await fetch(`${API_BASE}/admin/cohort-summary/${encodeURIComponent(department)}?t=${Date.now()}`);
    return await handleResponse(res, "Failed to fetch department cohort summary");
}

// Aliases for cohort summary
const fetchDeptCohortSummary = fetchCohortSummary;

async function fetchAllocations(department, yearFilter = "ALL") {
    let url = `${API_BASE}/admin/allocations/${encodeURIComponent(department)}?t=${Date.now()}`;
    if (yearFilter && yearFilter !== "ALL") {
        url += `&year=${encodeURIComponent(yearFilter)}`;
    }
    const res = await fetch(url);
    return await handleResponse(res, "Failed to fetch student course allocations");
}

// Aliases for allocations to support both naming styles
const fetchDeptAllocations = fetchAllocations;

// ----------------------------------------------------
// NOTICES, EVENTS & ASSIGNMENTS
// ----------------------------------------------------

async function fetchNotices() {
    const res = await fetch(`${API_BASE}/notices?t=${Date.now()}`);
    return await handleResponse(res, "Failed to fetch notices");
}

async function postNotice(noticeData) {
    const res = await fetch(`${API_BASE}/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeData)
    });
    return await handleResponse(res, "Failed to broadcast notice");
}

async function registerForEvent(eventId, studentId, studentName, department) {
    const res = await fetch(`${API_BASE}/events/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, studentId, studentName, department })
    });
    return await handleResponse(res, "Failed to register for event");
}

async function fetchStudentEventRegistrations(studentId) {
    const res = await fetch(`${API_BASE}/events/registrations/${encodeURIComponent(studentId)}?t=${Date.now()}`);
    return await handleResponse(res, "Failed to fetch event registrations");
}

async function fetchStudentAssignments(studentId) {
    const res = await fetch(`${API_BASE}/student-assignments/${encodeURIComponent(studentId)}?t=${Date.now()}`);
    return await handleResponse(res, "Failed to load student assignments");
}

async function fetchFacultyAssignments(facultyName) {
    const res = await fetch(`${API_BASE}/assignments/faculty/${encodeURIComponent(facultyName)}?t=${Date.now()}`);
    return await handleResponse(res, "Failed to load instructor assignments");
}

async function postAssignment(assignmentData) {
    const res = await fetch(`${API_BASE}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentData)
    });
    return await handleResponse(res, "Failed to publish assignment");
}

async function removeAssignment(id) {
    const res = await fetch(`${API_BASE}/assignments/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
    return await handleResponse(res, "Failed to delete assignment");
}

async function submitAssignment(assignmentId, studentId) {
    const res = await fetch(`${API_BASE}/assignments/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId, student_id: studentId })
    });
    return await handleResponse(res, "Failed to submit assignment");
}

async function fetchStudentSubmissions(studentId) {
    const res = await fetch(`${API_BASE}/student-submissions/${encodeURIComponent(studentId)}?t=${Date.now()}`);
    return await handleResponse(res, "Failed to load submission history");
}

async function fetchAssignmentSubmissionDetails(assignmentId) {
    const res = await fetch(`${API_BASE}/assignments/${encodeURIComponent(assignmentId)}/submissions?t=${Date.now()}`);
    return await handleResponse(res, "Failed to load submission tracking details");
}