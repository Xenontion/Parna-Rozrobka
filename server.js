const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();

const pool = new Pool({
  user: "postgres", 
  host: "localhost",
  database: "National cashback", 
  password: "20062005O", 
});

app.set("views", path.join(__dirname, "/public/html"));
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "ssshhhhh",
    resave: false,
    saveUninitialized: true
  })
);

// Головна сторінка, відображення Greeting.ejs
app.get("/", (req, res) => {
  res.render("Greeting");
});

// Сторінка зі списком товарів, відображення index.ejs
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products");
    res.render("index", { products: result.rows });
  } catch (err) {
    res.status(500).send("Помилка отримання товарів");
  }
});

// Сторінка реєстрації товару
app.get("/register", (req, res) => {
  res.render("registration");
});

// Обробка форми реєстрації товару
app.post("/register-product", async (req, res) => {
  const { name, price, quantity, category, bar_code, manufacturer, images } = req.body;
  try {
    await pool.query(
      "INSERT INTO products (name, price, quantity, category, bar_code, manufacturer, images) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [name, price, quantity, category, bar_code, manufacturer, images]
    );
    res.redirect("/products");
  } catch (err) {
    console.error("Error registering product:", err);
    res.status(500).send("Помилка при реєстрації товару");
  }
});

// Видалення товару
app.delete("/delete-product/:id", async (req, res) => {
  const productId = req.params.id;
  try {
    await pool.query("DELETE FROM products WHERE id = $1", [productId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.json({ success: false });
  }
});

// Сторінка для відображення конкретного виробника
app.get("/:manufacturer", async (req, res) => {
  try {
    const manufacturerName = req.params.manufacturer;
    const result = await pool.query("SELECT * FROM manufacturies WHERE name = $1", [manufacturerName]);

    if (result.rows.length === 0) {
      return res.status(404).send("Виробника не знайдено");
    }

    res.render("show", { manufacturer: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Помилка при отриманні виробника");
  }
});

// API для отримання всіх продуктів у форматі JSON
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Помилка отримання товарів" });
  }
});

app.listen(3000, () => {
  console.log("Сервер працює на порту 3000");
});