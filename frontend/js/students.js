// Active admin session
const currentAdmin = JSON.parse(
    sessionStorage.getItem("studentHubAdmin") || '{"username":"admin","role":"superadmin","department":"ALL"}'
);
const isSuperAdmin = currentAdmin.role === "superadmin" || currentAdmin.department === "ALL" || currentAdmin.username === "admin";
const userDept = isSuperAdmin ? "ALL" : (currentAdmin.department || "CSE");

let allCohortSummaries = [];
let allAllocations = [];

document.addEventListener("DOMContentLoaded", () => {
    const addStudentCard = document.getElementById("addStudentCard");
    const actionHeader = document.getElementById("actionHeader");
    const deptFilterOverview = document.getElementById("deptFilterOverview");

    if (!isSuperAdmin) {
        if (addStudentCard) addStudentCard.style.display = "none";
        if (actionHeader) actionHeader.style.display = "none";
        if (deptFilterOverview) deptFilterOverview.style.display = "none";
    }

    loadCohortOverview();
    setupAllocationListeners();
});

// View Switcher between Overview Table and Faculty Allocations
// View Switcher between Overview Table and Faculty Allocations
window.switchView = function (viewName) {
    const rosterContainer = document.getElementById("rosterViewContainer");
    const allocContainer = document.getElementById("allocationsViewContainer");
    const addStudentCard = document.getElementById("addStudentCard");
    const rosterBtn = document.getElementById("tabRosterBtn");
    const allocBtn = document.getElementById("tabAllocBtn");

    if (viewName === "roster") {
        if (rosterContainer) rosterContainer.style.display = "block";
        if (allocContainer) allocContainer.style.display = "none";
        if (addStudentCard) addStudentCard.style.display = isSuperAdmin ? "block" : "none";
        rosterBtn.className = "btn btn-primary";
        rosterBtn.style.background = "";
        rosterBtn.style.color = "";
        allocBtn.className = "btn";
        allocBtn.style.background = "#F1F5F9";
        allocBtn.style.color = "#0F172A";
        loadCohortOverview();
    } else {
        if (rosterContainer) rosterContainer.style.display = "none";
        if (allocContainer) allocContainer.style.display = "block";
        if (addStudentCard) addStudentCard.style.display = "none"; // Always hidden in Allocations tab
        allocBtn.className = "btn btn-primary";
        allocBtn.style.background = "";
        allocBtn.style.color = "";
        rosterBtn.className = "btn";
        rosterBtn.style.background = "#F1F5F9";
        rosterBtn.style.color = "#0F172A";
        loadAllocations();
    }
};

// ----------------------------------------------------
// VIEW 1: Department Overview & Standing Monitor
// ----------------------------------------------------
async function loadCohortOverview() {
    try {
        allCohortSummaries = await fetchDeptCohortSummary(userDept);
        applyOverviewFilters();
    } catch (err) {
        console.error("Failed to load cohort summary:", err);
    }
}

function renderOverviewTable(list) {
    const tableBody = document.getElementById("studentTable");
    const countLabel = document.getElementById("studentCountLabel");
    if (!tableBody) return;

    tableBody.replaceChildren();

    if (countLabel) {
        countLabel.textContent = `Showing ${list.length} registered students (${isSuperAdmin ? "University-wide" : userDept + " Department"})`;
    }

    if (list.length === 0) {
        const emptyRow = document.createElement("tr");
        const colspan = isSuperAdmin ? 8 : 7;
        emptyRow.innerHTML = `<td colspan="${colspan}" style="text-align: center; color: #94A3B8; padding: 24px;">No students match this criteria.</td>`;
        tableBody.appendChild(emptyRow);
        return;
    }

    list.forEach((s) => {
        const row = document.createElement("tr");

        let eligibilityBadge = "";
        if (s.totalCredits === 0) {
            eligibilityBadge = `<span class="badge-status status-warning">Not Registered</span>`;
        } else if (s.attendance >= 75) {
            eligibilityBadge = `<span class="badge-status status-eligible">✓ Hall Ticket Eligible</span>`;
        } else {
            eligibilityBadge = `<span class="badge-status status-shortage">⚠ Attendance Shortage</span>`;
        }

        let creditsBadge = `<span style="font-weight: 600; color: #0F172A;">${s.totalCredits} Credits</span>`;
        if (s.totalCredits > 0 && s.totalCredits < 14) {
            creditsBadge += ` <span style="font-size: 11px; color: #D97706;">(Needs min 14)</span>`;
        }

        row.innerHTML = `
            <td><strong>${s.id}</strong></td>
            <td>${s.name}</td>
            <td><span class="dept-pill">${s.department}</span> <span style="color:#64748B; font-size:12px;">${s.year}</span></td>
            <td>${creditsBadge}</td>
            <td>
                <span style="font-weight: 700; color: ${s.attendance >= 75 ? '#059669' : '#DC2626'};">${s.attendance}%</span>
            </td>
            <td>
                <strong style="color: #2563EB; font-size: 15px;">${s.cgpa}</strong>
                <span style="font-size: 11px; color: #94A3B8; display: block;">from faculty</span>
            </td>
            <td>${eligibilityBadge}</td>
            ${isSuperAdmin ? `<td style="text-align: right;"><button class="btn-delete" onclick="handleDelete('${s.id}')">Delete</button></td>` : ""}
        `;
        tableBody.appendChild(row);
    });
}

function applyOverviewFilters() {
    const searchVal = document.getElementById("searchInput")?.value.trim().toLowerCase() || "";
    const yearVal = document.getElementById("yearFilterOverview")?.value || "ALL";
    const deptVal = document.getElementById("deptFilterOverview")?.value || "ALL";

    const filtered = allCohortSummaries.filter((s) => {
        const matchesQuery = s.name.toLowerCase().includes(searchVal) || s.id.toLowerCase().includes(searchVal);
        const matchesYear = (yearVal === "ALL" || s.year === yearVal);
        const matchesDept = (deptVal === "ALL" || s.department.toUpperCase() === deptVal.toUpperCase());
        return matchesQuery && matchesYear && matchesDept;
    });

    renderOverviewTable(filtered);
}

document.getElementById("searchInput")?.addEventListener("input", applyOverviewFilters);
document.getElementById("yearFilterOverview")?.addEventListener("change", applyOverviewFilters);
document.getElementById("deptFilterOverview")?.addEventListener("change", applyOverviewFilters);

// ----------------------------------------------------
// VIEW 2: Segregated Faculty & Year Allocations
// ----------------------------------------------------
function setupAllocationListeners() {
    document.getElementById("allocYearFilter")?.addEventListener("change", loadAllocations);
    document.getElementById("allocFacultyFilter")?.addEventListener("change", renderAllocations);
}

async function loadAllocations() {
    const container = document.getElementById("allocationsCardContainer");
    const yearVal = document.getElementById("allocYearFilter")?.value || "ALL";
    const targetDept = isSuperAdmin ? "ALL" : userDept;

    try {
        allAllocations = await fetchDeptAllocations(targetDept, yearVal);
        populateFacultyDropdown(allAllocations);
        renderAllocations();
    } catch (err) {
        if (container) {
            container.innerHTML = `<p style="color: #EF4444; padding: 20px;">Failed to load allocations: ${err.message}</p>`;
        }
    }
}

function populateFacultyDropdown(data) {
    const facultySelect = document.getElementById("allocFacultyFilter");
    if (!facultySelect) return;

    const uniqueFaculty = Array.from(new Set(data.map((d) => d.faculty))).filter(Boolean).sort();
    const currentVal = facultySelect.value;
    facultySelect.replaceChildren();

    const allOpt = document.createElement("option");
    allOpt.value = "ALL";
    allOpt.textContent = "All Faculty Members";
    facultySelect.appendChild(allOpt);

    uniqueFaculty.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        if (f === currentVal) opt.selected = true;
        facultySelect.appendChild(opt);
    });
}

function renderAllocations() {
    const container = document.getElementById("allocationsCardContainer");
    const selectedFac = document.getElementById("allocFacultyFilter")?.value || "ALL";
    if (!container) return;

    container.replaceChildren();

    const filtered = allAllocations.filter((item) => {
        return selectedFac === "ALL" || item.faculty === selectedFac;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div style="background: white; padding: 30px; text-align: center; border-radius: 8px; color: #94A3B8; border: 1px solid #E2E8F0;">No student-course enrollments registered under this filter.</div>`;
        return;
    }

    // Segregate by Academic Year then Faculty
    const grouped = {};
    filtered.forEach((row) => {
        const yearKey = row.academic_year;
        const facKey = `${row.faculty} — [${row.course_id}] ${row.course_name}`;
        if (!grouped[yearKey]) grouped[yearKey] = {};
        if (!grouped[yearKey][facKey]) grouped[yearKey][facKey] = [];
        grouped[yearKey][facKey].push(row);
    });

    Object.keys(grouped).sort().forEach((year) => {
        const yearSection = document.createElement("div");
        yearSection.style.marginBottom = "24px";
        yearSection.innerHTML = `
            <h2 style="margin: 16px 0 10px 0; color: #1E293B; display: flex; align-items: center; gap: 10px; font-size: 18px;">
                <span>${year} Students</span>
                <span style="background: #EEF2FF; color: #4F46E5; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${isSuperAdmin ? "University-wide" : userDept + " Dept"}</span>
            </h2>
        `;

        Object.keys(grouped[year]).sort().forEach((facCourse) => {
            const students = grouped[year][facCourse];
            const card = document.createElement("div");
            card.style.background = "#FFFFFF";
            card.style.border = "1px solid #E2E8F0";
            card.style.borderRadius = "10px";
            card.style.padding = "16px";
            card.style.marginBottom = "14px";
            card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";

            let rowsHtml = students.map((s) => {
                const att = (s.course_attendance !== undefined && s.course_attendance !== null) ? s.course_attendance : 85;
                const marks = (s.course_marks !== undefined && s.course_marks !== null) ? s.course_marks : 80;
                const courseGradePoint = (marks / 10).toFixed(2);
                const deptBadge = s.student_dept ? `<span class="dept-pill" style="margin-left: 6px;">${s.student_dept}</span>` : "";

                return `
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                        <td style="padding: 10px 8px;"><strong>${s.student_id}</strong></td>
                        <td style="padding: 10px 8px;">${s.student_name} ${deptBadge}</td>
                        <td style="padding: 10px 8px;">
                            <input type="number" id="alloc_att_${s.allocation_id}" min="0" max="100" value="${att}" style="width: 65px; padding: 4px 6px; border: 1px solid #CBD5E1; border-radius: 4px; font-weight: 600;"> %
                        </td>
                        <td style="padding: 10px 8px;">
                            <input type="number" id="alloc_marks_${s.allocation_id}" min="0" max="100" value="${marks}" style="width: 65px; padding: 4px 6px; border: 1px solid #CBD5E1; border-radius: 4px; font-weight: 600;" oninput="document.getElementById('alloc_gp_${s.allocation_id}').textContent = (Math.max(0, Math.min(100, parseFloat(this.value) || 0)) / 10).toFixed(2)">
                        </td>
                        <td style="padding: 10px 8px;">
                            <strong id="alloc_gp_${s.allocation_id}" style="color: #2563EB; font-size: 14px;">${courseGradePoint}</strong>
                        </td>
                        <td style="padding: 10px 8px; text-align: right;">
                            <button class="btn btn-sm btn-primary" onclick="saveAllocationGrade(${s.allocation_id}, '${s.student_id}')" style="padding: 5px 12px; font-size: 12px;">Save Evaluation</button>
                        </td>
                    </tr>
                `;
            }).join("");

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F1F5F9; padding-bottom: 10px; margin-bottom: 10px;">
                    <div>
                        <h3 style="margin: 0; color: #0F172A; font-size: 15px;">${facCourse}</h3>
                        <span style="font-size: 12px; color: #64748B;">Academic Year: ${year}</span>
                    </div>
                    <span style="background: #ECFDF5; color: #059669; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                        ${students.length} Student${students.length > 1 ? "s" : ""} Enrolled
                    </span>
                </div>

                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; font-size: 13px; color: #64748B; border-bottom: 1px solid #E2E8F0;">
                            <th style="padding: 8px;">Student ID</th>
                            <th style="padding: 8px;">Student Name</th>
                            <th style="padding: 8px;">Course Attendance</th>
                            <th style="padding: 8px;">Subject Internal Marks (/100)</th>
                            <th style="padding: 8px;">Grade Point</th>
                            <th style="padding: 8px; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            `;
            yearSection.appendChild(card);
        });

        container.appendChild(yearSection);
    });
}

window.saveAllocationGrade = async function (allocId, studentId) {
    const att = document.getElementById(`alloc_att_${allocId}`)?.value;
    const marks = document.getElementById(`alloc_marks_${allocId}`)?.value;

    try {
        await updateFacultyGrade(allocId, att, marks);
        alert(`Evaluation saved for ${studentId}: ${att}% attendance, ${marks}/100 internal marks.`);
        await loadAllocations();
        await loadCohortOverview();
    } catch (err) {
        alert("Failed to save grade: " + err.message);
    }
};

// Super Admin Handlers
document.getElementById("studentForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    const name = document.getElementById("studentName").value.trim();
    const department = document.getElementById("department").value;
    const year = document.getElementById("academicYear").value;
    const password = document.getElementById("studentPassword")?.value.trim() || "student123";

    try {
        await createStudent({ name, department, year, password });
        alert(`Student enrolled successfully!`);
        document.getElementById("studentForm").reset();
        await loadCohortOverview();
    } catch (err) {
        alert("Error: " + err.message);
    }
});

async function handleDelete(id) {
    if (!isSuperAdmin) return;
    if (!confirm(`Are you sure you want to delete student ${id}?`)) return;
    try {
        await removeStudent(id);
        await loadCohortOverview();
    } catch (err) {
        alert("Delete failed: " + err.message);
    }
}