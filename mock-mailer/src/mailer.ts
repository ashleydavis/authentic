
export interface IEmailMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

// 
// Send an email.
//
export async function sendEmail(msg: IEmailMessage): Promise<void> {
    console.log("Email:");
    console.log("To: " + msg.to);
    console.log("Subject: " + msg.subject);
    console.log("Text: " + msg.text);
    console.log("HTML: " + msg.html);
}
