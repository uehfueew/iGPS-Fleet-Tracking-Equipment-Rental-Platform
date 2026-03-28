"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const cron_parser_1 = __importDefault(require("cron-parser"));
const db_1 = require("./db");
// A mock email sender for now
async function sendReportEmail(emails, reportName, data) {
    console.log(`[EMAIL MOCK] Sending ${reportName} to ${emails.join(', ')}`);
    console.log(`[EMAIL MOCK] Data preview:`, JSON.stringify(data).substring(0, 100), '...');
}
const initScheduler = () => {
    // Run every minute to check if any reports need to be generated
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            const reports = await db_1.prisma.automatedReport.findMany();
            const now = new Date();
            for (const report of reports) {
                try {
                    // @ts-ignore
                    const interval = cron_parser_1.default.parseExpression(report.schedule);
                    const prev = interval.prev().toDate();
                    // If the cron expression's previous tick is within the last minute, run it
                    const diffMs = now.getTime() - prev.getTime();
                    if (diffMs >= 0 && diffMs < 60000) {
                        console.log(`Running automated report: ${report.name} (${report.type})`);
                        // Execute the appropriate report logic
                        let data = null;
                        if (report.type === 'FLEET_SUMMARY') {
                            data = await db_1.prisma.vehicle.findMany({
                                include: { positions: { take: 1, orderBy: { timestamp: 'desc' } } }
                            });
                        }
                        else if (report.type === 'DRIVER_BEHAVIOUR') {
                            data = await db_1.prisma.driverLog.findMany({
                                where: { timestamp: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
                            });
                        }
                        else if (report.type === 'FUEL') {
                            data = await db_1.prisma.fuelLog.findMany({
                                where: { timestamp: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
                            });
                        }
                        const emails = report.emailList.split(',').map((e) => e.trim());
                        await sendReportEmail(emails, report.name, data);
                    }
                }
                catch (e) {
                    console.error(`Error parsing schedule for report ${report.id}:`, e);
                }
            }
        }
        catch (err) {
            console.error('Scheduler error:', err);
        }
    });
    console.log('Automated Reports Scheduler initialized');
};
exports.initScheduler = initScheduler;
