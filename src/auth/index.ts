import * as express from 'express';
import * as bcrypt from 'bcrypt-nodejs';
import * as passport from 'passport';
const conf = require('confucious');
import * as path from 'path';
import * as mustache from 'mustache';
import * as fs from 'fs';
import { Strategy as LocalStrategy } from 'passport-local';
import { sendEmail } from '../mailer';
import * as mongodb from 'mongodb';
import { post, verifyBodyParam } from '../utils/rest';
import * as uuid from 'uuid';

//
// Folder with email templates.
//
const templateFolderPath = path.join(__dirname, "../../templates");

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
async function sendSignupConfirmationEmail(email: string, token: string, url: string): Promise<void> {

    console.log("Sending confirmation email to " + email);

    const emailSubject = conf.get('emails:confirmAccountSubject');
    const templateFilePath = path.join(templateFolderPath, "confirm-account-email.template");
    console.log("Loading email template from " + templateFilePath);
    const emailTemplate = fs.readFileSync(templateFilePath, "utf8");

    const emailText = mustache.render(
        emailTemplate,
        {
            appName: conf.get('appName'),
            url: url,
            token: token,
            email: encodeURIComponent(email),
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
async function sendResetPasswordMail (email: string, token: string, url: string) {

    const emailSubject = conf.get('emails:passwordResetSubject');

    const templateFilePath = path.join(templateFolderPath, "password-reset-email.template");
    console.log("Loading email template from " + templateFilePath);		
    const emailTemplate = fs.readFileSync(templateFilePath, "utf8");

    const emailText = mustache.render(
        emailTemplate,
        {
            url: url,
            token: token,
            email: encodeURIComponent(email),
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
function authenticate(req: Express.Request, res: express.Response): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const authenticator = passport.authenticate('local', function (err, user, info) {
            if (err) {
                reject(err);
                return;
            }

            if (!user) {
                res.json({
                    ok: false,
                    errorMessage: "Unrecognised email or password.",
                });
                return;
            }

            req.logIn(user, function (err) {
                if (err) {
                    reject(err);
                    return;
                }

                console.log("User signed in: " + user.email + " (" + user._id + ")");

                res.json({
                    ok: true,
                });
                resolve();
            });
        });

        authenticator(req, res);
    });
}

export function initAuthApi(app: express.Express, db: mongodb.Db): express.Router {
    const router = express.Router(); //NOTE: 'new' is not used with Router.

    app.use(passport.initialize());
    app.use(passport.session());

    const usersCollection = db.collection("users");

    
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
    HTTP POST /auth/register
    BODY
    {
        "email": "someone@something.com",
        "password": "fooey"
    }
    */
    post(router, "/register", async (req, res) => {

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

			//TODO: Add initial user details here.
        });

        await sendSignupConfirmationEmail(email, confirmationToken, req.headers.host!);

        res.json({
            ok: true,
        });
    });

    post(router, "/resend-confirmation-email", async (req, res) => {

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
    post(router, "/confirm", async (req, res) => {

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
    HTTP POST auth/signedin
    RESPONSE
    {
        signedin: <boolean>
    }
    */    
    router.get("/signedin", (req, res) => {
        const isSignedIn = !!req.user;
        res.json({ signedin: isSignedIn });
    });

    /*
    HTTP POST /auth/signin
    BODY
    {
        "email": "a@a.com",
        "password": "a"
    }
    */
    post(router, "/signin", async (req, res) => {
        await authenticate(req, res);
    });

    /*
    HTTP POST /auth/signout
    */
    router.post("/signout", (req, res) => {

        const user = req.user;
        if (!user) {
            res.sendStatus(401);
            return;
        }

        console.log("Signing out user " + user.email + " (" + user._id + ")");

        req.logout();
        res.sendStatus(200);
    });

    /* 
    HTTP POST /auth/request-password-reset
    BODY
    {
        "email": "a@a.com",
    }
    */
    post(router, "/request-password-reset", async (req, res) => {

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
   post(router, "/reset-password", async (req, res) => {
    
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
    post(router, "/update-password", async (req, res) => {
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

    return router;
}