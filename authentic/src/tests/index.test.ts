import { IMicroservice, main } from "../";
import axios from "axios";
import * as mongodb from "mongodb";

const baseUrl = "http://localhost:3000";

//
// Invoke a function can capture its standard output.
//
async function captureOutput(fn: () => Promise<void>): Promise<string> {

    const mockConsole = jest.spyOn(global.console, 'log').mockImplementation(() => {});

    await fn();

    let output = "";

    for (const call of mockConsole.mock.calls) {
        for (const param of call) {
            output += param.toString();
        }
    }

    mockConsole.mockRestore();
    mockConsole.mockClear();

    return output;
}

//
// Checks that the object contains only whitelisted fields.
//
function checkWhitelist(data: any, allowedFields: string[]): void {
    const fields = Object.keys(data);
    for (const field of fields) {
        if (allowedFields.indexOf(field) < 0) {
            throw new Error(`Field ${field} is not in the list of allowed fields, expected one of ${allowedFields.join(", ")}\r\nObject: ${JSON.stringify(data, null, 4)}`);
        }
    }
}

//
// Check the register function matches the whilte list.
//
function checkRegisterWhitelist(data: any): void {
    checkWhitelist(data, [ "ok", "errorMessage", "id" ]);
}

//
// Registers a new user and returns their confirmation token.
//
async function registerNewUser(email: string, password: string, data?: any) {

    const output = await captureOutput(async () => {
        const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, {
            email: email,
            password: password,
            data: data,
        });
    
        expect(registerResponse.status).toBe(200);
        checkRegisterWhitelist(registerResponse.data);
    });

    return extractConfirmationToken(output);
}

//
// Extracts the confirmation token from debug output.
//
function extractConfirmationToken(output: string) {
    const match = /signup-confirmed\/(.*)\?/g.exec(output);
    const confirmationToken = match![1];
    return confirmationToken;
}

//
// Confirms a newly registered user.
//
async function confirmNewUser(email: string, confirmationToken: string) {
    const confirmResponse = await axios.post(`${baseUrl}/api/auth/confirm`, {
        email: email,
        token: confirmationToken
    });

    expect(confirmResponse.status).toBe(200);
    checkWhitelist(confirmResponse.data, [ "ok", "errorMessage", "id" ]);
}

//
// Validates that the input is a guid.
//
function validateGuid(guid: string): void {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(pattern.test(guid)).toBe(true);
}

//
// Extracts the password rest token from debug output.
//
function extractPasswordResetToken(output: string) {
    const match = /reset-password\/(.*)\?/g.exec(output);
    const token = match![1];
    return token;
}

//
// Requests a password reset.
//
async function requestPasswordReset(email: string) {
    const output = await captureOutput(async () => {
        const requestPwResetResponse = await axios.post(`${baseUrl}/api/auth/request-password-reset`, {
            email: email,
        });

        expect(requestPwResetResponse.status).toBe(200);
        expect(requestPwResetResponse.data).toBe("OK");
    });

    const token = extractPasswordResetToken(output);
    return token;
}

//
// Returns true if a collection exists.
//
async function collectionExists(db: mongodb.Db, collectionName: string): Promise<boolean> {
    const collections = await db.listCollections().toArray();
    return collections.some(collection => collection.name === collectionName);
}    

//
// Drops a collection from the database.
//
async function dropCollection(db: mongodb.Db, collectionName: string): Promise<void> {
    const exists = await collectionExists(db, collectionName);
    if (exists) {
        await db.collection(collectionName).drop();
    }
}

describe("authentic", () => {

    let microservice: IMicroservice;
    let usersCollection: mongodb.Collection<any>;

    beforeAll(async () => {
        microservice = await main();

        usersCollection = microservice.db.collection("users");
    });

    beforeEach(async ()  => {
        await dropCollection(microservice.db, "users");
    });

    afterAll(async () => {
        await microservice.stop();
    });

    const defaultEmail = "someone@something.com";
    const defaultPw = "fooey";

    //
    // Checks that a function throws an exception.
    //
    async function checkException(fn: () => Promise<void>, checkFn: (err: any) => void): Promise<void> {
        let thrownError;

        try {
            await fn();
        }
        catch (err) {
            thrownError = err;
        }

        expect(thrownError).toBeDefined();
        checkFn(thrownError);
    }

    it("can't register with no details", async () => {

        await checkException(
            () => axios.post(`${baseUrl}/api/auth/register`, {}),
            err => expect(err.response.status).toBe(500)
        );
    });

    it("registration must include password", async () => {
        await checkException(
            () => axios.post(`${baseUrl}/api/auth/register`, {
                email: defaultEmail,
            }),
            err => expect(err.response.status).toBe(500)
        );
    });
    
    it("registration must include email", async () => {
        await checkException(
            () => axios.post(`${baseUrl}/api/auth/register`, {
                password: defaultPw,
            }),
            err => expect(err.response.status).toBe(500)
        );
    });

    it("can register new user", async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        validateGuid(confirmationToken);
    });

    it("password is stored as a hash instead of as plain text", async () => {

        await registerNewUser(defaultEmail, defaultPw);

        const users = await usersCollection.find().toArray();
        expect(users.length).toBe(1);

        const user = users[0];
        expect(user.hash).not.toEqual(defaultPw);
    });

    it("can't register an unconfirmed user more than once", async () => {
        await registerNewUser(defaultEmail, defaultPw);

        const duplicateRegisterResponse = await axios.post(`${baseUrl}/api/auth/register`, {
                email: defaultEmail,
                password: defaultPw,
        });

        expect(duplicateRegisterResponse.status).toBe(200);
        expect(duplicateRegisterResponse.data.ok).toBe(true);
        checkRegisterWhitelist(duplicateRegisterResponse.data);
    });

    it("can resend confirmation", async () => {

        await registerNewUser(defaultEmail, defaultPw);

        const output = await captureOutput(async () => {
            const registerResponse = await axios.post(`${baseUrl}/api/auth/resend-confirmation-email`, {
                "email": "someone@something.com",
            });
        
            expect(registerResponse.status).toBe(200);
            expect(registerResponse.data).toBe("OK");
        });

        const confirmationToken = extractConfirmationToken(output);
        validateGuid(confirmationToken);
    });

    it("can confirm new user", async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);
    });

    it("can't register a confirmed user more than once", async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const duplicateRegisterResponse = await axios.post(`${baseUrl}/api/auth/register`, {
                email: defaultEmail,
                password: defaultPw,
        });

        expect(duplicateRegisterResponse.status).toBe(200);
        expect(duplicateRegisterResponse.data.ok).toBe(false);
        checkRegisterWhitelist(duplicateRegisterResponse.data);
    });    

    //
    // Check the response from /authenticate against the whitelist.
    //
    function checkAuthenticateResponse(data: any) {
        checkWhitelist(data, [ "ok", "id", "token", "errorMessage" ]);
    }

    it('can authenticate user', async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "fooey"
        });

        expect(authenticateResponse.status).toBe(200);
        expect(authenticateResponse.data.ok).toBe(true);
        expect(authenticateResponse.data.id).toBeDefined();
        expect(authenticateResponse.data.token).toBeDefined();
        checkAuthenticateResponse(authenticateResponse.data);
    });

    it("doesn't authenticate user when email isn't recognised", async () => {

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            email: "someone@something.com",
            password: "fooey"
        });

        expect(authenticateResponse.status).toBe(200);
        expect(authenticateResponse.data.ok).toBe(false);
        expect(authenticateResponse.data.errorMessage).toBeDefined();
        expect(authenticateResponse.data.id).toBeUndefined();
        expect(authenticateResponse.data.token).toBeUndefined();
        checkAuthenticateResponse(authenticateResponse.data);
    });

    it("doesn't authenticate user when email is wrong", async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            email: "someone@something.com",
            password: "fooster"
        });

        expect(authenticateResponse.status).toBe(200);
        expect(authenticateResponse.data.ok).toBe(false);
        expect(authenticateResponse.data.errorMessage).toBeDefined();
        expect(authenticateResponse.data.id).toBeUndefined();
        expect(authenticateResponse.data.token).toBeUndefined();
        checkAuthenticateResponse(authenticateResponse.data);
    });

    //
    // Check the response from /validate against the whitelist.
    //
    function checkValidateResponse(data: any) {
        checkWhitelist(data, [ "ok", "id", /*"token", "errorMessage"*/ ]);
    }

    it('can validate token', async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "fooey"
        });

        checkAuthenticateResponse(authenticateResponse.data);

        const token = authenticateResponse.data.token;
        const validateResponse = await axios.post(`${baseUrl}/api/auth/validate`, {
            "token": token,
        });

        expect(validateResponse.status).toBe(200);
        expect(validateResponse.data.ok).toBe(true);
        expect(validateResponse.data.id).toBeDefined();
        checkValidateResponse(validateResponse.data);
    });

    it("invalid token doesn't validate", async () => {

        const response = await axios.post(`${baseUrl}/api/auth/validate`, {
            "token": "1234",
        });

        expect(response.data.ok).toBe(false);
    });

    it('can refresh token', async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "fooey"
        });

        checkAuthenticateResponse(authenticateResponse.data);

        const token = authenticateResponse.data.token;
        const refreshResponse = await axios.post(`${baseUrl}/api/auth/refresh`, {
            "token": token,
        });

        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.data.ok).toBe(true);
        expect(refreshResponse.data.id).toBeDefined();
        expect(refreshResponse.data.token).toBeDefined();
        expect(refreshResponse.data.token).not.toEqual(token);
        checkWhitelist(refreshResponse.data, [ "ok", "id", "token" ])
    });

    it("can request password reset", async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const token = await requestPasswordReset(defaultEmail);
        validateGuid(token);
    });

    it("can reset password", async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const token = await requestPasswordReset(defaultEmail);

        const resetPwResponse = await axios.post(`${baseUrl}/api/auth/reset-password`, {
            email: "someone@something.com",
            password: "blah",
            token: token,
        });
    
        expect(resetPwResponse.status).toBe(200);
        checkWhitelist(resetPwResponse.data, [ "ok" ]);

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "blah"
        });

        expect(authenticateResponse.status).toBe(200);
        checkAuthenticateResponse(authenticateResponse.data);
    });

    it("can update password", async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "fooey"
        });

        checkAuthenticateResponse(authenticateResponse.data);

        const token = authenticateResponse.data.token;

        const updatePwdResponse = await axios.post(`${baseUrl}/api/auth/update-password`, {
            "token": token,
            "password": "blah"
        });

        expect(updatePwdResponse.status).toBe(200);
        expect(updatePwdResponse.data).toBe("OK");

        const authenticateResponse2 = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "blah"
        });

        expect(authenticateResponse2.status).toBe(200);
        checkAuthenticateResponse(authenticateResponse.data);
    });

    //
    // Checks the response from the users or user API.
    //
    function checkUserResponse(data: any) {
        checkWhitelist(data, [ "_id", "email", "confirmed", "signupDate", "data", ])
    }

    it("can get users", async () => {

        await registerNewUser("me@you.com", "1234");
        await registerNewUser("you@me.com", "ABCD");

        const usersResponse = await axios.get(`${baseUrl}/api/users`);

        expect(usersResponse.status).toBe(200);
        expect(usersResponse.data.length).toBe(2);

        const user1 = usersResponse.data[0];
        expect(user1.email).toEqual("me@you.com");
        checkUserResponse(user1);

        const user2 = usersResponse.data[1];
        expect(user2.email).toEqual("you@me.com");
        checkUserResponse(user2);
    });

    it("users api doesn't reveal password hash", async () => {

        await registerNewUser("me@you.com", "1234");

        const usersResponse = await axios.get(`${baseUrl}/api/users`);

        expect(usersResponse.status).toBe(200);
        expect(usersResponse.data.length).toBe(1);

        const user = usersResponse.data[0];
        expect(user.hash).toBeUndefined();
    });

    it("can get user", async () => {

        await registerNewUser("me@you.com", "1234");

        const usersResponse = await axios.get(`${baseUrl}/api/users`);
        const userId = usersResponse.data[0]._id;

        const userResponse = await axios.get(`${baseUrl}/api/user?id=${userId}`);

        expect(userResponse.status).toBe(200);
        
        const user = userResponse.data;
        expect(user.email).toEqual("me@you.com");
        checkUserResponse(user);
    });

    it("user api doesn't reveal password hash", async () => {

        await registerNewUser("me@you.com", "1234");

        const usersResponse = await axios.get(`${baseUrl}/api/users`);
        const userId = usersResponse.data[0]._id;

        const userResponse = await axios.get(`${baseUrl}/api/user?id=${userId}`);

        expect(userResponse.status).toBe(200);

        const user = userResponse.data;
        expect(user.hash).toBeUndefined();
    });

    it("can register user with data", async () => {

        const userData = {
            msg: "Hello World!",
        };

        await registerNewUser(defaultEmail, defaultPw, userData);

        const usersResponse = await axios.get(`${baseUrl}/api/users`);
        expect(usersResponse.data.length).toBe(1);
        expect(usersResponse.data[0].data).toEqual(userData);

        const userId = usersResponse.data[0]._id;

        const userResponse = await axios.get(`${baseUrl}/api/user?id=${userId}`);
        expect(userResponse.data.data).toEqual(userData);
    });

});