import type stream from "stream"

export default class Log {

	static debugEnabled: boolean = false
	static outStream: stream.Writable = process.stdout
	static errStream: stream.Writable = process.stderr

	static setOutStream(outStream: stream.Writable, errStream: stream.Writable) {
		Log.outStream = outStream
		Log.errStream = errStream
	}

	static enableDebugOutput(debug: boolean = true) {
		Log.debugEnabled = debug
	}

	static clearScreen() {
		process.stdout.write('\x1b[2J')
	}

	static stdout(...args: string[]) {
		Log.outStream.write(new Date().toISOString() + ' ' + args.join(' ') + '\n')
	}

	static stderr(...args: string[]) {
		Log.errStream.write(new Date().toISOString() + ' ' + args.join(' ') + '\n')
	}

	static debug(...args: string[]) {
		if (!Log.debugEnabled) return
		Log.outStream.write(new Date().toISOString() + ' ' + args.join(' ') + '\n')
	}

	static debugObject(label: string, obj: any) {
		if (!Log.debugEnabled) return
		Log.outStream.write(new Date().toISOString() + ' ' + label + '\n')
		Log.outStream.write(JSON.stringify(obj, null, 2) + '\n')
	}
}
