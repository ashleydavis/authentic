import * as express from 'express';
import * as bodyParser from 'body-parser';
const morganBody = require('morgan-body');

const isVerbose = process.env.VERBOSE === "true";
const inDevelpment = process.env.NODE_ENV === "development"; 
const PORT = process.env.PORT && parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

function verbose(msg: string): void {
    if (isVerbose) {
        console.log(msg);
    }
}

const app = express();

/*async*/ function startServer() {
    return new Promise<void>(resolve => {
        app.listen(PORT, HOST, () => {
            verbose(`Running on http://${HOST}:${PORT}`);
            resolve();
        });
    });
}

export async function main(): Promise<void> {

    app.use(bodyParser.json());

    if (inDevelpment) {
        verbose("In development, registering morgan.");
        morganBody(app);
    }

    /*
    HTTP POST /auth/send
    BODY
    {
        "to": "someone@something.com",
        "subject": "An email!",
        "text": "Email body (text version)",
        "html":  "Email body (HTML version)",
    }
    */
    post(app, "/api/send", async (req, res) => {

        const to = verifyBodyParam("to", req);
        const subject = verifyBodyParam("subject", req);
        const text = verifyBodyParam("text", req);
        const html = req.body.html;

        console.log("Email:");
        console.log("To: " + to);
        console.log("Subject: " + subject);
        console.log("Text: " + text);
        console.log("HTML: " + html);
        
        //
        // TODO: Use your desired email service here.
        //

        res.sendStatus(200);
    });

    await startServer();
}

main() 
    .then(() => verbose("Online"))
    .catch(err => {
        console.error("Failed to start!");
        console.error(err && err.stack || err);
    });

//
// Helper for HTTP POST with async handler.
//
function post(app: express.Router, route: string, handler: (req: express.Request, res: express.Response) => Promise<void>) {
    verbose("Registering HTTP POST " + route);
    app.post(route, (req, res) => {
        verbose("Handling HTTP POST " + route);
        handler(req,  res)
            .catch(err => {
                console.error("Error from handler: HTTP POST " + route);
                console.error(err && err.stack || err);

                res.sendStatus(500);
            });
    });
}

//
// Verify that a body parameter to a request is set.
//
function verifyBodyParam(name: string, req: any): string {
    if (!req.body[name]) {
        throw new Error("Missing body parameter " + name);
    }

    return req.body[name];
}    
