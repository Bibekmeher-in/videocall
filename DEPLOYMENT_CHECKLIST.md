# Deployment Checklist

## ✅ Pre-Deployment Checklist

### Local Setup
- [ ] Make sure both frontend and backend run locally without errors
- [ ] Test file uploads
- [ ] Test messaging functionality
- [ ] Test video/audio calls
- [ ] Test authentication and login
- [ ] All `.env` variables are set locally

### Code Cleanup
- [ ] Remove any console.log() debugging statements
- [ ] Check for any hardcoded URLs (should use environment variables)
- [ ] Ensure no localhost URLs in code
- [ ] All code is committed to git

### Environment Files
- [ ] `.env.example` exists and is up-to-date
- [ ] `.gitignore` includes `.env` file
- [ ] `.gitignore` includes `node_modules/` and `dist/`
- [ ] `.gitignore` includes `uploads/` directory

---

## 🚀 Deployment Checklist

### Step 1: GitHub Setup
- [ ] Create GitHub account
- [ ] Create new repository
- [ ] Copy repository URL
- [ ] Push local code to GitHub:
  ```bash
  git remote add origin <YOUR_REPO_URL>
  git push -u origin main
  ```

### Step 2: MongoDB Atlas
- [ ] Create MongoDB Atlas account
- [ ] Create a cluster
- [ ] Create database user and password
- [ ] Whitelist your IP (or 0.0.0.0 for development)
- [ ] Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/dbname`
- [ ] Test connection string locally

### Step 3: Backend Deployment (Render)
- [ ] Create Render account
- [ ] Connect GitHub to Render
- [ ] Create new Web Service
- [ ] Configure settings:
  - [ ] Repository: communication-app
  - [ ] Branch: main
  - [ ] Build command: `npm install`
  - [ ] Start command: `npm start`
- [ ] Add environment variables:
  - [ ] `MONGODB_URI`: [MongoDB connection string]
  - [ ] `JWT_SECRET`: [Random secure string]
  - [ ] `NODE_ENV`: `production`
  - [ ] `FRONTEND_URL`: [To be set in Step 4]
- [ ] Deploy and wait for completion (5-10 minutes)
- [ ] Copy backend URL (e.g., https://backend-app.onrender.com)
- [ ] Test health endpoint: `https://backend-app.onrender.com/api/health`

### Step 4: Frontend Deployment (Vercel)
- [ ] Create Vercel account
- [ ] Connect GitHub to Vercel
- [ ] Create new project:
  - [ ] Select communication-app repository
  - [ ] Root directory: `frontend`
  - [ ] Build command: `npm run build`
  - [ ] Install command: `npm install`
- [ ] Add environment variables:
  - [ ] `VITE_API_URL`: `https://backend-app.onrender.com/api`
  - [ ] `VITE_SOCKET_URL`: `https://backend-app.onrender.com`
- [ ] Deploy
- [ ] Copy frontend URL (e.g., https://frontend-app.vercel.app)

### Step 5: Backend Configuration Update
- [ ] Go to Render dashboard
- [ ] Select backend service
- [ ] Edit environment variables
- [ ] Update `FRONTEND_URL`: [Your Vercel URL]
- [ ] Redeploy backend

### Step 6: Verification
- [ ] Open frontend URL in browser
- [ ] Test signup/login
- [ ] Test sending a message
- [ ] Test file upload
- [ ] Test audio call
- [ ] Test video call
- [ ] Check browser console for errors
- [ ] Check Render logs for errors
- [ ] Check Vercel build logs for warnings

---

## 🔄 Continuous Deployment

After initial deployment, every push to `main` branch will:
- [ ] Trigger Vercel build for frontend (auto-deploy on success)
- [ ] Trigger Render build for backend (auto-deploy on success)
- [ ] Both services should update automatically

---

## 📝 Important Notes

### File Uploads
- Render's filesystem is ephemeral (files deleted on reboot)
- For production, use cloud storage:
  - [ ] Configure Cloudinary for images
  - [ ] Configure AWS S3 for documents
  - Update `uploadMiddleware.js` to use cloud storage

### Database Backups
- [ ] Enable MongoDB Atlas backup/restore
- [ ] Keep credentials secure
- [ ] Regularly monitor database usage

### Monitoring
- [ ] Set up Render alerts for errors
- [ ] Check Vercel analytics for performance
- [ ] Monitor MongoDB Atlas for queries

### Custom Domain (Optional)
- [ ] Purchase domain (GoDaddy, Namecheap, etc.)
- [ ] Configure DNS for Vercel frontend
- [ ] Configure DNS for Render backend

---

## 🆘 Troubleshooting

### CORS Errors
**Problem**: Messages like "Access to XMLHttpRequest blocked by CORS policy"
**Solution**: 
- Verify `FRONTEND_URL` in backend matches your Vercel URL
- Redeploy backend after updating environment variable

### Connection Refused
**Problem**: Cannot connect to backend API
**Solution**:
- Wait 2-3 minutes for Render service to fully boot
- Check `VITE_API_URL` in frontend environment variables
- Verify Render service status in dashboard
- Test `https://backend-url.onrender.com/api/health`

### WebGL Context Lost
**Problem**: 3D background glitches
**Solution**: Already handled in code, should fallback to gradient background

### Video Call Not Working
**Problem**: Can't establish video connection
**Solution**:
- Check both browser permissions (camera/mic)
- Verify CORS settings
- Check browser console for WebRTC errors
- Ensure STUN servers are accessible

### Files Not Persisting
**Problem**: Uploaded files disappear after container restart
**Solution**: 
- Use cloud storage (Cloudinary or S3)
- Never rely on local filesystem on Render

---

## 📞 Support Resources

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- Node.js Docs: https://nodejs.org/docs
- React Docs: https://react.dev
