# Communication App - Deployment Guide

## Prerequisites
- GitHub account
- MongoDB Atlas account (for database)
- Vercel account (for frontend)
- Render account (for backend)

## Setup Instructions

### 1. GitHub Setup
```bash
# Initialize git repository locally
git init
git add .
git commit -m "Initial commit"

# Create a new repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/communication-app.git
git branch -M main
git push -u origin main
```

### 2. Environment Variables

#### Backend (.env)
Copy `.env.example` to `.env` and update with:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: A secure random string
- `FRONTEND_URL`: Your Vercel deployment URL

#### Frontend (.env)
```
VITE_API_URL=https://your-render-backend.onrender.com/api
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

### 3. Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Fill in the details:
   - **Name**: `communication-app-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables:
   - Click **Add Environment Variable**
   - Add all variables from `.env.example`
6. Click **Create Web Service**
7. Copy your Render URL (e.g., `https://communication-app-backend.onrender.com`)

### 4. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Select `frontend` as the root directory
5. Add environment variables:
   - `VITE_API_URL`: `https://your-render-backend.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://your-render-backend.onrender.com`
6. Click **Deploy**
7. Copy your Vercel URL

### 5. Update Backend CORS

After deploying frontend, update backend `.env`:
```
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Then redeploy on Render.

## Important Notes

- Keep `.env` files secure and **never commit** them (covered by `.gitignore`)
- Use `.env.example` as reference for required variables
- Ensure MongoDB Atlas IP whitelist includes Render and Vercel IPs
- Video call requires both backend and frontend URLs to match CORS settings

## File Uploads

For production, consider using:
- **Cloudinary** for image/video storage
- **AWS S3** for file storage
- Update `uploadMiddleware.js` if switching providers

## Monitoring

- **Vercel**: Dashboard shows build logs and runtime errors
- **Render**: Dashboard shows deployment logs and service status
