import * as mailgun from 'mailgun-js';

const inProduction = process.env.NODE_ENV === "production";

if (!process.env.MAILGUN_API_KEY) {
    throw new Error("Set environment variable MAILGUN_API_KEY.");
}
if (!process.env.DOMAIN_NAME) {
    throw new Error("Set environment variable DOMAIN_NAME.");
}
if (!process.env.FROM_EMAIL) {
    throw new Error("Set environment variable FROM_EMAIL.");
}
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY as string;
const DOMAIN_NAME = process.env.DOMAIN_NAME as string;
const FROM_EMAIL = process.env.FROM_EMAIL as string;

export interface IEmailMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

// 
// Send an email.
//
export function sendEmail(msg: IEmailMessage): Promise<void> {
    if (inProduction) {
        return new Promise<void>((resolve, reject) => {
            var mailer = mailgun({ apiKey: MAILGUN_API_KEY, domain: DOMAIN_NAME });
            mailer.messages().send({
                    from: FROM_EMAIL,
                    to: msg.to,
                    subject: msg.subject,
                    text: msg.text,
                    html: msg.html,
                },
                (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                }
            );
        });
    }
    else {
        console.log("Email sending disabled in development mode.");
        console.log("Email:");
        console.log("To: " + msg.to);
        console.log("Subject: " + msg.subject);
        console.log("Text: " + msg.text);
        console.log("HTML: " + msg.html);

        return Promise.resolve();
    }
}
