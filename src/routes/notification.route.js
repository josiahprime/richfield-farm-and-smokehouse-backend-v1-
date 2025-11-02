import express from 'express'
import { protectRoute } from '../middlewares/auth.middleware.js'
import { getNewNotifications, MarkAllAsSeen, markNotificationsAsRead } from '../controllers/notifications.controllers.js'
const router = express.Router()



router.get('/get-notifications', protectRoute, getNewNotifications)
router.patch('/:id/read', protectRoute, markNotificationsAsRead)
router.patch('/seen', protectRoute, MarkAllAsSeen)
// router.get('/id', protectRoute)

// router.post('/send', protectRoute, sendMessages)
export default router;