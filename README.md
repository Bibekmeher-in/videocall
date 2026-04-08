# ConnectHub - Real-Time Communication Application

A production-ready real-time communication web application built with the MERN stack (MongoDB, Express.js, React.js, Node.js). ConnectHub combines features from WhatsApp, Discord, and Zoom to provide a comprehensive communication platform.

## Features

- **Real-Time Messaging** - Send text, images, videos, GIFs, and documents
- **Group Chats** - Create and manage group conversations
- **Audio/Video Calls** - Make peer-to-peer calls using WebRTC
- **Group Video Calls** - Video conference with multiple participants
- **Screen Sharing** - Share your screen during calls
- **Stories/Status** - Share temporary updates that expire after 24 hours
- **Online Status** - See who's online, offline, or away
- **Typing Indicators** - Know when someone is typing
- **Message Delivery & Read Status** - Track message status

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT Authentication
- Multer for file uploads

### Frontend
- React.js (Vite)
- TailwindCSS
- Socket.IO Client
- WebRTC (simple-peer)
- React Router
- Zustand for state management

## Project Structure

```
connecthub/
├── backend/
│   ├── controllers/      # API controllers
│   ├── models/          # MongoDB models
│   ├── routes/          # Express routes
│   ├── middleware/      # Auth & upload middleware
│   ├── sockets/         # Socket.IO handlers
│   ├── utils/           # Utility functions
│   ├── uploads/         # File uploads directory
│   ├── server.js        # Main server file
│   ├── .env             # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/       # Page components
│   │   ├── context/     # State management
│   │   ├── services/    # API services
│   │   ├── socket/      # Socket client
│   │   ├── App.jsx      # Main app component
│   │   └── main.jsx     # Entry point
│   ├── .env             # Frontend env
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Edit backend/.env file
PORT=5000
MONGODB_URI=mongodb://localhost:27017/connecthub
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

4. Start the backend server:
```bash
npm run dev
```

The server will run on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Edit frontend/.env file
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on http://localhost:5173

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `GET /api/auth/users` - Get all users
- `GET /api/auth/search` - Search users

### Messages
- `GET /api/messages/:contactId` - Get messages with contact
- `POST /api/messages` - Send message
- `PUT /api/messages/:messageId/read` - Mark as read
- `GET /api/messages/conversations` - Get all conversations

### Groups
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create group
- `GET /api/groups/:groupId` - Get group details
- `POST /api/groups/:groupId/members` - Add members

### Stories
- `GET /api/stories` - Get all stories
- `POST /api/stories` - Create story
- `POST /api/stories/:storyId/view` - View story

### Calls
- `POST /api/calls` - Initiate call
- `GET /api/calls/room/:roomId` - Get call by room
- `PUT /api/calls/:callId/end` - End call

### Upload
- `POST /api/upload/image` - Upload image
- `POST /api/upload/video` - Upload video
- `POST /api/upload/file` - Upload document
- `POST /api/upload/avatar` - Upload avatar

## Socket.IO Events

### Messaging
- `send_message` - Send message
- `receive_message` - Receive message
- `typing` / `stop_typing` - Typing indicators
- `message_read` - Read receipts

### Calls
- `call_user` - Initiate call
- `incoming_call` - Receive call
- `accept_call` / `reject_call` - Call responses
- `webrtc_signal` - WebRTC signaling

### Groups
- `join_group` / `leave_group` - Group management

## WebRTC Configuration

The application uses STUN servers for NAT traversal:
```javascript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}
```

## Deployment

### Backend (Render/Railway/AWS)
1. Set environment variables in deployment platform
2. Connect to MongoDB Atlas
3. Deploy and configure

### Frontend (Vercel/Netlify)
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder

### MongoDB Atlas
1. Create a free tier cluster
2. Get connection string
3. Update MONGODB_URI in backend/.env

## Security Features

- JWT Authentication
- Password hashing with bcrypt
- CORS protection
- Helmet for HTTP headers
- Input validation

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Author

Built with ❤️ By Bibek
