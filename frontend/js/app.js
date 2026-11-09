// Active admin session verification
const adminSession = JSON.parse(
    sessionStorage.getItem("studentHubAdmin") || '{"username":"admin","role":"superadmin","department":"ALL"}'
);

const isSuperAdminUser = adminSession.role === "superadmin" || adminSession.department === "ALL" || adminSession.username === "admin";
const targetDepartment = isSuperAdminUser ? "ALL" : (adminSession.department || "CSE");

let loadedStudents = [];

document.addEventListener("DOMContentLoaded", () => {
    // Set Topbar & Badge text
    const badge = document.getElementById("adminRoleBadge");
    const scopeLabel = document.getElementById("sidebarScopeLabel");
    const deptScopeKpi = document.getElementById("kpiDeptScope");

    if (badge) badge.textContent = isSuperAdminUser ? "Super Admin" : `${targetDepartment} Admin`;
    if (scopeLabel) scopeLabel.textContent = isSuperAdminUser ? "Central Super Admin" : `${targetDepartment} Coordinator`;
    if (deptScopeKpi) deptScopeKpi.textContent = isSuperAdminUser ? "All Departments" : targetDepartment;

    // Load student roster and KPIs
    loadDashboardData();

    // Export CSV Listener
    document.getElementById("exportCsvBtn")?.addEventListener("click", exportStudentRosterCsv);
});

async function loadDashboardData() {
    const tableBody = document.getElementById("dashboardStudentTable");
    const kpiCount = document.getElementById("kpiTotalStudents");

    try {
        const allStudents = await fetchStudents();

        // Scope to department if not superadmin
        loadedStudents = (allStudents || []).filter((s) => {
            if (isSuperAdminUser || targetDepartment === "ALL") return true;
            return s.department && s.department.toUpperCase() === targetDepartment.toUpperCase();
        });

        if (kpiCount) {
            kpiCount.textContent = loadedStudents.length;
        }

        renderDashboardTable(loadedStudents);
    } catch (err) {
        console.error("Dashboard data load error:", err);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #EF4444; padding: 20px;">Failed to load records: ${err.message}</td></tr>`;
        }
    }
}

function renderDashboardTable(students) {
    const tableBody = document.getElementById("dashboardStudentTable");
    if (!tableBody) return;

    tableBody.replaceChildren();

    if (students.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="4" style="text-align: center; color: #94A3B8; padding: 24px;">No registered students found for ${targetDepartment}.</td>`;
        tableBody.appendChild(emptyRow);
        return;
    }

    students.forEach((s) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${s.id}</strong></td>
            <td>${s.name}</td>
            <td><span class="dept-pill">${s.department}</span></td>
            <td>${s.year}</td>
        `;
        tableBody.appendChild(row);
    });
}

function exportStudentRosterCsv() {
    if (!loadedStudents || loadedStudents.length === 0) {
        alert("No student data available to export.");
        return;
    }

    const headers = ["Student ID", "Name", "Department", "Academic Year"];
    const rows = loadedStudents.map((s) => [s.id, `"${s.name}"`, s.department, `"${s.year}"`]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${targetDepartment}_Students_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}