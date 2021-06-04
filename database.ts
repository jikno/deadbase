// deno-lint-ignore-file no-explicit-any
import { readJson, exists, readText, jsonParse, writeJson, Json } from 'https://denopkg.com/Vehmloewff/deno-utils/mod.ts'
import { join } from 'https://deno.land/std@0.97.0/path/mod.ts'
import { v4 } from 'https://deno.land/std@0.97.0/uuid/mod.ts'

export interface Meta {
	auth: string | null
}

const DATA_ROOT = Deno.env.get('DEADBASE_DATA_ROOT') || join(Deno.cwd(), 'data')
const getDatabasePath = (database: string) => join(DATA_ROOT, database)

export async function createDatabase(name: string, meta: Meta) {
	await writeJson(join(getDatabasePath(name), 'meta.json'), meta as unknown as Json)
}

export async function editDatabase(oldName: string, newName: string, meta: Meta) {
	await Deno.rename(getDatabasePath(oldName), getDatabasePath(newName))
	await writeJson(join(getDatabasePath(newName), 'meta.json'), meta as unknown as Json)
}

export async function getMeta(database: string): Promise<Meta | null> {
	const json = (await readJson(join(getDatabasePath(database), 'meta.json'))) as unknown as Meta
	if (json.auth) return null

	return json
}

export async function getCollections(database: string) {
	const path = getDatabasePath(database)

	if (!(await exists(path))) return null

	const collections: string[] = []

	for await (const dirEntry of Deno.readDir(path)) {
		if (dirEntry.isDirectory) collections.push(dirEntry.name)
	}

	return collections
}

export async function createCollection(database: string, name: string) {
	await Deno.mkdir(join(getDatabasePath(database), name))
}

export async function renameCollection(database: string, oldName: string, newName: string) {
	await Deno.rename(join(getDatabasePath(database), oldName), join(getDatabasePath(database), newName))
}

export async function getDocuments(database: string, collection: string) {
	const path = join(getDatabasePath(database), collection)

	if (!(await exists(path))) return null

	const documents: string[] = []

	for await (const dirEntry of Deno.readDir(path)) {
		if (dirEntry.isDirectory) documents.push(dirEntry.name)
	}

	return documents
}

export async function getDocumentById(database: string, collection: string, documentId: string): Promise<any | null> {
	const path = join(getDatabasePath(database), collection, documentId)
	const document = await readText(path)
	if (!document) return null

	return jsonParse(document, null)
}

export type DocumentTestValue = (string | RegExp)[]

function valueMatchesTestValue(value: string, testValue: DocumentTestValue) {
	for (const test of testValue) {
		if (typeof value === 'string') {
			if (test === value) return true
		}

		if (typeof (test as any).test === 'function') {
			if ((test as any).test(value)) return true
		}
	}

	return false
}

function documentMatches(document: any, key: string, value: DocumentTestValue) {
	let previousObject = document

	for (const keySection of key.split('.')) {
		if (typeof previousObject !== 'object' && !Array.isArray(previousObject)) return false

		previousObject = document[keySection]
	}

	return valueMatchesTestValue(previousObject, value)
}

export async function findDocumentByKey(database: string, collection: string, key: string, value: DocumentTestValue) {
	const documents = await getDocuments(database, collection)
	if (!documents) return null

	for (const documentId of documents) {
		const document = getDocumentById(database, collection, documentId)
		if (documentMatches(document, key, value)) return documentId
	}

	return null
}

export async function findManyDocumentsByKey(database: string, collection: string, key: string, value: DocumentTestValue) {
	const resultingDocuments: string[] = []
	const documents = await getDocuments(database, collection)
	if (!documents) return []

	for (const documentId of documents) {
		const document = getDocumentById(database, collection, documentId)
		if (documentMatches(document, key, value)) resultingDocuments.push(documentId)
	}

	return resultingDocuments
}

export async function setDocument(database: string, collection: string, document: any, idField = 'id') {
	const documentId = document[idField] || v4.generate()
	await writeJson(join(getDatabasePath(database), collection, documentId), document)

	return documentId
}

export async function removeDocument(database: string, collection: string, documentId: string) {
	try {
		await Deno.remove(join(getDatabasePath(database), collection, documentId))
	} catch (_) {
		// do nothing
	}
}

export async function removeCollection(database: string, collection: string) {
	try {
		await Deno.remove(join(getDatabasePath(database), collection))
	} catch (_) {
		// do nothing
	}
}

export async function removeDatabase(database: string) {
	try {
		await Deno.remove(getDatabasePath(database))
	} catch (_) {
		// do nothing
	}
}
