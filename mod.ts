import { Model } from './model.ts'

export * from './model.ts'

export interface Persister {
	name: string
	set(id: string, data: Uint8Array): Promise<void>
	get(id: string): Promise<Uint8Array | null>
	remove(id: string): Promise<void>
}

export interface MakeDatabaseParams {
	persister: Persister
}

export function makeDatabase(params: MakeDatabaseParams) {
	function model<T>(name: string) {
		return new Model<T>(name, params.persister)
	}

	return { model }
}
