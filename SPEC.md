# ConnectHub - Real-Time Communication Application

## Project Overview

**Project Name:** ConnectHub
**Type:** Full-Stack Real-Time Communication Web Application
**Core Functionality:** A WhatsApp + Discord + Zoom hybrid for real-time messaging, audio/video calls, group chats, and stories
**Target Users:** Individuals and teams needing unified communication platform

---

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Real-Time:** Socket.IO
- **Authentication:** JWT with bcrypt
- **File Upload:** Multer + Cloudinary
- **Security:** Helmet, CORS, Rate Limiting

### Frontend
- **Framework:** React.js (Vite)
- **Styling:** TailwindCSS
- **State:** Context API
- **Routing:** React Router DOM v6
- **HTTP:** Axios
- **Real-Time:** Socket.IO Client
- **WebRTC:** Simple-Peer
- **File Upload:** React Dropzone

---

## UI/UX Specification

### Color Palette
- **Primary:** `#6366f1` (Indigo-500)
- **Primary Dark:** `#4f46e5` (Indigo-600)
- **Secondary:** `#10b981` (Emerald-500)
- **Background Light:** `#f8fafc` (Slate-50)
- **Background Dark:** `#0f172a` (Slate-900)
- **Surface Light:** `#ffffff`
- **Surface Dark:** `#1e293b` (Slate-800)
- **Text Primary Light:** `#1e293b` (Slate-800)
- **Text Primary Dark:** `#f1f5f9` (Slate-100)
- **Text Secondary:** `#64748b` (Slate-500)
- **Online:** `#22c55e` (Green-500)
- **Offline:** `#94a3b8` (Slate-400)
- **Error:** `#ef4444` (Red-500)
- **Warning:** `#f59e0b` (Amber-500)

### Typography
- **Font Family:** 'Inter', system-ui, sans-serif
- **Headings:** 
  - H1: 32px, font-weight 700
  - H2: 24px, font-weight 600
  - H3: 20px, font-weight 600
- **Body:** 16px, font-weight 400
- **Small:** 14px, font-weight 400
- **Caption:** 12px, font-weight 400

### Spacing System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  name: String (required, 2-50 chars),
  email: String (required, unique, valid email),
  password: String (required, hashed, min 6 chars),
  avatar: String (URL, default placeholder),
  bio: String (max 150 chars),
  status: String (enum: 'online', 'offline', 'away'),
  lastSeen: Date,
  contacts: [ObjectId], // User IDs
  createdAt: Date,
  updatedAt: Date
}
```

### Message Collection
```javascript
{
  _id: ObjectId,
  senderId: ObjectId (ref: User),
  receiverId: ObjectId (ref: User, optional),
  groupId: ObjectId (ref: Group, optional),
  messageType: String (enum: 'text', 'image', 'video', 'gif', 'document', 'audio'),
  content: String (text content),
  fileUrl: String (file URL if media),
  fileName: String (original file name),
  fileSize: Number,
  thumbnail: String (for videos),
  replyTo: ObjectId (ref: Message, optional),
  reactions: [{ userId: ObjectId, emoji: String }],
  seen: Boolean (default: false),
  delivered: Boolean (default: false),
  timestamp: Date (default: now),
  createdAt: Date,
  updatedAt: Date
}
```

### Group Collection
```javascript
{
  _id: ObjectId,
  groupName: String (required, 2-100 chars),
  groupAvatar: String (URL),
  description: String,
  admin: ObjectId (ref: User),
  members: [{ userId: ObjectId, role: String, joinedAt: Date }],
  lastMessage: ObjectId (ref: Message),
  isArchived: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### Story Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  mediaUrl: String (required),
  mediaType: String (enum: 'image', 'video'),
  thumbnail: String,
  duration: Number (seconds, for videos),
  viewers: [ObjectId],
  viewCount: Number,
  expiresAt: Date (24 hours from creation),
  isActive: Boolean (default: true),
  createdAt: Date
}
```

### Call Collection
```javascript
{
  _id: ObjectId,
  callerId: ObjectId (ref: User),
  calleeId: ObjectId (ref: User, optional),
  groupId: ObjectId (ref: Group, optional),
  callType: String (enum: 'audio', 'video'),
  callStatus: String (enum: 'initiated', 'ringing', 'accepted', 'rejected', 'ended', 'missed'),
  participants: [{ userId: ObjectId, joinedAt: Date }],
  startTime: Date,
  endTime: Date,
  duration: Number (seconds),
  createdAt: Date
}
```

---

## API Endpoints

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|--------------|------|
| POST | /register | Register new user | No |
| POST | /login | Login user | No |
| GET | /profile | Get current user | Yes |
| PUT | /profile | Update profile | Yes |
| PUT | /password | Change password | Yes |
| GET | /users | Get all users | Yes |
| GET | /users/:id | Get user by ID | Yes |
| GET | /search | Search users | Yes |

### Message Routes (`/api/messages`)
| Method | Endpoint | Description | Auth |
|--------|----------|--------------|------|
| GET | /:contactId | Get messages with contact | Yes |
| POST | /send | Send message | Yes |
| PUT | /:messageId/read | Mark as read | Yes |
| DELETE | /:messageId | Delete message | Yes |

### Group Routes (`/api/groups`)
| Method | Endpoint | Description | Auth |
|--------|----------|--------------|------|
| GET | / | Get user's groups | Yes |
| POST | /create | Create new group | Yes |
| GET | /:groupId | Get group details | Yes |
| PUT | /:groupId | Update group | Yes |
| DELETE | /:groupId | Delete group | Yes |
| POST | /:groupId/members | Add members | Yes |
| DELETE | /:groupId/members/:userId | Remove member | Yes |
| PUT | /:groupId/admin/:userId | Make admin | Yes |

### Story Routes (`/api/stories`)
| Method | Endpoint | Description | Auth |
|--------|----------|--------------|------|
| GET | / | Get all active stories | Yes |
| POST | /create | Create story | Yes |
| GET | /:userId | Get user's stories | Yes |
| DELETE | /:storyId | Delete story | Yes |
| POST | /:storyId/view | Mark as viewed | Yes |

### Call Routes (`/api/calls`)
| Method | Endpoint | Description | Auth |
|--------|----------|--------------|------|
| GET | /history | Get call history | Yes |
| POST | /initiate | Initiate call | Yes |
| PUT | /:callId/end | End call | Yes |

### Upload Routes (`/api/upload`)
| Method | Endpoint | Description | Auth |
|--------|----------|--------------|------|
| POST | /image | Upload image | Yes |
| POST | /video | Upload video | Yes |
| POST | /file | Upload document | Yes |
| POST | /avatar | Upload avatar | Yes |

---

## Socket.IO Events

### Connection Events
| Event | Description |
|-------|-------------|
| `connection` | User connects |
| `disconnect` | User disconnects |
| `user_online` | Broadcast user online status |

### Messaging Events
| Event | Payload | Description |
|--------|---------|-------------|
| `send_message` | { message } | Send new message |
| `receive_message` | { message } | Receive new message |
| `message_read` | { messageId, readerId } | Message read receipt |
| `typing` | { senderId, receiverId, isGroup, groupId } | Typing indicator |
| `stop_typing` | { senderId, receiverId, isGroup, groupId } | Stop typing |
| `message_delivered` | { messageId } | Message delivered |

### Group Events
| Event | Description |
|--------|-------------|
| `create_group` | Create new group |
| `join_group` | Join group room |
| `leave_group` | Leave group room |
| `group_message` | Group message |

### Call Events
| Event | Payload | Description |
|--------|---------|-------------|
| `call_user` | { callerId, calleeId, callType } | Initiate call |
| `call_group` | { callerId, groupId, callType } | Group call |
| `incoming_call` | { call, caller } | Incoming call |
| `accept_call` | { callId } | Accept call |
| `reject_call` | { callId } | Reject call |
| `end_call` | { callId } | End call |
| `call_ended` | { callId } | Call ended |
| `webrtc_signal` | { from, to, signal } | WebRTC signaling |
| `call_timeout` | Call timeout |

### Story Events
| Event | Description |
|--------|-------------|
| `story_uploaded` | New story posted |
| `story_viewed` | Story viewed |

---

## WebRTC Configuration

### ICE Servers
```javascript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}
```

### Call Features
- Peer-to-peer audio/video
- Screen sharing capability
- Mute/unmute audio
- Enable/disable video
- Picture-in-picture
- Call duration timer
- Connection quality indicator

---

## Pages & Routes

### Frontend Routes
| Route | Component | Auth |
|-------|-----------|------|
| / | Redirect to /login or /home | - |
| /login | LoginPage | No |
| /register | RegisterPage | No |
| /home | HomePage | Yes |
| /chat/:contactId | ChatPage | Yes |
| /group/:groupId | GroupChatPage | Yes |
| /call/:callId | CallPage | Yes |
| /stories | StoriesPage | Yes |
| /profile | ProfilePage | Yes |
| /settings | SettingsPage | Yes |

---

## Component Structure

### Layout Components
- `MainLayout` - Main app layout with sidebar
- `Navbar` - Top navigation bar
- `Sidebar` - Left sidebar with contacts/groups

### Chat Components
- `ChatWindow` - Main chat area
- `MessageBubble` - Individual message
- `MessageInput` - Message input with file upload
- `ContactList` - List of contacts
- `GroupList` - List of groups
- `ConversationItem` - Single conversation item

### Call Components
- `CallPopup` - Incoming call notification
- `CallInterface` - Active call UI
- `VideoGrid` - Grid of video feeds
- `ControlPanel` - Call controls

### Story Components
- `StoryViewer` - Story display
- `StoryCircle` - User story circle
- `StoryUpload` - Upload new story

### Auth Components
- `LoginForm` - Login form
- `RegisterForm` - Registration form

### Common Components
- `Avatar` - User avatar
- `Button` - Custom button
- `Input` - Custom input
- `Modal` - Modal dialog
- `Spinner` - Loading spinner
- `Toast` - Notification toast

---

## Acceptance Criteria

### Authentication
- [ ] Users can register with name, email, password
- [ ] Users can login with email/password
- [ ] JWT tokens are stored securely
- [ ] Protected routes redirect to login
- [ ] Password is hashed with bcrypt

### Messaging
- [ ] Real-time message delivery
- [ ] Text, image, video, document support
- [ ] Message read receipts
- [ ] Typing indicator
- [ ] Message timestamps
- [ ] Message delivery status

### Groups
- [ ] Create groups with name/avatar
- [ ] Add/remove members
- [ ] Group admin controls
- [ ] Group messaging
- [ ] Group info display

### Calls
- [ ] Audio calls work
- [ ] Video calls work
- [ ] Group video calls work
- [ ] Screen sharing works
- [ ] Mute/unmute audio
- [ ] Enable/disable video
- [ ] Call notifications

### Stories
- [ ] Upload image/video stories
- [ ] Stories expire after 24 hours
- [ ] View all stories
- [ ] View count tracking

### UI/UX
- [ ] Responsive design
- [ ] Dark/light mode
- [ ] Loading states
- [ ] Error handling
- [ ] Modern, clean interface

---

## File Structure

```
connecthub/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── messageController.js
│   │   ├── groupController.js
│   │   ├── storyController.js
│   │   ├── callController.js
│   │   └── uploadController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Message.js
│   │   ├── Group.js
│   │   ├── Story.js
│   │   └── Call.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── groupRoutes.js
│   │   ├── storyRoutes.js
│   │   ├── callRoutes.js
│   │   └── uploadRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── sockets/
│   │   ├── index.js
│   │   ├── messageHandler.js
│   │   ├── callHandler.js
│   │   └── presenceHandler.js
│   ├── utils/
│   │   ├── cloudinary.js
│   │   └── helpers.js
│   ├── uploads/
│   ├── server.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── socket/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── README.md
└── SPEC.md
```
