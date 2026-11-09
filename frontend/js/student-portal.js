document.addEventListener("DOMContentLoaded", async () => {
    // 1. Authenticate Session
    let sessionStudent = null;
    try {
        sessionStudent = getLoggedInStudent();
    } catch (e) {
        sessionStudent = null;
    }

    if (!sessionStudent || !sessionStudent.id) {
        window.location.replace("login.html");
        return;
    }

    let student = sessionStudent;

    // 2. Immediately Populate Identity Card from Session (No Waiting)
    function populateIdentityPass(s) {
        const welcomeTitle = document.getElementById("welcomeStudentName");
        if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${s.name || "Student"}`;

        const passName = document.getElementById("passStudentName");
        if (passName) passName.textContent = s.name || "Student";

        const passId = document.getElementById("passStudentId");
        if (passId) passId.textContent = `ID: ${s.id || "---"}`;

        const passMeta = document.getElementById("passStudentMeta");
        if (passMeta) passMeta.textContent = `${s.department || "CSE"} • ${s.year || "Enrolled"}`;

        const passAvatar = document.getElementById("passStudentAvatar");
        if (passAvatar) passAvatar.textContent = (s.name ? s.name.charAt(0) : "S").toUpperCase();
    }

    populateIdentityPass(student);

    // Try refreshing profile from backend
    try {
        const fresh = await fetchStudentById(sessionStudent.id);
        if (fresh && fresh.id) {
            student = fresh;
            setLoggedInStudent(student);
            populateIdentityPass(student);
        }
    } catch (err) {
        console.warn("Using cached session profile:", err);
    }

    // 3. Load Academic Metrics (GPA, Attendance, Credits)
    try {
        const summary = await fetchStudentAcademicsSummary(student.id);
        const gpaEl = document.getElementById("metricGpa");
        if (gpaEl) gpaEl.textContent = summary.cgpa || "0.00";

        const attEl = document.getElementById("metricAttendance");
        if (attEl) attEl.textContent = `${summary.attendance || 0}%`;

        const credsEl = document.getElementById("metricCredits");
        if (credsEl) credsEl.textContent = summary.totalCredits || 0;
    } catch (err) {
        console.warn("Could not load metrics summary, applying defaults:", err);
        const gpaEl = document.getElementById("metricGpa");
        if (gpaEl) gpaEl.textContent = "8.00";
        const attEl = document.getElementById("metricAttendance");
        if (attEl) attEl.textContent = "85%";
    }

    // -----------------------------------------------------------------
    // 4. Course & Faculty Registration (14 - 20 Credits)
    // -----------------------------------------------------------------
    let availableCourses = [];
    let selectedCourseMap = new Map();
    let savedEnrollmentList = [];

    const courseGrid = document.getElementById("coursePickerGrid");
    const coursePickerContainer = document.getElementById("coursePickerContainer");
    const confirmedContainer = document.getElementById("confirmedCoursesContainer");
    const confirmedList = document.getElementById("confirmedCoursesList");
    const editCoursesBtn = document.getElementById("editCoursesBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");
    const liveCreditsEl = document.getElementById("liveSelectedCredits");
    const headerCreditsEl = document.getElementById("metricCredits");
    const alertBox = document.getElementById("courseAlertMsg");
    const saveBtn = document.getElementById("saveCoursesBtn");

    function calculateTotalCredits() {
        let total = 0;
        selectedCourseMap.forEach(c => { total += c.credits; });
        return total;
    }

    function updateCreditDisplay() {
        const total = calculateTotalCredits();

        if (liveCreditsEl) {
            liveCreditsEl.textContent = total;
            liveCreditsEl.style.color = (total >= 14 && total <= 20) ? "#10B981" : "#DC2626";
        }

        if (headerCreditsEl) {
            headerCreditsEl.textContent = total;
        }

        if (alertBox) {
            if (total > 20) {
                alertBox.textContent = `Credit limit exceeded: ${total} credits selected. Maximum allowed is 20 credits.`;
                alertBox.style.background = "#FEE2E2";
                alertBox.style.color = "#DC2626";
                alertBox.style.display = "block";
                if (saveBtn) saveBtn.disabled = true;
            } else if (total > 0 && total < 14) {
                alertBox.textContent = `Under-registered: ${total} credits selected. Minimum required is 14 credits (add ${14 - total} more).`;
                alertBox.style.background = "#FEF3C7";
                alertBox.style.color = "#D97706";
                alertBox.style.display = "block";
                if (saveBtn) saveBtn.disabled = false;
            } else {
                alertBox.style.display = "none";
                if (saveBtn) saveBtn.disabled = false;
            }
        }
    }

    function renderConfirmedView(courses) {
        if (!confirmedContainer || !confirmedList) return;

        confirmedList.replaceChildren();
        courses.forEach((c) => {
            const card = document.createElement("div");
            card.className = "course-card";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.gap = "8px";
            card.style.padding = "16px";
            card.style.border = "1px solid #E2E8F0";
            card.style.borderRadius = "10px";
            card.style.background = "#FFFFFF";

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="color: #0F172A; font-size: 15px;">${c.course_name || c.name}</strong>
                        <div style="font-size: 12px; color: #64748B;">Code: ${c.course_id || c.id}</div>
                    </div>
                    <span style="background: #EFF6FF; color: #2563EB; font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 6px;">
                        ${c.credits} Credits
                    </span>
                </div>
                <div style="padding-top: 8px; border-top: 1px solid #F1F5F9; font-size: 13px; color: #334155;">
                    <span style="color: #64748B; font-size: 12px;">Instructor:</span> <strong>${c.faculty || "Department Panel"}</strong>
                </div>
            `;
            confirmedList.appendChild(card);
        });

        confirmedContainer.style.display = "block";
        if (coursePickerContainer) coursePickerContainer.style.display = "none";
    }

    function renderCourseSelectionGrid() {
        if (!courseGrid) return;
        courseGrid.replaceChildren();

        if (!availableCourses || availableCourses.length === 0) {
            courseGrid.innerHTML = `<p style="color: #94A3B8; font-size: 14px;">No courses available for ${student.department} - ${student.year}.</p>`;
            return;
        }

        availableCourses.forEach(c => {
            const isChecked = selectedCourseMap.has(c.id);
            const savedFaculty = isChecked ? selectedCourseMap.get(c.id).faculty : "";

            const facultyOptions = (c.faculty || ["Department Faculty"])
                .map(fac => `<option value="${fac}" ${fac === savedFaculty ? "selected" : ""}>${fac}</option>`)
                .join("");

            const card = document.createElement("div");
            card.id = `card_${c.id}`;
            card.className = "course-card";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.gap = "10px";
            card.style.padding = "16px";
            card.style.border = isChecked ? "2px solid #2563EB" : "1px solid #E2E8F0";
            card.style.borderRadius = "10px";
            card.style.background = isChecked ? "#EFF6FF" : "#FFFFFF";
            card.style.transition = "all 0.15s ease-in-out";

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; flex: 1;">
                        <input type="checkbox" id="chk_${c.id}" value="${c.id}" ${isChecked ? "checked" : ""} style="width: 18px; height: 18px; margin-top: 2px; accent-color: #2563EB; cursor: pointer;">
                        <div>
                            <div style="font-weight: 600; color: #0F172A; font-size: 14px;">${c.name}</div>
                            <div style="font-size: 12px; color: #64748B;">Code: ${c.id}</div>
                        </div>
                    </label>
                    <span style="background: #F1F5F9; color: #475569; font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 6px; white-space: nowrap;">
                        ${c.credits} Credits
                    </span>
                </div>

                <div style="margin-top: 4px; padding-top: 8px; border-top: 1px solid ${isChecked ? '#DBEAFE' : '#F1F5F9'};">
                    <label style="font-size: 12px; color: #64748B; font-weight: 600; display: block; margin-bottom: 4px;">Select Faculty</label>
                    <select id="fac_${c.id}" ${!isChecked ? "disabled" : ""} style="width: 100%; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 13px; background: ${!isChecked ? '#F8FAFC' : '#FFFFFF'};">
                        ${facultyOptions}
                    </select>
                </div>
            `;

            const checkbox = card.querySelector(`#chk_${c.id}`);
            const selectEl = card.querySelector(`#fac_${c.id}`);

            checkbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    let prospectiveTotal = c.credits;
                    selectedCourseMap.forEach(item => prospectiveTotal += item.credits);

                    if (prospectiveTotal > 20) {
                        e.target.checked = false;
                        alert(`Cannot enroll in "${c.name}" (${c.credits} credits). Total would reach ${prospectiveTotal} credits, which exceeds the 20-credit limit.`);
                        return;
                    }

                    selectedCourseMap.set(c.id, {
                        id: c.id,
                        name: c.name,
                        credits: c.credits,
                        faculty: selectEl.value
                    });

                    selectEl.disabled = false;
                    selectEl.style.background = "#FFFFFF";
                    card.style.border = "2px solid #2563EB";
                    card.style.background = "#EFF6FF";
                } else {
                    selectedCourseMap.delete(c.id);
                    selectEl.disabled = true;
                    selectEl.style.background = "#F8FAFC";
                    card.style.border = "1px solid #E2E8F0";
                    card.style.background = "#FFFFFF";
                }
                updateCreditDisplay();
            });

            selectEl.addEventListener("change", (e) => {
                if (selectedCourseMap.has(c.id)) {
                    selectedCourseMap.get(c.id).faculty = e.target.value;
                }
            });

            courseGrid.appendChild(card);
        });
    }

    try {
        availableCourses = await fetchStudentCourses(student.department, student.year);
        savedEnrollmentList = await fetchEnrolledStudentCourses(student.id);

        if (savedEnrollmentList && savedEnrollmentList.length > 0) {
            savedEnrollmentList.forEach(c => {
                selectedCourseMap.set(c.course_id, {
                    id: c.course_id,
                    name: c.course_name,
                    credits: c.credits,
                    faculty: c.faculty || "Unassigned"
                });
            });
            renderConfirmedView(savedEnrollmentList);
        } else {
            if (confirmedContainer) confirmedContainer.style.display = "none";
            if (coursePickerContainer) coursePickerContainer.style.display = "block";
            renderCourseSelectionGrid();
        }

        updateCreditDisplay();
    } catch (courseErr) {
        console.error("Course loading error:", courseErr);
        if (courseGrid) {
            courseGrid.innerHTML = `<p style="color: #DC2626;">Unable to connect to course server. Ensure 'node server.js' is running.</p>`;
        }
    }

    if (editCoursesBtn) {
        editCoursesBtn.addEventListener("click", () => {
            if (confirmedContainer) confirmedContainer.style.display = "none";
            if (coursePickerContainer) coursePickerContainer.style.display = "block";
            if (cancelEditBtn && savedEnrollmentList.length > 0) cancelEditBtn.style.display = "inline-block";
            renderCourseSelectionGrid();
            updateCreditDisplay();
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", () => {
            selectedCourseMap.clear();
            savedEnrollmentList.forEach(c => {
                selectedCourseMap.set(c.course_id, {
                    id: c.course_id,
                    name: c.course_name,
                    credits: c.credits,
                    faculty: c.faculty || "Unassigned"
                });
            });
            renderConfirmedView(savedEnrollmentList);
            updateCreditDisplay();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            const total = calculateTotalCredits();

            if (total < 14) {
                alert(`Cannot register: You have selected ${total} credits. Minimum required is 14 credits.`);
                return;
            }

            if (total > 20) {
                alert(`Cannot register: You have selected ${total} credits. Maximum allowed is 20 credits.`);
                return;
            }

            const courseList = Array.from(selectedCourseMap.values());

            try {
                const res = await saveStudentCourseSelection(student.id, courseList);
                alert(res.message);

                savedEnrollmentList = courseList.map(c => ({
                    course_id: c.id,
                    course_name: c.name,
                    credits: c.credits,
                    faculty: c.faculty
                }));

                renderConfirmedView(savedEnrollmentList);
                updateCreditDisplay();
            } catch (err) {
                alert("Error: " + err.message);
            }
        });
    }

    // 5. Load Department Assignments
    const assignContainer = document.getElementById("studentAssignmentList");
    if (assignContainer) {
        try {
            const assignments = await fetchAssignments(student.department);
            assignContainer.replaceChildren();

            if (!assignments || assignments.length === 0) {
                assignContainer.innerHTML = `<p style="color: #94A3B8; font-size: 14px;">No pending work assigned for ${student.department} department.</p>`;
            } else {
                assignments.forEach((task) => {
                    const card = document.createElement("div");
                    card.className = "notice-item";
                    card.style.borderLeftColor = "#10B981";
                    card.innerHTML = `
                        <div class="notice-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <strong style="color: #0F172A; font-size: 15px;">${task.title}</strong>
                            <span class="notice-tag" style="background: #ECFDF5; color: #059669;">Due: ${task.due_date}</span>
                        </div>
                        <p class="notice-content" style="margin-bottom: 6px;">${task.description}</p>
                        <span style="font-size: 11px; color: #94A3B8;">Assigned by: ${task.posted_by} (${task.department} Dept)</span>
                    `;
                    assignContainer.appendChild(card);
                });
            }
        } catch (assignErr) {
            assignContainer.innerHTML = `<p style="color: #94A3B8; font-size: 13px;">No departmental tasks at this time.</p>`;
        }
    }

    // 6. Load Campus Announcements & Events
    const noticeList = document.getElementById("noticeList");
    if (noticeList) {
        try {
            const notices = await fetchNotices();
            let registeredEventIds = [];
            try {
                registeredEventIds = await fetchStudentRegistrations(student.id);
            } catch (regErr) {
                registeredEventIds = [];
            }

            noticeList.replaceChildren();

            if (!notices || notices.length === 0) {
                noticeList.innerHTML = `<p style="color: #94A3B8; font-size: 14px;">No campus notices at this time.</p>`;
            } else {
                notices.forEach((n) => {
                    const item = document.createElement("div");
                    item.className = "notice-item";

                    const isEvent = n.category === "Event" || n.category === "Campus Event";
                    const isRegistered = registeredEventIds.includes(n.id);

                    let actionHtml = "";
                    if (isEvent) {
                        actionHtml = isRegistered
                            ? `<button class="btn" disabled style="background:#10B981; color:white; padding:6px 14px; border-radius:6px; cursor:default; border:none; font-size:12px; font-weight:600;">✓ Registered</button>`
                            : `<button class="btn btn-primary" onclick="handleEventRegister(${n.id})" style="padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Register Now</button>`;
                    }

                    item.innerHTML = `
                        <div class="notice-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <div>
                                <strong style="color: #0F172A; font-size: 15px;">${n.title}</strong>
                                <span class="notice-tag" style="margin-left: 8px;">${n.category}</span>
                            </div>
                            <div>${actionHtml}</div>
                        </div>
                        <p class="notice-content">${n.content}</p>
                    `;
                    noticeList.appendChild(item);
                });
            }
        } catch (noticeErr) {
            noticeList.innerHTML = `<p style="color: #94A3B8; font-size: 13px;">Unable to load announcements.</p>`;
        }
    }

    // 7. Student Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            clearAllSessions();
            window.location.replace("login.html");
        });
    }
});