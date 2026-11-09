const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(path.join(__dirname, "database.sqlite"), (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected to SQLite database.");
});

// Setup schema and seed initial records
db.serialize(() => {
    // 1. Students Table
    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            year TEXT NOT NULL,
            password TEXT NOT NULL DEFAULT 'student123',
            attendance INTEGER NOT NULL DEFAULT 85,
            marks INTEGER NOT NULL DEFAULT 80
        )
    `);

    // 2. Admins Table
    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            department TEXT NOT NULL DEFAULT 'ALL',
            role TEXT NOT NULL DEFAULT 'deptadmin'
        )
    `);

    // 3. Faculty Accounts Table
    db.run(`
        CREATE TABLE IF NOT EXISTS faculty (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL DEFAULT 'faculty123',
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            subject TEXT DEFAULT 'General'
        )
    `);

    db.run("ALTER TABLE faculty ADD COLUMN subject TEXT DEFAULT 'General'", () => {});

    // 4. Student Courses with Subject-Level Attendance & Marks
    db.run(`
        CREATE TABLE IF NOT EXISTS student_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            course_id TEXT NOT NULL,
            course_name TEXT NOT NULL,
            credits INTEGER NOT NULL,
            faculty TEXT NOT NULL DEFAULT 'Unassigned',
            course_attendance INTEGER NOT NULL DEFAULT 85,
            course_marks INTEGER NOT NULL DEFAULT 80,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, course_id)
        )
    `);

    db.run("ALTER TABLE student_courses ADD COLUMN course_attendance INTEGER NOT NULL DEFAULT 85", () => {});
    db.run("ALTER TABLE student_courses ADD COLUMN course_marks INTEGER NOT NULL DEFAULT 80", () => {});

    // 5. Notices & Events
    db.run(`
        CREATE TABLE IF NOT EXISTS notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'General',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 6. Course & Faculty Assignments (Linked to course_id)
    db.run(`
        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department TEXT NOT NULL,
            course_id TEXT NOT NULL DEFAULT 'ALL',
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            due_date TEXT NOT NULL,
            posted_by TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run("ALTER TABLE assignments ADD COLUMN course_id TEXT NOT NULL DEFAULT 'ALL'", () => {});

    // 7. Event Registrations
    db.run(`
        CREATE TABLE IF NOT EXISTS event_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            student_id TEXT NOT NULL,
            student_name TEXT NOT NULL,
            department TEXT NOT NULL,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id, student_id)
        )
    `);

    // 8. Assignment Submissions Table
    db.run(`
        CREATE TABLE IF NOT EXISTS assignment_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assignment_id INTEGER NOT NULL,
            student_id TEXT NOT NULL,
            submission_text TEXT DEFAULT 'Completed',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(assignment_id, student_id)
        )
    `);

    // Seed default Super Admin
    db.get("SELECT * FROM admins WHERE username = 'admin'", (err, admin) => {
        if (!admin) {
            db.run(
                "INSERT INTO admins (username, password, name, department, role) VALUES (?, ?, ?, ?, ?)",
                ["admin", "admin123", "System Administrator", "ALL", "superadmin"]
            );
        }
    });

    // Seed default CSE Coordinator
    db.get("SELECT * FROM admins WHERE username = 'cse_admin'", (err, admin) => {
        if (!admin) {
            db.run(
                "INSERT INTO admins (username, password, name, department, role) VALUES (?, ?, ?, ?, ?)",
                ["cse_admin", "admin123", "CSE Department Coordinator", "CSE", "deptadmin"]
            );
        }
    });

    // Seed default ECE Coordinator
    db.get("SELECT * FROM admins WHERE username = 'ece_admin'", (err, admin) => {
        if (!admin) {
            db.run(
                "INSERT INTO admins (username, password, name, department, role) VALUES (?, ?, ?, ?, ?)",
                ["ece_admin", "admin123", "ECE Department Coordinator", "ECE", "deptadmin"]
            );
        }
    });

    // Seed Initial Faculty Members
    const defaultFaculty = [
        ["dr_ramanathan", "faculty123", "Dr. D. V. Ramanathan", "CSE", "[CSE302] Operating Systems"],
        ["dr_murali", "faculty123", "Dr. Murali Krishna", "CSE", "[CSE301] Database Management Systems"],
        ["prof_alok", "faculty123", "Prof. Alok Mukherjee", "CSE", "[CSE306] Web Technologies & REST APIs"],
        ["prof_pooja", "faculty123", "Prof. Pooja Hegde", "CSE", "[CSE304] Software Engineering"],
        ["dr_srinivas", "faculty123", "Dr. K. Srinivas Rao", "CSE", "[CSE101] Problem Solving using C"],
        ["dr_catherine", "faculty123", "Dr. Catherine Roy", "CSE", "[ENG101] Technical Communication Skills"],
        ["dr_venkat", "faculty123", "Dr. M. Venkat Reddy", "CSE", "[CSE102] Digital Logic Design"],
        ["dr_sudheer", "faculty123", "Dr. A. Sudheer Kumar", "CSE", "[CSE201] Data Structures & Algorithms"],
        ["dr_chandrasekhar", "faculty123", "Dr. N. Chandrasekhar", "ECE", "[ECE201] Signals & Systems"],
        ["prof_divya", "faculty123", "Prof. Divya S.", "ECE", "[ECE202] Electronic Devices & Circuits"],
        ["dr_sasikumar", "faculty123", "Dr. P. R. Sasikumar", "ECE", "[ECE204L] Circuits & Simulation Lab"],
        ["prof_bala", "faculty123", "Prof. K. Bala", "ECE", "[CHM101] Engineering Chemistry"],
        ["dr_sharma", "faculty123", "Dr. S. K. Sharma", "MAT", "[MAT101] Calculus & Linear Algebra"],
        ["dr_usharani", "faculty123", "Dr. Usha Rani", "CHM", "[CHM101] Engineering Chemistry"]
    ];

    defaultFaculty.forEach(([uname, pwd, name, dept, subject]) => {
        db.get("SELECT id FROM faculty WHERE username = ?", [uname], (err, row) => {
            if (!row) {
                db.run(
                    "INSERT INTO faculty (username, password, name, department, subject) VALUES (?, ?, ?, ?, ?)",
                    [uname, pwd, name, dept, subject]
                );
            }
        });
    });

    // Seed Initial Students
    db.get("SELECT COUNT(*) AS count FROM students", (err, row) => {
        if (!err && row.count === 0) {
            const seedQuery = `INSERT INTO students (id, name, department, year, password, attendance, marks) VALUES (?, ?, ?, ?, ?, 85, 80)`;
            const initialStudents = [
                ["CSE001", "Rahul Kumar", "CSE", "3rd Year", "student123"],
                ["CSE002", "Sneha Patel", "CSE", "1st Year", "student123"],
                ["CSE003", "Tenddulkar Reddy", "CSE", "1st Year", "student123"],
                ["ECE001", "Priya Sharma", "ECE", "2nd Year", "student123"]
            ];
            initialStudents.forEach((s) => db.run(seedQuery, s));
        }
    });
});

function generateNextDeptId(dept, callback) {
    const prefix = dept.toUpperCase();
    db.all("SELECT id FROM students WHERE department = ?", [prefix], (err, rows) => {
        if (err) return callback(err);

        const existingNumbers = new Set(
            rows
                .map((r) => Number(r.id.replace(prefix, "")))
                .filter((n) => !isNaN(n))
        );

        let nextNum = 1;
        while (existingNumbers.has(nextNum)) {
            nextNum++;
        }
        callback(null, `${prefix}${String(nextNum).padStart(3, "0")}`);
    });
}

// ----------------------------------------------------
// FULL COURSE CATALOG
// ----------------------------------------------------
const COURSE_CATALOG = {
    CSE: {
        "1st Year": [
            { id: "CSE101", name: "Problem Solving using C", credits: 4, faculty: ["Dr. K. Srinivas Rao", "Prof. Ananya Sen", "Dr. Rajesh Varma"] },
            { id: "CSE102", name: "Digital Logic Design", credits: 4, faculty: ["Dr. M. Venkat Reddy", "Prof. Neha Gupta"] },
            { id: "MAT101", name: "Calculus & Linear Algebra", credits: 4, faculty: ["Dr. S. K. Sharma", "Dr. Geetha Kumari"] },
            { id: "PHY101", name: "Engineering Physics", credits: 3, faculty: ["Dr. P. N. Murthy", "Prof. Vikram Aditya"] },
            { id: "CSE103L", name: "C Programming Laboratory", credits: 2, faculty: ["Prof. Ananya Sen", "Dr. Rajesh Varma"] },
            { id: "ENG101", name: "Technical Communication Skills", credits: 2, faculty: ["Dr. Catherine Roy", "Prof. Sandhya Rani"] }
        ],
        "2nd Year": [
            { id: "CSE201", name: "Data Structures & Algorithms", credits: 4, faculty: ["Dr. A. Sudheer Kumar", "Dr. Pradeep Mishra", "Prof. Kavitha Raman"] },
            { id: "CSE202", name: "Object-Oriented Programming (Java)", credits: 4, faculty: ["Dr. R. K. Bhattacharya", "Prof. Snehal Deshmukh"] },
            { id: "MAT201", name: "Discrete Mathematics", credits: 4, faculty: ["Dr. S. K. Sharma", "Dr. Radhika Menon"] },
            { id: "CSE203", name: "Computer Architecture", credits: 3, faculty: ["Dr. T. Hariprasad", "Prof. Arun Nair"] },
            { id: "CSE204L", name: "Data Structures Lab", credits: 2, faculty: ["Dr. A. Sudheer Kumar", "Prof. Kavitha Raman"] },
            { id: "CSE205", name: "Principles of Programming Languages", credits: 3, faculty: ["Prof. Snehal Deshmukh", "Dr. R. K. Bhattacharya"] }
        ],
        "3rd Year": [
            { id: "CSE301", name: "Database Management Systems", credits: 4, faculty: ["Dr. Murali Krishna", "Prof. Swati Joshi", "Dr. Sanjay Gupta"] },
            { id: "CSE302", name: "Operating Systems", credits: 4, faculty: ["Dr. D. V. Ramanathan", "Prof. Alok Mukherjee"] },
            { id: "CSE303", name: "Computer Networks", credits: 4, faculty: ["Dr. B. K. Mohapatra", "Prof. Vandana Rao"] },
            { id: "CSE304", name: "Software Engineering", credits: 3, faculty: ["Prof. Pooja Hegde", "Dr. Murali Krishna"] },
            { id: "CSE305L", name: "DBMS & Networks Lab", credits: 2, faculty: ["Prof. Swati Joshi", "Prof. Vandana Rao"] },
            { id: "CSE306", name: "Web Technologies & REST APIs", credits: 3, faculty: ["Prof. Alok Mukherjee", "Dr. D. V. Ramanathan"] }
        ],
        "4th Year": [
            { id: "CSE401", name: "Cloud Computing & AWS Architecture", credits: 4, faculty: ["Dr. H. N. Prabhakar", "Prof. Meera Nair"] },
            { id: "CSE402", name: "Artificial Intelligence & ML", credits: 4, faculty: ["Dr. G. Satyanarayana", "Dr. Shikha Roy"] },
            { id: "CSE403", name: "Network Security & Cryptography", credits: 3, faculty: ["Dr. H. N. Prabhakar", "Prof. V. Chaitanya"] },
            { id: "CSE404", name: "DevOps & Continuous Deployment", credits: 3, faculty: ["Prof. Meera Nair", "Prof. V. Chaitanya"] },
            { id: "CSE405P", name: "Capstone Project Phase-I", credits: 6, faculty: ["Department Mentor Panel"] }
        ]
    },
    ECE: {
        "1st Year": [
            { id: "ECE101", name: "Basic Electrical & Electronics", credits: 4, faculty: ["Dr. N. Chandrasekhar", "Prof. Divya S."] },
            { id: "CHM101", name: "Engineering Chemistry", credits: 4, faculty: ["Dr. Usha Rani", "Prof. K. Bala"] },
            { id: "MAT101", name: "Calculus & Linear Algebra", credits: 4, faculty: ["Dr. S. K. Sharma", "Dr. Geetha Kumari"] },
            { id: "ENG101", name: "Technical Communication Skills", credits: 2, faculty: ["Dr. Catherine Roy", "Prof. Sandhya Rani"] }
        ],
        "2nd Year": [
            { id: "ECE201", name: "Signals & Systems", credits: 4, faculty: ["Dr. N. Chandrasekhar", "Prof. K. Bala"] },
            { id: "ECE202", name: "Electronic Devices & Circuits", credits: 4, faculty: ["Dr. P. R. Sasikumar", "Prof. Divya S."] },
            { id: "ECE203", name: "Digital System Design (Verilog)", credits: 4, faculty: ["Dr. M. Venkat Reddy", "Prof. Neha Gupta"] },
            { id: "MAT202", name: "Probability & Random Processes", credits: 4, faculty: ["Dr. S. K. Sharma", "Dr. Radhika Menon"] },
            { id: "ECE204L", name: "Circuits & Simulation Lab", credits: 2, faculty: ["Dr. P. R. Sasikumar", "Prof. Divya S."] }
        ],
        "3rd Year": [
            { id: "ECE301", name: "Microprocessors & Microcontrollers", credits: 4, faculty: ["Dr. T. Hariprasad", "Prof. Arun Nair"] },
            { id: "ECE302", name: "Analog & Digital Communication", credits: 4, faculty: ["Dr. B. K. Mohapatra", "Prof. Vandana Rao"] },
            { id: "ECE303", name: "Electromagnetic Fields & Waves", credits: 4, faculty: ["Dr. N. Chandrasekhar", "Dr. P. R. Sasikumar"] },
            { id: "ECE304L", name: "Microcontroller System Lab", credits: 2, faculty: ["Dr. T. Hariprasad", "Prof. Arun Nair"] }
        ],
        "4th Year": [
            { id: "ECE401", name: "VLSI Design & Embedded Systems", credits: 4, faculty: ["Dr. M. Venkat Reddy", "Dr. P. R. Sasikumar"] },
            { id: "ECE402", name: "Wireless Sensor Networks & IoT", credits: 4, faculty: ["Dr. B. K. Mohapatra", "Prof. Divya S."] },
            { id: "ECE403P", name: "Capstone Project Phase-I", credits: 6, faculty: ["ECE Review Panel"] }
        ]
    },
    IT: {
        "1st Year": [
            { id: "IT101", name: "Foundations of Computing", credits: 4, faculty: ["Dr. R. S. Iyer", "Prof. Sunita Rao"] },
            { id: "MAT101", name: "Calculus & Linear Algebra", credits: 4, faculty: ["Dr. S. K. Sharma", "Dr. Geetha Kumari"] },
            { id: "CSE103L", name: "Programming Laboratory", credits: 2, faculty: ["Prof. Ananya Sen", "Dr. Rajesh Varma"] },
            { id: "ENG101", name: "Technical Communication Skills", credits: 2, faculty: ["Dr. Catherine Roy", "Prof. Sandhya Rani"] }
        ],
        "2nd Year": [
            { id: "IT201", name: "Data Structures & Algorithms", credits: 4, faculty: ["Dr. A. Sudheer Kumar", "Prof. Kavitha Raman"] },
            { id: "IT202", name: "Database Management & SQL", credits: 4, faculty: ["Dr. Murali Krishna", "Prof. Swati Joshi"] },
            { id: "IT203", name: "Computer Organization", credits: 4, faculty: ["Dr. T. Hariprasad", "Prof. Arun Nair"] },
            { id: "IT204L", name: "Data Structures Lab", credits: 2, faculty: ["Dr. A. Sudheer Kumar", "Prof. Kavitha Raman"] }
        ],
        "3rd Year": [
            { id: "IT301", name: "Full Stack Web Engineering", credits: 4, faculty: ["Prof. Alok Mukherjee", "Dr. D. V. Ramanathan"] },
            { id: "IT302", name: "Information Security", credits: 4, faculty: ["Dr. H. N. Prabhakar", "Prof. V. Chaitanya"] },
            { id: "IT303", name: "Cloud Infrastructure", credits: 4, faculty: ["Dr. H. N. Prabhakar", "Prof. Meera Nair"] }
        ],
        "4th Year": [
            { id: "IT401", name: "Distributed Systems & Microservices", credits: 4, faculty: ["Dr. G. Satyanarayana", "Prof. Meera Nair"] },
            { id: "IT402", name: "DevOps & Continuous Deployment", credits: 4, faculty: ["Prof. Meera Nair", "Prof. V. Chaitanya"] },
            { id: "IT403P", name: "Capstone Project Phase-I", credits: 6, faculty: ["IT Review Panel"] }
        ]
    }
};

// ----------------------------------------------------
// 1. AUTHENTICATION & DIRECTORY APIS
// ----------------------------------------------------

app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admins WHERE LOWER(username) = LOWER(?)", [username?.trim()], (err, admin) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!admin || admin.password !== password) {
            return res.status(401).json({ error: "Invalid administrator credentials" });
        }
        res.json({
            success: true,
            role: admin.role,
            username: admin.username,
            name: admin.name,
            department: admin.department
        });
    });
});

app.get("/api/admin/all", (req, res) => {
    db.all("SELECT id, username, name, department, role FROM admins ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// STRICT ONE ADMIN PER DEPARTMENT CONSTRAINT
// CREATE ADMIN WITH STRICT ONE-ADMIN-PER-DEPARTMENT VALIDATION
app.post("/api/admin/create", (req, res) => {
    const { username, password, name, department } = req.body;
    if (!username || !password || !name) {
        return res.status(400).json({ error: "Username, password, and full name are required." });
    }
    const cleanUsername = username.trim().toLowerCase();
    const dept = (department || "CSE").trim().toUpperCase();

    // 1. Ensure username is globally unique
    db.get("SELECT id FROM admins WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))", [cleanUsername], (err, existingUser) => {
        if (err) return res.status(500).json({ error: err.message });
        if (existingUser) {
            return res.status(409).json({ error: `An administrator with username '${cleanUsername}' already exists.` });
        }

        // 2. Ensure only ONE admin exists per department (excluding central 'ALL')
        if (dept !== "ALL") {
            db.get(
                "SELECT id, name, username FROM admins WHERE UPPER(TRIM(department)) = UPPER(TRIM(?))",
                [dept],
                (deptErr, existingDeptAdmin) => {
                    if (deptErr) return res.status(500).json({ error: deptErr.message });
                    if (existingDeptAdmin) {
                        return res.status(409).json({
                            error: `Department '${dept}' already has an assigned coordinator (${existingDeptAdmin.name} - @${existingDeptAdmin.username}). Only one administrator is allowed per department.`
                        });
                    }

                    insertAdmin();
                }
            );
        } else {
            insertAdmin();
        }

        function insertAdmin() {
            db.run(
                "INSERT INTO admins (username, password, name, department, role) VALUES (?, ?, ?, ?, 'deptadmin')",
                [cleanUsername, password, name.trim(), dept],
                function (insertErr) {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });
                    res.status(201).json({
                        message: "Department coordinator account created successfully!",
                        admin: { id: this.lastID, username: cleanUsername, name: name.trim(), department: dept, role: "deptadmin" }
                    });
                }
            );
        }
    });
});

app.delete("/api/admin/:id", (req, res) => {
    const adminId = req.params.id;
    db.get("SELECT username FROM admins WHERE id = ?", [adminId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Admin account not found" });
        if (row.username === "admin") {
            return res.status(403).json({ error: "The primary Super Administrator account cannot be deleted." });
        }

        db.run("DELETE FROM admins WHERE id = ?", [adminId], (delErr) => {
            if (delErr) return res.status(500).json({ error: delErr.message });
            res.json({ message: `Admin account '${row.username}' removed successfully.` });
        });
    });
});

app.put("/api/admin/password", (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    db.get("SELECT password FROM admins WHERE LOWER(username) = LOWER(?)", [username?.trim()], (err, admin) => {
        if (err || !admin) return res.status(404).json({ error: "Admin not found" });
        if (admin.password !== currentPassword) return res.status(401).json({ error: "Current password does not match" });

        db.run("UPDATE admins SET password = ? WHERE LOWER(username) = LOWER(?)", [newPassword, username.trim()], (upErr) => {
            if (upErr) return res.status(500).json({ error: upErr.message });
            res.json({ message: "Admin password updated successfully!" });
        });
    });
});

// ----------------------------------------------------
// 2. FACULTY PORTAL, APPOINTMENTS & PASSWORDS
// ----------------------------------------------------

app.post("/api/faculty/login", (req, res) => {
    const { username, password } = req.body;
    db.get(
        "SELECT id, username, name, department, password, COALESCE(subject, 'General') AS subject FROM faculty WHERE LOWER(username) = LOWER(?) OR LOWER(name) = LOWER(?)",
        [username?.trim(), username?.trim()],
        (err, fac) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!fac) return res.status(404).json({ error: "Faculty account not found" });
            if (fac.password !== password) return res.status(401).json({ error: "Incorrect faculty password" });

            const { password: _, ...facData } = fac;
            res.json({ success: true, faculty: facData });
        }
    );
});

app.get("/api/faculty/all", (req, res) => {
    db.all("SELECT id, username, name, department, COALESCE(subject, 'General') AS subject FROM faculty ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post("/api/faculty/create", (req, res) => {
    const { username, password, name, department, subject } = req.body;
    if (!username || !password || !name || !department) {
        return res.status(400).json({ error: "Username, password, name, and department are required." });
    }
    const cleanUsername = username.trim().toLowerCase();
    const assignedSubject = subject ? subject.trim() : "General";

    db.get("SELECT id FROM faculty WHERE LOWER(username) = ?", [cleanUsername], (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });
        if (existing) {
            return res.status(409).json({ error: `A faculty account with username '${cleanUsername}' already exists.` });
        }

        db.run(
            "INSERT INTO faculty (username, password, name, department, subject) VALUES (?, ?, ?, ?, ?)",
            [cleanUsername, password, name.trim(), department.trim().toUpperCase(), assignedSubject],
            function (insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.status(201).json({
                    message: "Faculty account provisioned successfully!",
                    faculty: { 
                        id: this.lastID, 
                        username: cleanUsername, 
                        name: name.trim(), 
                        department: department.trim().toUpperCase(),
                        subject: assignedSubject
                    }
                });
            }
        );
    });
});

app.delete("/api/faculty/:id", (req, res) => {
    const facId = req.params.id;
    db.run("DELETE FROM faculty WHERE id = ?", [facId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Faculty account not found" });
        res.json({ message: "Faculty member removed successfully." });
    });
});

app.put("/api/faculty/password", (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "All password fields are required." });
    }

    db.get(
        "SELECT password FROM faculty WHERE LOWER(username) = LOWER(?)",
        [username.trim()],
        (err, faculty) => {
            if (err || !faculty) return res.status(404).json({ error: "Faculty member not found." });
            if (faculty.password !== currentPassword) {
                return res.status(401).json({ error: "Current password does not match." });
            }

            db.run(
                "UPDATE faculty SET password = ? WHERE LOWER(username) = LOWER(?)",
                [newPassword, username.trim()],
                (upErr) => {
                    if (upErr) return res.status(500).json({ error: upErr.message });
                    res.json({ message: "Faculty password updated successfully!" });
                }
            );
        }
    );
});

app.get("/api/faculty/classes/:facultyName", (req, res) => {
    const facultyName = decodeURIComponent(req.params.facultyName);

    const query = `
        SELECT 
            sc.id AS allocation_id,
            sc.student_id,
            s.name AS student_name,
            s.department AS student_dept,
            s.year AS academic_year,
            sc.course_id,
            sc.course_name,
            sc.credits,
            sc.course_attendance,
            sc.course_marks
        FROM student_courses sc
        JOIN students s ON UPPER(TRIM(sc.student_id)) = UPPER(TRIM(s.id))
        WHERE LOWER(TRIM(sc.faculty)) = LOWER(TRIM(?))
        ORDER BY sc.course_id ASC, s.id ASC
    `;

    db.all(query, [facultyName], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.put("/api/faculty/grade/:allocationId", (req, res) => {
    const allocationId = req.params.allocationId;
    const { attendance, marks } = req.body;

    const parsedAttendance = Math.min(100, Math.max(0, parseInt(attendance, 10) || 0));
    const parsedMarks = Math.min(100, Math.max(0, parseInt(marks, 10) || 0));

    db.run(
        "UPDATE student_courses SET course_attendance = ?, course_marks = ? WHERE id = ?",
        [parsedAttendance, parsedMarks, allocationId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Record not found" });

            res.json({
                message: "Evaluation saved successfully!",
                course_attendance: parsedAttendance,
                course_marks: parsedMarks
            });
        }
    );
});

// ----------------------------------------------------
// 3. DEPARTMENT COHORT SUMMARY (LIVE AGGREGATION)
// ----------------------------------------------------

app.get("/api/admin/cohort-summary/:dept", (req, res) => {
    const dept = req.params.dept.toUpperCase();

    let query = `
        SELECT 
            s.id AS student_id,
            s.name AS student_name,
            s.department,
            s.year AS academic_year,
            COUNT(sc.id) AS enrolled_courses_count,
            COALESCE(SUM(sc.credits), 0) AS total_credits,
            COALESCE(SUM(sc.course_marks * sc.credits * 1.0), 0) AS total_weighted_marks,
            COALESCE(AVG(sc.course_attendance * 1.0), 85.0) AS avg_course_attendance
        FROM students s
        LEFT JOIN student_courses sc ON UPPER(TRIM(s.id)) = UPPER(TRIM(sc.student_id))
    `;

    const params = [];
    if (dept !== "ALL") {
        query += " WHERE UPPER(TRIM(s.department)) = UPPER(TRIM(?))";
        params.push(dept);
    }

    query += " GROUP BY s.id, s.name, s.department, s.year ORDER BY s.year ASC, s.id ASC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const summary = (rows || []).map((r) => {
            const credits = parseInt(r.total_credits, 10) || 0;
            const weightedMarks = parseFloat(r.total_weighted_marks) || 0;

            const cgpa = credits > 0 
                ? (weightedMarks / credits / 10).toFixed(2) 
                : "0.00";

            const attendance = Math.round(parseFloat(r.avg_course_attendance) || 85);
            const isEligible = attendance >= 75;

            return {
                id: r.student_id,
                name: r.student_name,
                department: r.department,
                year: r.academic_year,
                totalCredits: credits,
                attendance,
                cgpa,
                isEligible,
                status: credits === 0 ? "Not Registered" : (credits < 14 ? "Under-Registered" : "Enrolled")
            };
        });

        res.json(summary);
    });
});

app.get("/api/students/:id/academics-summary", (req, res) => {
    const studentId = req.params.id.toUpperCase();

    db.all(
        "SELECT course_id, course_name, credits, faculty, course_attendance, course_marks FROM student_courses WHERE UPPER(TRIM(student_id)) = UPPER(TRIM(?))",
        [studentId],
        (err, courses) => {
            if (err) return res.status(500).json({ error: err.message });

            if (!courses || courses.length === 0) {
                return res.json({
                    cgpa: "0.00",
                    attendance: 0,
                    totalCredits: 0,
                    courses: []
                });
            }

            let totalMarksWeighted = 0;
            let totalAttendance = 0;
            let totalCredits = 0;

            courses.forEach((c) => {
                const creds = c.credits || 4;
                totalCredits += creds;
                totalMarksWeighted += (c.course_marks || 80) * creds;
                totalAttendance += (c.course_attendance || 85);
            });

            const weightedAverageMarks = totalCredits > 0 ? (totalMarksWeighted / totalCredits) : 80;
            const avgAttendance = Math.round(totalAttendance / courses.length);
            const calculatedCgpa = (weightedAverageMarks / 10).toFixed(2);

            res.json({
                cgpa: calculatedCgpa,
                attendance: avgAttendance,
                totalCredits,
                courses
            });
        }
    );
});

// ----------------------------------------------------
// 4. STUDENT & ALLOCATION APIS
// ----------------------------------------------------

app.post("/api/students/login", (req, res) => {
    const { id, password } = req.body;
    const identifier = id?.trim();

    db.get(
        "SELECT id, name, department, year, password FROM students WHERE UPPER(id) = UPPER(?) OR LOWER(name) = LOWER(?)",
        [identifier, identifier],
        (err, student) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!student) return res.status(404).json({ error: "Student ID or Name not found" });
            if (student.password !== password) return res.status(401).json({ error: "Incorrect password" });

            const { password: _, ...studentData } = student;
            res.json({ success: true, student: studentData });
        }
    );
});

app.put("/api/students/:id/password", (req, res) => {
    const studentId = req.params.id.toUpperCase();
    const { currentPassword, newPassword } = req.body;
    db.get("SELECT password FROM students WHERE UPPER(id) = ?", [studentId], (err, student) => {
        if (err || !student) return res.status(404).json({ error: "Student not found" });
        if (student.password !== currentPassword) return res.status(401).json({ error: "Current password does not match" });

        db.run("UPDATE students SET password = ? WHERE UPPER(id) = ?", [newPassword, studentId], (upErr) => {
            if (upErr) return res.status(500).json({ error: upErr.message });
            res.json({ message: "Password updated successfully!" });
        });
    });
});

app.get("/api/students/:id", (req, res) => {
    const studentId = req.params.id.toUpperCase();
    db.get("SELECT id, name, department, year FROM students WHERE UPPER(id) = ?", [studentId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Student not found" });
        res.json(row);
    });
});

app.get("/api/students", (req, res) => {
    db.all("SELECT id, name, department, year FROM students ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post("/api/students", (req, res) => {
    const { name, department, year, password } = req.body;
    if (!name || !department || !year) return res.status(400).json({ error: "All fields are required" });

    generateNextDeptId(department, (idErr, newId) => {
        if (idErr) return res.status(500).json({ error: idErr.message });

        db.run(
            "INSERT INTO students (id, name, department, year, password, attendance, marks) VALUES (?, ?, ?, ?, ?, 85, 80)",
            [newId, name.trim(), department, year, password?.trim() || "student123"],
            function (insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.status(201).json({ id: newId, name: name.trim(), department, year });
            }
        );
    });
});

app.delete("/api/students/:id", (req, res) => {
    db.run("DELETE FROM students WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Student deleted successfully" });
    });
});

app.get("/api/courses/:dept/:year", (req, res) => {
    const dept = req.params.dept.toUpperCase();
    const year = req.params.year;
    const courses = COURSE_CATALOG[dept]?.[year] || [];
    res.json(courses);
});

app.get("/api/student-courses/:studentId", (req, res) => {
    const studentId = req.params.studentId.toUpperCase();
    db.all(
        "SELECT course_id, course_name, credits, faculty, course_attendance, course_marks FROM student_courses WHERE UPPER(TRIM(student_id)) = UPPER(TRIM(?)) ORDER BY id ASC",
        [studentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        }
    );
});

app.post("/api/student-courses/save", (req, res) => {
    const { studentId, selectedCourses } = req.body;
    if (!studentId || !Array.isArray(selectedCourses)) return res.status(400).json({ error: "Invalid payload" });

    const totalCredits = selectedCourses.reduce((sum, c) => sum + (parseInt(c.credits, 10) || 0), 0);
    if (totalCredits < 14 || totalCredits > 20) {
        return res.status(400).json({ error: `Selected ${totalCredits} credits. Must be between 14 and 20 credits.` });
    }

    const sId = studentId.toUpperCase();
    db.serialize(() => {
        db.run("DELETE FROM student_courses WHERE UPPER(TRIM(student_id)) = UPPER(TRIM(?))", [sId], (delErr) => {
            if (delErr) return res.status(500).json({ error: delErr.message });

            const stmt = db.prepare(
                "INSERT INTO student_courses (student_id, course_id, course_name, credits, faculty, course_attendance, course_marks) VALUES (?, ?, ?, ?, ?, 85, 80)"
            );
            selectedCourses.forEach((c) => {
                stmt.run([sId, c.id, c.name, parseInt(c.credits, 10) || 0, c.faculty || "Unassigned"]);
            });
            stmt.finalize(() => {
                res.json({ message: `Course registration saved (${totalCredits} credits)!`, totalCredits });
            });
        });
    });
});

app.get("/api/admin/allocations/:dept", (req, res) => {
    const dept = req.params.dept.toUpperCase();
    const yearFilter = req.query.year;

    let query = `
        SELECT 
            sc.id AS allocation_id,
            sc.student_id,
            s.name AS student_name,
            s.department AS student_dept,
            s.year AS academic_year,
            sc.course_id,
            sc.course_name,
            sc.credits,
            sc.faculty,
            sc.course_attendance,
            sc.course_marks
        FROM student_courses sc
        JOIN students s ON UPPER(TRIM(sc.student_id)) = UPPER(TRIM(s.id))
    `;

    const conditions = [];
    const params = [];

    if (dept !== "ALL") {
        conditions.push("UPPER(TRIM(s.department)) = UPPER(TRIM(?))");
        params.push(dept);
    }

    if (yearFilter && yearFilter !== "ALL") {
        conditions.push("s.year = ?");
        params.push(yearFilter);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY s.year ASC, sc.faculty ASC, s.id ASC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ----------------------------------------------------
// 5. NOTICES, EVENTS & SCOPED ASSIGNMENTS
// ----------------------------------------------------

app.get("/api/notices", (req, res) => {
    db.all("SELECT * FROM notices ORDER BY id DESC LIMIT 10", [], (err, rows) => {
        res.json(rows || []);
    });
});

app.post("/api/notices", (req, res) => {
    const { title, content, category } = req.body;
    db.run("INSERT INTO notices (title, content, category) VALUES (?, ?, ?)", [title, content, category || "General"], function () {
        res.status(201).json({ id: this.lastID, title, content, category });
    });
});

app.post("/api/events/register", (req, res) => {
    const { eventId, studentId, studentName, department } = req.body;
    db.run(
        "INSERT INTO event_registrations (event_id, student_id, student_name, department) VALUES (?, ?, ?, ?)",
        [eventId, studentId.toUpperCase(), studentName, department],
        function (err) {
            if (err) return res.status(409).json({ error: "Already registered" });
            res.status(201).json({ message: "Registration confirmed!" });
        }
    );
});

app.get("/api/events/registrations/:studentId", (req, res) => {
    db.all("SELECT event_id FROM event_registrations WHERE UPPER(TRIM(student_id)) = UPPER(TRIM(?))", [req.params.studentId.toUpperCase()], (err, rows) => {
        res.json((rows || []).map((r) => r.event_id));
    });
});

// GET ASSIGNMENTS FOR STUDENT (Scoped strictly to courses they are registered in)
app.get("/api/student-assignments/:studentId", (req, res) => {
    const studentId = req.params.studentId.toUpperCase();
    const query = `
        SELECT DISTINCT a.* FROM assignments a
        JOIN student_courses sc ON UPPER(TRIM(sc.course_id)) = UPPER(TRIM(a.course_id))
        WHERE UPPER(TRIM(sc.student_id)) = UPPER(TRIM(?))
        ORDER BY a.id DESC
    `;
    db.all(query, [studentId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Fallback department assignments endpoint
app.get("/api/assignments/:dept", (req, res) => {
    db.all("SELECT * FROM assignments WHERE UPPER(TRIM(department)) = UPPER(TRIM(?)) ORDER BY id DESC", [req.params.dept.toUpperCase()], (err, rows) => {
        res.json(rows || []);
    });
});

// GET ASSIGNMENTS POSTED BY A SPECIFIC FACULTY MEMBER
app.get("/api/assignments/faculty/:facultyName", (req, res) => {
    const facultyName = decodeURIComponent(req.params.facultyName);
    db.all(
        "SELECT * FROM assignments WHERE LOWER(TRIM(posted_by)) = LOWER(TRIM(?)) ORDER BY id DESC",
        [facultyName],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        }
    );
});

// GET ASSIGNMENT SUBMISSIONS BREAKDOWN FOR INSTRUCTOR TRACKING
app.get("/api/assignments/:id/submissions", (req, res) => {
    const assignmentId = req.params.id;

    db.get("SELECT * FROM assignments WHERE id = ?", [assignmentId], (err, assignment) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!assignment) return res.status(404).json({ error: "Assignment not found." });

        // Clean course id: strip brackets, take first code chunk e.g. "[CSE301] DBMS" -> "CSE301"
        const cleanCourseId = (assignment.course_id || "")
            .replace(/[\[\]]/g, "")
            .split(" ")[0]
            .trim()
            .toUpperCase();

        // Standardize posted_by (remove dots and trim)
        const facultyClean = (assignment.posted_by || "").replace(/\./g, "").trim().toLowerCase();

        const query = `
            SELECT 
                s.id AS student_id,
                s.name AS student_name,
                s.department,
                s.year,
                sub.submitted_at,
                CASE WHEN sub.id IS NOT NULL THEN 1 ELSE 0 END AS is_submitted
            FROM student_courses sc
            JOIN students s ON UPPER(TRIM(sc.student_id)) = UPPER(TRIM(s.id))
            LEFT JOIN assignment_submissions sub 
                ON sub.assignment_id = ? AND UPPER(TRIM(sub.student_id)) = UPPER(TRIM(s.id))
            WHERE (
                UPPER(TRIM(sc.course_id)) LIKE '%' || ? || '%'
                OR ? LIKE '%' || UPPER(TRIM(sc.course_id)) || '%'
            )
            AND (
                REPLACE(LOWER(TRIM(sc.faculty)), '.', '') LIKE '%' || ? || '%'
                OR ? LIKE '%' || REPLACE(LOWER(TRIM(sc.faculty)), '.', '') || '%'
                OR LOWER(TRIM(sc.faculty)) = 'unassigned'
            )
            ORDER BY is_submitted DESC, s.id ASC
        `;

        db.all(query, [assignmentId, cleanCourseId, cleanCourseId, facultyClean, facultyClean], (subErr, rows) => {
            if (subErr) return res.status(500).json({ error: subErr.message });
            res.json({
                assignment,
                submissions: rows || []
            });
        });
    });
});

// STUDENT SUBMITS / MARKS COMPLETED
app.post("/api/assignments/submit", (req, res) => {
    const { assignment_id, student_id } = req.body;
    if (!assignment_id || !student_id) {
        return res.status(400).json({ error: "Assignment ID and Student ID are required." });
    }

    db.run(
        "INSERT INTO assignment_submissions (assignment_id, student_id) VALUES (?, ?)",
        [assignment_id, student_id.toUpperCase()],
        function (err) {
            if (err) {
                return res.status(409).json({ error: "Assignment already marked as completed." });
            }
            res.status(201).json({ message: "Assignment submitted successfully!", submission_id: this.lastID });
        }
    );
});

// GET ALL SUBMISSIONS FOR A STUDENT
app.get("/api/student-submissions/:studentId", (req, res) => {
    const studentId = req.params.studentId.toUpperCase();
    db.all(
        "SELECT assignment_id, submitted_at FROM assignment_submissions WHERE UPPER(TRIM(student_id)) = UPPER(TRIM(?))",
        [studentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        }
    );
});

// POST COURSE-SPECIFIC ASSIGNMENT
app.post("/api/assignments", (req, res) => {
    const { department, course_id, title, description, due_date, posted_by } = req.body;
    const cleanCourseId = (course_id || "ALL").trim().toUpperCase();

    db.run(
        "INSERT INTO assignments (department, course_id, title, description, due_date, posted_by) VALUES (?, ?, ?, ?, ?, ?)",
        [department.toUpperCase(), cleanCourseId, title, description, due_date, posted_by || "Course Instructor"],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, message: "Assignment posted!" });
        }
    );
});

// CASCADING DELETE ASSIGNMENT
app.delete("/api/assignments/:id", (req, res) => {
    const assignmentId = req.params.id;

    db.serialize(() => {
        db.run("DELETE FROM assignment_submissions WHERE assignment_id = ?", [assignmentId], (subErr) => {
            if (subErr) return res.status(500).json({ error: subErr.message });

            db.run("DELETE FROM assignments WHERE id = ?", [assignmentId], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Assignment deleted successfully." });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});