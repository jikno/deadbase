import { Persister } from '../../mod.ts'

export interface CreateLocalPersisterParams {
	directory: string
}

export async function createLocalPersister(params: CreateLocalPersisterParams): Promise<Persister> {
	try {
		const stat = await Deno.stat(params.directory)

		if (!stat.isDirectory) throw new Error(`Expected ${params.directory} to be a directory`)
	} catch (_error) {
		await Deno.mkdir(params.directory, { recursive: true })
	}

	const getName = (id: string) => {
		const safeName = id.replaceAll('/', ':')
		return `${params.directory}/${safeName}`
	}

	return {
		name: 'local',
		async get(id) {
			try {
				return await Deno.readFile(getName(id))
			} catch (_error) {
				return null
			}
		},
		async set(id, bytes) {
			await Deno.writeFile(getName(id), bytes)
		},
		async remove(id) {
			await Deno.remove(getName(id))
		},
	}
}
