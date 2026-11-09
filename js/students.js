
const studentForm = document.getElementById("studentForm");

const studentTable = document.getElementById("studentTable");

const searchInput = document.getElementById("searchInput");

const filterDepartment =
    document.getElementById("filterDepartment");

const studentCount =
    document.getElementById("studentCount");

// Display student records
function displayStudents() {

    const students = getStudents();

    const searchValue =
        searchInput.value.toLowerCase().trim();

    const departmentValue =
        filterDepartment.value;

    // Filter records
    const filteredStudents = students.filter(student => {

        const matchesSearch =
            student.name.toLowerCase().includes(searchValue) ||
            student.id.toLowerCase().includes(searchValue);

        const matchesDepartment =
            departmentValue === "" ||
            student.department === departmentValue;

        return matchesSearch && matchesDepartment;

    });

    // Clear previous table content
    studentTable.replaceChildren();

    // Display matching records
    filteredStudents.forEach(student => {

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

        // Delete button
        const actionCell = document.createElement("td");

        const deleteButton =
            document.createElement("button");

        deleteButton.textContent = "Delete";

        deleteButton.className = "delete-btn";

        deleteButton.addEventListener("click", () => {
            deleteStudent(student.id);
        });

        actionCell.appendChild(deleteButton);

        row.appendChild(actionCell);

        studentTable.appendChild(row);

    });

    studentCount.textContent =
        `Showing ${filteredStudents.length} of ${students.length} students`;

    // Show message when no records match
    if (filteredStudents.length === 0) {

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 5;

        cell.textContent = "No students found";

        row.appendChild(cell);

        studentTable.appendChild(row);

    }

}

// Add a new student
studentForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const students = getStudents();

    const name =
        document.getElementById("studentName").value.trim();

    const department =
        document.getElementById("department").value;

    const year =
        document.getElementById("year").value;

    if (!name || !department || !year) {
        alert("Please fill in all fields");
        return;
    }

    
   // Check for duplicate student records
   const duplicateStudent = students.some(student => {

      return (
        student.name.trim().toLowerCase() === name.toLowerCase() &&
        student.department === department &&
        student.year === year
      );

    });

    if (duplicateStudent) {

         alert("This student record already exists!");

        return;

    }


    const newStudent = {

        id: generateStudentID(students, department),

        name: name,

        department: department,

        year: year

    };
    students.push(newStudent);

    saveStudents(students);

    alert("Student added successfully!");

    studentForm.reset();

    displayStudents();

});

// Delete student
function deleteStudent(studentID) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this student?"
    );

    if (!confirmDelete) {
        return;
    }

    const students = getStudents();

    const updatedStudents = students.filter(
        student => student.id !== studentID
    );

    saveStudents(updatedStudents);

    displayStudents();

    alert("Student deleted successfully!");

}

// Search functionality
searchInput.addEventListener("input", displayStudents);

// Department filter
filterDepartment.addEventListener("change", displayStudents);

// Display records when page loads
displayStudents();
