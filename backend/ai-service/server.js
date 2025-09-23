const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const recommendationsRouter = require('./routes/recommendations');
const vectorSearchRouter = require('./routes/vector-search');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'orion-template-ai-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/ai', recommendationsRouter);
app.use('/api/ai/search', vectorSearchRouter);

app.use((err, req, res, next) => {
  console.error('Unhandled AI service error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🧠 ORION template AI service running on port ${PORT}`);
});
