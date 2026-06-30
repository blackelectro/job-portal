const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'job_portal'
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }

  console.log('MySQL connected successfully!');
});

module.exports = connection;