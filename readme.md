# DeadBase

The _dead simple_ document database.

## Goals

1. Provide a dead simple and familiar database model with an equally simple api.  Just one http `POST` or `GET` request to query the database.  No long-lived connections are necessary.  Works in out-of-the-box in AWS Lambda, Cloudflare workers, etc.

2. Dynamically typed.  This improves query and developer speed.  Data model typings, if required, can be done per-language via the different drivers in a way that best suites that language.

3. Efficient, simple, and logical authentication system.  There is a root token to create a new databases, then database-specific tokens for each operation on that database's collections and documents.

## Installation

With Deno:

```sh
deno install --unstable --allow-read --allow-write --allow-net --allow-env --name deadbase -f https://denopkg.com/jikno/deadbase/main.ts
```

<!-- Otherwise, you can just [download your OS' supported binary](https://github.com/jikno/deadbase/releases/latest) and run it. -->

## Usage

To start the server, simply run...

```sh
deadbase start
```

...which starts the database on port `2780` or whatever the `PORT` env variable is.

```sh
export PORT=3000
deadbase start
```

### Data Persistance

By default, DeadBase stores the databases in `./data`.  This can be changed using the `DEADBASE_DATA_ROOT` env var.

```sh
export DEADBASE_DATA_ROOT=/var/data
deadbase start # now the data is stored in /var/data instead of ./data
```

You can now interact with Deadbase through the [Rest Api](#rest-api), the [Official GUI client](https://github.com/jikno/deadbase_gui), or the [Deno driver](https://github.com/jikno/deadbase-driver-deno).

### Root Token

If the `DEADBASE_MASTER_PASSWORD` env var is set when DeadBase starts up, the following operations will have to send up an `Authentication` header containing the value of the said env var:

- Creating a new database
- Deleting an existing database
- Changing the database-specific auth token

## Methodology

Each deadbase instance can have an unlimited number of databases.  Each database can have an unlimited number of collections.  Each collection can have an unlimited number of documents.

A document represents an actual document on the deadbase hard drive.  Each document must have an id.  If the document body does not have an `id` field on it, one is created automatically and given the value of a uuid.

## REST API

All responses are in this form:

```json
{
	"error": string, // null if there is no error,
	"data": any // null if there is an error
}
```

### Authentication

The appropriate authentication token for each operation must be passed along in the `Authentication` header.

If the operation is mentioned as requiring "root authentication" the passed auth token must be the root authentication token specified when starting this service.  See [Root Token](#root-token) for more details.  If the Root Token was not set when starting deadbase, this field is not checked.

Otherwise, the operation is performed on a database and the database's auth token should be used.

### Databases

To create a database, send a POST request to `/` containing the following JSON payload.  Creating a database required [root authentication](#authentication).

- _(required)_ `name`: The name of the database.  Only alpha-numeric characters (A-Z, a-z, 0-9), underscores (_), dashes (-), dollar-signs ($), and dots (.) are allowed.
- `auth`: The database's new authentication token.  Certain operations on this database will require this authentication token.

Send a `PUT` request to `/:database_name` with the above payload to edit the database information.  Requires [root authentication](#authentication).

Send a `DELETE` request to `/:database_name` to delete the database.  Requires [root authentication](#authentication).

Send a `GET` request to `/:database_name` to get the usage information of the database.  Returns a `size` field that represents the storage space the database is using in GB.  The operation also returns `requests.read` and `requests.write` fields that represent the number of read and write operations of documents in that database.

Send a `GET` request to `/:database_name/collections` to get the names of all the collections in the database.

### Collections

To create a collection, `POST` to `/:database_name/collections` with the following payload.

- _(required)_ `name`: The name of the collection.  Only alpha-numeric characters (A-Z, a-z, 0-9), underscores (_), dashes (-), and dollar-signs ($) are allowed.

To rename the collection, send a `PUT` request to `/:database_name/collections/:collection_name`.

Send a `DELETE` request to `/:database_name/:collections/:collection_name` to delete a collection.

Send a `GET` request to `/:database_name/collections/:collection_name/documents` to get the id's of all the documents in this collection.

### Documents

To create or update a document, `POST` to `/:database_name/collections/:collection_name/setDocument`.  The body of the request should contain the document data in JSON form.

The document's id will be:
- The value of the document property matching the `idField` query parameter.
- If the `idField` query parameter was not specified, the value of the document's `id`.
- If the document doesn't have an `id` field, a random uuid.

If this id matches an existing document, it will be replaced with the uploaded document.  Otherwise, a new document will be created.

The server will respond with the document's id.

To get a document, send a `GET` request to `/:database_name/collections/:collection_name/documents/:document_id`.

#### Querying documents

To get a single document based on a certain key it has, send a `POST` request to `/:database_name/collections/:collection_name/findDocumentByKey` with a payload of the following:
- _(required)_ `key`: A string literal representing a certain key in the document.  Nested keys can be accessed using the dot notation (eg, `foo.bars.3.baz`)
- _(required)_ `values`: An array containing values to match the document value determined upon by `key` to.  Each item can be a:
	- string:  Must be a string literal pre-pended with `str:`
	- regular expression: Must be a stringified version of the regex pre-pended with `regex:`

Responds with the id of the first document that passes the test or `null`.

To do the same thing as above, but get all documents that pass the key-value test, do the same as above, but instead of posting to `findDocumentByKey`, use `findManyDocumentsByKey`.  This endpoint responds with an array of all the document id's that passed the key-value test.
