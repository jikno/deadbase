import { Application, Router } from 'https://deno.land/x/oak@v7.5.0/mod.ts'
import {
	ensureRootAuth,
	badRequest,
	ok,
	notFound,
	ensureAuthIsValid,
	invalidParams,
	collectionExists,
	sanitizeTestValues,
} from './utils.ts'
import * as db from './database.ts'

export default function () {
	const app = new Application()
	const router = new Router()

	router.post('/', async ctx => {
		const errorOut = ensureRootAuth(ctx)
		if (errorOut) return errorOut()

		const body = ctx.request.body()
		if (body.type !== 'json') return badRequest(ctx, 'Expected a JSON payload')
		const data = await body.value

		if (!data.name) return badRequest(ctx, 'Expected a "name" property in payload')

		await db.createDatabase(data.name, { auth: data.auth || null })

		return ok(ctx, data.name)
	})

	router.get('/:database', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		const size = await db.getDatabaseSize(ctx.params.database as string)
		const requests = await db.getRequestsCount(ctx.params.database as string)

		return ok(ctx, { size, requests })
	})

	router.put('/:database', async ctx => {
		const errorOut = ensureRootAuth(ctx)
		if (errorOut) return errorOut()

		const body = ctx.request.body()
		if (body.type !== 'json') return badRequest(ctx, 'Expected a JSON payload')
		const data = await body.value

		if (!data.name) return badRequest(ctx, 'Expected a "name" property in payload')
		if (ctx.params.database !== data.name) {
			if (await db.getCollections(data.name)) return invalidParams(ctx, 'New database name already exists')
		}

		await db.editDatabase(ctx.params.database as string, data.name, { auth: data.auth || null })

		return ok(ctx, data.name)
	})

	router.delete('/:database', async ctx => {
		const errorOut = ensureRootAuth(ctx)
		if (errorOut) return errorOut()

		await db.removeDatabase(ctx.params.database as string)

		return ok(ctx, ctx.params.database)
	})

	router.post('/:database/collections', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		const body = ctx.request.body()
		if (body.type !== 'json') return badRequest(ctx, 'Expected a JSON payload')
		const data = await body.value

		if (!data.name) return badRequest(ctx, 'Expected a "name" property in payload')
		if (await db.getDocuments(ctx.params.database as string, data.name)) return invalidParams(ctx, 'New collection name already exists')

		await db.createCollection(ctx.params.database as string, data.name)

		return ok(ctx, data.name)
	})

	router.get('/:database/collections', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		const collections = await db.getCollections(ctx.params.database as string)
		return ok(ctx, collections)
	})

	router.get('/:database/collections/:collection', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		if (!(await collectionExists(ctx))) return notFound(ctx, `collection ("${ctx.params.collection}")`)

		return ok(ctx, ctx.params.collection)
	})

	router.put('/:database/collections/:collection', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		if (!(await collectionExists(ctx))) return notFound(ctx, `collection ("${ctx.params.collection}")`)

		const body = ctx.request.body()
		if (body.type !== 'json') return badRequest(ctx, 'Expected a JSON payload')
		const data = await body.value

		if (!data.name) return badRequest(ctx, 'Expected a "name" property in payload')
		if (await db.getDocuments(ctx.params.database as string, data.name)) return invalidParams(ctx, 'New collection name already exists')

		await db.renameCollection(ctx.params.database as string, ctx.params.collection as string, data.name)

		return ok(ctx, data.name)
	})

	router.delete('/:database/collections/:collection', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		if (!(await collectionExists(ctx))) return notFound(ctx, `collection ("${ctx.params.collection}")`)

		await db.removeCollection(ctx.params.database as string, ctx.params.collection as string)

		return ok(ctx, ctx.params.collection)
	})

	router.post('/:database/collections/:collection/setDocument', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		if (!(await collectionExists(ctx))) return notFound(ctx, `collection ("${ctx.params.collection}")`)

		const body = ctx.request.body()
		if (body.type !== 'json') return badRequest(ctx, 'Expected a JSON payload')
		const data = await body.value

		const idField = ctx.request.url.searchParams.get('idField') || undefined

		return ok(ctx, await db.setDocument(ctx.params.database as string, ctx.params.collection as string, data, idField))
	})

	router.get('/:database/collections/:collection/documents', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		const documents = await db.getDocuments(ctx.params.database as string, ctx.params.collection as string)
		if (!documents) return notFound(ctx, `collection ("${ctx.params.collection}")`)

		return ok(ctx, documents)
	})

	router.get('/:database/collections/:collection/documents/:document', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		if (!(await collectionExists(ctx))) return notFound(ctx, `collection ("${ctx.params.collection}")`)

		const document = await db.getDocumentById(
			ctx.params.document as string,
			ctx.params.collection as string,
			ctx.params.document as string
		)
		if (!document) return notFound(ctx, `document ("${ctx.params.document}")`)

		return ok(ctx, document)
	})

	router.delete('/:database/collections/:collection/documents/:document', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		if (!(await collectionExists(ctx))) return notFound(ctx, `collection ("${ctx.params.collection}")`)

		const document = await db.getDocumentById(
			ctx.params.document as string,
			ctx.params.collection as string,
			ctx.params.document as string
		)
		if (!document) return notFound(ctx, `document ("${ctx.params.document}")`)

		await db.removeDocument(ctx.params.database as string, ctx.params.collection as string, ctx.params.document as string)

		return ok(ctx, ctx.params.document)
	})

	router.post('/:database/:collections/:collection/findDocumentByKey', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		if (!(await collectionExists(ctx))) return notFound(ctx, `collection ("${ctx.params.collection}")`)

		const body = ctx.request.body()
		if (body.type !== 'json') return badRequest(ctx, 'Expected a JSON payload')
		const data = await body.value

		if (!data.key) return badRequest(ctx, 'Expected a "key" property')
		if (!data.values) return badRequest(ctx, 'Expected a "values" property')

		const id = await db.findDocumentByKey(
			ctx.params.database as string,
			ctx.params.collection as string,
			data.key,
			sanitizeTestValues(data.value)
		)

		return ok(ctx, id)
	})

	router.post('/:database/:collections/:collection/findManyDocumentsByKey', async ctx => {
		const errorOut = await ensureAuthIsValid(ctx)
		if (errorOut) return errorOut()

		if (!(await collectionExists(ctx))) return notFound(ctx, `collection ("${ctx.params.collection}")`)

		const body = ctx.request.body()
		if (body.type !== 'json') return badRequest(ctx, 'Expected a JSON payload')
		const data = await body.value

		if (!data.key) return badRequest(ctx, 'Expected a "key" property')
		if (!data.values) return badRequest(ctx, 'Expected a "values" property')

		const ids = await db.findManyDocumentsByKey(
			ctx.params.database as string,
			ctx.params.collection as string,
			data.key,
			sanitizeTestValues(data.value)
		)

		return ok(ctx, ids)
	})

	app.use(router.allowedMethods(), router.routes())

	// wildcard route
	app.use(ctx => notFound(ctx, 'route'))

	const PORT_ENV = Deno.env.get('PORT')
	const port = PORT_ENV ? parseInt(PORT_ENV) : 2780

	app.addEventListener('listen', () => {
		console.log(`Listening for connections at http://localhost:${port}`)
	})

	app.listen({ port })
}
