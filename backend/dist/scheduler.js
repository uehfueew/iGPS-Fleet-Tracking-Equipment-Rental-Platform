"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const cron_parser_1 = __importDefault(require("cron-parser"));
const db_1 = require("./db");
const nodemailer_1 = __importDefault(require("nodemailer"));
let transporter = null;
async function initMailer() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log('[MAILER] Connected to Custom SMTP server.');
    }
    else {
        // Fallback: Create ethereal testing account
        console.log('[MAILER] No SMTP config found. Generating an Ethereal test email account for development...');
        const testAccount = await nodemailer_1.default.createTestAccount();
        transporter = nodemailer_1.default.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log('[MAILER] Ethereal account ready. Check terminal for email URLs.');
    }
}
initMailer();
// A generic email sender
async function sendReportEmail(emails, reportName, data) {
    if (!transporter)
        return;
    const htm = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto;">
      <h2 style="color: #10B981;">iGPS Platform - ${reportName}</h2>
      <p>Your automated report is ready.</p>
      <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <pre style="font-size: 11px; white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  `;
    try {
        const info = await transporter.sendMail({
            from: '"iGPS System" <reports@igps-platform.local>',
            to: emails.join(', '),
            subject: `Automated Report: ${reportName}`,
            text: `Your automated report is ready. \n\nData: ${JSON.stringify(data)}`,
            html: htm,
        });
        console.log(`[EMAIL] Sent report '${reportName}' to ${emails.join(', ')} (Message ID: ${info.messageId})`);
        if (info.messageId && nodemailer_1.default.getTestMessageUrl(info)) {
            console.log(`[EMAIL PREVIEW] View the email here: ${nodemailer_1.default.getTestMessageUrl(info)}`);
        }
    }
    catch (err) {
        console.error('[EMAIL ERROR] Failed to send report: ', err);
    }
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
