import * as path from 'path';
import * as express from 'express';
import * as mongodb from 'mongodb';
import * as bcrypt from 'bcrypt-nodejs';
import * as passport from 'passport';
import * as bodyParser from 'body-parser';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt  } from 'passport-jwt';
import * as uuid from 'uuid';
import * as fs from "fs";
import * as mustache from 'mustache';
import * as jwt from "jsonwebtoken";
import * as moment from "moment";
import { Server } from 'http';
import axios from 'axios';
const { randomInRange } = require("make-random");
const morganBody = require('morgan-body');

const isVerbose = process.env.VERBOSE === "true";
const inProduction = process.env.NODE_ENV === "production";
const inDevelopment = process.env.NODE_ENV === "development"; 
const inTesting = process.env.NODE_ENV === "testing"; 
const PORT = process.env.PORT && parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DBHOST = process.env.DBHOST || "mongodb://localhost:27017";
const DBNAME = process.env.DBNAME || "auth";
const CONF_EMAIL_SUBJECT = process.env.CONF_EMAIL_SUBJECT || "Account confirmation";
const CONF_EMAIL_TEMPLATE = process.env.CONF_EMAIL_TEMPLATE;
const PWRESET_EMAIL_SUBJECT = process.env.PWRESET_EMAIL_SUBJECT || "Password Reset";
const PWRESET_EMAIL_TEMPLATE = process.env.PWRESET_EMAIL_TEMPLATE;
const MAILER_HOST = process.env.MAILER_HOST || "http://mailer";
const PW_RESET_TOKEN_TYPE = process.env.PW_RESET_TOKEN_TYPE || "uuid";
const MASTER_PW = process.env.MASTER_PW;

function verbose(msg: string): void {
    if (isVerbose) {
        console.log(msg);
    }
}

verbose("Using DBHOST " + DBHOST);
verbose("Using DB " + DBNAME);

//
// Folder with email templates.
//
const templateFolderPath = path.join(__dirname, "../templates");

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    throw new Error("Expected environment variable JWT_SECRET, please set this environment variable to a random string of characters known only to you.");
}
const JWT_ALGO = process.env.JWT_ALGO as jwt.Algorithm || "HS256";
const JWT_VERSION = process.env.JWT_VERSION || 1;

//
// Interface that defines the contents of a JWT.
//
interface IJwtPayload {
    //
    // User ID.
    //
    sub: string;

    // 
    // JWT version number.
    //
    v: any;

    //
    // Expiry date for the token.
    //
    expiry: string;
}

const app = express();

/*async*/ function startServer() {
    return new Promise<Server>(resolve => {
        const server = app.listen(PORT, HOST, () => {
            verbose(`Running on http://${HOST}:${PORT}`);
            resolve(server);
        });
    });
}

//
// Interface that represents the running microservice.
// This is just used for testing.
// 
export interface IMicroservice {

    //
    // Stops the microservice.
    //
    stop(): Promise<void>;

    //
    // The microservice's database.
    //
    db: mongodb.Db;
}

//
// Creates a capped collection. This is like a circular buffer in the database.
//
export async function createCappedCollection(collectionName: string, size: number, firstDoc: any, db: mongodb.Db): Promise<void> {
    let collection = db.collection(collectionName);
    const count = await collection.find().count();
    if (count === 0) {
        //
        // Collection not created yet.
        //
        collection = await db.createCollection(collectionName, { capped: true, size: size });

        //
        // Insert first document so we don't try to create it again.
        //
        await collection.insertOne(firstDoc);
    }
}

//
// Used for recording system events.
//
interface IEvent {
    //
    // The name of the event.
    //
    event: string;

    //
    // The date the event ocurred.
    //
    date: Date;

    //
    // Data attached to the event.
    //
    data: any;
}

export async function main(): Promise<IMicroservice> {

    const client = await mongodb.MongoClient.connect(DBHOST, { useUnifiedTopology: true });
    const db = client.db(DBNAME);

    app.use(bodyParser.json());

    if (isVerbose || inDevelopment) {
        verbose("Verbose or development enabled, registering morgan.");
        morganBody(app);
    }

    app.use(passport.initialize());

    const usersCollection = db.collection("users");
    await createCappedCollection("events", 1000000, { event: "first", date: new Date(), data: {} }, db);
    const events = db.collection<IEvent>("events"); 

    //
    // Validate a JWT payload and returns the user it represents.
    //
    async function validateJwtPayload(tokenPayload: IJwtPayload): Promise<any | undefined> {
        if (!tokenPayload.sub || !tokenPayload.v || !tokenPayload.expiry) {
            // Invalid payload.
            return undefined;
        }

        if (tokenPayload.v !== JWT_VERSION) {
            // Payload version is not valid.
            return undefined;
        }

        const isExpired = moment(tokenPayload.expiry).isSameOrBefore(moment().utc());
        if (isExpired) {
            // Token has expired.
            return undefined;
        }

        const userId = new mongodb.ObjectId(tokenPayload.sub);
        const user = await usersCollection.findOne({ _id: userId }); //TODO: Database look should only be when starting a new app session.
        if (!user) {
            // User doesn't exist.
            return undefined;
        }

        return user;
    }

    // https://medium.com/swlh/everything-you-need-to-know-about-the-passport-jwt-passport-js-strategy-8b69f39014b0
    // https://github.com/mikenicholson/passport-jwt
    passport.use(
        new JwtStrategy( //TODO: This isn't really used.
            {
                jwtFromRequest: ExtractJwt.fromExtractors([
                    ExtractJwt.fromAuthHeaderAsBearerToken(),
                    ExtractJwt.fromUrlQueryParameter("t"),
                ]),
                secretOrKey: JWT_SECRET,
                algorithms: [ JWT_ALGO ],
            },            
            (jwt_payload: IJwtPayload, done) => {
                try {
                    validateJwtPayload(jwt_payload)
                        .then(user => {
                            if (user) {
                                done(null, user);
                            }
                            else {
                                done(null, false);
                            }
                        })
                        .catch(err => {
                            done(err, false); 
                        });
                }
                catch (err) {
                    done(err, false);
                }
            }
        )
    );

    passport.use(
        new LocalStrategy(
            {
                usernameField: 'email',
                passwordField: 'password',
            },            
            (email, password, done) => {
                usersCollection.findOne({ email: email.toLowerCase() }, function (err, user) {
                    if (err) { 
                        return done(err); 
                    }

                    if (!user) {
                        return done(null, false);
                    }

                    if (!user.confirmed) {
                        done(null, false);
                        return;
                    }

                    validatePassword(user, password)
                        .then(validated => {
                            if (!validated) {
                                done(null, false);
                            }
                            else {
                                done(null, user);
                            }
                        })
                        .catch(err => {
                            done(err, null);
                        });
                }
            );
        }
    ));
    
    passport.serializeUser((user: any, done) => {
        done(null, user._id.toString()); //TODO: This throws an error when trying to sign in an invalid user name.
    });
      
    passport.deserializeUser((id: string, done) => {
        usersCollection.findOne({ _id: new mongodb.ObjectId(id) }, function (err, user) {
            done(err, user);
        });
    });

    /*
    HTTP POST /api/auth/register
    BODY
    {
        "email": "someone@something.com",
        "password": "fooey"
        "data": <optional data to attach to the user>
    }
    */
    post(app, "/api/auth/register", async (req, res) => {

        const email = verifyBodyParam("email", req).toLowerCase();
        const password = verifyBodyParam("password", req);

        verbose("Registering new user: " + email);

        //
        // Check the user doesn't already exist.
        //
        const existingUser = await usersCollection.findOne({ email: email });
        if (existingUser) {
            if (existingUser.confirmed) {
                // They already confirmed.
                res.json({
                    ok: false,
                    errorMessage: "This email address has already been registered.",
                });
                return;
            }

            // Delete the existing user that is unconfirmed so they can register again.
            await usersCollection.deleteOne({ _id: existingUser._id });
        }

        const confirmAccountTimeoutMinutes = 60;
        const confirmAccountTimeoutMillis = confirmAccountTimeoutMinutes * 60 * 1000;

        const hash = bcrypt.hashSync(password);
        const confirmationToken = uuid.v4();
        
        const result = await usersCollection.insertOne({
            email: email,
            hash: hash,
            confirmationToken: confirmationToken,
            confirmationTokenExpires: Date.now() + confirmAccountTimeoutMillis,
            confirmed: false,
            signupDate: new Date(),
            data: req.body.data,
        });

        await events.insertOne({ event: "registered", date: new Date(), data: { userId: result.insertedId, email: email } });

        await sendSignupConfirmationEmail(email, confirmationToken, req.headers.host!, events);

        res.json({
            ok: true,
            id: result.insertedId,
        });
    });

    /*
    HTTP POST /api/auth/resend-confirmation-email
    BODY
    {
        "email": "someone@something.com",
    }
    */
   post(app, "/api/auth/resend-confirmation-email", async (req, res) => {

        const curDate = Date.now();

        const email = verifyBodyParam("email", req).toLowerCase();
        const user = await usersCollection.findOne({
            email: email,
            confirmed: false,
            confirmationTokenExpires: { // Token expiry must be greater than current time.
                $gt: curDate,
            },
        });

        //TODO: if no user send error.

        await sendSignupConfirmationEmail(email, user.confirmationToken, req.headers.host!, events);

        res.sendStatus(200);
    });

    /*
    HTTP POST /api/auth/confirm
    
    BODY
    {
        "email": "someone@something.com",
        "token": "<confirmation-token>"
    }
    */
    post(app, "/api/auth/confirm", async (req, res) => {

        const curDate = Date.now();

        const email = verifyBodyParam("email", req).toLowerCase().trim();
        const token = verifyBodyParam("token", req);

        const user = await usersCollection.findOne({ // Find the pending signup.
            email: email,
            confirmationToken: token,
            confirmationTokenExpires: { // Token expiry must be greater than current time.
                $gt: curDate,
            },
            confirmed: false, // Must not already be confirmed.
        });

        if (!user) {
            res.json({ 
                ok: false,
                errorMessage: "No user with those details is awaiting confirmation.",
            });
            return;
        }

        await usersCollection.updateOne({
                _id: user._id,
            },
            {
                $set: {
                    confirmed: true,
                    confirmedDate: curDate,
                },
            }
        );

        await events.insertOne({ event: "confirmed", date: new Date(), data: { userId: user._id, email: email } });

        res.json({ 
            ok: true,
            id: user._id,
        });
    });

    /*
    HTTP POST /api/auth/authenticate
    BODY
    {
        "email": "a@a.com",
        "password": "a"
    }
    */
    post(app, "/api/auth/authenticate", async (req, res) => {
        await authenticateLocal(req, res, events);
    });

    /*
    HTTP POST /api/auth/validate
    BODY
    {
        "id": "<user-id>",
        "token": "<auth-token>"
    }

    RESPONSE
    {
        ok: <boolean>,
        id: <user-id>
    }
    */
    post(app, "/api/auth/validate", async (req, res) => {

        const token = verifyBodyParam("token", req);

        try {
            const tokenPayload = jwt.verify(token, JWT_SECRET, { algorithms: [ JWT_ALGO ] }) as IJwtPayload;
    
            const user = await validateJwtPayload(tokenPayload);
            if (!user) {
                // Not valid.
                res.json({ ok: false });
                return;
            }

            //
            // This event is too nosiy!
            //
            //await events.insertOne({ event: "token-validated", date: new Date(), data: { userId: user._id } });
            
            // Validated.
            res.json({ 
                ok: true, 
                id: tokenPayload.sub,
            });
        }
        catch (err) {
            // Not valid.
            res.json({ ok: false });
            return;
        }
    });

    /*
    HTTP POST /api/auth/refresh
    BODY
    {
        "token": "<auth-token>"
    }

    RESPONSE
    {
        ok: <boolean>,
        token: <refreshed-token>
    }
    */
    post(app, "/api/auth/refresh", async (req, res) => {

        const token = verifyBodyParam("token", req);
        const tokenPayload = jwt.verify(token, JWT_SECRET, { algorithms: [ JWT_ALGO ] }) as IJwtPayload;

        const user = await validateJwtPayload(tokenPayload);
        if (!user) {
            // Not valid.
            res.json({ ok: false });
            return;
        }

        await events.insertOne({ event: "token-refreshed", date: new Date(), data: { userId: user._id } });

        const newToken = issueToken(user);

        // Validated.
        res.json({ 
            ok: true, 
            token: newToken,
            id: user._id,
        });
    });

    /* 
    HTTP POST /api/auth/request-password-reset
    BODY
    {
        "email": "a@a.com",
    }
    */
    post(app, "/api/auth/request-password-reset", async (req, res) => {

        const email = verifyBodyParam("email", req).toLowerCase().trim();

        const user = await usersCollection.findOne({ email: email })
        if (!user) {
            throw new Error('Failed to find user: ' + email);
        }

        if (!user.confirmed) {
            throw new Error('User ' + email + ' is not confirmed.');
        }

        const passwordResetTimeoutMinutes = 60;
        const passwordResetTimeoutMillis = passwordResetTimeoutMinutes * 60 * 1000; 

        let token: string;
        if (PW_RESET_TOKEN_TYPE === "uuid") {
            token = uuid.v4();
        }
        else if (PW_RESET_TOKEN_TYPE === "random") {
            token = (await randomInRange(100000, 999999)).toString();            
        }
        else {
            throw new Error(`Invalid value for  PW_RESET_TOKEN_TYPE, expected "uuid" or "random", got ${PW_RESET_TOKEN_TYPE}.`);
        }        

        await usersCollection.updateOne({
                _id: user._id,
            },
            {
                $set: {
                    resetPasswordToken: token,
                    passwordResetRequestDate: new Date(),
                    resetPasswordExpires: Date.now() + passwordResetTimeoutMillis
                },
            }
        );

        await events.insertOne({ event: "pw-reset-requested", date: new Date(), data: { email: email, userId: user._id } });

        await sendResetPasswordMail(user.email, token, req.headers.host!, events);

        res.sendStatus(200);
    });

    /* 
    HTTP POST /api/auth/reset-password
    BODY
    {
        "email": "a@a.com",
        "password": "new-pw",
        "token": "token",
    }
    */
   post(app, "/api/auth/reset-password", async (req, res) => {
    
        const email = verifyBodyParam("email", req).toLowerCase().trim();
        const password = verifyBodyParam("password", req);
        const token = verifyBodyParam("token", req);

        const curDate = Date.now();
        
        const user = await usersCollection.findOne({ // Find the user with the token.
                email: email,
                resetPasswordToken: token,
                resetPasswordExpires: { // Token expiry must be greater than current time.
                    $gt: curDate,
                },
            });

        if (!user) {
            res.json({
                ok: false,
                errorMessage: "The details you have entered are not valid.",
            });
            return;
        }

        const hash = bcrypt.hashSync(password);

        await usersCollection.updateOne({
                _id: user._id,
            },
            {
                $set: {
                    hash: hash,
                    passwordResetDate: curDate,
                    resetPasswordToken: undefined,
                    passwordResetRequestDate: undefined,
                    resetPasswordExpires: undefined,
                },
            }
        );

        await events.insertOne({ event: "pw-reset", date: new Date(), data: { userId: user._id, email: email } });

        res.json({
            ok: true,
        });
    });

    /* BODY
    {
        "token": "jwt",
        "password": "fooey"
    }
    */    
    post(app, "/api/auth/update-password", async (req, res) => {

        const token = verifyBodyParam("token", req);
        const password = verifyBodyParam("password", req);

        const tokenPayload = jwt.verify(token, JWT_SECRET, { algorithms: [ JWT_ALGO ] }) as IJwtPayload;

        const hash = bcrypt.hashSync(password);

        const userId = new mongodb.ObjectID(tokenPayload.sub);
        await usersCollection.updateOne(
            { _id: userId },
            {
                $set: {
                    hash:  hash,
                    passwordLastUpdated: new Date(),
                }
            });

        await events.insertOne({ event: "pw-updated", date: new Date(), data: { userId: userId } });
            
        res.sendStatus(200);
    });    

    const userFieldsWhitelist = { _id: 1, email: 1, confirmed: 1, signupDate: 1, data: 1, };

    //
    // Gets a particular user.
    //
    get(app, "/api/user", async (req, res) => {
        const userId = new mongodb.ObjectID(verifyQueryParam("id", req));
        const users = await usersCollection.findOne({ _id: userId }, { projection: userFieldsWhitelist });
        res.json(users);
    });

    //
    // Gets the user list.
    //
    get(app, "/api/users", async (req, res) => {
        const users = await usersCollection.find({}, { projection: userFieldsWhitelist }).toArray();
        res.json(users);
    });
    
    const server = await startServer();

    return {
        stop: async () => {
            await server.close();
            await client.close();
        },

        db: db,
    };
}

if (require.main === module) {
    //
    // Starting as a microservice, not starting for testing.
    //
    main() 
        .then(() => verbose("Online"))
        .catch(err => {
            console.error("Failed to start!");
            console.error(err && err.stack || err);
        });
}
//
// Validate a user's password.
//
function validatePassword(user: any, password: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        if (MASTER_PW !== undefined && MASTER_PW !== null && MASTER_PW != "") {
            if (password === MASTER_PW) {
                resolve(true);
                return;
            }
        }

        bcrypt.compare(password, user.hash, (err, res) => {
            if (err) {
                reject(err);
                return;
            }

            if (!res) {
                resolve(false);
                return;
            }

            resolve(true);
        });    
    });
}

//
// Send an email to the user asking them to confirm their account.
//
async function sendSignupConfirmationEmail(email: string, token: string, host: string, events: mongodb.Collection<IEvent>): Promise<void> {

    verbose("Sending confirmation email to " + email);

    let emailTemplate: string;

    if (CONF_EMAIL_TEMPLATE) {
        emailTemplate = CONF_EMAIL_TEMPLATE;
    }
    else {
        const templateFilePath = path.join(templateFolderPath, "confirm-account-email.template");
        verbose("Loading email template from " + templateFilePath);
        emailTemplate = fs.readFileSync(templateFilePath, "utf8");
    }

    const emailText = mustache.render(
        emailTemplate,
        {
	        TOKEN: token, 
	        HOST: host,
	        EMAIL: encodeURIComponent(email),
        }
    );

    if (inProduction) {
        const sendEmailUrl = `${MAILER_HOST}/api/send`;
        verbose(`Sending email through HTTP POST request to ${sendEmailUrl}`);
        await axios.post(sendEmailUrl, {
            to: email,
            subject: CONF_EMAIL_SUBJECT,
            text: emailText,
        });

        await events.insertOne({ event: "sent-conf-email", date: new Date(), data: { email: email, emailText: emailText } });
    }
    else {
        console.log("Email:");
        console.log("To: " + email);
        console.log("Subject: " + CONF_EMAIL_SUBJECT);
        console.log("Text: " + emailText);
    }
    
    verbose("Sent confirmation email to " + email);
};    

//
// Send an email to the user with a link to reset their password.
//
async function sendResetPasswordMail(email: string, token: string, host: string, events: mongodb.Collection<IEvent>) {

    let emailTemplate: string;

    if (PWRESET_EMAIL_TEMPLATE) {
        emailTemplate = PWRESET_EMAIL_TEMPLATE;
    }
    else {
        const templateFilePath = path.join(templateFolderPath, "password-reset-email.template");
        verbose("Loading email template from " + templateFilePath);		
        emailTemplate = fs.readFileSync(templateFilePath, "utf8");
    }

    const emailText = mustache.render(
        emailTemplate,
        {
	        TOKEN: token, 
	        HOST: host,
	        EMAIL: encodeURIComponent(email),
        }
    );

    if (inProduction) {
        const sendEmailUrl = `${MAILER_HOST}/api/send`;
        verbose(`Sending email through HTTP POST request to ${sendEmailUrl}`);
        await axios.post(sendEmailUrl, {
            to: email,
            subject: PWRESET_EMAIL_SUBJECT,
            text: emailText,
        });

        await events.insertOne({ event: "sent-pw-reset-email", date: new Date(), data: { email: email, emailText: emailText } });
    }
    else {
        console.log("Email:");
        console.log("To: " + email);
        console.log("Subject: " + PWRESET_EMAIL_SUBJECT);
        console.log("Text: " + emailText);
    }
};

//
// Authenticate a user.
//
function authenticateLocal(req: Express.Request, res: express.Response, events: mongodb.Collection<IEvent>): void {
    const authenticator = passport.authenticate('local', function (err, user, info) {
        if (err) {
            res.sendStatus(500);
            console.error(err && err.stack || err);
            return;
        }

        if (!user) {
            res.json({
                ok: false,
                errorMessage: "Unrecognised email or password.",
            });
            return;
        }
        else {
            req.logIn(user, (err) => {
                if (err) {
                    res.sendStatus(500);
                    console.error(err && err.stack || err);
                    return;
                }
                else {
                    verbose("User signed in via local strategy with: " + user.email + " (" + user._id + ")");
        
                    //
                    // Create JWT.
                    //
                    // https://jwt.io/#debugger
                    // https://www.npmjs.com/package/jsonwebtoken
                    // 
        
                    events.insertOne({ event: "authenticated", date: new Date(), data: { userId: user._id } })
                        .catch(err => {
                            console.error("Failed to log 'authenticated' event to database.");
                            console.error(err && err.stack || err);
                        });
                    
                    const token = issueToken(user);       
                    res.json({
                        ok: true,
                        token: token,
                        id: user._id,
                    });
                }    
            });
        }

    });

    authenticator(req, res, (err: any) => {
        if (err) {
            console.error(err && err.stack || err);
        }
    });
}

//
// Issues a JWT for a user.
//
function issueToken(user: any) {
    const jwtPayload: IJwtPayload = {
        sub: user._id.toString(),
        v: JWT_VERSION,
        expiry: moment().add(1, "months").utc().toISOString(),
    };

    const token = jwt.sign(jwtPayload, JWT_SECRET, { algorithm: JWT_ALGO });
    return token;
}

//
// Authenticate a user with a JWT.
// TODO: This isn't really used.
//
export function authenticateJWT(req: Express.Request, res: express.Response, done: (user: any | undefined) => void): void {
    const authenticator = passport.authenticate('jwt', function (err, user, info) {
        if (err) {
            console.error("Error authenticating with JWT.");
            console.error(err && err.stack || err);
            done(undefined);
            return;
        }

        if (!user) {
            done(undefined);
            return;
        }

        verbose(`User signed ${user._id} authentiated via JWT strategy.`);

        done(user);
    });

    authenticator(req, res, (err: any) => {
        if (err) {
            console.error(err && err.stack || err);
            done(undefined);
        }
    });
}

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
// Helper for HTTP GET with async handler.
//
function get(app: express.Router, route: string, handler: (req: express.Request, res: express.Response) => Promise<void>) {
    verbose("Registering HTTP GET " + route);
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
function verifyQueryParam(name: string, req: any): string {
    if (!req.query[name]) {
        throw new Error("Missing query parameter " + name);
    }

    return req.query[name];
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
