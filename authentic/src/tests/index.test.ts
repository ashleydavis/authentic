import { IMicroservice, main } from "../";
import axios, { AxiosError } from "axios";
import * as mongodb from "mongodb";
import { fdatasync } from "fs";

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
// Registers a new user and returns their confirmation token.
//
async function registerNewUser(email: string, password: string) {

    const output = await captureOutput(async () => {
        const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, {
            email: email,
            password: password,
        });
    
        expect(registerResponse.status).toBe(200);
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

    it("can't register user more than once", async () => {
        await registerNewUser(defaultEmail, defaultPw);

        const duplicateRegisterResponse = await axios.post(`${baseUrl}/api/auth/register`, {
                email: defaultEmail,
                password: defaultPw,
        });

        expect(duplicateRegisterResponse.status).toBe(200);
        expect(duplicateRegisterResponse.data.ok).toBe(false);
    });
    
    it("can resend confirmation", async () => {

        await registerNewUser(defaultEmail, defaultPw);

        const output = await captureOutput(async () => {
            const registerResponse = await axios.post(`${baseUrl}/api/auth/resend-confirmation-email`, {
                "email": "someone@something.com",
                "password": "fooey"
            });
        
            expect(registerResponse.status).toBe(200);
        });

        const confirmationToken = extractConfirmationToken(output);
        validateGuid(confirmationToken);
    });

    it("can confirm new user", async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);
    });

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
    });

    it('can validate token', async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "fooey"
        });

        const token = authenticateResponse.data.token;
        const validateResponse = await axios.post(`${baseUrl}/api/auth/validate`, {
            "token": token,
        });

        expect(validateResponse.status).toBe(200);
        expect(validateResponse.data.ok).toBe(true);
        expect(validateResponse.data.id).toBeDefined();
    });

    it("invalid token doesn't validate", async () => {

        checkException(
            () => axios.post(`${baseUrl}/api/auth/validate`, {
                "token": "1234",
            }),
            err => {
                expect(err.response.status).toBe(500);
            }
        )
    });

    it('can refresh token', async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "fooey"
        });

        const token = authenticateResponse.data.token;
        const refreshResponse = await axios.post(`${baseUrl}/api/auth/refresh`, {
            "token": token,
        });

        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.data.ok).toBe(true);
        expect(refreshResponse.data.id).toBeDefined();
        expect(refreshResponse.data.token).toBeDefined();
        expect(refreshResponse.data.token).not.toEqual(token);
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

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "blah"
        });

        expect(authenticateResponse.status).toBe(200);
    });

    it("can update password", async () => {

        const confirmationToken = await registerNewUser(defaultEmail, defaultPw);
        await confirmNewUser(defaultEmail, confirmationToken);

        const authenticateResponse = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "fooey"
        });

        const token = authenticateResponse.data.token;

        const updatePwdResponse = await axios.post(`${baseUrl}/api/auth/update-password`, {
            "token": token,
            "password": "blah"
        });

        expect(updatePwdResponse.status).toBe(200);

        const authenticateResponse2 = await axios.post(`${baseUrl}/api/auth/authenticate`, {
            "email": "someone@something.com",
            "password": "blah"
        });

        expect(authenticateResponse2.status).toBe(200);
    });

    it("can get users", async () => {

        await registerNewUser("me@you.com", "1234");
        await registerNewUser("you@me.com", "ABCD");

        const usersResponse = await axios.get(`${baseUrl}/api/users`);

        expect(usersResponse.status).toBe(200);
        expect(usersResponse.data.length).toBe(2);

        const user1 = usersResponse.data[0];
        expect(user1.email).toEqual("me@you.com");

        const user2 = usersResponse.data[1];
        expect(user2.email).toEqual("you@me.com");
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
});