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
	/**
	 * Make a model from a typescript type and a name. All documents in this model will persisted with
	 * keys prepended with `<name>/`.
	 *
	 * ```ts
	 * interface User {
	 * 	name: string
	 * 	email: string
	 * }
	 *
	 * const User = db.model<User>('users')
	 *
	 * await User.get(...)
	 * ``` */
	function model<T>(name: string) {
		return new Model<T>(name, params.persister)
	}

	return { model }
}
