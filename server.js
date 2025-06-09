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
    password: "postgres",
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

// Middleware для перевірки авторизації
const checkAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware для перевірки прав компанії
const checkCompanyAuth = (req, res, next) => {
    const user = req.session.user;
    if (user && user.type === 'company') {
        next();
    } else {
        res.redirect('/products');
    }
};

// *** ОНОВЛЕНИЙ МІДЛВАР checkCompanyProductAuth ***
// Тепер цей мідлвар дозволяє будь-якій авторизованій компанії редагувати/видаляти товари,
// без перевірки, чи товар належить саме цій компанії.
const checkCompanyProductAuth = (req, res, next) => {
    const user = req.session.user;

    if (user && user.type === 'company') {
        // Якщо користувач є компанією, дозволяємо йому продовжувати.
        // Ми БІЛЬШЕ НЕ ПЕРЕВІРЯЄМО, чи товар належить саме цій компанії.
        next();
    } else {
        // Якщо користувач не авторизований як компанія, забороняємо доступ.
        res.status(403).json({ error: 'Доступ заборонено. Тільки компанії мають доступ до цієї функції.' });
    }
};


// Сторінка з інструкцією - доступна всім без авторизації
app.get("/", (req, res) => {
    res.render("Greeting", { userType: req.session.user ? req.session.user.type : null });
});

// Сторінка з персоналом - доступна всім без авторизації
app.get("/personnel", (req, res) => {
    res.render("personnel", { userType: req.session.user ? req.session.user.type : null });
});

// Сторінка з ліцензією - доступна всім без авторизації
app.get("/license", (req, res) => {
    res.render("license", { userType: req.session.user ? req.session.user.type : null });
});

// Сторінка входу
app.get("/login", (req, res) => {
    res.render("users");
});

// Route for registration page
app.get('/register_user', (req, res) => {
    res.render('register_user');
});

// API endpoint for user registration
app.post('/api/register_user', async (req, res) => {
    try {
        const { type, login, email, password, companyName, companyAddress, companyPhone } = req.body;

        // Check if user already exists
        const userCheck = await pool.query(
            'SELECT * FROM users WHERE login = $1 OR email = $2',
            [login, email]
        );

        if (userCheck.rows.length > 0) {
            // ВАЖЛИВО: завжди повертаємо JSON!
            return res.status(400).json({ message: 'Користувач з таким логіном або поштою вже існує' });
        }

        // Insert new user into database
        const result = await pool.query(
            'INSERT INTO users (type, login, email, password, company_name, company_address, company_phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [type, login, email, password, companyName || null, companyAddress || null, companyPhone || null]
        );

        res.status(201).json({
            message: 'Користувача успішно зареєстровано',
            userId: result.rows[0].id
        });

    } catch (error) {
        console.error('Registration error:', error);
        // ВАЖЛИВО: завжди повертаємо JSON!
        res.status(500).json({ message: 'Помилка сервера при реєстрації' });
    }
});

// Обробка форми логіну
app.post("/login", async (req, res) => {
    const { login, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE login = $1", [login]);
        if (result.rows.length === 0) {
            return res.render('users', { error: 'Невірний логін або пароль' });
        }
        const user = result.rows[0];
        // Якщо паролі зберігаються у відкритому вигляді (не рекомендовано), то просто порівнюємо.
        // Якщо використовується bcrypt, додайте порівняння через bcrypt.compare.
        if (user.password !== password) {
            return res.render('users', { error: 'Невірний логін або пароль' });
        }
        // Зберігаємо користувача в сесії
        req.session.user = user;
        req.session.userType = user.type;
        req.session.userLogin = user.login;
        req.session.user.company_name = user.company_name; // Додаємо company_name до сесії користувача
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('users', { error: 'Сталася помилка' });
    }
});

// Вихід з системи
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Сторінка зі списком товарів
app.get('/products', async (req, res) => {
    try {
        const userType = req.session.user ? req.session.user.type : null;
        const userLogin = req.session.user ? req.session.user.login : null;

        // Отримуємо тільки ті товари, у яких всі основні поля заповнені (НЕ null і НЕ порожні)
        const products = await pool.query(`
            SELECT * FROM products
            WHERE
                name IS NOT NULL AND name <> '' AND
                price IS NOT NULL AND
                quantity IS NOT NULL AND
                category IS NOT NULL AND category <> '' AND
                bar_code IS NOT NULL AND bar_code <> '' AND
                manufacturer IS NOT NULL AND manufacturer <> '' AND
                images IS NOT NULL AND images <> ''
            ORDER BY name
        `);

        // Отримуємо всі категорії
        const categories = await pool.query('SELECT DISTINCT category FROM products ORDER BY category');

        res.render('index', {
            products: products.rows,
            categories: categories.rows,
            userType: userType,
            userLogin: userLogin
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).render('error', { error: 'Помилка при завантаженні товарів' });
    }
});

// Сторінка реєстрації товару
app.get("/register", checkCompanyAuth, async (req, res) => {
    try {
        // First check if the categories table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'categories'
            )
        `);

        if (!tableCheck.rows[0].exists) {
            console.log("Categories table does not exist");
            return res.render("registration", {
                categories: [],
                userType: req.session.user.type
            });
        }

        const categoriesResult = await pool.query("SELECT name FROM categories");
        const categories = categoriesResult.rows;

        if (!categories || categories.length === 0) {
            console.log("No categories found in database");
            // Fallback to empty array if no categories found
            return res.render("registration", {
                categories: [],
                userType: req.session.user.type
            });
        }

        console.log("Found categories:", categories);
        res.render("registration", {
            categories,
            userType: req.session.user.type
        });
    } catch (err) {
        console.error("Error fetching categories:", err);
        // If there's an error, still render the page with an empty categories array
        res.render("registration", {
            categories: [],
            userType: req.session.user.type
        });
    }
});

// Обробка форми реєстрації товару
app.post("/register-product", checkCompanyAuth, async (req, res) => {
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
app.delete('/api/products/delete/:id', checkCompanyProductAuth, async (req, res) => {
    try {
        const productId = req.params.id;

        // Видаляємо товар
        await pool.query(
            'DELETE FROM products WHERE id = $1',
            [productId]
        );

        res.json({ success: true, message: 'Товар успішно видалено.' }); // Повертаємо повідомлення про успіх
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Помилка при видаленні товару' });
    }
});

// НОВИЙ МАРШРУТ: Оновлення товару (PUT)
app.put('/api/products/edit/:id', checkCompanyProductAuth, async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, price, quantity, category, bar_code, manufacturer } = req.body;

        // Перевірка наявності даних
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: 'Немає даних для оновлення.' });
        }

        // Оновлюємо товар у базі даних
        const result = await pool.query(
            `UPDATE products
             SET name = $1, price = $2, quantity = $3, category = $4, bar_code = $5, manufacturer = $6
             WHERE id = $7 RETURNING *`,
            [name, price, quantity, category, bar_code, manufacturer, productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Продукт не знайдено для оновлення.' });
        }

        res.status(200).json({ message: 'Продукт успішно оновлено', product: result.rows[0] });

    } catch (error) {
        console.error('Помилка при оновленні товару:', error);
        // Забезпечуємо повернення JSON-відповіді для всіх помилок
        res.status(500).json({ error: 'Помилка сервера при оновленні товару.', details: error.message });
    }
});

// API для отримання всіх продуктів у форматі JSON
app.get("/api/products", checkAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM products");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Помилка отримання товарів" });
    }
});

// Test route to check categories
app.get("/test-categories", async (req, res) => {
    try {
        const categoriesResult = await pool.query("SELECT name FROM categories");
        res.json({ success: true, categories: categoriesResult.rows });
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Сторінка для відображення конкретного виробника та його товарів
app.get("/manufacturer/:name", checkAuth, async (req, res) => {
    try {
        const manufacturerName = req.params.name;

        // Отримуємо інформацію про виробника
        const manufacturerResult = await pool.query(
            "SELECT * FROM manufacturies WHERE name = $1",
            [manufacturerName]
        );

        if (manufacturerResult.rows.length === 0) {
            return res.status(404).send("Виробника не знайдено");
        }

        // Отримуємо всі товари цього виробника
        const productsResult = await pool.query(
            "SELECT * FROM products WHERE manufacturer = $1",
            [manufacturerName]
        );

        res.render("show", {
            manufacturer: manufacturerResult.rows[0],
            products: productsResult.rows,
            userType: req.session.user ? req.session.user.type : null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Помилка при отриманні виробника");
    }
});

app.get('/slider', async (req, res) => {
    try {
        const userType = req.session.user ? req.session.user.type : null;
        const userLogin = req.session.user ? req.session.user.login : null;

        const products = await pool.query(`
            SELECT * FROM products
            WHERE
                name IS NOT NULL AND name <> '' AND
                price IS NOT NULL AND
                quantity IS NOT NULL AND
                category IS NOT NULL AND category <> '' AND
                bar_code IS NOT NULL AND bar_code <> '' AND
                manufacturer IS NOT NULL AND manufacturer <> '' AND
                images IS NOT NULL AND images <> ''
            ORDER BY name
        `);

        res.render('slider', {
            products: products.rows,
            userType,
            userLogin
        });

    } catch (error) {
        console.error('Помилка при завантаженні слайдера:', error);
        res.status(500).render('error', { error: 'Помилка при завантаженні слайдера' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});