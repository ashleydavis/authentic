import { main } from "../";
import axios from "axios";

const baseUrl = "http://localhost:3000";

describe("authentic", () => {

    it("can register and then confirm new user", async () => { //TODO: break this up into two tests with helper fns.

        const microservice = await main();

        const usersCollection = microservice.db.collection("users");
        await usersCollection.drop();

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

        const confirmResponse = await axios.post(`${baseUrl}/api/auth/confirm`, {
            "email": "someone@something.com",
            "token": confirmationToken
        });

        expect(confirmResponse.status).toBe(200);

        await microservice.stop();

        mockConsole.mockRestore(); //todo: do I need this?
        mockConsole.mockClear();
    });

    //todo:
    //
    // must provide valid email
    // must provide valid password
    // can't register user more than once
});