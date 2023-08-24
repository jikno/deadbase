import { Document } from './document.ts'

export * from './document.ts'

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
	function document<T>(name: string) {
		return new Document<T>(name, params.persister)
	}

	return { document }
}
