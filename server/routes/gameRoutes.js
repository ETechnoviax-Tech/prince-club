import { Router } from 'express'
import { getCurrentRound, placeBet } from '../controllers/gameController.js'

const router = Router()

router.get('/round/current', getCurrentRound)
router.post('/bet', placeBet)

export default router
