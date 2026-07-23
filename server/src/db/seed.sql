-- SliceLine Demo Seed Data (UUID version)
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
('bf73f6dd-9e67-54d1-aa0c-9faa71d21069', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-001', 'Demo Pizza - ByWard Market', '(613) 555-0001', '45 George St', 'Ottawa', 'ON', 'K1N 8V3', 45.43, -75.69, 'America/Toronto'),
('d602a410-e722-5637-8bad-ca1a671718a5', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-002', 'Demo Pizza - Centretown', '(613) 555-0002', '280 Elgin St', 'Ottawa', 'ON', 'K1P 5L3', 45.42, -75.7, 'America/Toronto'),
('03b4b401-6ca9-5439-ae2b-48544a75c14f', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-003', 'Demo Pizza - Kanata', '(613) 555-0003', '300 Terry Fox Dr', 'Kanata', 'ON', 'K2K 3J1', 45.34, -75.89, 'America/Toronto'),
('24739f61-fc01-512b-92f6-f420dd0b6539', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-004', 'Demo Pizza - Barrhaven', '(613) 555-0004', '3500 Strandherd Dr', 'Ottawa', 'ON', 'K2J 5J5', 45.29, -75.74, 'America/Toronto'),
('3ad90156-8fec-536e-8709-da4fef361d0f', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-005', 'Demo Pizza - Orleans', '(613) 555-0005', '210 Centrum Blvd', 'Orleans', 'ON', 'K1E 3V2', 45.47, -75.51, 'America/Toronto'),
('ab3ef168-3d97-573c-b6c6-611b919559c7', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-006', 'Demo Pizza - Nepean', '(613) 555-0006', '1345 Richmond Rd', 'Nepean', 'ON', 'K2C 3R5', 45.39, -75.75, 'America/Toronto'),
('c612a443-8815-5c28-8a84-98484a837cf7', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-007', 'Demo Pizza - Gloucester', '(613) 555-0007', '1680 Blair Rd', 'Gloucester', 'ON', 'K1J 7R5', 45.45, -75.61, 'America/Toronto'),
('dd22357f-69c0-5463-8197-b40fdc089bbb', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-008', 'Demo Pizza - Stittsville', '(613) 555-0008', '1250 Stittsville Main St', 'Stittsville', 'ON', 'K2S 1A1', 45.26, -75.87, 'America/Toronto'),
('3eb50cd9-931e-588e-bb7f-37eafc5f0735', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-009', 'Demo Pizza - South Keys', '(613) 555-0009', '1000 Bank St', 'Ottawa', 'ON', 'K1S 3X7', 45.38, -75.68, 'America/Toronto'),
('6453fa9e-d449-5796-b21d-2683a693ce78', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-010', 'Demo Pizza - Westboro', '(613) 555-0010', '345 Richmond Rd', 'Ottawa', 'ON', 'K2A 3T2', 45.405, -75.76, 'America/Toronto'),
('f9b00c7d-1cdf-5b5f-8efa-5bad9ac3575b', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-011', 'Demo Pizza - Downtown Toronto', '(416) 555-0011', '100 King St W', 'Toronto', 'ON', 'M5X 1A9', 43.648, -79.382, 'America/Toronto'),
('93916817-e55e-595a-b09c-abad9554ff8c', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-012', 'Demo Pizza - Yonge & Eglinton', '(416) 555-0012', '2200 Yonge St', 'Toronto', 'ON', 'M4S 2C6', 43.704, -79.4, 'America/Toronto'),
('df33f140-00e0-5178-a3ea-eada7247c688', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-013', 'Demo Pizza - Liberty Village', '(416) 555-0013', '150 East Liberty St', 'Toronto', 'ON', 'M6K 3M5', 43.642, -79.42, 'America/Toronto'),
('a72f8b7e-247d-5839-a0b2-bed999b1ddfa', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-014', 'Demo Pizza - Scarborough', '(416) 555-0014', '3000 Lawrence Ave E', 'Scarborough', 'ON', 'M1P 2S5', 43.77, -79.24, 'America/Toronto'),
('cb50f35c-ac86-5466-ac82-9b5413286eb0', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-015', 'Demo Pizza - North York', '(416) 555-0015', '5000 Yonge St', 'North York', 'ON', 'M2N 5V2', 43.77, -79.41, 'America/Toronto'),
('b329cdf4-4be4-531b-9b49-979a07f2a40e', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-016', 'Demo Pizza - Etobicoke', '(416) 555-0016', '800 The Queensway', 'Etobicoke', 'ON', 'M8Z 1N4', 43.615, -79.51, 'America/Toronto'),
('21850b74-e399-52b7-bd86-32f1027789bd', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-017', 'Demo Pizza - Mississauga', '(905) 555-0017', '100 City Centre Dr', 'Mississauga', 'ON', 'L5B 2G9', 43.594, -79.646, 'America/Toronto'),
('9addcbbf-93e1-566a-a732-929d92d5c59c', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-018', 'Demo Pizza - Brampton', '(905) 555-0018', '25 Peel Centre Dr', 'Brampton', 'ON', 'L6T 3R5', 43.688, -79.74, 'America/Toronto'),
('27dce768-e3d8-50f9-8248-00b114c843ec', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-019', 'Demo Pizza - Markham', '(905) 555-0019', '3995 Highway 7 E', 'Markham', 'ON', 'L3R 0C2', 43.856, -79.34, 'America/Toronto'),
('b7f6069d-b91f-58f4-94b4-2e2beba0b2fb', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-020', 'Demo Pizza - Vaughan', '(905) 555-0020', '1 Bass Pro Mills Dr', 'Vaughan', 'ON', 'L4K 5W4', 43.73, -79.52, 'America/Toronto'),
('30b0cf38-ae2f-5ee9-a3a3-2e990cc73d83', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-021', 'Demo Pizza - Richmond Hill', '(905) 555-0021', '430 Hwy 7', 'Richmond Hill', 'ON', 'L4B 1A2', 43.87, -79.41, 'America/Toronto'),
('421b27ac-4f66-508e-8a6c-deed2d486acb', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-022', 'Demo Pizza - Oakville', '(905) 555-0022', '240 Leighland Ave', 'Oakville', 'ON', 'L6H 3T8', 43.46, -79.68, 'America/Toronto'),
('bdb53e7d-7836-5e8d-b9d9-b440373697be', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-023', 'Demo Pizza - Pickering', '(905) 555-0023', '1355 Kingston Rd', 'Pickering', 'ON', 'L1V 3N9', 43.83, -79.09, 'America/Toronto'),
('1a1edfb7-205e-5421-b924-01651195add3', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-024', 'Demo Pizza - Hamilton', '(905) 555-0024', '875 Upper Wentworth St', 'Hamilton', 'ON', 'L9B 2W2', 43.22, -79.87, 'America/Toronto'),
('201fc479-30aa-5ccd-8c50-3b4cb0ece250', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-025', 'Demo Pizza - Yorkdale', '(416) 555-0025', '3401 Dufferin St', 'Toronto', 'ON', 'M6A 2T9', 43.73, -79.45, 'America/Toronto'),
('9a64bd4b-1a6c-57c8-8943-a239688740ee', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-026', 'Demo Pizza - Ajax', '(905) 555-0026', '15 Kingston Rd E', 'Ajax', 'ON', 'L1S 5S2', 43.85, -79.03, 'America/Toronto'),
('6987c8da-4439-503b-8961-21aac5b11729', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-027', 'Demo Pizza - Whitby', '(905) 555-0027', '210 Dundas St W', 'Whitby', 'ON', 'L1N 5T6', 43.88, -78.95, 'America/Toronto'),
('2a6842a9-8933-56b5-8e77-c980b52710da', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-028', 'Demo Pizza - Oshawa', '(905) 555-0028', '115 King St E', 'Oshawa', 'ON', 'L1H 1B7', 43.9, -78.87, 'America/Toronto'),
('22dab7de-21ec-51aa-b1f5-4b5462eb0ec6', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-029', 'Demo Pizza - Kingston', '(613) 555-0029', '700 Princess St', 'Kingston', 'ON', 'K7L 1E5', 44.23, -76.48, 'America/Toronto'),
('bf675427-ab43-5bc2-b9f4-198fafbc525c', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-030', 'Demo Pizza - London', '(519) 555-0030', '530 Richmond St', 'London', 'ON', 'N6A 3H3', 42.98, -81.25, 'America/Toronto'),
('cdcf75fd-85cd-5f7b-bc9b-2b7861968de0', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-031', 'Demo Pizza - Barrie', '(705) 555-0031', '70 Bayfield St', 'Barrie', 'ON', 'L4M 4Y6', 44.39, -79.69, 'America/Toronto'),
('ba959b53-871e-57ca-b386-c5ab3dcb845e', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-032', 'Demo Pizza - Kitchener', '(519) 555-0032', '400 King St W', 'Kitchener', 'ON', 'N2G 1C3', 43.45, -80.48, 'America/Toronto'),
('ab2c80a0-1550-50b1-9dbf-28112456921d', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-033', 'Demo Pizza - Waterloo', '(519) 555-0033', '150 King St S', 'Waterloo', 'ON', 'N2J 2W1', 43.46, -80.52, 'America/Toronto'),
('2569cbfa-9529-550d-a0d3-704c6886afbe', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-034', 'Demo Pizza - Guelph', '(519) 555-0034', '125 Wyndham St N', 'Guelph', 'ON', 'N1H 4E9', 43.54, -80.25, 'America/Toronto'),
('20b7e3ac-9443-5adf-8ef6-547adc66662a', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-035', 'Demo Pizza - Peterborough', '(705) 555-0035', '380 George St N', 'Peterborough', 'ON', 'K9H 3R5', 44.3, -78.32, 'America/Toronto'),
('4f06fc26-fa1e-5a7f-a6fe-0a834e837cd9', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-036', 'Demo Pizza - Belleville', '(613) 555-0036', '225 Dundas St E', 'Belleville', 'ON', 'K8N 1E5', 44.16, -77.38, 'America/Toronto'),
('1280d5db-17b0-58a7-abaf-c3a1d9b92d7c', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-037', 'Demo Pizza - Cornwall', '(613) 555-0037', '10 Water St E', 'Cornwall', 'ON', 'K6H 6S9', 45.02, -74.73, 'America/Toronto'),
('aadd2f9c-4ec5-548c-831f-38e36856f3e0', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-038', 'Demo Pizza - Pembroke', '(613) 555-0038', '85 Pembroke St E', 'Pembroke', 'ON', 'K8A 3M5', 45.82, -77.11, 'America/Toronto'),
('7389ac0d-8a00-5a00-9407-f4cc21e8bd98', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-039', 'Demo Pizza - Brockville', '(613) 555-0039', '185 King St W', 'Brockville', 'ON', 'K6V 4R4', 44.59, -75.68, 'America/Toronto'),
('2e1738a0-094c-5fed-ac54-897406722579', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-040', 'Demo Pizza - Smiths Falls', '(613) 555-0040', '12 Beckwith St N', 'Smiths Falls', 'ON', 'K7A 2B4', 44.9, -76.02, 'America/Toronto'),
('d2c86461-184b-59a4-8082-78a8fd603c9f', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-041', 'Demo Pizza - Sudbury', '(705) 555-0041', '150 Larch St', 'Sudbury', 'ON', 'P3E 4J3', 46.49, -81.0, 'America/Toronto'),
('a675cffd-a172-54a2-b839-c7d36c4d41f5', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-042', 'Demo Pizza - Thunder Bay', '(807) 555-0042', '100 Red River Rd', 'Thunder Bay', 'ON', 'P7B 1B3', 48.38, -89.25, 'America/Toronto'),
('03faf75e-29de-560f-841f-4bd6e638b11c', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-043', 'Demo Pizza - Sault Ste Marie', '(705) 555-0043', '370 Queen St E', 'Sault Ste Marie', 'ON', 'P6A 1Z5', 46.52, -84.34, 'America/Toronto'),
('6810532c-f30c-5cb2-b82b-c4624a75506e', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-044', 'Demo Pizza - North Bay', '(705) 555-0044', '275 Main St E', 'North Bay', 'ON', 'P1B 1B3', 46.31, -79.46, 'America/Toronto'),
('524b7c83-899e-5fd2-bb57-8dc903455e1b', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-045', 'Demo Pizza - Windsor', '(519) 555-0045', '200 Ouellette Ave', 'Windsor', 'ON', 'N9A 5W4', 42.3, -83.04, 'America/Toronto'),
('57496937-b11d-5005-af73-ccf077f83713', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-046', 'Demo Pizza - Niagara Falls', '(905) 555-0046', '5605 Ferry St', 'Niagara Falls', 'ON', 'L2G 1S7', 43.09, -79.08, 'America/Toronto'),
('eb98d820-8b0c-5776-ae2e-a055f3f399bb', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-047', 'Demo Pizza - St Catharines', '(905) 555-0047', '120 St Paul St', 'St Catharines', 'ON', 'L2R 3M3', 43.15, -79.24, 'America/Toronto'),
('8c9d7875-4dad-572f-9a21-197d5248940d', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-048', 'Demo Pizza - Newmarket', '(905) 555-0048', '450 Davis Dr', 'Newmarket', 'ON', 'L3Y 2R1', 44.05, -79.46, 'America/Toronto'),
('65be9abd-aa6a-5689-8e38-dd7b9b65cd47', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-049', 'Demo Pizza - Burlington', '(905) 555-0049', '460 Brant St', 'Burlington', 'ON', 'L7R 2C5', 43.32, -79.79, 'America/Toronto'),
('830ce832-0aaa-572b-bf76-efa5fbfe4eaa', 'a1b2c3d4-0000-0000-0000-000000000001', 'DP-050', 'Demo Pizza - Milton', '(905) 555-0050', '820 Main St E', 'Milton', 'ON', 'L9T 3N9', 43.51, -79.88, 'America/Toronto');

-- ============================================
-- MENU CATEGORIES
-- ============================================

INSERT INTO menu_categories (id, franchise_id, name, slug, display_order) VALUES 
('dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'a1b2c3d4-0000-0000-0000-000000000001', 'Pizza', 'pizza', 1),
('3376a66d-372d-55f5-9f75-c4f27f8772ed', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sides', 'sides', 2),
('3c70fa23-d655-58f4-9cd8-cc7f94905149', 'a1b2c3d4-0000-0000-0000-000000000001', 'Wings', 'wings', 3),
('ae3c05f4-426f-5ffd-ae41-29de6627bf7b', 'a1b2c3d4-0000-0000-0000-000000000001', 'Salads', 'salads', 4),
('ffec1f6f-6b77-5b29-886a-0603d8f38aae', 'a1b2c3d4-0000-0000-0000-000000000001', 'Drinks', 'drinks', 5),
('2e1c7785-7df7-5493-a7b3-6f09d33e5bba', 'a1b2c3d4-0000-0000-0000-000000000001', 'Desserts', 'desserts', 6),
('9e25cc9a-b01a-57ac-afd2-6191fcdde2d6', 'a1b2c3d4-0000-0000-0000-000000000001', 'Dips & Extras', 'dips-extras', 7),
('09d6cb34-d987-5142-b881-34dd09704b0a', 'a1b2c3d4-0000-0000-0000-000000000001', 'Combos & Deals', 'combos-deals', 8);

-- ============================================
-- MENU ITEMS
-- ============================================
INSERT INTO menu_items (id, franchise_id, category_id, name, description, slug, base_price, sizes, display_order) VALUES
('ea0c7b16-5d8c-5247-89de-3e2aa428b653', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'The Classic', 'Pepperoni, mozzarella, and our signature tomato sauce', 'the-classic', 14.99, '[{"name":"Small (10\u201d)","price":14.99},{"name":"Medium (12\u201d)","price":18.99},{"name":"Large (14\u201d)","price":22.99},{"name":"X-Large (16\u201d)","price":26.99}]'::jsonb, 1),
('f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'The Works', 'Pepperoni, mushrooms, green peppers, onions, sausage, olives', 'the-works', 17.99, '[{"name":"Small (10\u201d)","price":17.99},{"name":"Medium (12\u201d)","price":21.99},{"name":"Large (14\u201d)","price":25.99},{"name":"X-Large (16\u201d)","price":29.99}]'::jsonb, 2),
('ead1f569-1a16-5925-9263-f73bb2140efc', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'Meat Lovers', 'Pepperoni, ham, bacon, sausage, ground beef', 'meat-lovers', 19.99, '[{"name":"Small (10\u201d)","price":19.99},{"name":"Medium (12\u201d)","price":23.99},{"name":"Large (14\u201d)","price":27.99},{"name":"X-Large (16\u201d)","price":31.99}]'::jsonb, 3),
('3b68a041-ae3e-5476-bd57-f84d206921dc', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'Veggie Supreme', 'Mushrooms, green peppers, onions, olives, tomatoes, spinach', 'veggie-supreme', 16.99, '[{"name":"Small (10\u201d)","price":16.99},{"name":"Medium (12\u201d)","price":20.99},{"name":"Large (14\u201d)","price":24.99},{"name":"X-Large (16\u201d)","price":28.99}]'::jsonb, 4),
('957264f2-13a5-53b7-ac57-59f142523421', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'Hawaiian', 'Ham, pineapple, mozzarella', 'hawaiian', 16.49, '[{"name":"Small (10\u201d)","price":16.49},{"name":"Medium (12\u201d)","price":20.49},{"name":"Large (14\u201d)","price":24.49},{"name":"X-Large (16\u201d)","price":28.49}]'::jsonb, 5),
('65acf4da-3c9c-55dc-9086-262b7ba66f81', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'BBQ Chicken', 'Grilled chicken, BBQ sauce, red onions, cilantro, mozzarella', 'bbq-chicken', 18.49, '[{"name":"Small (10\u201d)","price":18.49},{"name":"Medium (12\u201d)","price":22.49},{"name":"Large (14\u201d)","price":26.49},{"name":"X-Large (16\u201d)","price":30.49}]'::jsonb, 6),
('a7a12a0e-7890-511c-b18f-ca061744ceab', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'Buffalo Chicken', 'Fried chicken, buffalo sauce, ranch drizzle, mozzarella', 'buffalo-chicken', 18.99, '[{"name":"Small (10\u201d)","price":18.99},{"name":"Medium (12\u201d)","price":22.99},{"name":"Large (14\u201d)","price":26.99},{"name":"X-Large (16\u201d)","price":30.99}]'::jsonb, 7),
('a2af7a60-9bf2-5405-8500-08dccf86e273', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'Margherita', 'Fresh mozzarella, basil, tomato sauce, EVOO', 'margherita', 15.99, '[{"name":"Small (10\u201d)","price":15.99},{"name":"Medium (12\u201d)","price":19.99},{"name":"Large (14\u201d)","price":23.99},{"name":"X-Large (16\u201d)","price":27.99}]'::jsonb, 8),
('59aa2a7a-c695-5cbd-8abb-e468a063ceb5', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'Diavola', 'Spicy pepperoni, jalapeños, hot honey drizzle, mozzarella', 'diavola', 17.49, '[{"name":"Small (10\u201d)","price":17.49},{"name":"Medium (12\u201d)","price":21.49},{"name":"Large (14\u201d)","price":25.49},{"name":"X-Large (16\u201d)","price":29.49}]'::jsonb, 9),
('f7b9bb30-2d4b-5f48-b0ca-716c98ff7ad9', 'a1b2c3d4-0000-0000-0000-000000000001', 'dec1e00d-e80a-5f26-a33b-0bc55cfbd5e1', 'Build Your Own', 'Start with our signature crust and sauce, add your favourite toppings', 'build-your-own', 11.99, '[{"name":"Small (10\u201d)","price":11.99},{"name":"Medium (12\u201d)","price":14.99},{"name":"Large (14\u201d)","price":17.99},{"name":"X-Large (16\u201d)","price":20.99}]'::jsonb, 10),
('5b5c4a9f-602e-58bf-a915-1672ed5b20c5', 'a1b2c3d4-0000-0000-0000-000000000001', '3376a66d-372d-55f5-9f75-c4f27f8772ed', 'Garlic Bread', 'Toasted with garlic butter and herbs', 'garlic-bread', 4.99, '[{"name":"Regular","price":4.99},{"name":"With Cheese","price":6.99}]'::jsonb, 11),
('97759bcd-5258-5d06-80a2-f9caae3190bd', 'a1b2c3d4-0000-0000-0000-000000000001', '3376a66d-372d-55f5-9f75-c4f27f8772ed', 'Garlic Knots (6pc)', 'Fresh-baked garlic knots with marinara', 'garlic-knots', 5.99, '[]'::jsonb, 12),
('f7f96498-93d8-59f9-9b87-8f324fdb162b', 'a1b2c3d4-0000-0000-0000-000000000001', '3376a66d-372d-55f5-9f75-c4f27f8772ed', 'Cheese Sticks', 'Mozzarella sticks with marinara dipping sauce', 'cheese-sticks', 7.99, '[{"name":"6pc","price":7.99},{"name":"12pc","price":13.99}]'::jsonb, 13),
('83744141-5410-59af-9afd-71c1eef951f3', 'a1b2c3d4-0000-0000-0000-000000000001', '3376a66d-372d-55f5-9f75-c4f27f8772ed', 'Caesar Salad', 'Romaine, parmesan, croutons, house-made Caesar dressing', 'caesar-salad', 6.99, '[{"name":"Side","price":6.99},{"name":"Full","price":10.99}]'::jsonb, 14),
('b52a7af4-e376-517e-85be-69f8ecaa538b', 'a1b2c3d4-0000-0000-0000-000000000001', '3376a66d-372d-55f5-9f75-c4f27f8772ed', 'Fries', 'Crispy golden fries with sea salt', 'fries', 4.49, '[{"name":"Regular","price":4.49},{"name":"Large","price":6.49},{"name":"Poutine","price":8.49}]'::jsonb, 15),
('4401464a-ad5b-5c6a-9d83-a53a81830a2e', 'a1b2c3d4-0000-0000-0000-000000000001', '3c70fa23-d655-58f4-9cd8-cc7f94905149', 'Chicken Wings', 'Crispy wings tossed in your choice of sauce', 'chicken-wings', 12.99, '[{"name":"8pc","price":12.99},{"name":"16pc","price":22.99},{"name":"24pc","price":31.99}]'::jsonb, 16),
('4bdd494d-6767-5f96-96e6-a81a155a18fb', 'a1b2c3d4-0000-0000-0000-000000000001', '3c70fa23-d655-58f4-9cd8-cc7f94905149', 'Boneless Wings', 'Breaded boneless wings, choice of sauce', 'boneless-wings', 11.99, '[{"name":"8pc","price":11.99},{"name":"16pc","price":20.99},{"name":"24pc","price":28.99}]'::jsonb, 17),
('72874f82-d7f9-55c5-8e6a-c93e0f5569b6', 'a1b2c3d4-0000-0000-0000-000000000001', 'ae3c05f4-426f-5ffd-ae41-29de6627bf7b', 'Garden Salad', 'Mixed greens, tomatoes, cucumbers, red onion, vinaigrette', 'garden-salad', 7.99, '[{"name":"Side","price":7.99},{"name":"Full","price":11.99}]'::jsonb, 18),
('07b97805-9743-5f4d-b596-7f4d7dfa7877', 'a1b2c3d4-0000-0000-0000-000000000001', 'ae3c05f4-426f-5ffd-ae41-29de6627bf7b', 'Greek Salad', 'Romaine, feta, olives, tomatoes, red onion, Greek dressing', 'greek-salad', 8.99, '[{"name":"Side","price":8.99},{"name":"Full","price":12.99}]'::jsonb, 19),
('3c3d0292-45a9-54d3-9d72-9be620d5ab5d', 'a1b2c3d4-0000-0000-0000-000000000001', 'ffec1f6f-6b77-5b29-886a-0603d8f38aae', 'Pop', 'Coca-Cola, Diet Coke, Sprite, Ginger Ale', 'pop', 2.49, '[{"name":"Can","price":2.49},{"name":"Bottle","price":3.49}]'::jsonb, 20),
('a0cecab5-beca-53ae-a3da-9ececbaf7209', 'a1b2c3d4-0000-0000-0000-000000000001', 'ffec1f6f-6b77-5b29-886a-0603d8f38aae', 'Water', 'Spring water', 'water', 1.99, '[]'::jsonb, 21),
('f75601c8-2406-5759-b564-ab1a1ed5926e', 'a1b2c3d4-0000-0000-0000-000000000001', 'ffec1f6f-6b77-5b29-886a-0603d8f38aae', 'Juice', 'Orange or apple juice', 'juice', 3.49, '[]'::jsonb, 22),
('9cda2020-cf4b-5f2f-99a8-d6e1b1906bb9', 'a1b2c3d4-0000-0000-0000-000000000001', '2e1c7785-7df7-5493-a7b3-6f09d33e5bba', 'Cinnamon Sticks', 'Sweet cinnamon sugar sticks with cream cheese icing', 'cinnamon-sticks', 6.99, '[]'::jsonb, 23),
('19447c8e-6c55-583d-9a31-1939f09b31a1', 'a1b2c3d4-0000-0000-0000-000000000001', '2e1c7785-7df7-5493-a7b3-6f09d33e5bba', 'Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 'chocolate-lava-cake', 7.99, '[]'::jsonb, 24),
('bae4e0cd-22b3-5ca7-a358-4e8af1809a0b', 'a1b2c3d4-0000-0000-0000-000000000001', '2e1c7785-7df7-5493-a7b3-6f09d33e5bba', 'Cannoli (2pc)', 'Crispy shell, sweet ricotta filling, chocolate chips', 'cannoli', 5.99, '[]'::jsonb, 25),
('1032da32-7b06-566b-989a-e63a191d9d88', 'a1b2c3d4-0000-0000-0000-000000000001', '9e25cc9a-b01a-57ac-afd2-6191fcdde2d6', 'Extra Sauce', 'Additional pizza sauce', 'extra-sauce', 0.99, '[{"name":"Pizza Sauce","price":0.99},{"name":"BBQ","price":0.99},{"name":"Ranch","price":0.99},{"name":"Garlic Butter","price":0.99}]'::jsonb, 26),
('388fa09f-88f4-5f37-b575-cd1f9e7d2f15', 'a1b2c3d4-0000-0000-0000-000000000001', '9e25cc9a-b01a-57ac-afd2-6191fcdde2d6', 'Dipping Sauce', 'For wings and sticks', 'dipping-sauce', 0.99, '[{"name":"Ranch","price":0.99},{"name":"Blue Cheese","price":0.99},{"name":"Hot Sauce","price":0.99},{"name":"Honey Garlic","price":0.99}]'::jsonb, 27),
('cdf9d8c9-b116-5466-99f9-28b6a2f63a78', 'a1b2c3d4-0000-0000-0000-000000000001', '9e25cc9a-b01a-57ac-afd2-6191fcdde2d6', 'Extra Cheese', 'Additional mozzarella on your pizza', 'extra-cheese', 2.49, '[]'::jsonb, 28),
('1a30a4e1-041d-5071-a971-6491c5eb0434', 'a1b2c3d4-0000-0000-0000-000000000001', '09d6cb34-d987-5142-b881-34dd09704b0a', 'Family Combo', '2 Large pizzas + garlic bread + 2L pop', 'family-combo', 44.99, '[]'::jsonb, 29),
('03f1154b-31ae-5bf4-88d5-c937e98348f0', 'a1b2c3d4-0000-0000-0000-000000000001', '09d6cb34-d987-5142-b881-34dd09704b0a', 'Date Night Combo', '1 Medium pizza + salad + 2 drinks', 'date-night-combo', 29.99, '[]'::jsonb, 30),
('194aeeb6-469c-5925-bf47-40e62fd9c233', 'a1b2c3d4-0000-0000-0000-000000000001', '09d6cb34-d987-5142-b881-34dd09704b0a', 'Wing Night', '16 wings + large fries + 2L pop', 'wing-night', 34.99, '[]'::jsonb, 31);

-- ============================================
-- TOPPINGS
-- ============================================

INSERT INTO toppings (id, franchise_id, name, base_price, is_premium) VALUES
('6b93c756-08a3-5e8f-a429-c76d39b300e1', 'a1b2c3d4-0000-0000-0000-000000000001', 'Pepperoni', 1.5, false),
('955b157f-a977-5ddd-b2df-34f2fc3284ba', 'a1b2c3d4-0000-0000-0000-000000000001', 'Mushrooms', 1.5, false),
('7e80f4a2-2791-580b-af91-6b24a2739379', 'a1b2c3d4-0000-0000-0000-000000000001', 'Green Peppers', 1.5, false),
('0771aa6f-6095-5d5b-9947-f63445728e31', 'a1b2c3d4-0000-0000-0000-000000000001', 'Onions', 1.5, false),
('20adf705-96b7-51b2-8e43-4f1d2fc3730b', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sausage', 1.5, false),
('ac36f50d-4012-59c0-8493-d78f5b63edf2', 'a1b2c3d4-0000-0000-0000-000000000001', 'Ham', 1.5, false),
('0eced9bc-a0e5-5335-9671-193c07c31d70', 'a1b2c3d4-0000-0000-0000-000000000001', 'Bacon', 2.0, true),
('5e1c7364-f5f0-5ab4-96b7-76197b5d7f8d', 'a1b2c3d4-0000-0000-0000-000000000001', 'Black Olives', 1.5, false),
('c8c8acd8-b64e-5201-a48d-0d119df77693', 'a1b2c3d4-0000-0000-0000-000000000001', 'Pineapple', 1.5, false),
('4ebba7d0-e4d7-58dd-86a0-3b9bead3fd86', 'a1b2c3d4-0000-0000-0000-000000000001', 'Jalapeños', 1.5, false),
('727e329e-1150-5ffa-8e42-30e36dffbc77', 'a1b2c3d4-0000-0000-0000-000000000001', 'Spinach', 1.5, false),
('704be33e-1d3a-5027-a98f-dabfeb8e6baa', 'a1b2c3d4-0000-0000-0000-000000000001', 'Tomatoes', 1.5, false),
('5fa76479-0263-5cf5-a87c-86380d7b10d8', 'a1b2c3d4-0000-0000-0000-000000000001', 'Extra Cheese', 2.0, true),
('239899a1-4b8d-57f7-9813-6315cfdfc9ae', 'a1b2c3d4-0000-0000-0000-000000000001', 'Feta', 2.0, true),
('7b258564-4d3c-5884-ae16-c790ae8f7b04', 'a1b2c3d4-0000-0000-0000-000000000001', 'Ground Beef', 2.0, true),
('4644f799-bf3f-5e79-bcc1-c487feda7cdf', 'a1b2c3d4-0000-0000-0000-000000000001', 'Grilled Chicken', 2.5, true),
('7b6141c9-ff75-550c-8142-b0ddd7a66f7a', 'a1b2c3d4-0000-0000-0000-000000000001', 'Anchovies', 2.0, true),
('7754f151-c1b1-58d4-9fc0-ee0e47ee5a19', 'a1b2c3d4-0000-0000-0000-000000000001', 'Banana Peppers', 1.5, false),
('5d5c82a2-7bbd-51d0-9e8f-47f3dbb824fc', 'a1b2c3d4-0000-0000-0000-000000000001', 'Roasted Red Peppers', 1.75, false),
('20e5bbb3-e6a0-5e41-abd0-890145a8adac', 'a1b2c3d4-0000-0000-0000-000000000001', 'Fresh Basil', 1.75, false);

-- ============================================
-- PIZZA TOPPINGS (default recipes)
-- is_required=true means a core ingredient — if out of stock, the pizza is unavailable
-- is_required=false means default but optional — customer can remove it, pizza still available without it
-- ============================================

-- The Classic: Pepperoni, mozzarella, tomato sauce
-- (mozzarella & tomato sauce are implicit — not tracked as toppings)
INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES
('ea0c7b16-5d8c-5247-89de-3e2aa428b653', '6b93c756-08a3-5e8f-a429-c76d39b300e1', true, 1),  -- Pepperoni (required)
('ea0c7b16-5d8c-5247-89de-3e2aa428b653', '5fa76479-0263-5cf5-a87c-86380d7b10d8', false, 2);  -- Extra Cheese (optional default)

-- The Works: Pepperoni, mushrooms, green peppers, onions, sausage, olives
INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES
('f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', '6b93c756-08a3-5e8f-a429-c76d39b300e1', true, 1),  -- Pepperoni
('f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', '955b157f-a977-5ddd-b2df-34f2fc3284ba', true, 2),  -- Mushrooms
('f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', '7e80f4a2-2791-580b-af91-6b24a2739379', true, 3),  -- Green Peppers
('f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', '0771aa6f-6095-5d5b-9947-f63445728e31', false, 4),  -- Onions
('f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', '20adf705-96b7-51b2-8e43-4f1d2fc3730b', true, 5),  -- Sausage
('f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', '5e1c7364-f5f0-5ab4-96b7-76197b5d7f8d', false, 6);  -- Black Olives

-- Meat Lovers: Pepperoni, ham, bacon, sausage, ground beef
INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES
('ead1f569-1a16-5925-9263-f73bb2140efc', '6b93c756-08a3-5e8f-a429-c76d39b300e1', true, 1),  -- Pepperoni
('ead1f569-1a16-5925-9263-f73bb2140efc', 'ac36f50d-4012-59c0-8493-d78f5b63edf2', true, 2),  -- Ham
('ead1f569-1a16-5925-9263-f73bb2140efc', '0eced9bc-a0e5-5335-9671-193c07c31d70', true, 3),  -- Bacon
('ead1f569-1a16-5925-9263-f73bb2140efc', '20adf705-96b7-51b2-8e43-4f1d2fc3730b', true, 4),  -- Sausage
('ead1f569-1a16-5925-9263-f73bb2140efc', '7b258564-4d3c-5884-ae16-c790ae8f7b04', true, 5);  -- Ground Beef

-- Veggie Supreme: mushrooms, green peppers, onions, olives, tomatoes, spinach
INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES
('3b68a041-ae3e-5476-bd57-f84d206921dc', '955b157f-a977-5ddd-b2df-34f2fc3284ba', true, 1),  -- Mushrooms
('3b68a041-ae3e-5476-bd57-f84d206921dc', '7e80f4a2-2791-580b-af91-6b24a2739379', true, 2),  -- Green Peppers
('3b68a041-ae3e-5476-bd57-f84d206921dc', '0771aa6f-6095-5d5b-9947-f63445728e31', false, 3),  -- Onions
('3b68a041-ae3e-5476-bd57-f84d206921dc', '5e1c7364-f5f0-5ab4-96b7-76197b5d7f8d', true, 4),  -- Black Olives
('3b68a041-ae3e-5476-bd57-f84d206921dc', '704be33e-1d3a-5027-a98f-dabfeb8e6baa', true, 5),  -- Tomatoes
('3b68a041-ae3e-5476-bd57-f84d206921dc', '727e329e-1150-5ffa-8e42-30e36dffbc77', false, 6);  -- Spinach

-- Hawaiian: ham, pineapple
INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES
('957264f2-13a5-53b7-ac57-59f142523421', 'ac36f50d-4012-59c0-8493-d78f5b63edf2', true, 1),  -- Ham
('957264f2-13a5-53b7-ac57-59f142523421', 'c8c8acd8-b64e-5201-a48d-0d119df77693', true, 2);  -- Pineapple

-- BBQ Chicken: grilled chicken, red onions, cilantro
-- (BBQ sauce is in sizes JSON, not a topping)
INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES
('65acf4da-3c9c-55dc-9086-262b7ba66f81', '4644f799-bf3f-5e79-bcc1-c487feda7cdf', true, 1),  -- Grilled Chicken
('65acf4da-3c9c-55dc-9086-262b7ba66f81', '0771aa6f-6095-5d5b-9947-f63445728e31', false, 2);  -- Onions

-- Buffalo Chicken: fried chicken, buffalo sauce, ranch
-- (buffalo sauce & ranch drizzle are in sizes JSON)
INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES
('a7a12a0e-7890-511c-b18f-ca061744ceab', '4644f799-bf3f-5e79-bcc1-c487feda7cdf', true, 1);  -- Grilled Chicken

-- Margherita: fresh mozzarella, basil, EVOO
-- (fresh mozzarella & EVOO are implicit, not tracked)
INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES
('a2af7a60-9bf2-5405-8500-08dccf86e273', '20e5bbb3-e6a0-5e41-abd0-890145a8adac', true, 1);  -- Fresh Basil

-- Diavola: spicy pepperoni, jalapeños
-- (hot honey drizzle is in sizes JSON)
INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES
('59aa2a7a-c695-5cbd-8abb-e468a063ceb5', '6b93c756-08a3-5e8f-a429-c76d39b300e1', true, 1),  -- Pepperoni
('59aa2a7a-c695-5cbd-8abb-e468a063ceb5', '4ebba7d0-e4d7-58dd-86a0-3b9bead3fd86', true, 2);  -- Jalapeños

-- Build Your Own: no default toppings (customer adds them)
-- No menu_item_toppings rows for Build Your Own

-- ============================================
-- SPECIALS
-- ============================================

INSERT INTO specials (id, franchise_id, name, description, discount_type, discount_value, applies_to, day_of_week, start_time, end_time, start_date, end_date, is_active) VALUES
('7e4091b0-6e55-5d78-9688-3d944ea0532e', 'a1b2c3d4-0000-0000-0000-000000000001', 'Tuesday Night 2-for-1', 'Buy one large pizza, get a second large pizza free every Tuesday', 'buy_one_get_one', 0, 'order', ARRAY[2], '16:00', '22:00', NULL, NULL, true),
('fda096fc-db0b-51c7-86d2-f8eafdd5bd3c', 'a1b2c3d4-0000-0000-0000-000000000001', 'Lunch Combo Special', 'Any small pizza + drink for $12.99, Mon-Fri 11am-2pm', 'fixed', 12.99, 'order', ARRAY[1,2,3,4,5], '11:00', '14:00', NULL, NULL, true),
('086a4bb3-5886-5e8f-bcfd-26e76dc2f9ce', 'a1b2c3d4-0000-0000-0000-000000000001', 'Weekend Family Deal', '15% off Family Combo every Saturday and Sunday', 'percentage', 15.0, 'order', ARRAY[0,6], NULL, NULL, NULL, NULL, true),
('955f018d-ed90-5791-8662-96851b8a6c45', 'a1b2c3d4-0000-0000-0000-000000000001', 'Student Discount', '10% off with valid student ID', 'percentage', 10.0, 'order', NULL, NULL, NULL, NULL, NULL, true),
('aeec1c14-795f-5acc-a1ec-d6b2337edaf7', 'a1b2c3d4-0000-0000-0000-000000000001', 'Free Delivery over $30', 'Free delivery on orders over $30', 'fixed', 0, 'delivery', NULL, NULL, NULL, NULL, NULL, true),
('af8b7b09-8182-5a28-bb72-51a5aff16c39', 'a1b2c3d4-0000-0000-0000-000000000001', 'Wing Wednesday', '50 cents off each wing every Wednesday', 'fixed', 0.5, 'category', ARRAY[3], NULL, NULL, NULL, NULL, true);

-- Location-exclusive special: Downtown Ottawa has a late-night deal
INSERT INTO location_specials (id, location_id, special_id, is_excluded, name, description, discount_type, discount_value, applies_to, day_of_week, start_time, end_time, is_active) VALUES
('7978dd9a-00a3-5b35-bbfe-3dafcbfb1939', 'bf73f6dd-9e67-54d1-aa0c-9faa71d21069', NULL, false, 'ByWard Late Night', '20% off any pizza after 10pm, ByWard Market location only', 'percentage', 20.00, 'order', ARRAY[4,5,6], '22:00', '02:00', true);

-- Toronto downtown location opts out of the Tuesday special
INSERT INTO location_specials (id, location_id, special_id, is_excluded) VALUES ('3c783dc9-6d5d-5b84-8fca-9f3cf1642c45', 'f9b00c7d-1cdf-5b5f-8efa-5bad9ac3575b', '7e4091b0-6e55-5d78-9688-3d944ea0532e', true);

-- ============================================
-- LOCATION-SPECIFIC PRICE OVERRIDES
-- ============================================

-- Downtown Toronto charges $2 more on large pizzas
INSERT INTO location_menu_overrides (location_id, menu_item_id, price_override) VALUES
('f9b00c7d-1cdf-5b5f-8efa-5bad9ac3575b', 'ea0c7b16-5d8c-5247-89de-3e2aa428b653', 16.99),
('f9b00c7d-1cdf-5b5f-8efa-5bad9ac3575b', 'f4f9e87d-bc5c-57fe-bf50-b8c7b04274dc', 19.99),
('f9b00c7d-1cdf-5b5f-8efa-5bad9ac3575b', 'ead1f569-1a16-5925-9263-f73bb2140efc', 21.99);

-- ============================================
-- SAMPLE STOCK OUTAGES
-- ============================================

INSERT INTO location_stock (location_id, item_type, item_id, stock_status, notes) VALUES ('bf73f6dd-9e67-54d1-aa0c-9faa71d21069', 'topping', '7b6141c9-ff75-550c-8142-b0ddd7a66f7a', 'out_of_stock', 'Supplier delay — expect restock Thursday');
INSERT INTO location_stock (location_id, item_type, item_id, stock_status, notes) VALUES ('03b4b401-6ca9-5439-ae2b-48544a75c14f', 'menu_item', 'bae4e0cd-22b3-5ca7-a358-4e8af1809a0b', 'out_of_stock', 'Seasonal item — returning next month');
INSERT INTO location_stock (location_id, item_type, item_id, stock_status, quantity, notes) VALUES ('f9b00c7d-1cdf-5b5f-8efa-5bad9ac3575b', 'menu_item', '4401464a-ad5b-5c6a-9d83-a53a81830a2e', 'low_stock', 8, 'Only 8 wings left — recommend upselling boneless');
INSERT INTO location_stock (location_id, item_type, item_id, stock_status, notes, updated_by) VALUES ('cb50f35c-ac86-5466-ac82-9b5413286eb0', 'menu_item', '19447c8e-6c55-583d-9a31-1939f09b31a1', 'discontinued', 'Removed from this location per manager request', 'manager');
