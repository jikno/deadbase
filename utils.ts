import { Context } from 'https://deno.land/x/oak@v7.5.0/mod.ts'
import { getMeta, getDocuments, DocumentTestValue } from './database.ts'

export async function ensureAuthIsValid(ctx: Context) {
	// deno-lint-ignore no-explicit-any
	const databaseName = (ctx as any).params?.database
	if (!databaseName) return () => internalServerError(ctx, 'Expected a "database" parameter in the path')

	const auth = ctx.request.headers.get('Authentication')
	if (!auth) return () => unAuthorized(ctx)

	const meta = await getMeta(databaseName)
	if (!meta) return () => notFound(ctx, `database ('${databaseName}')`)

	if (meta.auth !== auth.trim()) return () => forbidden(ctx)
}

export function hasAuth(ctx: Context) {
	const auth = ctx.request.headers.get('Authentication')
	return auth !== null
}

export function unAuthorized(ctx: Context) {
	ctx.response.status = 401
	ctx.response.body = { error: 'Expected an authorization header to be sent', data: null }
}

export function forbidden(ctx: Context) {
	ctx.response.status = 403
	ctx.response.body = { error: 'You do not have permission to access this database', data: null }
}

export function ok(ctx: Context, data: unknown) {
	ctx.response.status = 200
	ctx.response.body = { error: null, data }
}

export function badRequest(ctx: Context, message = 'Bad request') {
	ctx.response.status = 400
	ctx.response.body = { error: message, data: null }
}

export function invalidParams(ctx: Context, message = 'Invalid parameters in request') {
	ctx.response.status = 406
	ctx.response.body = { error: message, data: null }
}

export function internalServerError(ctx: Context, error: unknown) {
	console.error(error)
	ctx.response.status = 500
	ctx.response.body = { error: 'Internal server error', data: null }
}

export function notFound(ctx: Context, what: string) {
	ctx.response.status = 404
	ctx.response.body = { error: `The requested ${what} was not found`, data: null }
}

export async function collectionExists(ctx: Context) {
	// deno-lint-ignore no-explicit-any
	const c = ctx as any
	return (await getDocuments(c.params.database, c.params.collection)) !== null
}

export function sanitizeTestValues(values: string[]): DocumentTestValue {
	return values.map(value => {
		if (value.startsWith('str:')) return value.slice(4)
		if (value.startsWith('regex:')) return new RegExp(value.slice(6))

		throw 'INVALID_TEST_VALUE_START'
	})
}
