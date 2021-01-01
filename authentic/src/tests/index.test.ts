import { main } from "../";
import axios from "axios";
import * as mongodb from "mongodb";

const baseUrl = "http://localhost:3000";

describe("authentic", () => {

    //
    // Registers a new user and returns their confirmation token.
    //
    async function registerNewUser() {
        const mockConsole = jest.spyOn(global.console, 'log');
    
        const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, {
            "email": "someone@something.com",
            "password": "fooey"
        });
    
        expect(registerResponse.status).toBe(200);
    
        let output = "";
    
        for (const call of mockConsole.mock.calls) {
            for (const param of call) {
                output += param.toString();
            }
        }
    
        const match = /signup-confirmed\/(.*)\?/g.exec(output);
    
        const confirmationToken = match![1];
        console.log(confirmationToken);

        mockConsole.mockRestore(); //todo: do I need this?
        mockConsole.mockClear();

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
    
    it("can register new user", async () => {

        const microservice = await main();

        await dropCollection(microservice.db, "users");

        const confirmationToken = await registerNewUser();
        expect(confirmationToken).toBeDefined();

        await microservice.stop();

    });

    
    it("can confirm new user", async () => {

        const microservice = await main();

        await dropCollection(microservice.db, "users");

        const confirmationToken = await registerNewUser();

        await confirmNewUser(confirmationToken);

        await microservice.stop();

    });

    //todo:
    //
    // must provide valid email
    // must provide valid password
    // can't register user more than once
});

