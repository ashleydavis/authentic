# Authentic

A microservice for authentication.

Based on [Node.js](https://nodejs.org/), [Express](https://expressjs.com/) and [Passport](http://www.passportjs.org/).

## Features

- New user registration.
- Password based authentication.
- Email-based confirmation.
- Email-based password reset.
- Authentication issues a [JWT](https://jwt.io/).
- Validates issued JWTs.

## Prerequisites

To use Authentic you need the following skills:

- Be able to use Docker to instantiate the Authentic image as a container in your production application.
- Be able to use Docker Compose if you want to run the example application or run the tests.
- Be able to make HTTP requests using [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) or [Postman](https://www.postman.com/) so you can explore and test Authentic's REST API.

# The example application

Authentic includes an example application in this repo under the [example](https://github.com/ashleydavis/authentic/tree/main/example) subdirectory.

## Run the example application

You need [Docker and Docker-Compose installed](https://docs.docker.com/get-docker/).

Clone this repo, then run the example application `docker-compose`:

```bash
cd authentic
docker-compose up --build
```

## Capture logging

Use the `tee` command to capture output to a file

```bash
docker-compose up --build 2>&1 | tee run.log
```

## Example UI

The example application contains an example UI implemented using [React](https://reactjs.org/).

You can find it in the [example/client](https://github.com/ashleydavis/authentic/tree/main/example/client) subdirectory.

## Exploring the Authentic REST API

Check out the file [tests/authenticate.http](https://github.com/ashleydavis/authentic/blob/main/tests/authenticate.http). It contains runnable examples of HTTP requests against the Authentic microservice's REST API.

You can use the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) plugin for [Visual Studio Code](https://code.visualstudio.com/) to run these HTTP requests.

# Using Authentic

## Database

Authentic requires a Monogdb database. You need to make one available and set the environment variable `DBHOST` and `DBNAME` to tell Authentic where to locate it's database. See the next section for an example.

## Usage in development

To instantiate the Authentic microservice in production include it in your Docker Compose file like this:

```yaml
  authentic:
    image: authentic:1.0.0
    container_name: authentic
    ports:
     - "5000:80"
    environment:
      - PORT=80
      - DBHOST=mongodb://db:27017
      - DBNAME=auth
      - NODE_ENV=development
      - JWT_SECRET=1234
    restart: "no"
```


For a real example see [docker-compose.yaml](https://github.com/ashleydavis/authentic/blob/main/docker-compose.yml) in this repo which starts the example application.

## Usage in production

To use in production instantiate the Docker image `authentic` to a container on your server or in your cluster. Make sure you configure necessary environment variables as described in the next section.

## Configuring Authentic

Authentic is configurable through multiple environment variables.

Variable | Default | Descrption
--- | --- | ---
JWT_SECRET (required) | None | Sets the secret used for encoding JWTs. 
JWT_ALGO | HS256 | Sets the algorithm for signing the JWT. [See allowed algorithms here](https://www.npmjs.com/package/jsonwebtoken#algorithms-supported).
JWT_VERSION | 1 | Sets a version number or label that is encoded in the JWT payload. You can change this to any string to invalidate all issued JWTs.
VERBOSE | false | Set to "true" to enable verbose logging to standard output.
NODE_ENV | unset | Set to "production" when running Authentic in production, otherwise "development" for development or "testing" for testing.
HOST | 0.0.0.0 | Sets the IP address the Authentic microservice is listening on.
PORT | 3000 | Sets the port number the microservice is listening on. Usually you'll want to set this to port 80 for production.
DBHOST | mongodb://localhost:27017 | Connection string for the Monogdb server Authentic will use.
DBNAME | auth | The name of the database where Authentic should keep it's data.
MAILER_HOST | http://mailer | Sets the host that handles sending email messages.
CONF_EMAIL_SUBJECT | Account confirmation | Sets the subject for the confirmation email.
CONF_EMAIL_TEMPLATE | Defaults to contents of template file. | Sets the content for the confirmation email.
PWRESET_EMAIL_SUBJECT | Password Reset | Sets the subject for the confirmation email.
PWRESET_EMAIL_TEMPLATE | Defaults to contents of template file. | Sets the content for the password reset request email.

## Using the Authentic REST API

Users are registered, authenticated and validated through Authentic's REST API.

You can try out the REST API using [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) (as mentioned earlier) or something else like [Postman](https://www.postman.com/).

### REST API overview

HTTP | Route | Description
--- | --- | ---
POST | /api/auth/register | Registers a new user and sends them a confirmation email.
POST | /api/auth/resend-confirmation-email | Resends the confirmation email to a new unconfirmed user.
POST | /api/auth/confirm | Confirms a new user (triggered through the link in the confirmation email).
POST | /api/auth/authenticate | Authenticates a user and issues a JWT.
POST | /api/auth/validate | Validates an issued JWT.
POST | /api/auth/refresh | Refreshes a valid JWT and issues a new JWT.
POST | /api/auth/request-password-reset | Requests a password reset for a user, sends the user an email to validate the request.
POST | /api/auth/reset-password | Resets a user's password (triggered from the pw reset validation email).
POST | /api/auth/update-password | Updates a user's password (requires a valid JWT).
GET | /api/user | Gets details for a particular user.
GET | /api/users | Gets details for all users.

### REST API documentation

More detailed documentation for the Authentic REST API.

**HTTP POST /api/auth/register**

Registers a new user and sends them a confirmation email.

#### Body

```json
{
    "email": "email address for the new user",
    "password": "password for the new user"
}
```

#### Response

```json
{
    "ok": "true or false",
    "errorMessage": "error message to display to user (when ok is false)"
}
```

**HTTP POST /api/auth/resend-confirmation-email**

Resends the confirmation email to a new unconfirmed user.

### Body

```json
{
    "email": "email address for the user requesting to resend the confirmation email",
}
```

### Response

Status 200

**HTTP POST /api/auth/confirm**

Confirms a new user (triggered through the link in the confirmation email).

&lt;confirmation-token&gt; is issued by the /register API directly to the user via their email.

#### Body

```json
{
    "email": "email address for the user that is confirming their account",
    "token": "the confirmation token that was issued to the user by email"
}
```

#### Response

```json
{
    "ok": "true or false",
    "errorMessage": "error message to display to user (when ok is false)"
}
```

**HTTP POST /api/auth/authenticate**

Authenticates a user and issues a JWT.

#### Body

```json
{
    "email": "email address for the user who is authenticating",
    "password": "password for the user"
}
```

#### Response

```json
{
    "ok": "true or false",
    "id": "unique id for the user",
    "token": "JWT issued for the user",
    "errorMessage": "error message to display to user (when ok is false)"
}
```

**HTTP POST /api/auth/validate**

Validates an issued JWT.

#### Body

```json
{
    "id": "unique id for the user",
    "token": "the JWT to be validated"
}
```

#### Response

```json
{
    "ok": "true or false",
    "id": "unique id for the user, if validated",
}
```

**HTTP POST /api/auth/refresh**

Refreshes a valid JWT and issues a new JWT.

#### Body

```json
{
    "token": "the JWT to be refreshed"
}
```

#### Response

```json
{
    "ok": "true or false",
    "id": "unique id for the user, if validated",
    "token": "new JWT issued for the user, if validated",
}
```

**HTTP POST /api/auth/request-password-reset**

Requests a password reset for a user, sends the user an email to validate the request.

#### Body

```json
{
    "email": "email address for the user requesting the pw reset"
}
```

#### Response

Status 200


**HTTP POST /api/auth/reset-password**

Resets a user's password (triggered from the pw reset validation email).

#### Body

```json
{
    "email": "email address for the user whose passwoord is being rest",
    "password": "new password for the user",
    "token": "the token issued to the user by email",
}
```

#### Response

```json
{
    "ok": "true or false",
    "id": "unique id for the user, if validated",
    "token": "new JWT issued for the user, if validated",
}
```

**HTTP POST /api/auth/update-password**

Updates a user's password (requires a valid JWT).

#### Body

```json
{
    "token": "JWT that was issued to the user who is updating their password",
    "password": "new password for the user",
}
```

#### Response

Status 200

**HTTP GET /api/user**

Gets details for a particular user.

#### Query parameters

```json
{
    "id": "ID of the user to get details for",
}
```

#### Response

JSON object containing user details.

**HTTP GET /api/users**

Gets details for all users.

#### Response

JSON array containing details for all users.

## Security concerns

Authentic is designed to be microservice that runs within a private network or private Kubernetes cluster.

**! Don't expose the Authentic microservice to the world !**

By itself Authentic has no authentication, it simply provides *authentication services* for a larger application. 

**You still need a gateway microservice that enforces the authentication services provided by Authentic.**

Please secure your Gateway microservice appropriatley and *never* expose the Authentic microservice to the outside world.

## Configuring email

**You must provide your own email microservice** that can send emails on Authentic's behalf.

By default this is located using DNS at https://mailer. You can set the `MAILER_HOST` environment variable to set the host name for the mailer microservice.

The example application includes a mock mailer microservice that simply prints emails to standard output (which is great for development and testing). **You must replace** this mock microservice with your own that implements email sending. It requires a single REST API for HTTP POST `/api/send` that accepts `to`, `subject`, `text` and (optional) `html` in the request body and then sends the email by whatever service you desire to use.

## Configuring email templates

Authentic email templates can be configured using the environment variables mentioned earlier.

Email templates are rendered using the [Mustache template engine](https://github.com/janl/mustache.js). You can use the following template variables within your email templates:

Variable | Description
--- | ---
HOST | The host name of the responsible website. E.g. the host name for your website!
TOKEN | The token that is being issued to the user via the email. E.g the confirmation token or password reset token.
EMAIL | The email address for the user that is about to be emailed.

## Debugging

For help debugging set the `VERBOSE` environment variable to `true`.

Also set `NODE_ENV` to `development`.

When debugging (check it out in the example application) the confirmation and password reset emails are simply printed to standard output. That means you can copy the confirmation and password reset links from standard output to test the process of registration and password reset without having to use real emails.


# Contributing

Please contribute! I accept pull requests for useful features that have automated tests and documentation.

## Future features needed

- Moving email templates to the database mailer. Have a UI for editing email templates.
- Examples of mailer implementations (e.g for Mailgun, GSuite and SMTP).
- Admin microservice with a UI for managing users.

## Running the automated tests

Authentic has a suite of automated integration tests.

Change into the Authentic microservice's subdirectory:

```bash
cd authentic/authentic/
```

You need a real database to run tests against, use Docker Compose to boot an instance of MongoDB:

```bash
docker-compose up
```

Then in another terminal, change to the directory:

```bash
cd authentic/authentic/
```

Set necessary environment variables:

```bash
export DBHOST=mongodb://localhost:6000
export NODE_ENV=testing
export JWT_SECRET=1234
export MAILER_HOST=http://localhost:6001
```

Or on Windows:

```bash
set DBHOST=mongodb://localhost:6000
set NODE_ENV=testing
set JWT_SECRET=1234
set MAILER_HOST=http://localhost:6001
```

Now run tests:

```bash
npm test
```

Or run tests in live reload mode:

```bash
npm run test:watch
```

# Contact

Please get in touch via [Twitter](https://twitter.com/ashleydavis75) or [Email](mailto:ashley@codecapers.com.au).
