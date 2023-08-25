import { Persister } from './mod.ts'

export class Document<T> {
	name: string
	#encoder = new TextEncoder()
	#decoder = new TextDecoder()
	#persister: Persister

	constructor(name: string, persister: Persister) {
		this.name = name
		this.#persister = persister
	}

	async get(id: string) {
		const bytes = await this.#persister.get(`${this.name}/${id}`)
		if (!bytes) return null

		const text = this.#decoder.decode(bytes)
		return JSON.parse(text) as T
	}

	async set(id: string, content: T) {
		const text = JSON.stringify(content)
		const bytes = this.#encoder.encode(text)

		await this.#persister.set(`${this.name}/${id}`, bytes)
	}

	async remove(id: string) {
		await this.#persister.remove(`${this.name}/${id}`)
	}
}
