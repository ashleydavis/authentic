import { IMicroservice, main } from "../";
import axios from "axios";
import * as mongodb from "mongodb";
import { fdatasync } from "fs";

const baseUrl = "http://localhost:3000";

//
// Invoke a function can capture its standard output.
//
async function captureOutput(fn: () => Promise<void>): Promise<string> {

    const mockConsole = jest.spyOn(global.console, 'log');

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
async function registerNewUser() {

    const output = await captureOutput(async () => {
        const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, {
            "email": "someone@something.com",
            "password": "fooey"
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
async function confirmNewUser(confirmationToken: string) {
    const confirmResponse = await axios.post(`${baseUrl}/api/auth/confirm`, {
        "email": "someone@something.com",
        "token": confirmationToken
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

    beforeAll(async () => {
        microservice = await main();
    });

    beforeEach(async ()  => {
        await dropCollection(microservice.db, "users");
    });

    afterAll(async () => {
        await microservice.stop();
    });
    
    it("can register new user", async () => {

        const confirmationToken = await registerNewUser();
        validateGuid(confirmationToken);
    });

    
    it("can resend confirmation", async () => {

        await registerNewUser();

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

        const confirmationToken = await registerNewUser();
        await confirmNewUser(confirmationToken);
    });

    //todo:
    //
    // must provide valid email
    // must provide valid password
    // can't register user more than once
});

