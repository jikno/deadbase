export interface Persister<T> {
	name: string
	setup(): Promise<T>
	set(state: T, id: string, data: Uint8Array): Promise<void>
	get(state: T, id: string): Promise<Uint8Array | null>
	remove(state: T, id: string): Promise<void>
}

let stashedPersister: Persister<unknown> | null = null

// I know it's weird, but we are just wrapping this in an object so that we can tell the difference between
// no persister being setup and a setup call that resolved to null
let stashedPersisterSetupPromise: { state: Promise<unknown> } | null = null

export function setPersister(persister: Persister<unknown>) {
	stashedPersisterSetupPromise = { state: persister.setup() }
	stashedPersister = persister
}

export async function setPersistently(id: string, data: Uint8Array) {
	const { persister, state } = await usePersister()

	await persister.set(state, id, data)
}

export async function getPersistently(id: string) {
	const { persister, state } = await usePersister()

	return await persister.get(state, id)
}

export async function removePersistently(id: string) {
	const { persister, state } = await usePersister()

	await persister.remove(state, id)
}

async function usePersister() {
	if (!stashedPersister || !stashedPersisterSetupPromise) {
		throw new Error('No persisters have been set. Be sure to call "setPersisters" before running any database operations')
	}

	const state = await stashedPersisterSetupPromise.state
	return { state, persister: stashedPersister }
}
