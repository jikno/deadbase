# Deadbase

The _dead simple_ document database (v2).

## Ideology

Deadbase supports only id-based lookups with a maximum document size of 400KB. If you need more document space, use a file storage service
(or similar). If you need advanced searching, use an in-memory search service, which is far more performant and flexible than a full-scale
database.

The primary downside to this service is that it can't efficiently perform filtering. It was built to be used more in client-heavy services,
like applications, not on-demand services like websites and traditional REST apis.

## Usage

```ts
import { makeDatabase } from 'https://code.jikno.com/deadbase/mod.ts'
import { makeLocal } from 'https://code.jikno.com/deadbase/persisters/local/mod.ts'

const db = makeDatabase({
	persister: await makeLocal({ directory: 'data' }), // Or use the "dynamo" persister (persisters/dynamo/mod.ts)
})

interface User {
	email: string
	name: string
}

const User = db.document<User>('users')

const unsubscribe = User.subscribe('some-id-here', (doc) => console.log(doc))

await User.setItem('some-id-here', { email: 'john.doe@example.com', name: 'John Doe' })
await User.getItem('some-id-here') // -> { email: 'john.doe ... }
await User.removeItem('some-id-here')
```

## Duo-Index Strategy

There are cases, though, where more than one primary key will greatly improve performance. For these, simple "index documents" can be setup.
Take the following example of a user. We want to be able to get the user by its id or email.

For this, we can have two collections, one of the full user, keyed by the user's id. The other can be a simple email->userId mapping, where
the user's email is the id of the document that contains the user's id.

## Persisters

A persister can be registered to be the place where data is persisted.

Later, there should be the functionality for multiple persisters to be registered, where data is set at each, and fetched from the persister
with the lowest latency. There could also be hashing functions to determine which documents are set to which persisters.

## Caching (coming later)

Results are cached in RAM up to a predefined max cache size.

Multiple instances of the same program communicate with each other to update their caches through channels.

### Error Handling (coming later)

If the setting of a persister errors, it will be retried three times. If it never works, the `onPersistFailure` fn will be called with the
state of the un-persistable document.

This handler could then open up a support ticket to resolve the issue that could contain the timestamp of the failure and the content of the
document.
