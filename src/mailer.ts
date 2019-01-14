import * as mailgun from 'mailgun-js';

const inProduction = process.env.NODE_ENV === "production";
export const MAILGUN_API_KEY = "4960f4fc7a590eb47e83cc5802e3dadc-9525e19d-9eb71c9e";
export const DOMAIN_NAME = "coinstash.io";
export const FROM_EMAIL = "verify@coinstash.io";

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
