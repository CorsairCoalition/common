import EventEmitter from "node:events"
import Log from "./log.js"
import Redis from "./redis.js"

/**
 * @class GameState
 * @description handle game updates from Redis and maintain local state
 */
export default class GameState extends EventEmitter implements Game.State {
	public gameType = Game.Type.CUSTOM
	public gamePhase = Game.Phase.INITIALIZING
	public replay_id = ""
	public playerIndex = null
	public turn = 0
	public usernames = null
	public scores = null
	public won = null

	constructor(botId: string, enableTurnByTurnUpdates: boolean = false) {
		super()
		Redis.subscribe(botId, RedisData.CHANNEL.STATE, this.handleStateUpdates)
		if (enableTurnByTurnUpdates) {
			Redis.subscribe(botId, RedisData.CHANNEL.GAME_UPDATE, this.handleGameUpdates)
		}
	}

	public handleStateUpdates = async (data: RedisData.State) => {
		Log.debugObject('handleStateUpdates', data)
		let type: string = Object.keys(data)[0]
		switch (type) {
			case 'connected':
				this.gamePhase = Game.Phase.CONNECTED
				this.emit('connected')
				break
			case 'disconnected':
				this.gamePhase = Game.Phase.INITIALIZING
				this.emit('disconnected')
				break
			case 'joined':
				this.gamePhase = Game.Phase.JOINED_LOBBY
				this.emit('joined')
				break
			case 'left':
				this.gamePhase = Game.Phase.CONNECTED
				this.emit('left')
				break
			case 'playing':
				this.gamePhase = Game.Phase.PLAYING
				this.emit('playing')
				break
			case 'game_lost':
				this.gamePhase = Game.Phase.CONNECTED
				this.won = false
				this.emit('ended')
				break
			case 'game_won':
				this.gamePhase = Game.Phase.CONNECTED
				this.won = true
				this.emit('ended')
				break
			case 'game_start':
				this.gamePhase = Game.Phase.PLAYING
				this.gameType = data.game_start.game_type
				this.replay_id = data.game_start.replay_id
				this.playerIndex = data.game_start.playerIndex
				this.turn = 0
				this.usernames = data.game_start.usernames
				this.scores = null
				this.won = null
				this.emit('game_start', data.game_start.replay_id)
				break
		}
		this.emit('phase', this.gamePhase)
		this.emit('update', this)
	}

	private handleGameUpdates = async (data: GeneralsIO.GameUpdate) => {
		this.turn = data.turn
		this.scores = data.scores
		this.emit('update', this)
	}
}
