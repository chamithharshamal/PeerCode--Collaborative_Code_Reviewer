# PeerCode - Collaborative Code Review Simulator

An AI-powered collaborative code review platform that combines real-time collaboration with intelligent code analysis and debate simulation.

## Features

- Real-time collaborative code review
- AI-powered code analysis using Hugging Face CodeBERT
- Interactive debate simulation for code changes
- Multi-user session management
- WebSocket-based real-time communication

## Project Structure

```
├── frontend/          # Next.js frontend application
│   ├── src/
│   │   ├── app/       # Next.js app router
│   │   ├── types/     # TypeScript type definitions
│   │   └── lib/       # Utility libraries
├── backend/           # Node.js backend server
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── types/     # TypeScript type definitions
│   │   └── utils/
└── .kiro/            # Kiro spec files
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL (for production)
- Redis (for session management)

### Development Setup

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

### Environment Variables

#### Backend (.env)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `HUGGINGFACE_API_KEY` - Hugging Face API key

#### Frontend (.env.local)
- `NEXT_PUBLIC_SERVER_URL` - Backend server URL
- `NEXT_PUBLIC_APP_URL` - Frontend application URL

## Technology Stack

### Frontend
- Next.js 14+ with TypeScript
- React 18+
- Tailwind CSS
- Socket.io Client

### Backend
- Node.js with Express
- TypeScript
- Socket.io
- JWT Authentication
- PostgreSQL
- Redis

### AI Integration
- Hugging Face Transformers API
- CodeBERT for code analysis

## Development Commands

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## API Documentation

The backend provides RESTful APIs for:
- User authentication
- Session management
- Code snippet upload
- AI analysis requests

WebSocket events handle real-time collaboration features.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.