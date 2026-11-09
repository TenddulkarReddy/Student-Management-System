const STORAGE_KEY = "studentHubRecords";
const CURRENT_STUDENT_KEY = "studentHubCurrentStudent";

// Initial student records with department-based IDs
const defaultStudents = [
    {
        id: "CSE001",
        name: "Rahul Kumar",
        department: "CSE",
        year: "3rd Year"
    },
    {
        id: "ECE001",
        name: "Priya Sharma",
        department: "ECE",
        year: "2nd Year"
    },
    {
        id: "IT001",
        name: "Arjun Reddy",
        department: "IT",
        year: "4th Year"
    },
    {
        id: "CSE002",
        name: "Sneha Patel",
        department: "CSE",
        year: "1st Year"
    }
];

// Initialize storage if it doesn't exist
function initializeStudents() {
    if (localStorage.getItem(STORAGE_KEY) === null) {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(defaultStudents)
        );
    }
}

// Get all students
function getStudents() {
    return JSON.parse(
        localStorage.getItem(STORAGE_KEY)
    ) || [];
}

// Save students
function saveStudents(students) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(students)
    );
}

// Generate the next student ID based on department
function generateStudentID(students, department) {
    const deptPrefix = department.toUpperCase();

    // Filter students belonging to this department and extract their numeric IDs
    const existingNumbers = new Set(
        students
            .filter(student => student.id.startsWith(deptPrefix))
            .map(student => Number(student.id.replace(deptPrefix, "")))
            .filter(num => !isNaN(num))
    );

    // Find the smallest missing integer starting from 1 (reuses deleted gaps)
    let nextNumber = 1;
    while (existingNumbers.has(nextNumber)) {
        nextNumber++;
    }

    return `${deptPrefix}${String(nextNumber).padStart(3, "0")}`;
}

// Student session helpers
function setLoggedInStudent(student) {
    sessionStorage.setItem(CURRENT_STUDENT_KEY, JSON.stringify(student));
}

function getLoggedInStudent() {
    const data = sessionStorage.getItem(CURRENT_STUDENT_KEY);
    return data ? JSON.parse(data) : null;
}

function clearLoggedInStudent() {
    sessionStorage.removeItem(CURRENT_STUDENT_KEY);
}

// Initialize when the script loads
initializeStudents();