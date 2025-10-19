# Chat Enhancement Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Changes
- [x] Input field styling fixed (assistant & calendar pages)
- [x] Enhanced chat endpoint created
- [x] Enhanced chat hook created
- [x] Assistant page UI updated
- [x] Environment variables documented

### ✅ Local Testing
- [ ] Run `npm run dev` and test locally
- [ ] Test assistant page at `http://localhost:3000/assistant`
- [ ] Test calendar page at `http://localhost:3000/calendar`
- [ ] Verify input fields have proper text color
- [ ] Test provider switching (if API keys available)
- [ ] Check browser console for errors

### ✅ Build Verification
```bash
cd sites/ai-marketplace/frontend/apps/web
npm run build
```
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No console warnings

---

## Vercel Deployment

### Step 1: Set Environment Variables

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add these variables (if not already set):

```
NEXT_PUBLIC_ORION_API_URL = https://fabric.sidekickportal.com
ORION_SHARED_JWT_SECRET = [your_jwt_secret]
ORION_SHARED_JWT_ISS = https://www.sidekickportal.com
ORION_SHARED_JWT_AUD = orion-core
```

Optional (for full AI provider support):
```
DEEPSEEK_API_KEY = [your_deepseek_key]
GEMINI_API_KEY = [your_gemini_key]
```

- [ ] All required variables set
- [ ] Variables set for Production environment
- [ ] Variables set for Preview environment (optional)

### Step 2: Deploy

```bash
cd sites/ai-marketplace/frontend/apps/web
vercel --prod
```

- [ ] Deployment starts
- [ ] Build completes successfully
- [ ] Deployment URL shows in output
- [ ] Wait for deployment to complete

### Step 3: Post-Deployment Verification

#### Test Input Fields
- [ ] Visit https://www.sidekickportal.com/assistant
- [ ] Verify input field text is visible (not white on white)
- [ ] Test typing in the input field
- [ ] Verify placeholder text is visible

#### Test Chat Functionality
- [ ] Click "Send" button
- [ ] Verify streaming response appears
- [ ] Check for status indicators (🔍, 📚, 🤖)
- [ ] Verify [DONE] message appears at end

#### Test Provider Selection (if API keys set)
- [ ] Verify provider dropdown is visible
- [ ] Try switching between DeepSeek and Gemini
- [ ] Verify provider name updates in status

#### Test Calendar Page
- [ ] Visit https://www.sidekickportal.com/calendar
- [ ] Verify input field text is visible
- [ ] Test typing in the input field

#### Check Browser Console
- [ ] No JavaScript errors
- [ ] No network errors
- [ ] No CORS errors
- [ ] Check for any warnings

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback
```bash
# Revert to previous deployment
vercel rollback
```

### Manual Rollback
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Deployments**
4. Find the previous working deployment
5. Click **Promote to Production**

---

## Monitoring

### Check Deployment Status
```bash
vercel list
```

### View Deployment Logs
```bash
vercel logs [deployment-url]
```

### Monitor Errors
- Check Vercel Analytics dashboard
- Monitor browser console errors
- Check ORION-CORE tunnel status

---

## Success Criteria

✅ **Deployment is successful when:**

1. **Input Fields**
   - Text is visible (not white on white)
   - Placeholder text is visible
   - Focus states work properly

2. **Chat Functionality**
   - Chat endpoint responds
   - Streaming works (real-time tokens appear)
   - Status indicators show
   - [DONE] message appears

3. **No Errors**
   - No JavaScript errors in console
   - No network errors
   - No CORS errors
   - No timeout errors

4. **Performance**
   - Page loads in < 3 seconds
   - Chat response starts within 5 seconds
   - Streaming is smooth

---

## Troubleshooting

### Issue: Input text not visible
**Solution:** 
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check CSS is loading properly

### Issue: Chat not responding
**Solution:**
- Verify Cloudflare tunnel is running
- Check ORION-CORE services are healthy
- Verify JWT secret is set
- Check browser console for errors

### Issue: Provider dropdown not showing
**Solution:**
- Verify API keys are set in environment
- Check JavaScript is enabled
- Verify page loaded completely

### Issue: Streaming interrupted
**Solution:**
- Check network connection
- Verify SSE support in browser
- Check for proxy/firewall issues
- Review server logs

---

## Rollback Triggers

Rollback immediately if:
- ❌ Chat page shows 500 error
- ❌ Input fields are completely broken
- ❌ Multiple users report issues
- ❌ Performance degrades significantly

---

## Post-Deployment Tasks

- [ ] Notify team of deployment
- [ ] Monitor error rates for 24 hours
- [ ] Gather user feedback
- [ ] Document any issues found
- [ ] Plan follow-up improvements

---

## Contact & Support

For issues during deployment:
1. Check this checklist
2. Review CHAT_ENHANCEMENT_HANDOFF.md
3. Check ENHANCED_CHAT_README.md
4. Review server logs
5. Contact backend team if ORION-CORE issues
