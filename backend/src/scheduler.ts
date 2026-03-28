import cron from 'node-cron';
import cronParser from 'cron-parser';
import { prisma } from './db';

// A mock email sender for now
async function sendReportEmail(emails: string[], reportName: string, data: any) {
  console.log(`[EMAIL MOCK] Sending ${reportName} to ${emails.join(', ')}`);
  console.log(`[EMAIL MOCK] Data preview:`, JSON.stringify(data).substring(0, 100), '...');
}

export const initScheduler = () => {
  // Run every minute to check if any reports need to be generated
  cron.schedule('* * * * *', async () => {
    try {
      const reports = await prisma.automatedReport.findMany();
      const now = new Date();

      for (const report of reports) {
        try {
          // @ts-ignore
          const interval = cronParser.parseExpression(report.schedule);
          const prev = interval.prev().toDate();
          
          // If the cron expression's previous tick is within the last minute, run it
          const diffMs = now.getTime() - prev.getTime();
          if (diffMs >= 0 && diffMs < 60000) {
            console.log(`Running automated report: ${report.name} (${report.type})`);
            
            // Execute the appropriate report logic
            let data = null;
            if (report.type === 'FLEET_SUMMARY') {
               data = await prisma.vehicle.findMany({
                 include: { positions: { take: 1, orderBy: { timestamp: 'desc' } } }
               });
            } else if (report.type === 'DRIVER_BEHAVIOUR') {
               data = await prisma.driverLog.findMany({
                 where: { timestamp: { gte: new Date(now.getTime() - 24*60*60*1000) } }
               });
            } else if (report.type === 'FUEL') {
               data = await prisma.fuelLog.findMany({
                 where: { timestamp: { gte: new Date(now.getTime() - 24*60*60*1000) } }
               });
            }
            
            const emails = report.emailList.split(',').map((e: string) => e.trim());
            await sendReportEmail(emails, report.name, data);
          }
        } catch (e) {
          console.error(`Error parsing schedule for report ${report.id}:`, e);
        }
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });

  console.log('Automated Reports Scheduler initialized');
};
