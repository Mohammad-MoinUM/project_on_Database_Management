USE ecommerce_marketplace;

INSERT INTO vendors (name, email) VALUES
('Acme Corp', 'sales@acme.test'),
('Globex', 'info@globex.test'),
('Soylent', 'hello@soylent.test');

INSERT INTO categories (name, description) VALUES
('Electronics', 'Devices and gadgets'),
('Home', 'Home and kitchen'),
('Books', 'Books and magazines'),
('Fashion', 'Clothing and accessories');

INSERT INTO customers (name, email) VALUES
('Alice', 'alice@example.com'),
('Bob', 'bob@example.com'),
('Charlie', 'charlie@example.com');

INSERT INTO products (vendor_id, name, description, price, stock) VALUES
((SELECT id FROM vendors WHERE name='Acme Corp'), 'Smartphone X', 'Latest smartphone', 699.00, 50),
((SELECT id FROM vendors WHERE name='Acme Corp'), 'Bluetooth Headphones', 'Noise cancelling', 129.99, 200),
((SELECT id FROM vendors WHERE name='Globex'), 'Air Fryer', 'Healthy cooking', 89.99, 80),
((SELECT id FROM vendors WHERE name='Soylent'), 'Soylent Drink', 'Meal replacement', 3.49, 500),
((SELECT id FROM vendors WHERE name='Globex'), 'Novel: The Odyssey', 'Classic literature', 14.99, 150);

-- Map products to categories
INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id FROM products p JOIN categories c ON (
 (p.name='Smartphone X' AND c.name='Electronics') OR
 (p.name='Bluetooth Headphones' AND c.name='Electronics') OR
 (p.name='Air Fryer' AND c.name='Home') OR
 (p.name='Soylent Drink' AND c.name='Home') OR
 (p.name='Novel: The Odyssey' AND c.name='Books')
);

-- Some orders
INSERT INTO orders (customer_id, status) VALUES
((SELECT id FROM customers WHERE email='alice@example.com'), 'paid'),
((SELECT id FROM customers WHERE email='bob@example.com'), 'pending'),
((SELECT id FROM customers WHERE email='charlie@example.com'), 'shipped');

-- Items: use current product prices
INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT o.id, p.id, q.qty, p.price FROM (
  SELECT (SELECT id FROM orders ORDER BY id LIMIT 1) AS oid, 'Smartphone X' AS pname, 1 AS qty
) q
JOIN orders o ON o.id = q.oid
JOIN products p ON p.name = q.pname;

INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT o.id, p.id, q.qty, p.price FROM (
  SELECT (SELECT id FROM orders ORDER BY id LIMIT 1 OFFSET 1) AS oid, 'Air Fryer' AS pname, 2 AS qty
) q
JOIN orders o ON o.id = q.oid
JOIN products p ON p.name = q.pname;

INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT o.id, p.id, q.qty, p.price FROM (
  SELECT (SELECT id FROM orders ORDER BY id LIMIT 1 OFFSET 2) AS oid, 'Soylent Drink' AS pname, 10 AS qty
) q
JOIN orders o ON o.id = q.oid
JOIN products p ON p.name = q.pname;

-- Reviews
INSERT INTO reviews (product_id, customer_id, rating, comment)
SELECT p.id, c.id, 5, 'Excellent!' FROM products p, customers c WHERE p.name='Smartphone X' AND c.email='alice@example.com';
INSERT INTO reviews (product_id, customer_id, rating, comment)
SELECT p.id, c.id, 4, 'Good value' FROM products p, customers c WHERE p.name='Air Fryer' AND c.email='bob@example.com';
INSERT INTO reviews (product_id, customer_id, rating, comment)
SELECT p.id, c.id, 3, 'Ok' FROM products p, customers c WHERE p.name='Soylent Drink' AND c.email='charlie@example.com';