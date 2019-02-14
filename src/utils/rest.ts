import * as express from 'express';

//
// Helper for HTTP POST with async handler.
//
export function post(app: express.Router, route: string, handler: (req: express.Request, res: express.Response) => Promise<void>) {
    console.log("Registering HTTP POST " + route);
    app.post(route, (req, res) => {
        handler(req,  res)
            .catch(err => {
                console.error("Error from handler: HTTP POST " + route);
                console.error(err && err.stack || err);

                res.sendStatus(500);
            });
    });
}

//
// Helper for HTTP GET with async handler.
//
export function get(app: express.Router, route: string, handler: (req: express.Request, res: express.Response) => Promise<void>) {
    console.log("Registering HTTP GET " + route);
    app.get(route, (req, res) => {
        handler(req,  res)
            .catch(err => {
                console.error("Error from handler: HTTP GET " + route);
                console.error(err && err.stack || err);

                res.sendStatus(500);
            });
    });
}

//
// Verify that a query parameter to a request is set.
//
export function verifyQueryParam(name: string, req: any): string {
    if (!req.query[name]) {
        throw new Error("Missing query parameter " + name);
    }

    return req.query[name];
}

//
// Verify that a body parameter to a request is set.
//
export function verifyBodyParam(name: string, req: any): string {
    if (!req.body[name]) {
        throw new Error("Missing body parameter " + name);
    }

    return req.body[name];
}