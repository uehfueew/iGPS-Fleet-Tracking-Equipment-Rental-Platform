"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.tsPool = exports.pgPool = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const redis_1 = require("redis");
exports.prisma = new client_1.PrismaClient();
exports.pgPool = new pg_1.Pool({
    host: 'localhost',
    port: 5432,
    user: 'igps',
    password: 'igps123',
    database: 'igps_db',
});
exports.tsPool = new pg_1.Pool({
    host: 'localhost',
    port: 5433,
    user: 'igps',
    password: 'igps123',
    database: 'igps_ts',
});
exports.redisClient = (0, redis_1.createClient)({
    url: 'redis://localhost:6379',
});
exports.redisClient.on('error', (err) => console.error('Redis error:', err));
exports.redisClient.connect();
