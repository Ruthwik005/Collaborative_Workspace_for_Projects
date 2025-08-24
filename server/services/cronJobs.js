import cron from 'node-cron';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';

export const initCronJobs = (io) => {
  // Every Friday at 17:00
  cron.schedule('0 17 * * 5', async () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const tasks = await Task.find({ status: 'Done', updatedAt: { $gte: lastWeek } });

    const doc = new PDFDocument();
    const filePath = `./uploads/report-${Date.now()}.pdf`;
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text('Weekly Report', { align: 'center' });
    doc.moveDown();

    tasks.forEach((task) => {
      doc.fontSize(14).text(`- ${task.title} (Assignee: ${task.assignee})`);
    });

    doc.end();

    // Save notification
    const notification = await Notification.create({ message: 'Weekly Report is ready for download', link: filePath });

    io.emit('notification', notification);
  });
};