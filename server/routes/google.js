const express = require('express');
const { google } = require('googleapis');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/google/auth
// @desc    Initiate Google OAuth flow
// @access  Private
router.get('/auth', auth, async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/google/callback
// @desc    Handle Google OAuth callback
// @access  Public
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    // Get user info from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Update user with Google credentials
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    user.googleToken = tokens.access_token;
    user.googleRefreshToken = tokens.refresh_token;
    user.googleEmail = userInfo.email;
    await user.save();

    res.redirect(`${process.env.FRONTEND_URL}/settings?google=success`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?google=error`);
  }
});

// @route   GET /api/google/calendar-events
// @desc    Get user's Google Calendar events
// @access  Private
router.get('/calendar-events', auth, async (req, res) => {
  try {
    if (!req.user.googleToken) {
      return res.status(400).json({ error: 'Google integration not connected' });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: req.user.googleToken,
      refresh_token: req.user.googleRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const { data: events } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });

    res.json({ events: events.items });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/google/create-doc
// @desc    Create a new Google Doc
// @access  Private
router.post('/create-doc', auth, async (req, res) => {
  try {
    if (!req.user.googleToken) {
      return res.status(400).json({ error: 'Google integration not connected' });
    }

    const { title, content } = req.body;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: req.user.googleToken,
      refresh_token: req.user.googleRefreshToken
    });

    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Create document
    const document = await docs.documents.create({
      requestBody: {
        title: title || 'Untitled Document'
      }
    });

    // Add content if provided
    if (content) {
      await docs.documents.batchUpdate({
        documentId: document.data.documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: {
                  index: 1
                },
                text: content
              }
            }
          ]
        }
      });
    }

    // Get document URL
    const docUrl = `https://docs.google.com/document/d/${document.data.documentId}/edit`;

    res.json({
      documentId: document.data.documentId,
      title: document.data.title,
      url: docUrl
    });
  } catch (error) {
    console.error('Create Google Doc error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/google/docs
// @desc    Get user's Google Docs
// @access  Private
router.get('/docs', auth, async (req, res) => {
  try {
    if (!req.user.googleToken) {
      return res.status(400).json({ error: 'Google integration not connected' });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: req.user.googleToken,
      refresh_token: req.user.googleRefreshToken
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const { data: files } = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.document'",
      fields: 'files(id,name,createdTime,modifiedTime,webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 20
    });

    res.json({ documents: files.files });
  } catch (error) {
    console.error('Get Google Docs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/google/disconnect
// @desc    Disconnect Google integration
// @access  Private
router.delete('/disconnect', auth, async (req, res) => {
  try {
    req.user.googleToken = null;
    req.user.googleRefreshToken = null;
    req.user.googleEmail = null;
    await req.user.save();

    res.json({ message: 'Google integration disconnected' });
  } catch (error) {
    console.error('Disconnect Google error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/google/status
// @desc    Get Google integration status
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const status = {
      connected: !!req.user.googleToken,
      email: req.user.googleEmail
    };

    res.json(status);
  } catch (error) {
    console.error('Get Google status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;