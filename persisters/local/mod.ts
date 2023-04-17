import { Persister } from '../mod.ts'

export interface CreateLocalPersisterParams {
	directory: string
}

export function createLocalPersister(params: CreateLocalPersisterParams): Persister<null> {
	const getName = (id: string) => {
		const safeName = id.replaceAll('/', ':')
		return `${params.directory}/${safeName}`
	}

	return {
		name: 'local',
		async setup() {
			try {
				const stat = await Deno.stat(params.directory)

				if (!stat.isDirectory) throw new Error(`Expected ${params.directory} to be a directory`)
			} catch (_error) {
				await Deno.mkdir(params.directory, { recursive: true })
			}

			return null
		},
		async get(_, id) {
			try {
				return await Deno.readFile(getName(id))
			} catch (_error) {
				return null
			}
		},
		async set(_, id, bytes) {
			await Deno.writeFile(getName(id), bytes)
		},
		async remove(_, id) {
			await Deno.remove(getName(id))
		},
	}
}
