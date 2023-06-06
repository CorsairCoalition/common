import { createClient, RedisClientType } from '@redis/client'
import Log from './log.js'
import EventEmitter from 'node:events'

export default class Redis {

	private static publisher: RedisClientType
	private static subscriber: RedisClientType
	private static EXPIRATION_TIME: number
	public static readonly connectionEventEmitter = new EventEmitter()

	public static async initilize(redisConfig: Config.Redis) {
		Redis.EXPIRATION_TIME = redisConfig.EXPIRATION_TIME

		const connectionObj = {
			username: process.env['REDIS_USERNAME'] || redisConfig.USERNAME,
			password: process.env['REDIS_PASSWORD'] || redisConfig.PASSWORD,
			socket: {
				host: process.env['REDIS_HOST'] || redisConfig.HOST,
				port: parseInt(process.env['REDIS_PORT']) || redisConfig.PORT,
				tls: redisConfig.TLS,
				servername: process.env['REDIS_HOST'] || redisConfig.HOST,
			}
		}

		Redis.subscriber = createClient(connectionObj)
		Redis.publisher = createClient(connectionObj)
		Redis.subscriber.on('error', (error: Error) => Log.stderr(`[Redis] ${error}`))
		Redis.publisher.on('error', (error: Error) => Log.stderr(`[Redis] ${error}`))

		let redisConnectionEvents = ['connect', 'ready', 'reconnecting', 'end', 'error']
		for (let event of redisConnectionEvents) {
			Redis.subscriber.on(event, Redis.redisEventHandler(event))
		}

		return Promise.all([
			Redis.subscriber.connect(),
			Redis.publisher.connect()
		])
	}

	private static redisEventHandler = (type: string) => (data: any) => Redis.connectionEventEmitter.emit('status', type, data)

	public static async ping() {
		await Redis.publisher.ping()
	}

	public static async listPush(keyspace: string, list: RedisData.LIST, data: any) {
		return Promise.all([
			Redis.publisher.rPush(keyspace + '-' + list, JSON.stringify(data)),
			Redis.publisher.expire(keyspace + '-' + list, Redis.EXPIRATION_TIME)
		])
	}

	public static async setKeys(keyspace: string, keyValues: Record<string, any>) {
		// JSON.stringify each value
		for (let key in keyValues) {
			keyValues[key] = JSON.stringify(keyValues[key])
		}
		return Promise.all([
			Redis.publisher.hSet(keyspace, keyValues),
			Redis.publisher.expire(keyspace, Redis.EXPIRATION_TIME),
		])
	}

	public static async getKeys(keyspace: string, ...keys: Array<string>) {
		// JSON.parse each value
		let values = await Redis.publisher.hmGet(keyspace, keys)
		for (let key in values) {
			values[key] = JSON.parse(values[key])
		}
		return values
	}

	public static async getAllKeys(keyspace: string) {
		// JSON.parse each value
		let values = await Redis.publisher.hGetAll(keyspace)
		for (let key in values) {
			values[key] = JSON.parse(values[key])
		}
		return values
	}

	public static publish(botId: string, channel: RedisData.CHANNEL, data: any) {
		const CHANNEL_NAME: string = `${botId}-${channel}`
		return Redis.publisher.publish(CHANNEL_NAME, JSON.stringify(data))
	}

	public static async subscribe(botId: string, channel: RedisData.CHANNEL, callback: (data: any) => void) {
		const CHANNEL_NAME: string = `${botId}-${channel}`
		Log.debug('[Redis] subscribe:', CHANNEL_NAME)
		let handleResponse = (message: string) => {
			let data: any
			try {
				data = JSON.parse(message)
			} catch (error) {
				Log.stderr('[JSON] received:', message, ', error:', error)
				return
			}
			callback(data)
		}
		await Redis.subscriber.subscribe(CHANNEL_NAME, handleResponse)
		Log.debug('[Redis] subscribed:', CHANNEL_NAME)
		return CHANNEL_NAME
	}

	public static async quit() {
		let promises = []
		if (Redis.subscriber.isReady) {
			Log.stdout('Closing Redis subscriber...')
			promises.push(Redis.subscriber.quit())
		}
		if (Redis.publisher.isReady) {
			Log.stdout('Closing Redis publisher...')
			promises.push(Redis.publisher.quit())
		}
		return Promise.all(promises).then(() => {
			Log.stdout('Redis connection closed.')
		})
	}
}
