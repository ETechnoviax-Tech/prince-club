import { Router } from 'express'
import { loginOrRegister } from '../controllers/authController.js'

const router = Router()

router.post('/login', loginOrRegister)

export default router
