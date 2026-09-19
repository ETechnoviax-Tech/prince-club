import {
  PROVIDERS_META,
  executeGameRound,
  getUnifiedCatalog,
  getLaunchUrl,
} from '../services/thirdPartyGameService.js'
import { persistThirdPartyPlay } from '../db/gamePersistence.js'

export async function getProviders(req, res) {
  try {
    return res.json({ success: true, providers: PROVIDERS_META })
  } catch {
    return res.status(500).json({ error: 'Failed to fetch providers' })
  }
}

export async function getGameCatalog(req, res) {
  try {
    const { provider = 'ALL', category, search, page = 1, limit = 40 } = req.query
    const result = await getUnifiedCatalog({
      provider,
      category,
      search,
      page: Number(page),
      limit: Number(limit),
    })
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[getGameCatalog Error]:', err.message)
    return res.status(500).json({ error: 'Failed to fetch game catalog' })
  }
}

/**
 * GET /api/game/third-party/launch?gameId=49&provider=JILI
 * Returns the real playable game URL (iframe-able) from provider
 */
export async function launchGame(req, res) {
  try {
    const { gameId, provider } = req.query
    const userId = req.user ? req.user.id : (req.query.userId || 'guest')

    if (!gameId || !provider) {
      return res.status(400).json({ error: 'gameId and provider are required' })
    }

    const result = await getLaunchUrl({ gameId, provider, userId })
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('[launchGame Error]:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to get game URL' })
  }
}

export async function playGameRound(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId
    const { gameId, provider, betAmount } = req.body

    if (!userId || !gameId || !betAmount) {
      return res.status(400).json({ error: 'userId, gameId, and betAmount are required' })
    }

    const result = await executeGameRound({ userId, gameId, provider, betAmount: Number(betAmount) })
    await persistThirdPartyPlay({
      userId,
      provider: String(provider).toUpperCase(),
      gameId,
      betAmount: Number(betAmount),
      result,
    })
    return res.json(result)
  } catch (err) {
    console.error('[playGameRound Error]:', err.message)
    return res.status(400).json({ error: err.message || 'Game round execution failed' })
  }
}
