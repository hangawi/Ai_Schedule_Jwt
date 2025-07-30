const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path'); // path 모듈 추가
const config = require('config'); // config 모듈 추가

// 환경 변수 로드 (가장 먼저 실행)
require('dotenv').config();

const app = express();

// MONGO_URI 값 확인을 위한 console.log 추가
console.log('MONGO_URI from index.js:', process.env.MONGO_URI); // 추가

// 데이터베이스 연결
connectDB();

// CORS 설정 개선
const allowedOrigins = process.env.corsOrigin
  ? process.env.corsOrigin.trim().replace(/^"|"$/g, '').split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // 모바일 앱, Postman 등 origin이 없는 요청 허용
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-auth-token',
    'X-Requested-With'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));

// 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  console.log('Request headers:', {
    'content-type': req.headers['content-type'],
    'x-auth-token': req.headers['x-auth-token'] ? 'exists' : 'missing',
    'authorization': req.headers['authorization'] ? 'exists' : 'missing'
  });
  next();
});

// 라우트 정의
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/users', require('./routes/users'));
app.use('/api/external', require('./routes/external'));
app.use('/api/calendar', require('./routes/calendar')); // Google Calendar 라우트 추가

// Serve static assets in production (aisch의 로직 추가)
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'client', 'build', 'index.html'));
  });
}


// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'MeetAgent API Server is running!' });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// 404 핸들러
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('🚀==================================🚀');
  console.log(`🚀 MeetAgent Server running on port ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 JWT Secret configured: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
  console.log('🚀==================================🚀');
});