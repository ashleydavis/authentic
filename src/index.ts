import * as path from 'path';
import * as express from 'express';
import * as mongodb from 'mongodb';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';
import * as connectMongo from 'connect-mongo';
import { sendEmail } from './mailer';
const conf = require('confucious');
conf.pushJsonFile(path.join(__dirname, "config.json"));
const morganBody = require('morgan-body');
import { initAuthApi } from './auth';

import { get } from './utils/rest';
// Constants
const inProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT && parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DBHOST = process.env.DBHOST || "mongodb://localhost:27017";
const DBNAME = process.env.DBNAME || "auth-test";
const SESSIONDB = process.env.SESSIONDB || "mongodb://localhost:27017/" + DBNAME;
console.log("Using DBHOST " + DBHOST);
console.log("Using DB " + DBNAME);

// App
const app = express();

/*async*/ function startServer() {
    return new Promise((resolve, reject) => {
        app.listen(PORT, HOST, (err: any) => {
            if (err) {
                reject(err);
            }
            else {
                console.log(`Running on http://${HOST}:${PORT}`);
                resolve();
            }
        });
    });
}

async function main() {

    const staticPath = path.join(__dirname, "client");
    console.log("Serving static files from " + staticPath);
    app.use(express.static(staticPath));
        
    const publicPath = path.join(__dirname, "../public");
    console.log("Serving static assets from " + publicPath);
    app.use(express.static(publicPath));
        
    const client = await mongodb.MongoClient.connect(DBHOST);
    const db = client.db(DBNAME);

    const MongoStore = connectMongo(session);
    const sessionStore = new MongoStore({
        url: SESSIONDB,
        collection: "sessions",
        autoReconnect: true,
    });    

    app.use(session({
        secret: "ed86d134-69bc-4e8d-a295-a95c198729ad",
        store: sessionStore,
        resave: true, //TODO: Check if this can be set to false for my store.
        saveUninitialized: true,
    }));

    app.use(bodyParser.json());
    if (!inProduction) {
        morganBody(app);
    }

    app.use("/api/auth", initAuthApi(app, db));

	// TODO: Add non-authenticated routes here.

    // Every route after this point requires authentication.
    app.use((req, res, next) => {
        if (!req.user) {
            // Not authenticated.
            console.warn("API request from unauthenticated user.");
            res.sendStatus(401);
        }
        else {
            return next();
        }
    });

	// TODO: Add authenticated routes here.
    
    await startServer();
}

main() 
    .then(() => console.log("Online"))
    .catch(err => {
        console.error("Failed to start!");
        console.error(err && err.stack || err);
    });
