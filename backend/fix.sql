SELECT setval('"Equipment_id_seq"', (SELECT MAX(id) FROM "Equipment"));
