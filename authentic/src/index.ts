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
import { sendEmail } from './mailer';
import * as jwt from "jsonwebtoken";
import * as moment from "moment";
const morganBody = require('morgan-body');

const inProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT && parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DBHOST = process.env.DBHOST || "mongodb://localhost:27017";
const DBNAME = process.env.DBNAME || "auth-test";
console.log("Using DBHOST " + DBHOST);
console.log("Using DB " + DBNAME);

//
// Folder with email templates.
//
const templateFolderPath = path.join(__dirname, "../templates");

const JWT_SECRET = "1234"; //TODO: env var.
const JWT_ALGO = "HS256";
const JWT_VERSION = 1; //TODO: env var.

interface IJwtPayload {
    //
    // User ID.
    //
    sub: string;

    // 
    // JWT version number.
    //
    v: number;

    //
    // Expiry date for the token.
    //
    expiry: string;
}

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

    const client = await mongodb.MongoClient.connect(DBHOST);
    const db = client.db(DBNAME);

    app.use(bodyParser.json());

    if (!inProduction) {
        console.log("In development, registering morgan.");
        morganBody(app);
    }

    app.use(passport.initialize());

    const usersCollection = db.collection("users");

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
        new JwtStrategy(
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

    //
    // Helper for HTTP POST with async handler.
    //
    function post(app: express.Router, route: string, handler: (req: express.Request, res: express.Response) => Promise<void>) {
        console.log("Registering HTTP POST " + route);
        app.post(route, (req, res) => {
            console.log("Handling HTTP POST " + route);
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
    /*
    HTTP POST /auth/register
    BODY
    {
        "email": "someone@something.com",
        "password": "fooey"
    }
    */
    post(app, "/api/auth/register", async (req, res) => {

        const email = verifyBodyParam("email", req).toLowerCase();
        const password = verifyBodyParam("password", req);

        console.log("Registering new user: " + email);

        //
        // Check the user doesn't already exist.
        //
        const existingUser = await usersCollection.findOne({ email: email });
        if (existingUser) {
            res.json({
                ok: false,
                errorMessage: "This email address has already been registered.",
            });
            return;
        }

        const confirmAccountTimeoutMinutes = 60;
        const confirmAccountTimeoutMillis = confirmAccountTimeoutMinutes * 60 * 1000;

        const hash = bcrypt.hashSync(password);
        const confirmationToken = uuid.v4();
        
        await usersCollection.insertOne({
            email: email,
            hash: hash,
            confirmationToken: confirmationToken,
            confirmationTokenExpires: Date.now() + confirmAccountTimeoutMillis,
            confirmed: false,
            signupDate: new Date(),
        });

        await sendSignupConfirmationEmail(email, confirmationToken, req.headers.host!);

        res.json({
            ok: true,
        });
    });

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

        await sendSignupConfirmationEmail(email, user.confirmationToken, req.headers.host!);

        res.sendStatus(200);
    });

    /*
    HTTP POST auth/confirm
    
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
                errorMessage: "No user with those details is not awaiting confirmation.",
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

        res.json({ ok: true });
    });

    /*
    HTTP POST /auth/authenticate
    BODY
    {
        "email": "a@a.com",
        "password": "a"
    }
    */
    post(app, "/api/auth/authenticate", async (req, res) => {
        await authenticateLocal(req, res);
    });

    /*
    HTTP POST auth/validate
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
        const tokenPayload = jwt.verify(token, JWT_SECRET, { algorithms: [ JWT_ALGO ] }) as IJwtPayload;

        const user = await validateJwtPayload(tokenPayload);
        if (!user) {
            // Not valid.
            res.json({ ok: false });
            return;
        }

        // Validated.
        res.json({ 
            ok: true, 
            id: tokenPayload.sub,
        });
    });

    /*
    HTTP POST auth/refresh
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

        const newToken = issueToken(user);

        // Validated.
        res.json({ 
            ok: true, 
            token: newToken,
            id: user._id,
        });
    });

    /* 
    HTTP POST /auth/request-password-reset
    BODY
    {
        "email": "a@a.com",
    }
    */
    post(app, "/api/auth/request-password-reset", async (req, res) => {

        const email = verifyBodyParam("email", req).toLowerCase().trim();

        res.sendStatus(200); // Always respond straight away.

        const user = await usersCollection.findOne({ email: email })
        if (!user) {
            throw new Error('Failed to find user: ' + email);
        }

        if (!user.confirmed) {
            throw new Error('User ' + email + ' is not confirmed.');
        }

        const passwordResetTimeoutMinutes = 60;
        const passwordResetTimeoutMillis = passwordResetTimeoutMinutes * 60 * 1000; 

        const token = uuid.v4();
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

        await sendResetPasswordMail(user.email, token, req.headers.host!);
    });

    /* 
    HTTP POST /auth/reset-password
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

        res.json({
            ok: true,
        });
    });

    /* BODY
    {
        "password": "fooey"
    }
    */    
    post(app, "/api/auth/update-password", async (req, res) => {
        if (!req.user) {
            // Fail if the user is not logged in.
            res.sendStatus(401);
            return;
        }

        const password = verifyBodyParam("password", req);

        console.log("Changing password for user : " + req.user._id);

        const hash = bcrypt.hashSync(password);

        await usersCollection.updateOne(
            { _id: req.user._id },
            {
                $set: {
                    hash:  hash,
                    passwordLastUpdated: new Date(),
                }
            });
            
        res.sendStatus(200);
    });    
    
    await startServer();
}

main() 
    .then(() => console.log("Online"))
    .catch(err => {
        console.error("Failed to start!");
        console.error(err && err.stack || err);
    });

//
// Validate a user's password.
//
function validatePassword(user: any, password: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
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
async function sendSignupConfirmationEmail(email: string, token: string, host: string): Promise<void> {

    console.log("Sending confirmation email to " + email);
    
    const emailSubject = "Account confirmation"; //TODO: From env var.
    const templateFilePath = path.join(templateFolderPath, "confirm-account-email.template");
    console.log("Loading email template from " + templateFilePath);
    const emailTemplate = fs.readFileSync(templateFilePath, "utf8");

    const emailText = mustache.render(
        emailTemplate,
        {
	        TOKEN: token, 
	        HOST: host,
	        EMAIL: encodeURIComponent(email),
        }
    );
    
    await sendEmail({
        to: email,
        subject: emailSubject,
        text: emailText,
    });

    console.log("Sent confirmation email to " + email);
};    

//
// Send an email to the user with a link to reset their password.
//
async function sendResetPasswordMail(email: string, token: string, host: string) {

    const emailSubject = "Password Reset"; //todo: env var

    const templateFilePath = path.join(templateFolderPath, "password-reset-email.template");
    console.log("Loading email template from " + templateFilePath);		
    const emailTemplate = fs.readFileSync(templateFilePath, "utf8");

    const emailText = mustache.render(
        emailTemplate,
        {
	        TOKEN: token, 
	        HOST: host,
	        EMAIL: encodeURIComponent(email),
        }
    );

    return sendEmail({
        to: email,
        subject: emailSubject,
        text: emailText,
    });
};

//
// Authenticate a user.
//
function authenticateLocal(req: Express.Request, res: express.Response): void {
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
                    console.log("User signed in via local strategy with: " + user.email + " (" + user._id + ")");
        
                    //
                    // Create JWT.
                    //
                    // https://jwt.io/#debugger
                    // https://www.npmjs.com/package/jsonwebtoken
                    // 
        
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
// Authenticate a user.
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

        console.log(`User signed ${user._id} authentiated via JWT strategy.`);

        done(user);
    });

    authenticator(req, res, (err: any) => {
        if (err) {
            console.error(err && err.stack || err);
            done(undefined);
        }
    });
}

