import { Persister } from '../mod.ts'
import { AwsSdk, Dynamo } from './deps.ts'

export interface DynamoConfig {
	tableName: string
	secretKeyId: string
	secretKey: string
	region: string
}

const TABLE_FIELDS = {
	id: 'I',
	data: 'D',
} as const

const DYNAMO_TYPES = {
	string: 'S',
	binary: 'B',
} as const

export function createDynamoPersister(config: DynamoConfig): Persister<Dynamo.DynamoDB> {
	return {
		name: 'dynamo',
		async setup() {
			const client = new AwsSdk.ApiFactory({
				region: config.region,
				credentials: { awsAccessKeyId: config.secretKeyId, awsSecretKey: config.secretKey },
			}).makeNew(Dynamo.DynamoDB)

			const output = await safelyDescribeTable(client, config.tableName)
			if (!output.Table) {
				await createAppropriateTable(client, config.tableName)
				return client
			}

			if (!output.Table.AttributeDefinitions) {
				throw new Error(`Table ${config.tableName} was already created, but expected it to have attribute definitions`)
			}

			const idDef = output.Table.AttributeDefinitions.find((attribute) => attribute.AttributeName === TABLE_FIELDS.id)
			if (!idDef) {
				throw new Error(`Table ${config.tableName} was already created, but expected it to have an '${TABLE_FIELDS.id}' attribute`)
			}

			if (idDef.AttributeType !== DYNAMO_TYPES.string) {
				throw new Error(`Table ${config.tableName} was already created, but expected its '${TABLE_FIELDS.id}' field to be of type string`)
			}

			return client
		},
		async get(client, id) {
			const output = await client.getItem({
				Key: {
					[TABLE_FIELDS.id]: {
						[DYNAMO_TYPES.string]: id,
					},
				},
				TableName: config.tableName,
			})

			if (!output.Item) return null

			const data = output.Item[TABLE_FIELDS.data]?.B
			if (!data) {
				throw new Error(`Table ${config.tableName} is misconfigured. Expected field '${TABLE_FIELDS.data}' to be specified as binary`)
			}

			if (!(data instanceof Uint8Array)) throw new Error(`Expected binary data, but got '${typeof data}'`)

			return data
		},
		async set(client, id, data) {
			await client.putItem({
				TableName: config.tableName,
				Item: {
					[TABLE_FIELDS.id]: {
						[DYNAMO_TYPES.string]: id,
					},
					[TABLE_FIELDS.data]: {
						[DYNAMO_TYPES.binary]: data,
					},
				},
			})
		},
		async remove(client, id) {
			await client.deleteItem({
				TableName: config.tableName,
				Key: {
					[TABLE_FIELDS.id]: {
						[DYNAMO_TYPES.string]: id,
					},
				},
			})
		},
	}
}

async function createAppropriateTable(client: Dynamo.DynamoDB, tableName: string) {
	await client.createTable({
		TableName: tableName,
		AttributeDefinitions: [
			{ AttributeName: TABLE_FIELDS.id, AttributeType: DYNAMO_TYPES.string },
			// { AttributeName: TABLE_FIELDS.data, AttributeType: DYNAMO_TYPES.binary },
		],
		KeySchema: [
			{ AttributeName: TABLE_FIELDS.id, KeyType: 'HASH' },
		],
		ProvisionedThroughput: {
			ReadCapacityUnits: 1,
			WriteCapacityUnits: 1,
		},
	})
}

async function safelyDescribeTable(client: Dynamo.DynamoDB, tableName: string) {
	try {
		const output = await client.describeTable({ TableName: tableName })
		return output
	} catch (error) {
		if (error.message?.startsWith('ResourceNotFoundException:')) return { Table: null }

		throw error
	}
}
