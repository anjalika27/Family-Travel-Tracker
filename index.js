import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "12345",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function getAllUsers(){
  let result = await db.query('select * from users');

  let users=[];
  result.rows.forEach((u)=>{
    users.push(u);
  });
  // console.log(users);
  return users;
}

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries where user_id=$1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}


async function getCurrentUser() {
  const result = await db.query('select * from users where id=$1', [currentUserId]);
  // console.log(result.rows[0]);
  return result.rows[0];
}


app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();;
  let users=await getAllUsers();
  
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});


app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1,$2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log("error occured while inserting");
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add) {
    res.render('new.ejs');
  }
  else {
    currentUserId = req.body.user;
    res.redirect('/');
  }
});

app.post("/new", async (req, res) => {
  try {
    const result = await db.query('insert into users (name,color) values ($1,$2) returning *;', [req.body.name, req.body.color]);

    const id = result.rows[0].id;

    currentUserId = id;
    console.log('inserted new user' + id);

    res.redirect('/');
  } catch (error) {
    console.log('cannot add user');
  }

  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
