import crypto from 'node:crypto'

export function hashUserId(userId: string) {
	return crypto.createHash('sha256').update(userId).digest('base64').replace(/[^\w\s]/gi, '').slice(-7)
}

export function later(delay: number) {
	return new Promise(function (resolve) {
		setTimeout(resolve, delay)
	})
}

export function random(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}
