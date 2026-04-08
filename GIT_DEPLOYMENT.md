# Git & Deployment Quick Start

## 1️⃣ Initialize Git Repository Locally

```bash
cd d:\communication
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## 2️⃣ Create `.gitignore` files
✅ Already created - no changes needed

## 3️⃣ Stage and commit files

```bash
git add .
git commit -m "Initial commit: Communication app with messaging and calls"
```

## 4️⃣ Create Remote Repository on GitHub

1. Go to [github.com](https://github.com/new)
2. Create new repository: `communication-app`
3. Do NOT initialize with README, .gitignore, or license (we have our own)
4. Copy the repository URL

## 5️⃣ Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/communication-app.git
git branch -M main
git push -u origin main
```

## 6️⃣ Environment Variables Setup

### MongoDB Atlas Setup
1. Go to [mongodb.com/cloud](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string from "Connect" button
4. Format: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`

### JWT Secret Generation
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 7️⃣ Deploy Backend (Render)

1. **Create Render Account**: [render.com](https://render.com)
2. **Connect GitHub**: Link your GitHub in Render settings
3. **Create New Web Service**:
   - Select your repository
   - Set build command: `npm install`
   - Set start command: `npm start`
4. **Add Environment Variables**:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Generated secret
   - `FRONTEND_URL`: (update after Vercel deployment)
   - `NODE_ENV`: `production`
5. **Deploy**: Click "Create Web Service"
6. **Get URL**: Copy your service URL (e.g., `https://communication-app.onrender.com`)

## 8️⃣ Deploy Frontend (Vercel)

1. **Create Vercel Account**: [vercel.com](https://vercel.com)
2. **Import GitHub Repository**:
   - Click "Add New" → "Project"
   - Select your GitHub account
   - Import `communication-app` repository
3. **Configure Project**:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Add Environment Variables:
     - `VITE_API_URL`: `https://your-render-app.onrender.com/api`
     - `VITE_SOCKET_URL`: `https://your-render-app.onrender.com`
4. **Deploy**: Click "Deploy"
5. **Get URL**: Copy your Vercel deployment URL

## 9️⃣ Final Steps

1. **Update Backend CORS**:
   - Go to Render dashboard
   - Edit your backend service
   - Update `FRONTEND_URL` environment variable with your Vercel URL
   - Redeploy

2. **Test Deployment**:
   - Visit your Vercel URL
   - Try signing up
   - Test messaging
   - Test video/audio calls

## 🔄 Subsequent Deployments

After making changes locally:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

- **Vercel**: Auto-deploys on push to main
- **Render**: Auto-deploys on push to main

## 📝 Environment Variables Quick Reference

### Backend (.env on Render)
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_generated_secret
JWT_EXPIRE=7d
FRONTEND_URL=https://your-vercel-app.vercel.app
CLOUDINARY_CLOUD_NAME=optional
CLOUDINARY_API_KEY=optional
CLOUDINARY_API_SECRET=optional
MAX_FILE_SIZE=52428800
UPLOAD_PATH=./uploads
```

### Frontend (.env in frontend folder on Vercel)
```
VITE_API_URL=https://your-render-app.onrender.com/api
VITE_SOCKET_URL=https://your-render-app.onrender.com
```

## 🐛 Troubleshooting

### Issue: CORS errors
- Ensure `FRONTEND_URL` in backend matches your Vercel URL
- Redeploy backend after updating

### Issue: Connection refused
- Wait 2-3 minutes for Render to fully boot
- Check backend logs in Render dashboard

### Issue: Uploads not working
- On Render, uploads to `/uploads` directory will be lost on redeploy
- Use Cloudinary or S3 for persistent storage

### Issue: Video call not connecting
- Ensure both backend and frontend URLs are correct
- Check browser console for errors
- Test health endpoint: `https://your-render-app.onrender.com/api/health`
