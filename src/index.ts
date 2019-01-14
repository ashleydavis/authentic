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

// Constants
const PORT = process.env.PORT && parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

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
        
    const dbHost = process.env.DBHOST || "mongodb://localhost:27017";
    const client = await mongodb.MongoClient.connect(dbHost);
    const db = client.db(process.env.DBNAME || "web");

    app.get("/data", (req, res) => {
        const collection = db.collection("mycollection");
        collection.find().toArray()
            .then(data => {
                res.json(data);
            })
            .catch(err => {
                console.error("Error retreiving data.");
                console.error(err && err.stack || err);

                res.sendStatus(500);
            });
    });

    const MongoStore = connectMongo(session);
    const sessionStore = new MongoStore({
        url: dbHost,
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
    morganBody(app); //TODO: Dev only.

    app.use("/api/auth", initAuthApi(app, db));

    await startServer();
}

main() 
    .then(() => console.log("Online"))
    .catch(err => {
        console.error("Failed to start!");
        console.error(err && err.stack || err);
    });
