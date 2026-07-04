require('dotenv').config();

require('./config/db');

const express = require("express");
const session = require("express-session");

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "jobportal-secret",
    resave: false,
    saveUninitialized: false
  })
);

app.get("/", (req, res) => {
    res.send("Job Portal is running!");
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
        (title, company, category, job_type,
         location, salary, last_date,
         apply_link, description)
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

            res.redirect("/admin/dashboard");
        }
    );
});

const db = require("./config/db");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
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

console.log(process.env.ADMIN_USERNAME);
console.log(process.env.ADMIN_PASSWORD);

app.get("/admin", (req, res) => {
    res.render("admin/login");
});

app.post("/admin/login", (req, res) => {

    const { username, password } = req.body;

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {

        req.session.admin = true;

        return res.redirect("/admin/dashboard");
    }

    res.send("Invalid credentials");
});

function isAdmin(req, res, next) {

    if (req.session.admin) {
        return next();
    }

    res.redirect("/admin");
}

app.get("/admin/dashboard", isAdmin, (req, res) => {
    res.render("admin/dashboard");
});

app.get("/admin/jobs/new", isAdmin, (req, res) => {
    res.render("admin/add-job");
});

//tech/freshers
app.get("/tech/freshers", (req, res) => {

    const sql =
        "SELECT * FROM jobs WHERE category='Tech' AND job_type='Freshers' ORDER BY created_at DESC";

    db.query(sql, (err, jobs) => {

        if (err) {
            return res.send("Database Error");
        }

        res.render("tech/freshers", { jobs });
    });

});

//tech/experienced
app.get("/tech/experienced", (req, res) => {

    const sql =
        "SELECT * FROM jobs WHERE category='Tech' AND job_type='Experienced' ORDER BY created_at DESC";

    db.query(sql, (err, jobs) => {

        res.render("tech/experienced", { jobs });
    });

});

//tech/offcampus
app.get("/tech/offcampus", (req, res) => {

    const sql =
        "SELECT * FROM jobs WHERE category='Tech' AND job_type='Off Campus' ORDER BY created_at DESC";

    db.query(sql, (err, jobs) => {

        res.render("tech/offcampus", { jobs });
    });

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

app.get("/admin/jobs/delete/:id", isAdmin, (req, res) => {

    const id = req.params.id;

    db.query(
        "DELETE FROM jobs WHERE id = ?",
        [id],
        (err) => {

            if (err) {
                return res.send("Delete Failed");
            }

            res.redirect("/admin/jobs");
        }
    );

});

app.get("/admin/jobs/edit/:id", isAdmin, (req, res) => {

    const id = req.params.id;

    db.query(
        "SELECT * FROM jobs WHERE id = ?",
        [id],
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

    const id = req.params.id;

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
            id
        ],
        (err) => {

            if (err) {
                console.log(err);
                return res.send("Update failed");
            }

            res.redirect("/admin/jobs");
        }
    );
});

app.get("/admin/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/admin");
    });
});

