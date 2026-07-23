-- SliceLine Demo Seed Data
-- Demo Pizza franchise: 50 locations, full menu, toppings, specials

-- ============================================
-- FRANCHISE
-- ============================================

INSERT INTO franchises (id, name, slug) VALUES 
('a1b2c3d4-0000-0000-0000-000000000001', 'Demo Pizza', 'demo-pizza');

-- ============================================
-- 50 LOCATIONS (Ontario, Canada)
-- ============================================

INSERT INTO locations (id, franchise_id, store_number, name, phone, street, city, state, zip, latitude, longitude, timezone) VALUES
-- Ottawa region (10)
('loc-0001', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-001', 'Demo Pizza - ByWard Market', '(613) 555-0001', '45 George St', 'Ottawa', 'ON', 'K1N 8V3', 45.4300, -75.6900, 'America/Toronto'),
('loc-0002', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-002', 'Demo Pizza - Centretown', '(613) 555-0002', '280 Elgin St', 'Ottawa', 'ON', 'K1P 5L3', 45.4200, -75.7000, 'America/Toronto'),
('loc-0003', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-003', 'Demo Pizza - Kanata', '(613) 555-0003', '300 Terry Fox Dr', 'Kanata', 'ON', 'K2K 3J1', 45.3400, -75.8900, 'America/Toronto'),
('loc-0004', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-004', 'Demo Pizza - Barrhaven', '(613) 555-0004', '3500 Strandherd Dr', 'Ottawa', 'ON', 'K2J 5J5', 45.2900, -75.7400, 'America/Toronto'),
('loc-0005', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-005', 'Demo Pizza - Orleans', '(613) 555-0005', '210 Centrum Blvd', 'Orleans', 'ON', 'K1E 3V2', 45.4700, -75.5100, 'America/Toronto'),
('loc-0006', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-006', 'Demo Pizza - Nepean', '(613) 555-0006', '1345 Richmond Rd', 'Nepean', 'ON', 'K2C 3R5', 45.3900, -75.7500, 'America/Toronto'),
('loc-0007', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-007', 'Demo Pizza - Gloucester', '(613) 555-0007', '1680 Blair Rd', 'Gloucester', 'ON', 'K1J 7R5', 45.4500, -75.6100, 'America/Toronto'),
('loc-0008', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-008', 'Demo Pizza - Stittsville', '(613) 555-0008', '1250 Stittsville Main St', 'Stittsville', 'ON', 'K2S 1A1', 45.2600, -75.8700, 'America/Toronto'),
('loc-0009', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-009', 'Demo Pizza - South Keys', '(613) 555-0009', '1000 Bank St', 'Ottawa', 'ON', 'K1S 3X7', 45.3800, -75.6800, 'America/Toronto'),
('loc-0010', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-010', 'Demo Pizza - Westboro', '(613) 555-0010', '345 Richmond Rd', 'Ottawa', 'ON', 'K2A 3T2', 45.4050, -75.7600, 'America/Toronto'),

-- Toronto region (15)
('loc-0011', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-011', 'Demo Pizza - Downtown Toronto', '(416) 555-0011', '100 King St W', 'Toronto', 'ON', 'M5X 1A9', 43.6480, -79.3820, 'America/Toronto'),
('loc-0012', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-012', 'Demo Pizza - Yonge & Eglinton', '(416) 555-0012', '2200 Yonge St', 'Toronto', 'ON', 'M4S 2C6', 43.7040, -79.4000, 'America/Toronto'),
('loc-0013', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-013', 'Demo Pizza - Liberty Village', '(416) 555-0013', '150 East Liberty St', 'Toronto', 'ON', 'M6K 3M5', 43.6420, -79.4200, 'America/Toronto'),
('loc-0014', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-014', 'Demo Pizza - Scarborough', '(416) 555-0014', '3000 Lawrence Ave E', 'Scarborough', 'ON', 'M1P 2S5', 43.7700, -79.2400, 'America/Toronto'),
('loc-0015', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-015', 'Demo Pizza - North York', '(416) 555-0015', '5000 Yonge St', 'North York', 'ON', 'M2N 5V2', 43.7700, -79.4100, 'America/Toronto'),
('loc-0016', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-016', 'Demo Pizza - Etobicoke', '(416) 555-0016', '800 The Queensway', 'Etobicoke', 'ON', 'M8Z 1N4', 43.6150, -79.5100, 'America/Toronto'),
('loc-0017', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-017', 'Demo Pizza - Mississauga', '(905) 555-0017', '100 City Centre Dr', 'Mississauga', 'ON', 'L5B 2G9', 43.5940, -79.6460, 'America/Toronto'),
('loc-0018', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-018', 'Demo Pizza - Brampton', '(905) 555-0018', '25 Peel Centre Dr', 'Brampton', 'ON', 'L6T 3R5', 43.6880, -79.7400, 'America/Toronto'),
('loc-0019', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-019', 'Demo Pizza - Markham', '(905) 555-0019', '3995 Highway 7 E', 'Markham', 'ON', 'L3R 0C2', 43.8560, -79.3400, 'America/Toronto'),
('loc-0020', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-020', 'Demo Pizza - Vaughan', '(905) 555-0020', '1 Bass Pro Mills Dr', 'Vaughan', 'ON', 'L4K 5W4', 43.7300, -79.5200, 'America/Toronto'),
('loc-0021', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-021', 'Demo Pizza - Richmond Hill', '(905) 555-0021', '430 Hwy 7', 'Richmond Hill', 'ON', 'L4B 1A2', 43.8700, -79.4100, 'America/Toronto'),
('loc-0022', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-022', 'Demo Pizza - Oakville', '(905) 555-0022', '240 Leighland Ave', 'Oakville', 'ON', 'L6H 3T8', 43.4600, -79.6800, 'America/Toronto'),
('loc-0023', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-023', 'Demo Pizza - Pickering', '(905) 555-0023', '1355 Kingston Rd', 'Pickering', 'ON', 'L1V 3N9', 43.8300, -79.0900, 'America/Toronto'),
('loc-0024', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-024', 'Demo Pizza - Hamilton', '(905) 555-0024', '875 Upper Wentworth St', 'Hamilton', 'ON', 'L9B 2W2', 43.2200, -79.8700, 'America/Toronto'),
('loc-0025', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-025', 'Demo Pizza - Yorkdale', '(416) 555-0025', '3401 Dufferin St', 'Toronto', 'ON', 'M6A 2T9', 43.7300, -79.4500, 'America/Toronto'),

-- GTA extended + Kingston + London (10)
('loc-0026', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-026', 'Demo Pizza - Ajax', '(905) 555-0026', '15 Kingston Rd E', 'Ajax', 'ON', 'L1S 5S2', 43.8500, -79.0300, 'America/Toronto'),
('loc-0027', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-027', 'Demo Pizza - Whitby', '(905) 555-0027', '210 Dundas St W', 'Whitby', 'ON', 'L1N 5T6', 43.8800, -78.9500, 'America/Toronto'),
('loc-0028', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-028', 'Demo Pizza - Oshawa', '(905) 555-0028', '115 King St E', 'Oshawa', 'ON', 'L1H 1B7', 43.9000, -78.8700, 'America/Toronto'),
('loc-0029', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-029', 'Demo Pizza - Kingston', '(613) 555-0029', '700 Princess St', 'Kingston', 'ON', 'K7L 1E5', 44.2300, -76.4800, 'America/Toronto'),
('loc-0030', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-030', 'Demo Pizza - London', '(519) 555-0030', '530 Richmond St', 'London', 'ON', 'N6A 3H3', 42.9800, -81.2500, 'America/Toronto'),

-- Other Ontario cities (20)
('loc-0031', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-031', 'Demo Pizza - Barrie', '(705) 555-0031', '70 Bayfield St', 'Barrie', 'ON', 'L4M 4Y6', 44.3900, -79.6900, 'America/Toronto'),
('loc-0032', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-032', 'Demo Pizza - Kitchener', '(519) 555-0032', '400 King St W', 'Kitchener', 'ON', 'N2G 1C3', 43.4500, -80.4800, 'America/Toronto'),
('loc-0033', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-033', 'Demo Pizza - Waterloo', '(519) 555-0033', '150 King St S', 'Waterloo', 'ON', 'N2J 2W1', 43.4600, -80.5200, 'America/Toronto'),
('loc-0034', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-034', 'Demo Pizza - Guelph', '(519) 555-0034', '125 Wyndham St N', 'Guelph', 'ON', 'N1H 4E9', 43.5400, -80.2500, 'America/Toronto'),
('loc-0035', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-035', 'Demo Pizza - Peterborough', '(705) 555-0035', '380 George St N', 'Peterborough', 'ON', 'K9H 3R5', 44.3000, -78.3200, 'America/Toronto'),
('loc-0036', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-036', 'Demo Pizza - Belleville', '(613) 555-0036', '225 Dundas St E', 'Belleville', 'ON', 'K8N 1E5', 44.1600, -77.3800, 'America/Toronto'),
('loc-0037', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-037', 'Demo Pizza - Cornwall', '(613) 555-0037', '10 Water St E', 'Cornwall', 'ON', 'K6H 6S9', 45.0200, -74.7300, 'America/Toronto'),
('loc-0038', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-038', 'Demo Pizza - Pembroke', '(613) 555-0038', '85 Pembroke St E', 'Pembroke', 'ON', 'K8A 3M5', 45.8200, -77.1100, 'America/Toronto'),
('loc-0039', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-039', 'Demo Pizza - Brockville', '(613) 555-0039', '185 King St W', 'Brockville', 'ON', 'K6V 4R4', 44.5900, -75.6800, 'America/Toronto'),
('loc-0040', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-040', 'Demo Pizza - Smiths Falls', '(613) 555-0040', '12 Beckwith St N', 'Smiths Falls', 'ON', 'K7A 2B4', 44.9000, -76.0200, 'America/Toronto'),
('loc-0041', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-041', 'Demo Pizza - Sudbury', '(705) 555-0041', '150 Larch St', 'Sudbury', 'ON', 'P3E 4J3', 46.4900, -81.0000, 'America/Toronto'),
('loc-0042', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-042', 'Demo Pizza - Thunder Bay', '(807) 555-0042', '100 Red River Rd', 'Thunder Bay', 'ON', 'P7B 1B3', 48.3800, -89.2500, 'America/Toronto'),
('loc-0043', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-043', 'Demo Pizza - Sault Ste Marie', '(705) 555-0043', '370 Queen St E', 'Sault Ste Marie', 'ON', 'P6A 1Z5', 46.5200, -84.3400, 'America/Toronto'),
('loc-0044', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-044', 'Demo Pizza - North Bay', '(705) 555-0044', '275 Main St E', 'North Bay', 'ON', 'P1B 1B3', 46.3100, -79.4600, 'America/Toronto'),
('loc-0045', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-045', 'Demo Pizza - Windsor', '(519) 555-0045', '200 Ouellette Ave', 'Windsor', 'ON', 'N9A 5W4', 42.3000, -83.0400, 'America/Toronto'),
('loc-0046', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-046', 'Demo Pizza - Niagara Falls', '(905) 555-0046', '5605 Ferry St', 'Niagara Falls', 'ON', 'L2G 1S7', 43.0900, -79.0800, 'America/Toronto'),
('loc-0047', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-047', 'Demo Pizza - St Catharines', '(905) 555-0047', '120 St Paul St', 'St Catharines', 'ON', 'L2R 3M3', 43.1500, -79.2400, 'America/Toronto'),
('loc-0048', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-048', 'Demo Pizza - Newmarket', '(905) 555-0048', '450 Davis Dr', 'Newmarket', 'ON', 'L3Y 2R1', 44.0500, -79.4600, 'America/Toronto'),
('loc-0049', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-049', 'Demo Pizza - Burlington', '(905) 555-0049', '460 Brant St', 'Burlington', 'ON', 'L7R 2C5', 43.3200, -79.7900, 'America/Toronto'),
('loc-0050', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-050', 'Demo Pizza - Milton', '(905) 555-0050', '820 Main St E', 'Milton', 'ON', 'L9T 3N9', 43.5100, -79.8800, 'America/Toronto');

-- ============================================
-- MENU CATEGORIES
-- ============================================

INSERT INTO menu_categories (id, franchise_id, name, slug, display_order) VALUES 
('cat-01', 'a1b2c3d4-0000-0000-0000-000000000001', 'Pizza', 'pizza', 1),
('cat-02', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sides', 'sides', 2),
('cat-03', 'a1b2c3d4-0000-0000-0000-000000000001', 'Wings', 'wings', 3),
('cat-04', 'a1b2c3d4-0000-0000-0000-000000000001', 'Salads', 'salads', 4),
('cat-05', 'a1b2c3d4-0000-0000-0000-000000000001', 'Drinks', 'drinks', 5),
('cat-06', 'a1b2c3d4-0000-0000-0000-000000000001', 'Desserts', 'desserts', 6),
('cat-07', 'a1b2c3d4-0000-0000-0000-000000000001', 'Dips & Extras', 'dips-extras', 7),
('cat-08', 'a1b2c3d4-0000-0000-0000-000000000001', 'Combos & Deals', 'combos-deals', 8);

-- ============================================
-- MENU ITEMS — PIZZAS
-- ============================================

INSERT INTO menu_items (id, franchise_id, category_id, name, description, slug, base_price, sizes, display_order) VALUES
-- Specialty Pizzas
('item-001', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'The Classic', 'Pepperoni, mozzarella, and our signature tomato sauce', 'the-classic', 14.99, '[{"name":"Small (10\u201d)","price":14.99},{"name":"Medium (12\u201d)","price":18.99},{"name":"Large (14\u201d)","price":22.99},{"name":"X-Large (16\u201d)","price":26.99}]'::jsonb, 1),
('item-002', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'The Works', 'Pepperoni, mushrooms, green peppers, onions, sausage, olives', 'the-works', 17.99, '[{"name":"Small (10\u201d)","price":17.99},{"name":"Medium (12\u201d)","price":21.99},{"name":"Large (14\u201d)","price":25.99},{"name":"X-Large (16\u201d)","price":29.99}]'::jsonb, 2),
('item-003', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'Meat Lovers', 'Pepperoni, ham, bacon, sausage, ground beef', 'meat-lovers', 19.99, '[{"name":"Small (10\u201d)","price":19.99},{"name":"Medium (12\u201d)","price":23.99},{"name":"Large (14\u201d)","price":27.99},{"name":"X-Large (16\u201d)","price":31.99}]'::jsonb, 3),
('item-004', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'Veggie Supreme', 'Mushrooms, green peppers, onions, olives, tomatoes, spinach', 'veggie-supreme', 16.99, '[{"name":"Small (10\u201d)","price":16.99},{"name":"Medium (12\u201d)","price":20.99},{"name":"Large (14\u201d)","price":24.99},{"name":"X-Large (16\u201d)","price":28.99}]'::jsonb, 4),
('item-005', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'Hawaiian', 'Ham, pineapple, mozzarella', 'hawaiian', 16.49, '[{"name":"Small (10\u201d)","price":16.49},{"name":"Medium (12\u201d)","price":20.49},{"name":"Large (14\u201d)","price":24.49},{"name":"X-Large (16\u201d)","price":28.49}]'::jsonb, 5),
('item-006', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'BBQ Chicken', 'Grilled chicken, BBQ sauce, red onions, cilantro, mozzarella', 'bbq-chicken', 18.49, '[{"name":"Small (10\u201d)","price":18.49},{"name":"Medium (12\u201d)","price":22.49},{"name":"Large (14\u201d)","price":26.49},{"name":"X-Large (16\u201d)","price":30.49}]'::jsonb, 6),
('item-007', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'Buffalo Chicken', 'Fried chicken, buffalo sauce, ranch drizzle, mozzarella', 'buffalo-chicken', 18.99, '[{"name":"Small (10\u201d)","price":18.99},{"name":"Medium (12\u201d)","price":22.99},{"name":"Large (14\u201d)","price":26.99},{"name":"X-Large (16\u201d)","price":30.99}]'::jsonb, 7),
('item-008', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'Margherita', 'Fresh mozzarella, basil, tomato sauce, EVOO', 'margherita', 15.99, '[{"name":"Small (10\u201d)","price":15.99},{"name":"Medium (12\u201d)","price":19.99},{"name":"Large (14\u201d)","price":23.99},{"name":"X-Large (16\u201d)","price":27.99}]'::jsonb, 8),
('item-009', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'Diavola', 'Spicy pepperoni, jalapeños, hot honey drizzle, mozzarella', 'diavola', 17.49, '[{"name":"Small (10\u201d)","price":17.49},{"name":"Medium (12\u201d)","price":21.49},{"name":"Large (14\u201d)","price":25.49},{"name":"X-Large (16\u201d)","price":29.49}]'::jsonb, 9),
('item-010', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-01', 'Build Your Own', 'Start with our signature crust and sauce, add your favourite toppings', 'build-your-own', 11.99, '[{"name":"Small (10\u201d)","price":11.99},{"name":"Medium (12\u201d)","price":14.99},{"name":"Large (14\u201d)","price":17.99},{"name":"X-Large (16\u201d)","price":20.99}]'::jsonb, 10),

-- Sides
('item-011', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-02', 'Garlic Bread', 'Toasted with garlic butter and herbs', 'garlic-bread', 4.99, '[{"name":"Regular","price":4.99},{"name":"With Cheese","price":6.99}]'::jsonb, 11),
('item-012', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-02', 'Garlic Knots (6pc)', 'Fresh-baked garlic knots with marinara', 'garlic-knots', 5.99, '[]'::jsonb, 12),
('item-013', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-02', 'Cheese Sticks', 'Mozzarella sticks with marinara dipping sauce', 'cheese-sticks', 7.99, '[{"name":"6pc","price":7.99},{"name":"12pc","price":13.99}]'::jsonb, 13),
('item-014', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-02', 'Caesar Salad', 'Romaine, parmesan, croutons, house-made Caesar dressing', 'caesar-salad', 6.99, '[{"name":"Side","price":6.99},{"name":"Full","price":10.99}]'::jsonb, 14),
('item-015', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-02', 'Fries', 'Crispy golden fries with sea salt', 'fries', 4.49, '[{"name":"Regular","price":4.49},{"name":"Large","price":6.49},{"name":"Poutine","price":8.49}]'::jsonb, 15),

-- Wings
('item-016', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-03', 'Chicken Wings', 'Crispy wings tossed in your choice of sauce', 'chicken-wings', 12.99, '[{"name":"8pc","price":12.99},{"name":"16pc","price":22.99},{"name":"24pc","price":31.99}]'::jsonb, 16),
('item-017', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-03', 'Boneless Wings', 'Breaded boneless wings, choice of sauce', 'boneless-wings', 11.99, '[{"name":"8pc","price":11.99},{"name":"16pc","price":20.99},{"name":"24pc","price":28.99}]'::jsonb, 17),

-- Salads
('item-018', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-04', 'Garden Salad', 'Mixed greens, tomatoes, cucumbers, red onion, vinaigrette', 'garden-salad', 7.99, '[{"name":"Side","price":7.99},{"name":"Full","price":11.99}]'::jsonb, 18),
('item-019', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-04', 'Greek Salad', 'Romaine, feta, olives, tomatoes, red onion, Greek dressing', 'greek-salad', 8.99, '[{"name":"Side","price":8.99},{"name":"Full","price":12.99}]'::jsonb, 19),

-- Drinks
('item-020', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-05', 'Pop', 'Coca-Cola, Diet Coke, Sprite, Ginger Ale', 'pop', 2.49, '[{"name":"Can","price":2.49},{"name":"Bottle","price":3.49}]'::jsonb, 20),
('item-021', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-05', 'Water', 'Spring water', 'water', 1.99, '[]'::jsonb, 21),
('item-022', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-05', 'Juice', 'Orange or apple juice', 'juice', 3.49, '[]'::jsonb, 22),

-- Desserts
('item-023', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-06', 'Cinnamon Sticks', 'Sweet cinnamon sugar sticks with cream cheese icing', 'cinnamon-sticks', 6.99, '[]'::jsonb, 23),
('item-024', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-06', 'Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 'chocolate-lava-cake', 7.99, '[]'::jsonb, 24),
('item-025', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-06', 'Cannoli (2pc)', 'Crispy shell, sweet ricotta filling, chocolate chips', 'cannoli', 5.99, '[]'::jsonb, 25),

-- Dips & Extras
('item-026', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-07', 'Extra Sauce', 'Additional pizza sauce', 'extra-sauce', 0.99, '[{"name":"Pizza Sauce","price":0.99},{"name":"BBQ","price":0.99},{"name":"Ranch","price":0.99},{"name":"Garlic Butter","price":0.99}]'::jsonb, 26),
('item-027', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-07', 'Dipping Sauce', 'For wings and sticks', 'dipping-sauce', 0.99, '[{"name":"Ranch","price":0.99},{"name":"Blue Cheese","price":0.99},{"name":"Hot Sauce","price":0.99},{"name":"Honey Garlic","price":0.99}]'::jsonb, 27),
('item-028', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-07', 'Extra Cheese', 'Additional mozzarella on your pizza', 'extra-cheese', 2.49, '[]'::jsonb, 28),

-- Combos & Deals
('item-029', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-08', 'Family Combo', '2 Large pizzas + garlic bread + 2L pop', 'family-combo', 44.99, '[]'::jsonb, 29),
('item-030', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-08', 'Date Night Combo', '1 Medium pizza + salad + 2 drinks', 'date-night-combo', 29.99, '[]'::jsonb, 30),
('item-031', 'a1b2c3d4-0000-0000-0000-000000000001', 'cat-08', 'Wing Night', '16 wings + large fries + 2L pop', 'wing-night', 34.99, '[]'::jsonb, 31);

-- ============================================
-- TOPPINGS
-- ============================================

INSERT INTO toppings (id, franchise_id, name, base_price, is_premium) VALUES
('top-01', 'a1b2c3d4-0000-0000-0000-000000000001', 'Pepperoni', 1.50, false),
('top-02', 'a1b2c3d4-0000-0000-0000-000000000001', 'Mushrooms', 1.50, false),
('top-03', 'a1b2c3d4-0000-0000-0000-000000000001', 'Green Peppers', 1.50, false),
('top-04', 'a1b2c3d4-0000-0000-0000-000000000001', 'Onions', 1.50, false),
('top-05', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sausage', 1.50, false),
('top-06', 'a1b2c3d4-0000-0000-0000-000000000001', 'Ham', 1.50, false),
('top-07', 'a1b2c3d4-0000-0000-0000-000000000001', 'Bacon', 2.00, true),
('top-08', 'a1b2c3d4-0000-0000-0000-000000000001', 'Black Olives', 1.50, false),
('top-09', 'a1b2c3d4-0000-0000-0000-000000000001', 'Pineapple', 1.50, false),
('top-10', 'a1b2c3d4-0000-0000-0000-000000000001', 'Jalapeños', 1.50, false),
('top-11', 'a1b2c3d4-0000-0000-0000-000000000001', 'Spinach', 1.50, false),
('top-12', 'a1b2c3d4-0000-0000-0000-000000000001', 'Tomatoes', 1.50, false),
('top-13', 'a1b2c3d4-0000-0000-0000-000000000001', 'Extra Cheese', 2.00, true),
('top-14', 'a1b2c3d4-0000-0000-0000-000000000001', 'Feta', 2.00, true),
('top-15', 'a1b2c3d4-0000-0000-0000-000000000001', 'Ground Beef', 2.00, true),
('top-16', 'a1b2c3d4-0000-0000-0000-000000000001', 'Grilled Chicken', 2.50, true),
('top-17', 'a1b2c3d4-0000-0000-0000-000000000001', 'Anchovies', 2.00, true),
('top-18', 'a1b2c3d4-0000-0000-0000-000000000001', 'Banana Peppers', 1.50, false),
('top-19', 'a1b2c3d4-0000-0000-0000-000000000001', 'Roasted Red Peppers', 1.75, false),
('top-20', 'a1b2c3d4-0000-0000-0000-000000000001', 'Fresh Basil', 1.75, false);

-- ============================================
-- SPECIALS
-- ============================================

INSERT INTO specials (id, franchise_id, name, description, discount_type, discount_value, applies_to, day_of_week, start_time, end_time, start_date, end_date, is_active) VALUES
-- Tuesday Night 2-for-1 (all locations)
('sp-01', 'a1b2c3d4-0000-0000-0000-000000000001', 'Tuesday Night 2-for-1', 'Buy one large pizza, get a second large pizza free every Tuesday', 'buy_one_get_one', 0, 'order', ARRAY[2], '16:00', '22:00', NULL, NULL, true),
-- Lunch Special (Mon-Fri)
('sp-02', 'a1b2c3d4-0000-0000-0000-000000000001', 'Lunch Combo Special', 'Any small pizza + drink for $12.99, Mon-Fri 11am-2pm', 'fixed', 12.99, 'order', ARRAY[1,2,3,4,5], '11:00', '14:00', NULL, NULL, true),
-- Weekend Family Deal
('sp-03', 'a1b2c3d4-0000-0000-0000-000000000001', 'Weekend Family Deal', '15% off Family Combo every Saturday and Sunday', 'percentage', 15.00, 'order', ARRAY[0,6], NULL, NULL, NULL, NULL, true),
-- Student Discount (all week)
('sp-04', 'a1b2c3d4-0000-0000-0000-000000000001', 'Student Discount', '10% off with valid student ID', 'percentage', 10.00, 'order', NULL, NULL, NULL, NULL, NULL, true),
-- Free Delivery over $30
('sp-05', 'a1b2c3d4-0000-0000-0000-000000000001', 'Free Delivery over $30', 'Free delivery on orders over $30', 'fixed', 0, 'delivery', NULL, NULL, NULL, NULL, NULL, true),
-- Wing Wednesday
('sp-06', 'a1b2c3d4-0000-0000-0000-000000000001', 'Wing Wednesday', '50 cents off each wing every Wednesday', 'fixed', 0.50, 'category', ARRAY[3], NULL, NULL, NULL, NULL, true);

-- Location-exclusive special: Downtown Ottawa has a late-night deal
INSERT INTO location_specials (id, location_id, special_id, is_excluded, name, description, discount_type, discount_value, applies_to, day_of_week, start_time, end_time, is_active) VALUES
('ls-01', 'loc-0001', NULL, false, 'ByWard Late Night', '20% off any pizza after 10pm, ByWard Market location only', 'percentage', 20.00, 'order', ARRAY[4,5,6], '22:00', '02:00', true);

-- Toronto downtown location opts out of the Tuesday special (they have their own promo)
INSERT INTO location_specials (id, location_id, special_id, is_excluded) VALUES
('ls-02', 'loc-0011', 'sp-01', true);

-- ============================================
-- LOCATION-SPECIFIC PRICE OVERRIDES
-- ============================================

-- Downtown Toronto charges $2 more on large pizzas
INSERT INTO location_menu_overrides (location_id, menu_item_id, price_override) VALUES
('loc-0011', 'item-001', 16.99),  -- Classic base: $14.99 → $16.99
('loc-0011', 'item-002', 19.99),  -- Works base: $17.99 → $19.99
('loc-0011', 'item-003', 21.99);  -- Meat Lovers base: $19.99 → $21.99

-- ============================================
-- SAMPLE STOCK OUTAGES (for demo)
-- ============================================

-- ByWard Market is out of anchovies
INSERT INTO location_stock (location_id, item_type, item_id, stock_status, notes) VALUES
('loc-0001', 'topping', 'top-17', 'out_of_stock', 'Supplier delay — expect restock Thursday');

-- Kanata is out of cannoli
INSERT INTO location_stock (location_id, item_type, item_id, stock_status, notes) VALUES
('loc-0003', 'menu_item', 'item-025', 'out_of_stock', 'Seasonal item — returning next month');

-- Downtown Toronto has low stock on wings
INSERT INTO location_stock (location_id, item_type, item_id, stock_status, quantity, notes) VALUES
('loc-0011', 'menu_item', 'item-016', 'low_stock', 8, 'Only 8 wings left — recommend upselling boneless');

-- North York discontinued chocolate lava cake
INSERT INTO location_stock (location_id, item_type, item_id, stock_status, notes, updated_by) VALUES
('loc-0015', 'menu_item', 'item-024', 'discontinued', 'Removed from this location per manager request', 'manager');