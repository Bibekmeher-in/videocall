# Quick Reference - Deployment URLs Template

## After Deployment - Update Your Notes

### GitHub Repository
```
GitHub URL: https://github.com/YOUR_USERNAME/communication-app
```

### MongoDB Atlas
```
MongoDB Connection URI: mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MongoDB Cluster: CLUSTER_NAME
```

### Backend (Render)
```
Service Name: communication-app-backend
Render URL: https://communication-app-YOUR_NAME.onrender.com
Backend API: https://communication-app-YOUR_NAME.onrender.com/api
Health Check: https://communication-app-YOUR_NAME.onrender.com/api/health
```

### Frontend (Vercel)
```
Project Name: communication-app
Vercel URL: https://communication-app-YOUR_NAME.vercel.app
Frontend Env Variables:
  VITE_API_URL: https://communication-app-YOUR_NAME.onrender.com/api
  VITE_SOCKET_URL: https://communication-app-YOUR_NAME.onrender.com
```

---

## Environment Variables Summary

### Backend (.env) - Store in Render
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=[SECURE_RANDOM_STRING]
JWT_EXPIRE=7d
FRONTEND_URL=https://communication-app-YOUR_NAME.vercel.app
MAX_FILE_SIZE=52428800
UPLOAD_PATH=./uploads
```

### Frontend (.env) - Store in Vercel
```
VITE_API_URL=https://communication-app-YOUR_NAME.onrender.com/api
VITE_SOCKET_URL=https://communication-app-YOUR_NAME.onrender.com
```

---

## Common Commands for Development

### Git Commands
```bash
# Push updates to GitHub
git add .
git commit -m "Your message"
git push origin main

# Clone repository
git clone https://github.com/YOUR_USERNAME/communication-app.git
cd communication-app
```

### Backend Local Development
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```

### Frontend Local Development
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## Testing After Deployment

1. **Health Check**
   ```
   Open: https://your-backend-url.onrender.com/api/health
   Expected: { "status": "ok", "timestamp": "2024-..." }
   ```

2. **Frontend Access**
   ```
   Open: https://your-frontend-url.vercel.app
   Expected: See login page
   ```

3. **Test Functionality**
   - [ ] Sign up with new account
   - [ ] Login
   - [ ] Send a text message
   - [ ] Upload an image
   - [ ] Make an audio call
   - [ ] Make a video call
   - [ ] Create/join a group

---

## Redeploy After Code Changes

### Automatic Deployment (Recommended)
1. Make changes locally
2. Push to GitHub: `git push origin main`
3. Wait 2-5 minutes for auto-deployment

### Manual Redeploy (if needed)

**Vercel:**
- Go to https://vercel.com/dashboard
- Click your project
- Click "Deployments" → Latest deployment → "..." → "Redeploy"

**Render:**
- Go to https://dashboard.render.com
- Click your service
- Click "Manual Deploy" → "Deploy Latest Commit"

---

## Monitoring & Maintenance

### Daily Checks (First Week)
- [ ] Check Render dashboard for errors
- [ ] Check Vercel analytics
- [ ] Test core functionality

### Weekly Checks
- [ ] Monitor MongoDB usage
- [ ] Review error logs
- [ ] Check database size

### Monthly Tasks
- [ ] Review MongoDB backup status
- [ ] Update dependencies (if needed)
- [ ] Check security advisories

---

## Getting Help

If you encounter issues:

1. **Check Logs**
   - Render: Dashboard → Service → Logs
   - Vercel: Dashboard → Project → Deployments → Build Logs
   - Browser: Press F12 → Console tab

2. **Common Issues**
   - See DEPLOYMENT_CHECKLIST.md for troubleshooting

3. **Documentation**
   - DEPLOYMENT.md - Full deployment guide
   - GIT_DEPLOYMENT.md - Step-by-step Git setup
   - README.md - Project overview

---

## Notes
```
Last Updated: 2024
Deployment Status: [Ready for Deployment]
```
