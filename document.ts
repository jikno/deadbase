import { getPersistently, removePersistently, setPersistently } from './persisters/mod.ts'

export class Document<T> {
	name: string
	#encoder = new TextEncoder()
	#decoder = new TextDecoder()

	constructor(name: string) {
		this.name = name
	}

	async getItem(id: string) {
		const bytes = await getPersistently(`${this.name}/${id}`)
		if (!bytes) return null

		const text = this.#decoder.decode(bytes)
		return JSON.parse(text) as T
	}

	async setItem(id: string, content: T) {
		const text = JSON.stringify(content)
		const bytes = this.#encoder.encode(text)

		await setPersistently(`${this.name}/${id}`, bytes)
	}

	async removeItem(id: string) {
		await removePersistently(`${this.name}/${id}`)
	}
}

export function makeDocument<T>(name: string) {
	return new Document<T>(name)
}
