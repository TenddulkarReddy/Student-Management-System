
// Get student records from Local Storage
const students = getStudents();

// Dashboard statistics
const totalStudents =
    document.getElementById("totalStudents");

const totalDepartments =
    document.getElementById("totalDepartments");

const totalYears =
    document.getElementById("totalYears");

// Calculate statistics
const departments = new Set(
    students.map(student => student.department)
);

const academicYears = new Set(
    students.map(student => student.year)
);

// Update dashboard numbers
totalStudents.textContent = students.length;

totalDepartments.textContent = departments.size;

totalYears.textContent = academicYears.size;

// Display recent students
const studentTable =
    document.getElementById("studentTable");

studentTable.replaceChildren();

students.slice(-4).reverse().forEach(student => {

    const row = document.createElement("tr");

    const values = [
        student.id,
        student.name,
        student.department,
        student.year
    ];

    values.forEach(value => {

        const cell = document.createElement("td");

        cell.textContent = value;

        row.appendChild(cell);

    });

    studentTable.appendChild(row);

});
