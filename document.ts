import { Persister } from './mod.ts'

export type WatcherFn<T> = (newDoc: T | null) => unknown

export class Document<T> {
	name: string
	#encoder = new TextEncoder()
	#decoder = new TextDecoder()
	#persister: Persister
	#watchers = new Map<string, WatcherFn<T>[]>()

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

		this.#notifySubscribers(id, content)
	}

	async remove(id: string) {
		await this.#persister.remove(`${this.name}/${id}`)

		this.#notifySubscribers(id, null)
	}

	subscribe(id: string, fn: WatcherFn<T>): VoidFunction {
		const previousWatchers = this.#watchers.get(id)

		if (!previousWatchers) this.#watchers.set(id, [fn])
		else previousWatchers.push(fn)

		this.get(id).then((doc) => fn(doc))

		return () => {
			const watchers = this.#watchers.get(id)
			if (!watchers) return

			watchers.splice(watchers.indexOf(fn), 1)
		}
	}

	#notifySubscribers(id: string, doc: T | null) {
		const watchers = this.#watchers.get(id)
		if (!watchers) return

		for (const watcher of watchers) watcher(doc)
	}
}
