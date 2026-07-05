require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./config/db");

const app = express();

/* =========================
   APP CONFIG
========================= */

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "jobportal-secret",
    resave: false,
    saveUninitialized: false
  })
);

/* =========================
   MIDDLEWARE
========================= */

function isAdmin(req, res, next) {
  if (req.session.admin) {
    return next();
  }

  res.redirect("/admin");
}

/* =========================
   PUBLIC ROUTES
========================= */

app.get("/", (req, res) => {

    db.query(
        "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 6",
        (err, jobs) => {

            if (err) {
                console.log(err);
                return res.render("home", { jobs: [] });
            }

            res.render("home", { jobs });
        }
    );

});

app.get("/home", (req, res) => {

    db.query(
        "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 6",
        (err, jobs) => {

            if (err) {
                return res.render("home", { jobs: [] });
            }

            res.render("home", { jobs });
        }
    );

});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/contact", (req, res) => {
  res.render("contact");
});

app.get("/internships", (req, res) => {
  res.render("internships");
});

/* =========================
   ADMIN LOGIN
========================= */

app.get("/admin", (req, res) => {
  res.render("admin/login");
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM admins WHERE username = ?",
    [username],
    async (err, result) => {

      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      if (result.length === 0) {
        return res.send("Invalid Username");
      }

      const admin = result[0];

      const match = await bcrypt.compare(
        password,
        admin.password
      );

      if (!match) {
        return res.send("Invalid Password");
      }

      req.session.admin = admin.id;
      req.session.username = admin.username;
      req.session.role = admin.role;

      if (admin.must_change_password) {
        return res.redirect("/admin/change-password");
      }

      res.redirect("/admin/dashboard");
    }
  );
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin");
  });
});

/* =========================
   DASHBOARD
========================= */

app.get("/admin/dashboard", isAdmin, (req, res) => {
  res.render("admin/dashboard");
});

/* =========================
   CREATE NEW ADMIN
========================= */

app.get("/admin/new-admin", isAdmin, (req, res) => {
  res.render("admin/new-admin");
});

app.post("/admin/new-admin", isAdmin, async (req, res) => {

  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    `INSERT INTO admins
    (username, password, role, must_change_password)
    VALUES (?, ?, 'admin', TRUE)`,

    [username, hashedPassword],

    (err) => {

      if (err) {
        console.log(err);
        return res.send("Username already exists!");
      }

      res.redirect("/admin/dashboard");
    }
  );
});

/* =========================
   CHANGE PASSWORD
========================= */

app.get("/admin/change-password", isAdmin, (req, res) => {

  res.render("admin/change-password", {
    username: req.session.username
  });

});

app.post("/admin/change-password", isAdmin, async (req, res) => {

  const hashedPassword =
    await bcrypt.hash(req.body.password, 10);

  db.query(
    `UPDATE admins
     SET password = ?,
         must_change_password = FALSE
     WHERE id = ?`,

    [
      hashedPassword,
      req.session.admin
    ],

    (err) => {

      if (err) {
        console.log(err);
        return res.send("Password update failed!");
      }

      res.redirect("/admin/dashboard");
    }
  );
});

/* =========================
   JOB MANAGEMENT
========================= */

app.get("/admin/jobs/new", isAdmin, (req, res) => {
  res.render("admin/add-job");
});

app.post("/admin/jobs/add", isAdmin, (req, res) => {

  const {
    title,
    company,
    category,
    job_type,
    location,
    salary,
    last_date,
    apply_link,
    description
  } = req.body;

  const sql = `
    INSERT INTO jobs
    (
      title,
      company,
      category,
      job_type,
      location,
      salary,
      last_date,
      apply_link,
      description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      title,
      company,
      category,
      job_type,
      location,
      salary,
      last_date,
      apply_link,
      description
    ],
    (err) => {

      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      res.redirect("/admin/jobs");
    }
  );
});

app.get("/admin/jobs", isAdmin, (req, res) => {

  db.query(
    "SELECT * FROM jobs ORDER BY created_at DESC",
    (err, jobs) => {

      if (err) {
        return res.send("Database Error");
      }

      res.render("admin/jobs", { jobs });
    }
  );
});

app.get("/admin/jobs/edit/:id", isAdmin, (req, res) => {

  db.query(
    "SELECT * FROM jobs WHERE id = ?",
    [req.params.id],

    (err, result) => {

      if (err || result.length === 0) {
        return res.send("Job not found");
      }

      res.render("admin/edit-job", {
        job: result[0]
      });
    }
  );
});

app.post("/admin/jobs/update/:id", isAdmin, (req, res) => {

  const {
    title,
    company,
    location,
    salary,
    apply_link,
    description
  } = req.body;

  db.query(
    `UPDATE jobs
     SET title=?,
         company=?,
         location=?,
         salary=?,
         apply_link=?,
         description=?
     WHERE id=?`,

    [
      title,
      company,
      location,
      salary,
      apply_link,
      description,
      req.params.id
    ],

    (err) => {

      if (err) {
        console.log(err);
        return res.send("Update Failed");
      }

      res.redirect("/admin/jobs");
    }
  );
});

app.get("/admin/jobs/delete/:id", isAdmin, (req, res) => {

  db.query(
    "DELETE FROM jobs WHERE id = ?",
    [req.params.id],

    (err) => {

      if (err) {
        return res.send("Delete Failed");
      }

      res.redirect("/admin/jobs");
    }
  );
});

/* =========================
   TECH JOBS
========================= */

app.get("/tech/freshers", (req, res) => {

  db.query(
    `SELECT * FROM jobs
     WHERE category='Tech'
     AND job_type='Freshers'
     ORDER BY created_at DESC`,

    (err, jobs) => {

      if (err) {
        return res.send("Database Error");
      }

      res.render("tech/freshers", { jobs });
    }
  );
});

app.get("/tech/experienced", (req, res) => {

  db.query(
    `SELECT * FROM jobs
     WHERE category='Tech'
     AND job_type='Experienced'
     ORDER BY created_at DESC`,

    (err, jobs) => {

      res.render("tech/experienced", { jobs });
    }
  );
});

app.get("/tech/offcampus", (req, res) => {

  db.query(
    `SELECT * FROM jobs
     WHERE category='Tech'
     AND job_type='Off Campus'
     ORDER BY created_at DESC`,

    (err, jobs) => {

      res.render("tech/offcampus", { jobs });
    }
  );
});


app.get("/create-super-admin", async (req, res) => {

    const hashedPassword = await bcrypt.hash(
        "hellowelcome",
        10
    );

    db.query(
        `INSERT INTO admins
        (username, password, role, must_change_password)
        VALUES (?, ?, ?, ?)`,
        [
            "superadmin",
            hashedPassword,
            "superadmin",
            false
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send(err.message);
            }

            res.send("Super Admin Created Successfully!");
        }
    );

});

/* =========================
   CHANGE PASSWORD FOR ADMIN
========================= */
app.get("/change-superadmin-password", async (req, res) => {

    const newPassword = "Master@$4";

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query(
        "UPDATE admins SET password = ? WHERE username = ?",
        [hashedPassword, "superadmin"],
        (err) => {

            if (err) {
                return res.send(err.message);
            }

            res.send("Superadmin password updated successfully!");
        }
    );

});

app.get("/jobs", (req, res) => {

    db.query(
        "SELECT * FROM jobs ORDER BY created_at DESC",
        (err, jobs) => {

            if (err) {
                return res.send("Database Error");
            }

            res.render("jobs", { jobs });

        }
    );

});

/* =========================
   NON-TECH JOBS
========================= */

app.get("/nontech/freshers", (req, res) => {

    db.query(
        `SELECT * FROM jobs
         WHERE category='Non-Tech'
         AND job_type='Freshers'
         ORDER BY created_at DESC`,
        (err, jobs) => {

            if (err) {
                return res.send("Database Error");
            }

            res.render("nontech/freshers", { jobs });
        }
    );

});

app.get("/nontech/experienced", (req, res) => {

    db.query(
        `SELECT * FROM jobs
         WHERE category='Non-Tech'
         AND job_type='Experienced'
         ORDER BY created_at DESC`,
        (err, jobs) => {

            if (err) {
                return res.send("Database Error");
            }

            res.render("nontech/experienced", { jobs });
        }
    );

});

app.get("/nontech/offcampus", (req, res) => {

    db.query(
        `SELECT * FROM jobs
         WHERE category='Non-Tech'
         AND job_type='Off Campus'
         ORDER BY created_at DESC`,
        (err, jobs) => {

            if (err) {
                return res.send("Database Error");
            }

            res.render("nontech/offcampus", { jobs });
        }
    );

});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


