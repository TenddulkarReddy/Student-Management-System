// js/student-portal.js

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("studentLoginForm");
    const logoutBtn = document.getElementById("logoutBtn");

    // 1. Handle Login Submission
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const enteredId = document.getElementById("studentId").value.trim().toUpperCase();
            const errorElement = document.getElementById("loginError");
            
            const students = getStudents();
            const foundStudent = students.find(s => s.id.toUpperCase() === enteredId);

            if (foundStudent) {
                setLoggedInStudent(foundStudent);
                window.location.href = "student-dashboard.html";
            } else {
                errorElement.textContent = "Invalid Student ID. Please verify your ID or check Admin records.";
                errorElement.style.display = "block";
            }
        });
    }

    // 2. Handle Student Dashboard Population & Route Protection
    if (window.location.pathname.endsWith("student-dashboard.html")) {
        const student = getLoggedInStudent();

        if (!student) {
            window.location.href = "student-login.html";
            return;
        }

        document.getElementById("portalHeaderName").textContent = `Welcome, ${student.name}`;
        document.getElementById("portalName").textContent = student.name;
        document.getElementById("portalId").textContent = `ID: ${student.id}`;
        document.getElementById("portalAvatar").textContent = student.name.charAt(0).toUpperCase();
        document.getElementById("portalBadge").textContent = student.id;

        document.getElementById("detailId").textContent = student.id;
        document.getElementById("detailName").textContent = student.name;
        document.getElementById("detailDept").textContent = student.department;
        document.getElementById("detailYear").textContent = student.year;
    }

    // 3. Handle Logout
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            clearLoggedInStudent();
            window.location.href = "student-login.html";
        });
    }
});