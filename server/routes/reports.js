const express = require('express');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { generateWeeklyReport } = require('../utils/cronJobs');

const router = express.Router();

// @route   POST /api/reports/generate
// @desc    Manually generate a weekly report
// @access  Private
router.post('/generate', auth, async (req, res) => {
  try {
    const { filepath, filename } = await generateWeeklyReport();
    
    res.json({
      message: 'Weekly report generated successfully',
      filename,
      downloadUrl: `/api/reports/download/${filename}`
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/reports/download/:filename
// @desc    Download a generated report
// @access  Private
router.get('/download/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../uploads/reports', filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/reports/list
// @desc    List available reports
// @access  Private
router.get('/list', auth, async (req, res) => {
  try {
    const reportsDir = path.join(__dirname, '../uploads/reports');
    
    if (!fs.existsSync(reportsDir)) {
      return res.json({ reports: [] });
    }

    const files = fs.readdirSync(reportsDir);
    const reports = files
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filepath = path.join(reportsDir, file);
        const stats = fs.statSync(filepath);
        
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          downloadUrl: `/api/reports/download/${file}`
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({ reports });
  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/reports/:filename
// @desc    Delete a report
// @access  Private
router.delete('/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../uploads/reports', filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Delete the file
    fs.unlinkSync(filepath);
    
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;