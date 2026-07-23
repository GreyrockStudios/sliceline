-- Seed realistic demo orders, customers, and calls for SliceLine dashboard
-- All UUIDs auto-generated. Run AFTER init.sql and seed.sql.

-- ============================================================
-- CUSTOMERS
-- ============================================================
INSERT INTO customers (phone, name, email, street, city, state, zip, default_location_id) VALUES
('(613) 555-1234', 'Sarah Mitchell', 'sarah.m@gmail.com', '22 George St', 'Ottawa', 'ON', 'K1N 8V3', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069'),
('(613) 555-2345', 'Marcus Chen', 'mchen@outlook.com', '189 Murray St', 'Ottawa', 'ON', 'K1N 5M6', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069'),
('(613) 555-3456', 'Aisha Patel', 'aisha.patel@yahoo.com', '312 Rideau St', 'Ottawa', 'ON', 'K1N 5Y2', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069'),
('(613) 555-4567', 'Derek Larsson', 'dlarsson@gmail.com', '77 Besserer St', 'Ottawa', 'ON', 'K1N 6B2', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069'),
('(613) 555-5678', 'Olivia Tremblay', 'olivia.t@hotmail.com', '145 Dalhousie St', 'Ottawa', 'ON', 'K1N 7E9', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069'),
('(613) 555-6789', 'James Okonkwo', 'j.okonkwo@gmail.com', '400 Elgin St', 'Ottawa', 'ON', 'K1P 5L3', 'd602a410-e722-5637-8bad-ca1a671718a5'),
('(613) 555-7890', 'Nadia Kowalski', 'nkowalski@live.com', '555 Bank St', 'Ottawa', 'ON', 'K1S 4N2', 'd602a410-e722-5637-8bad-ca1a671718a5'),
('(416) 555-1111', 'Priya Sharma', 'priya.s@gmail.com', '200 Bay St', 'Toronto', 'ON', 'M5J 2R5', (SELECT id FROM locations WHERE store_number = 'DP-010' LIMIT 1)),
('(416) 555-2222', 'Tyler Brooks', 'tbrooks@outlook.com', '88 King St W', 'Toronto', 'ON', 'M5H 1C1', (SELECT id FROM locations WHERE store_number = 'DP-010' LIMIT 1)),
('(613) 555-9900', 'Helen Morrison', 'hmorrison@gmail.com', '45 Castlefrank Rd', 'Kanata', 'ON', 'K2K 2T4', (SELECT id FROM locations WHERE store_number = 'DP-003' LIMIT 1))
ON CONFLICT (phone) DO NOTHING;

-- ============================================================
-- ORDERS — ByWard Market (DP-001)
-- ============================================================

-- Active: preparing (pickup)
INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone, order_type, status, subtotal, tax, discount, total, notes, created_at, updated_at)
SELECT 'SL-847291', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', c.id, c.name, c.phone, 'pickup', 'preparing', 25.99, 3.38, 0.00, 29.37, 'Extra napkins please', NOW() - INTERVAL '18 minutes', NOW() - INTERVAL '10 minutes'
FROM customers c WHERE c.phone = '(613) 555-1234';

-- Active: confirmed (delivery)
INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone, order_type, status, subtotal, tax, discount, total, delivery_address, delivery_instructions, notes, created_at, updated_at)
SELECT 'SL-847292', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', c.id, c.name, c.phone, 'delivery', 'confirmed', 44.98, 5.85, 0.00, 50.83, c.street || ', ' || c.city || ', ON ' || c.zip, 'Ring buzzer 4B', '2nd floor apartment', NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '5 minutes'
FROM customers c WHERE c.phone = '(613) 555-2345';

-- Active: pending (just placed)
INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone, order_type, status, subtotal, tax, discount, total, created_at, updated_at)
SELECT 'SL-847293', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', c.id, c.name, c.phone, 'pickup', 'pending', 23.98, 3.12, 0.00, 27.10, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '2 minutes'
FROM customers c WHERE c.phone = '(613) 555-1234';

-- Active: ready for pickup
INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone, order_type, status, subtotal, tax, discount, total, created_at, updated_at)
SELECT 'SL-847285', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', c.id, c.name, c.phone, 'pickup', 'ready', 14.99, 1.95, 0.00, 16.94, NOW() - INTERVAL '32 minutes', NOW() - INTERVAL '3 minutes'
FROM customers c WHERE c.phone = '(613) 555-5678';

-- Completed (past 24h)
INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone, order_type, status, subtotal, tax, discount, total, pos_status, created_at, updated_at)
SELECT 'SL-847250', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', c.id, c.name, c.phone, 'delivery', 'completed', 35.98, 4.68, 0.00, 40.66, 'submitted', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours'
FROM customers c WHERE c.phone = '(613) 555-3456';

INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone, order_type, status, subtotal, tax, discount, total, pos_status, created_at, updated_at)
SELECT 'SL-847240', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', c.id, c.name, c.phone, 'pickup', 'completed', 22.99, 2.99, 0.00, 25.98, 'submitted', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours'
FROM customers c WHERE c.phone = '(613) 555-1234';

-- Cancelled
INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone, order_type, status, subtotal, tax, discount, total, notes, created_at, updated_at)
SELECT 'SL-847245', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', c.id, c.name, c.phone, 'delivery', 'cancelled', 29.98, 3.90, 0.00, 33.88, 'Customer cancelled — wrong address', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '55 minutes'
FROM customers c WHERE c.phone = '(613) 555-4567';

-- ============================================================
-- ORDER ITEMS — ByWard Market
-- ============================================================

-- SL-847291 (preparing) — Sarah Mitchell, Classic L
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'ea0c7b16-5d8c-5247-89de-3e2aa428b653', 'The Classic', 'Large (14")', 1, 25.99, 25.99, '{"toppings": ["extra cheese"]}'::jsonb, 'Well done please'
FROM orders o WHERE o.order_number = 'SL-847291';

-- SL-847292 (confirmed) — Marcus Chen, big delivery order
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', 'The Works', 'Medium (12")', 1, 21.99, 21.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847292';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e0', 'Garlic Bread', NULL, 1, 5.99, 5.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847292';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'c6e6ab2e-4e67-5de8-9b35-e5f1a2b3c4d5', 'Caesar Salad', NULL, 1, 8.99, 8.99, '{}'::jsonb, 'Dressing on the side'
FROM orders o WHERE o.order_number = 'SL-847292';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'a1b2c3d4-5e6f-7a8b-9c0d-e1f2a3b4c5d6', 'Coca-Cola 2L', NULL, 1, 3.99, 3.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847292';
-- Wings item — need the actual ID from seed
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, mi.id, 'Wings (8pc)', NULL, 1, 8.99, 8.99, '{"sauce": "hot"}'::jsonb, NULL
FROM orders o, menu_items mi WHERE o.order_number = 'SL-847292' AND mi.name = 'Wings (8pc)' LIMIT 1;

-- SL-847293 (pending) — Walk-in, Works S + Garlic Bread
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', 'The Works', 'Small (10")', 1, 17.99, 17.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847293';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e0', 'Garlic Bread', NULL, 1, 5.99, 5.99, '{}'::jsonb, 'No butter'
FROM orders o WHERE o.order_number = 'SL-847293';

-- SL-847285 (ready) — Olivia, Classic S
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'ea0c7b16-5d8c-5247-89de-3e2aa428b653', 'The Classic', 'Small (10")', 1, 14.99, 14.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847285';

-- SL-847250 (completed) — Aisha, Hawaiian M + sides
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'ead1f569-1a16-5925-9263-f73bb2140efc', 'Hawaiian', 'Medium (12")', 1, 20.99, 20.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847250';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e0', 'Garlic Bread', NULL, 1, 5.99, 5.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847250';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'a1b2c3d4-5e6f-7a8b-9c0d-e1f2a3b4c5d6', 'Coca-Cola 2L', NULL, 1, 3.99, 3.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847250';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, mi.id, 'Tiramisu', NULL, 1, 5.99, 5.99, '{}'::jsonb, NULL
FROM orders o, menu_items mi WHERE o.order_number = 'SL-847250' AND mi.name = 'Tiramisu' LIMIT 1;

-- SL-847240 (completed) — Sarah again, Classic L
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'ea0c7b16-5d8c-5247-89de-3e2aa428b653', 'The Classic', 'Large (14")', 1, 22.99, 22.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847240';

-- SL-847245 (cancelled) — Derek, Works L + Caesar
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', 'The Works', 'Large (14")', 1, 25.99, 25.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847245';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'c6e6ab2e-4e67-5de8-9b35-e5f1a2b3c4d5', 'Caesar Salad', NULL, 1, 3.99, 3.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847245';

-- ============================================================
-- ORDERS — Centretown (DP-002)
-- ============================================================

-- Active: preparing — James Okonkwo, office order
INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone, order_type, status, subtotal, tax, discount, total, notes, created_at, updated_at)
SELECT 'SL-847294', 'd602a410-e722-5637-8bad-ca1a671718a5', c.id, c.name, c.phone, 'pickup', 'preparing', 55.34, 0, 0, 55.34, 'Office order — call when ready', NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '8 minutes'
FROM customers c WHERE c.phone = '(613) 555-6789';

-- Fix the tax for SL-847294
UPDATE orders SET tax = ROUND((subtotal - discount) * 0.13, 2), total = ROUND(subtotal - discount + ROUND((subtotal - discount) * 0.13, 2), 2) WHERE order_number = 'SL-847294';

-- SL-847294 items: 2x Works Large, 1x wings, 1x garlic bread, 1x Coke 2L
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', 'The Works', 'Large (14")', 2, 25.99, 51.98, '{}'::jsonb, 'One with extra cheese'
FROM orders o WHERE o.order_number = 'SL-847294';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, mi.id, 'Wings (8pc)', NULL, 1, 8.99, 8.99, '{"sauce": "honey garlic"}'::jsonb, NULL
FROM orders o, menu_items mi WHERE o.order_number = 'SL-847294' AND mi.name = 'Wings (8pc)' LIMIT 1;

-- Completed — Nadia, Centretown
INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone, order_type, status, subtotal, tax, discount, total, pos_status, created_at, updated_at)
SELECT 'SL-847260', 'd602a410-e722-5637-8bad-ca1a671718a5', c.id, c.name, c.phone, 'delivery', 'completed', 30.98, 4.03, 0.00, 35.01, 'submitted', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours'
FROM customers c WHERE c.phone = '(613) 555-7890';

INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'ea0c7b16-5d8c-5247-89de-3e2aa428b653', 'The Classic', 'Medium (12")', 1, 18.99, 18.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847260';
INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
SELECT o.id, 'ead1f569-1a16-5925-9263-f73bb2140efc', 'Hawaiian', 'Medium (12")', 1, 20.99, 20.99, '{}'::jsonb, NULL
FROM orders o WHERE o.order_number = 'SL-847260';

-- ============================================================
-- CALLS
-- ============================================================

-- Active call — matches SL-847293 (pending order)
INSERT INTO calls (retell_call_id, location_id, caller_phone, caller_name, status, duration_seconds, started_at, order_id)
VALUES ('retell_call_active_001', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', '(613) 555-1234', 'Sarah Mitchell', 'in_progress', 120, NOW() - INTERVAL '2 minutes', (SELECT id FROM orders WHERE order_number = 'SL-847293'));

-- Completed call — Marcus Chen (SL-847292)
INSERT INTO calls (retell_call_id, location_id, customer_id, caller_phone, caller_name, status, duration_seconds, started_at, ended_at, order_id, order_accuracy_verified)
VALUES ('retell_call_def456', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', (SELECT id FROM customers WHERE phone = '(613) 555-2345'), '(613) 555-2345', 'Marcus Chen', 'completed', 285, NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '3 minutes', (SELECT id FROM orders WHERE order_number = 'SL-847292'), true);

-- Completed — Aisha (SL-847250)
INSERT INTO calls (retell_call_id, location_id, customer_id, caller_phone, caller_name, status, duration_seconds, started_at, ended_at, order_id, order_accuracy_verified)
VALUES ('retell_call_ghi789', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', (SELECT id FROM customers WHERE phone = '(613) 555-3456'), '(613) 555-3456', 'Aisha Patel', 'completed', 198, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours' + INTERVAL '3 minutes 18 seconds', (SELECT id FROM orders WHERE order_number = 'SL-847250'), true);

-- Completed — Derek (cancelled order, accuracy issue)
INSERT INTO calls (retell_call_id, location_id, customer_id, caller_phone, caller_name, status, duration_seconds, started_at, ended_at, order_id, order_accuracy_verified)
VALUES ('retell_call_jkl012', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', (SELECT id FROM customers WHERE phone = '(613) 555-4567'), '(613) 555-4567', 'Derek Larsson', 'completed', 145, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour' + INTERVAL '2 minutes 25 seconds', (SELECT id FROM orders WHERE order_number = 'SL-847245'), false);

-- Completed — James Okonkwo, Centretown (SL-847294)
INSERT INTO calls (retell_call_id, location_id, customer_id, caller_phone, caller_name, status, duration_seconds, started_at, ended_at, order_id, order_accuracy_verified)
VALUES ('retell_call_mno345', 'd602a410-e722-5637-8bad-ca1a671718a5', (SELECT id FROM customers WHERE phone = '(613) 555-6789'), '(613) 555-6789', 'James Okonkwo', 'completed', 312, NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '7 minutes', (SELECT id FROM orders WHERE order_number = 'SL-847294'), true);

-- Completed — no order, just asked about hours
INSERT INTO calls (retell_call_id, location_id, caller_phone, caller_name, status, duration_seconds, started_at, ended_at, order_id, order_accuracy_verified)
VALUES ('retell_call_pqr678', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', '(613) 555-9999', 'Unknown Caller', 'completed', 45, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours' + INTERVAL '45 seconds', NULL, NULL);

-- ============================================================
-- CALL SEGMENTS — Transcripts
-- ============================================================

-- Marcus Chen ordering delivery (retell_call_def456)
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Thank you for calling Demo Pizza ByWard Market! This is Harper. How can I help you today?', 0, 'greeting' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Hi, I''d like to place a delivery order please.', 3200, 'order_intent' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'I''d be happy to help with that! Can I get your phone number so I can pull up your account?', 7500, 'identify_customer' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'It''s 613-555-2345.', 10500, 'provide_info' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Great, I see you''re Marcus Chen at 189 Murray Street. Is that the delivery address?', 14000, 'confirm_address' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Yes that''s right.', 16200, 'confirm' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Perfect. What can I get for you tonight?', 18500, 'take_order' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Can I get a medium Works pizza, a Caesar salad, a 2-liter Coke, and the hot wings — 8 piece.', 22000, 'place_order' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Let me confirm that: one medium Works pizza, one Caesar salad, one 2-liter Coca-Cola, and one 8-piece hot wings. Anything else?', 28000, 'confirm_order' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Oh, and garlic bread too please.', 30500, 'add_item' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Got it, adding garlic bread. So that''s medium Works, Caesar salad, Coke, hot wings, and garlic bread. Your total comes to $50.83 including HST. Delivery to 189 Murray Street, buzzer 4B. Should be about 35 to 40 minutes.', 36000, 'total_and_timing' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Sounds good, thanks!', 38500, 'confirm' FROM calls WHERE retell_call_id = 'retell_call_def456';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'You''re welcome, Marcus! Your order number is SL-847292. Have a great evening!', 40500, 'close' FROM calls WHERE retell_call_id = 'retell_call_def456';

-- Aisha Patel ordering (retell_call_ghi789)
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Thank you for calling Demo Pizza ByWard Market! This is Harper. How can I help you?', 0, 'greeting' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Hi, I''d like delivery please. Medium Hawaiian and a Caesar salad.', 2800, 'place_order' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Sure! Can I get your phone number?', 5500, 'identify_customer' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', '613-555-3456.', 7200, 'provide_info' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Thanks Aisha! I see your address on file at 312 Rideau Street. Is that correct?', 9800, 'confirm_address' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Yep!', 11000, 'confirm' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Great. Medium Hawaiian, Caesar salad — anything else? Maybe a drink?', 13000, 'upsell' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Sure, a 2-liter Coke please.', 15000, 'add_item' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'And also the tiramisu.', 16000, 'add_item' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Perfect! Medium Hawaiian, Caesar salad, 2-liter Coke, and tiramisu. Your total is $40.66 with HST. About 35 minutes for delivery.', 19000, 'total_and_timing' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Thank you!', 20500, 'close' FROM calls WHERE retell_call_id = 'retell_call_ghi789';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'You''re welcome! Order number is SL-847250. Enjoy!', 21500, 'close' FROM calls WHERE retell_call_id = 'retell_call_ghi789';

-- Derek Larsson — cancelled order (retell_call_jkl012)
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Thank you for calling Demo Pizza ByWard Market! This is Harper.', 0, 'greeting' FROM calls WHERE retell_call_id = 'retell_call_jkl012';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Hey, I want a large Works and a Caesar salad for delivery.', 2500, 'place_order' FROM calls WHERE retell_call_id = 'retell_call_jkl012';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Sure! Phone number please?', 4500, 'identify_customer' FROM calls WHERE retell_call_id = 'retell_call_jkl012';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', '613-555-4567.', 5800, 'provide_info' FROM calls WHERE retell_call_id = 'retell_call_jkl012';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Great, that''ll be $33.88 with HST. Delivery to your address on file. About 40 minutes.', 8500, 'total_and_timing' FROM calls WHERE retell_call_id = 'retell_call_jkl012';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Actually wait, can I change that to pickup instead?', 11000, 'modify_order' FROM calls WHERE retell_call_id = 'retell_call_jkl012';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Of course, I can change that to pickup. Same order — large Works and Caesar salad?', 13500, 'confirm_order' FROM calls WHERE retell_call_id = 'retell_call_jkl012';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Actually you know what, I need to cancel. I''ll call back later.', 15500, 'cancel' FROM calls WHERE retell_call_id = 'retell_call_jkl012';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'No problem at all. Feel free to call back anytime. Have a good one!', 17500, 'close' FROM calls WHERE retell_call_id = 'retell_call_jkl012';

-- James Okonkwo — Centretown office order (retell_call_mno345)
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Demo Pizza Centretown, this is Harper!', 0, 'greeting' FROM calls WHERE retell_call_id = 'retell_call_mno345';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Hi, this is James. I need a big order for the office — two large Works pizzas, honey garlic wings, garlic bread, and a 2-liter Coke.', 3000, 'place_order' FROM calls WHERE retell_call_id = 'retell_call_mno345';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Big office order! Let me pull up your account. 613-555-6789?', 6500, 'identify_customer' FROM calls WHERE retell_call_id = 'retell_call_mno345';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'That''s me.', 7500, 'confirm' FROM calls WHERE retell_call_id = 'retell_call_mno345';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Alright James, two large Works, 8-piece honey garlic wings, garlic bread, and a 2-liter Coke. That''s $55.34 with HST for pickup. About 25 minutes.', 10000, 'total_and_timing' FROM calls WHERE retell_call_id = 'retell_call_mno345';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'Perfect, can you call me when it''s ready?', 12000, 'special_request' FROM calls WHERE retell_call_id = 'retell_call_mno345';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Absolutely! Your order number is SL-847294. We''ll call you when it''s ready for pickup.', 14000, 'close' FROM calls WHERE retell_call_id = 'retell_call_mno345';

-- Just asked about hours (retell_call_pqr678)
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Thank you for calling Demo Pizza ByWard Market! This is Harper.', 0, 'greeting' FROM calls WHERE retell_call_id = 'retell_call_pqr678';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'What are your hours today?', 2000, 'question' FROM calls WHERE retell_call_id = 'retell_call_pqr678';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'We''re open today from 11 AM to 11 PM. Would you like to place an order?', 5500, 'offer_order' FROM calls WHERE retell_call_id = 'retell_call_pqr678';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'caller', 'No thanks, just checking. Bye!', 7500, 'close' FROM calls WHERE retell_call_id = 'retell_call_pqr678';
INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
SELECT id, 'agent', 'Have a great day!', 8500, 'close' FROM calls WHERE retell_call_id = 'retell_call_pqr678';