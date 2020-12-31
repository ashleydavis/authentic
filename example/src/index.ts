import * as path from 'path';
import * as express from 'express';
import * as http from "http";
import Axios from 'axios';
const morganBody = require('morgan-body');

const inProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT && parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

/*async*/ function startServer() {
    return new Promise<void>(resolve => {
        app.listen(PORT, HOST, () => {
            console.log(`Running on http://${HOST}:${PORT}`);
            resolve();
        });
    });
}

async function main() {

    const staticPath = path.join(__dirname, "client");
    console.log("Serving static files from " + staticPath);
    app.use(express.static(staticPath));
               
    //
    // Forward a request to another service.
    //
    function forward(host: string, route: string, req: express.Request, res: express.Response): void {
        console.log(`Forwarding HTTP ${req.method} to ${host}${route}`);
        const forwardRequest = http.request(
            {
                host: host,
                path: route,
                method: req.method,
                headers: req.headers,
            }, 
            forwardResponse => {
                console.log(`Got response from ${host}${route}`);
                res.writeHead(forwardResponse.statusCode!, forwardResponse.headers);
                forwardResponse.pipe(res);
            }
        );
        
        req.pipe(forwardRequest);
    }

    //
    // Handle a HTTP post request and forward it.
    //
    function forwardPost(route: string, host: string) {
        console.log(`Forwarding HTTP post from ${route} to ${host}.`);
        app.post(route, (req, res) => {
            console.log(`Handling ${route}`);
            forward(host, route, req, res);
        });
    }

    if (!inProduction) {
        console.log("In development, registering morgan.");
        morganBody(app);
    }

    forwardPost("/api/auth/register", "authentic");
    forwardPost("/api/auth/resend-confirmation-email", "authentic");
    forwardPost("/api/auth/confirm", "authentic");
    forwardPost("/api/auth/authenticate", "authentic");
    forwardPost("/api/auth/request-password-reset", "authentic");
    forwardPost("/api/auth/reset-password", "authentic");

    app.get("/api/test1", (req, res) => {
        res.json({
            msg: "This data requires no authentication",
        });
    });

    // Every route after this point requires authentication.
    app.use((req, res, next) => {

        function authFailed() {
            console.warn("API request from unauthenticated user.");
            res.sendStatus(401);
        }

        console.log("Request headers:"); //fio:
        console.log(req.headers);

        if (!req.headers.authorization) {
            authFailed();
            return;
        }

        const token = req.headers.authorization.substring("Bearer ".length);

        //
        // TODO: This could be cached in this service for better performance.
        //
        Axios.post("http://authentic/api/auth/validate", {
                token: token,
            })
            .then(response => {
                if (!response.data.ok) {
                    authFailed();
                    return;
                }
                else {
                    (req as any).userId = response.data.id;
                    next();
                }
            })
            .catch(err => {
                console.error("Auth validation error:");
                console.error(err && err.stack || err);
                authFailed();
            });
    });

    // TODO: Add authenticated routes here.

    forwardPost("/api/auth/update-password", "authentic");
    forwardPost("/api/auth/validate", "authentic");
    forwardPost("/api/auth/refresh", "authentic");
    
    app.get("/api/test2", (req, res) => {
        res.json({
            msg: "This data requires authentication",
        });
    });
    
    await startServer();
}

main() 
    .then(() => console.log("Online"))
    .catch(err => {
        console.error("Failed to start!");
        console.error(err && err.stack || err);
    });
